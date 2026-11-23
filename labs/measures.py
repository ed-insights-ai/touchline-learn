"""The course's two measures of the best team, shared by every lab that reports them."""

from __future__ import annotations

from pathlib import Path

from common import DATA, load, require

require("duckdb")

import duckdb  # noqa: E402

STANDINGS_SQL = (Path(__file__).parent / "m08_standings.sql").read_text()
COLUMNS = ("home", "away", "status", "home_score", "away_score", "conference_game", "match_type")


def counts(fixture: dict) -> bool:
    """Final, scored on both sides, and not an exhibition."""
    return (fixture["status"] == "final" and fixture.get("home_score") is not None
            and fixture.get("away_score") is not None and fixture.get("match_type") != "exhibition")


def members() -> set[str]:
    return set(load(DATA / "reference" / "membership.json")["memberships"])


def conference_table(fixtures: list[dict]) -> list[tuple]:
    """Rows of (team, listed, counted, w, d, l, gf, ga, pts), best first."""
    db = duckdb.connect()
    db.execute("""CREATE TABLE fixtures (home VARCHAR, away VARCHAR, status VARCHAR, home_score INT,
                  away_score INT, conference_game BOOLEAN, match_type VARCHAR)""")
    db.executemany("INSERT INTO fixtures VALUES (?, ?, ?, ?, ?, ?, ?)",
                   [[f.get(c) for c in COLUMNS] for f in fixtures])
    return db.execute(STANDINGS_SQL).fetchall()


def goal_difference(fixtures: list[dict]) -> list[tuple[str, float, int]]:
    """Rows of (team, goal difference per game, games) for conference members, best first.

    Every counted game is included, conference or not, and each side is one
    appearance, so a game a false merge makes against itself counts twice.
    """
    totals: dict[str, list[int]] = {}
    for f in fixtures:
        if not counts(f):
            continue
        for team, scored, conceded in ((f["home"], f["home_score"], f["away_score"]),
                                       (f["away"], f["away_score"], f["home_score"])):
            row = totals.setdefault(team, [0, 0])
            row[0] += 1
            row[1] += scored - conceded
    inside = members()
    rows = [(t, diff / games, games) for t, (games, diff) in totals.items() if t in inside]
    return sorted(rows, key=lambda r: (-r[1], r[0]))
