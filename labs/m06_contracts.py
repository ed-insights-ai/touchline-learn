#!/usr/bin/env python3
"""Module 6 lab: contracts, and the kinds of missing data.

Part 1 holds every fixtures file to its written contract, then shows the
contract refusing records that are well-formed JSON and still wrong.

Part 2 is the contract-writing exercise. A starter contract for rosters
accepts almost anything. Tighten it until it refuses every bad file:

    python labs/m06_contracts.py --rosters labs/contracts/rosters-1.starter.schema.json
    python labs/m06_contracts.py --rosters path/to/yours.json

Part 3 reads the coverage record: what is missing, why, and whether the gaps
bias an estimate.
"""

from __future__ import annotations

import argparse
import copy
import sys
from pathlib import Path

import duckdb
from jsonschema import Draft202012Validator

from common import DATA, UNITS, heading, load, season_file

HERE = Path(__file__).parent


def errors(schema: dict, doc: dict) -> list[str]:
    v = Draft202012Validator(schema, format_checker=Draft202012Validator.FORMAT_CHECKER)
    return [f"{'/'.join(str(p) for p in e.absolute_path)}: {e.message}"[:110] for e in v.iter_errors(doc)]


def broken_fixtures(doc: dict) -> dict[str, dict]:
    """Each change is one way a writer could drift without anyone noticing."""
    def change(fn):
        d = copy.deepcopy(doc)
        fn(d)
        return d
    final = next(i for i, f in enumerate(doc["fixtures"]) if "home_score" in f)
    todo = next(i for i, f in enumerate(doc["fixtures"]) if f["status"] == "scheduled")
    return {
        "a score written as text": change(lambda d: d["fixtures"][final].update(home_score="2")),
        "a status the contract never promised": change(lambda d: d["fixtures"][final].update(status="finished")),
        "a display name where a slug belongs": change(lambda d: d["fixtures"][final].update(home="St. Oswin")),
        "one score without the other": change(lambda d: d["fixtures"][final].pop("away_score")),
        "a 0-0 invented for an unplayed game": change(lambda d: d["fixtures"][todo].update(home_score=0, away_score=0)),
        "a record with no citation": change(lambda d: d["fixtures"][final].pop("source_url")),
        "a version this reader does not know": change(lambda d: d.update(schema="touchline.fixtures/3")),
    }


def broken_rosters(doc: dict) -> dict[str, dict]:
    def change(fn):
        d = copy.deepcopy(doc)
        fn(d)
        return d
    team = sorted(doc["rosters"])[0]
    return {
        "a player with no name": change(lambda d: d["rosters"][team]["players"][0].pop("name")),
        "a shirt number stored as a number": change(lambda d: d["rosters"][team]["players"][0].update(number=7)),
        "a gender the writer never emits": change(lambda d: d.update(gender="mixed")),
        "a team keyed by display name": change(lambda d: d["rosters"].update({"St. Oswin": d["rosters"][team]})),
        "players as an object, not a list": change(lambda d: d["rosters"][team].update(players={})),
        "a season written as text": change(lambda d: d.update(season="2026")),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rosters", type=Path, default=HERE / "contracts" / "rosters-1.schema.json")
    args = ap.parse_args()
    ok = True

    heading("Part 1: every fixtures file against touchline.fixtures/2")
    schema = load(HERE / "contracts" / "fixtures-2.schema.json")
    for season, gender in UNITS:
        found = errors(schema, load(season_file("fixtures", season, gender)))
        ok &= not found
        print(f"{season} {gender:5}  {'conforms' if not found else found[:3]}")
    print()
    for label, doc in broken_fixtures(load(season_file("fixtures", 2026, "men"))).items():
        found = errors(schema, doc)
        ok &= bool(found)
        print(f"{'refused ' if found else 'ACCEPTED'}  {label}")

    heading(f"Part 2: your rosters contract ({args.rosters.name})")
    schema = load(args.rosters)
    slipped = 0
    for season, gender in UNITS:
        found = errors(schema, load(season_file("rosters", season, gender)))
        if found:
            slipped += 1
            print(f"REJECTS REAL DATA  {season} {gender}: {found[0]}")
    for label, doc in broken_rosters(load(season_file("rosters", 2026, "men"))).items():
        found = errors(schema, doc)
        slipped += not found
        print(f"{'refused ' if found else 'ACCEPTED'}  {label}")
    print(f"{slipped} problems with this contract")
    ok &= slipped == 0

    heading("Part 3: what is missing, and why")
    db = duckdb.connect()
    db.execute("""
        CREATE TABLE coverage AS
        SELECT c.* FROM (
            SELECT unnest(map_values(cells)) AS c
            FROM read_json(?, columns = {cells: 'MAP(VARCHAR, STRUCT(season INT, gender VARCHAR,
                 programme VARCHAR, layer VARCHAR, state VARCHAR, reason VARCHAR, "count" INT))'}))
    """, [str(DATA / "coverage.json")])
    for row in db.execute("""
        SELECT season, gender, programme, layer, state, reason FROM coverage
        WHERE state <> 'complete' AND layer IN ('matches', 'stats') ORDER BY ALL""").fetchall():
        print(*row, sep=" | ")

    # Does the missing box-score coverage bias goals per game? Compare the
    # estimate from box scores with the answer from the schedule's own scores.
    files = [str(season_file("fixtures", 2025, "men"))]
    all_games = db.execute("""
        SELECT count(*), avg(f.home_score + f.away_score)
        FROM (SELECT unnest(fixtures) AS f FROM read_json(?))
        WHERE f.status = 'final' AND f.home_score IS NOT NULL""", files).fetchone()
    boxes = load(season_file("matches", 2025, "men"))["matches"]
    box_avg = sum(t["score"] for b in boxes.values() for t in b["teams"]) / len(boxes)
    print(f"\n2025 men, goals per game from every final : {all_games[1]:.2f} over {all_games[0]} games")
    print(f"2025 men, goals per game from box scores  : {box_avg:.2f} over {len(boxes)} games")
    print("The gap is not random: the missing box scores are one school's home games.")
    ok &= abs(all_games[1] - box_avg) > 0.05

    print("\nRESULT:", "contracts hold, and every gap has a named reason" if ok else "see the lines above")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
