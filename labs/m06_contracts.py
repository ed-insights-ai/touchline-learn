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
import random
import sys
from collections import Counter
from pathlib import Path

from common import DATA, UNITS, heading, load, require, season_file

require("duckdb", "jsonschema")

import duckdb  # noqa: E402
from jsonschema import Draft202012Validator  # noqa: E402

from measures import conference_table, counts, goal_difference  # noqa: E402

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
        "a display name where a slug belongs": change(lambda d: d["fixtures"][final].update(home="St. Lambert")),
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
        "a team keyed by display name": change(lambda d: d["rosters"].update({"St. Lambert": d["rosters"][team]})),
        "players as an object, not a list": change(lambda d: d["rosters"][team].update(players={})),
        "a season written as text": change(lambda d: d.update(season="2026")),
    }


def goals_per_game(fixtures: list[dict]) -> float:
    return sum(f["home_score"] + f["away_score"] for f in fixtures) / len(fixtures)


def permutation_p(with_box: list[dict], without: list[dict], shuffles: int = 10_000) -> float:
    """How often a random split of the same games shows a gap at least this large."""
    totals = [f["home_score"] + f["away_score"] for f in with_box + without]
    observed = abs(goals_per_game(with_box) - goals_per_game(without))
    rng, cut, hits = random.Random(0), len(with_box), 0
    for _ in range(shuffles):
        rng.shuffle(totals)
        gap = sum(totals[:cut]) / cut - sum(totals[cut:]) / (len(totals) - cut)
        hits += abs(gap) >= observed - 1e-9
    return hits / shuffles


def missingness() -> bool:
    fixtures = load(season_file("fixtures", 2025, "men"))["fixtures"]
    boxes = load(season_file("matches", 2025, "men"))["matches"]
    games = [f for f in fixtures if counts(f)]
    with_box = [f for f in games if f["id"] in boxes]
    without = [f for f in games if f["id"] not in boxes]
    exhibitions = sum(f["status"] == "final" and f.get("match_type") == "exhibition" and "home_score" in f
                      for f in fixtures)
    publishers = Counter(f["id"].split(":")[1] for f in without)
    school = publishers.most_common(1)[0][0]
    home = sum(f["home"] == school for f in without)
    p = permutation_p(with_box, without)
    print(f"\n2025 men, counted games ({exhibitions} exhibitions excluded)")
    print(f"  every counted game  : {goals_per_game(games):.2f} goals per game over {len(games)}")
    print(f"  with a box score    : {goals_per_game(with_box):.2f} over {len(with_box)}")
    print(f"  without a box score : {goals_per_game(without):.2f} over {len(without)}")
    print(f"All {len(without)} missing box scores come from {school}'s site "
          f"({home} home, {len(without) - home} away).")
    print(f"Permutation test on the gap: p = {p:.2f}.")
    print("The coverage record names the mechanism. With 12 games, the gap alone does not establish bias.")

    fixtures_26 = load(season_file("fixtures", 2026, "men"))["fixtures"]
    boxes_26 = load(season_file("matches", 2026, "men"))["matches"]
    counted = [f for f in fixtures_26 if counts(f)]
    subset = [f for f in counted if f["id"] in boxes_26]
    table_holds = [r[0] for r in conference_table(fixtures_26)] == [r[0] for r in conference_table(subset)]
    rating_holds = [r[0] for r in goal_difference(fixtures_26)] == [r[0] for r in goal_difference(subset)]
    print(f"\n2026 men, baseline rankings on the box-score subset ({len(subset)} of {len(counted)} counted games)")
    print(f"  conference table order       : {'holds' if table_holds else 'CHANGES'}")
    print(f"  goal difference per game order: {'holds' if rating_holds else 'CHANGES'}")
    return (len(games), len(without), len(publishers)) == (59, 12, 1) and table_holds and rating_holds


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

    ok &= missingness()

    print("\nRESULT:", "contracts hold, and every gap has a named reason" if ok else "see the lines above")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
