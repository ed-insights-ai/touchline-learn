#!/usr/bin/env python3
"""Module 8 lab: derived products.

Builds three things from the clean season files, all of them disposable:

  1. a standings table, in SQL, with the counting rule
  2. the same standings recounted in plain Python by different code, and an
     agreement check between the two
  3. a single-file analytical database with a manifest: one row count and one
     content hash per table, so a receiver can confirm what it holds

Then it times the standings query over JSON and over Parquet.
"""

from __future__ import annotations

import hashlib
import json
import sys
import time
from pathlib import Path

import duckdb

from common import DATA, UNITS, heading, load, season_file, workdir

SQL = (Path(__file__).parent / "m08_standings.sql").read_text()

LOAD_FIXTURES = """
    CREATE OR REPLACE TABLE fixtures AS
    SELECT season, gender, f.id, f.date, f.home, f.away, f.status, f.home_score, f.away_score,
           f.conference_game, f.match_type
    FROM (SELECT season, gender, unnest(fixtures) AS f FROM read_json(?, union_by_name = true))
"""


def recount(doc: dict) -> dict[str, tuple]:
    """The second implementation: no SQL, written separately on purpose."""
    table: dict[str, list[int]] = {}
    for f in doc["fixtures"]:
        if not f["conference_game"]:
            continue
        for team in (f["home"], f["away"]):
            table.setdefault(team, [0, 0, 0, 0, 0])
        if f["status"] != "final" or "home_score" not in f or f.get("match_type") == "exhibition":
            continue
        h, a = f["home_score"], f["away_score"]
        for team, gf, ga in ((f["home"], h, a), (f["away"], a, h)):
            row = table[team]
            row[0 if gf > ga else 1 if gf == ga else 2] += 1
            row[3] += gf
            row[4] += ga
    return {t: tuple(r) for t, r in table.items()}


def table_hash(db, table: str) -> tuple[int, str]:
    """Row count and a hash of the rows in a fixed order: the same rows give
    the same hash on any machine."""
    rows = db.execute(f"SELECT * FROM {table} ORDER BY ALL").fetchall()
    return len(rows), hashlib.sha256(json.dumps(rows, default=str).encode()).hexdigest()


def main() -> int:
    work = workdir("m08")
    db = duckdb.connect()
    path = str(season_file("fixtures", 2026, "men"))

    heading("Standings, 2026 men, from SQL")
    db.execute(LOAD_FIXTURES, [path])
    rows = db.execute(SQL).fetchall()
    print(f"{'team':20}{'listed':>7}{'counted':>8}{'W':>4}{'D':>4}{'L':>4}{'GF':>4}{'GA':>4}{'Pts':>5}")
    for team, listed, counted, w, d, l, gf, ga, pts in rows:
        note = "  <- not every listed game could be counted" if listed != counted else ""
        print(f"{team:20}{listed:>7}{counted:>8}{w:>4}{d:>4}{l:>4}{gf:>4}{ga:>4}{pts:>5}{note}")

    heading("Agreement check: SQL against a separate Python recount")
    from_sql = {r[0]: (r[3], r[4], r[5], r[6], r[7]) for r in rows}
    from_py = recount(load(path))
    diffs = sorted(t for t in from_sql.keys() | from_py.keys() if from_sql.get(t) != from_py.get(t))
    print("teams compared:", len(from_sql), "| disagreements:", len(diffs))

    heading("Null is not zero")
    naive = db.execute("""SELECT count(*) FROM fixtures WHERE status = 'final' AND conference_game
                          AND coalesce(home_score, 0) = 0 AND coalesce(away_score, 0) = 0""").fetchone()[0]
    real = db.execute("""SELECT count(*) FROM fixtures WHERE status = 'final' AND conference_game
                         AND home_score = 0 AND away_score = 0""").fetchone()[0]
    print(f"goalless draws if a missing score is read as 0: {naive}")
    print(f"goalless draws that were actually published   : {real}")

    heading("One database file, with a manifest")
    out = work / "plc.duckdb"
    pack = duckdb.connect(str(out))
    pack.execute(LOAD_FIXTURES, [[str(season_file("fixtures", s, g)) for s, g in UNITS]])
    pack.execute("""
        CREATE TABLE player_lines AS
        SELECT season, gender, m.key AS fixture_id, t.abbr AS team, p.name, p.minutes, p.goals, p.assists
        FROM (SELECT season, gender, unnest(map_entries(matches)) AS m
              FROM read_json(?, columns = {season: 'INT', gender: 'VARCHAR',
                   matches: 'MAP(VARCHAR, STRUCT(teams STRUCT(abbr VARCHAR, players STRUCT(name VARCHAR,
                   minutes INT, goals INT, assists INT)[])[]))'})),
             unnest(m.value.teams) AS x(t), unnest(t.players) AS y(p)
    """, [[str(season_file("matches", s, g)) for s, g in UNITS]])
    manifest = {"format": 1, "tables": {}}
    for table in ("fixtures", "player_lines"):
        n, digest = table_hash(pack, table)
        manifest["tables"][table] = {"rows": n, "sha256": digest}
        print(f"{table:13} {n:6} rows  sha256 {digest[:16]}...")
    pack.close()
    (work / "manifest.json").write_text(json.dumps(manifest, indent=1))

    # The receiver's side: open the file and confirm it holds the publisher's rows.
    check = duckdb.connect(str(out), read_only=True)
    verified = all(table_hash(check, t) == (m["rows"], m["sha256"]) for t, m in manifest["tables"].items())
    print("receiver verified every table against the manifest:", verified)
    top = check.execute("""SELECT name, team, sum(goals) AS goals FROM player_lines
                           WHERE season = 2026 AND gender = 'men'
                           GROUP BY ALL ORDER BY goals DESC, name LIMIT 3""").fetchall()
    print("top scorers in box scores, 2026 men:", top)
    check.close()

    heading("The same query over JSON and over Parquet")
    db.execute(f"COPY fixtures TO '{work / 'fixtures.parquet'}' (FORMAT parquet)")
    def timed(source, arg):
        start = time.perf_counter()
        for _ in range(20):
            if source == "json":
                db.execute(LOAD_FIXTURES, [arg])
            else:
                db.execute(f"CREATE OR REPLACE TABLE fixtures AS SELECT * FROM read_parquet('{arg}')")
            db.execute(SQL).fetchall()
        return (time.perf_counter() - start) / 20 * 1000
    print(f"JSON    : {timed('json', path):6.2f} ms per load and query")
    print(f"Parquet : {timed('parquet', work / 'fixtures.parquet'):6.2f} ms per load and query")
    print("(Timings vary by machine. On a file this small the gap is modest; it grows with size.)")

    ok = not diffs and verified and naive == real + 1
    print("\nRESULT:", "two implementations agree, and the database verifies" if ok else "unexpected result")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
