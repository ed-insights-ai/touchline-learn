#!/usr/bin/env python3
"""Write the numbers the Module 5 lesson shows, computed from the sample.

    python scripts/build_identity_pilot.py          # write src/data/identity-pilot.json
    python scripts/build_identity_pilot.py --check  # fail if the file has drifted
"""

from __future__ import annotations

import difflib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "labs"))

from common import DATA, load, season_file  # noqa: E402
from m05_identity import build_index, published_names, strip_rank  # noqa: E402
from measures import conference_table, counts, goal_difference  # noqa: E402

OUT = ROOT / "src" / "data" / "identity-pilot.json"
TRUE_TEAM, WRONG_TEAM = "eastbrook-state", "westbrook-state"
CUTOFFS = [round(0.5 + i * 0.05, 2) for i in range(10)]
ROUTES = ("No. 14 Harbor Point", "Westbrook St.", "Eastbrook St.")
LISTED = ("harbor-point", "dunmore", "eastbrook-state", "westbrook-state")


def board(fixtures: list[dict], names: dict) -> list[dict]:
    points = {row[0]: row[-1] for row in conference_table(fixtures)}
    return [{"slug": slug, "name": names[slug]["name"], "games": games, "gd": round(per_game * games),
             "perGame": round(per_game, 2), "points": points[slug]}
            for slug, per_game, games in goal_difference(fixtures)]


def merged(fixture: dict) -> dict:
    swap = {WRONG_TEAM: TRUE_TEAM}
    return {**fixture, "home": swap.get(fixture["home"], fixture["home"]),
            "away": swap.get(fixture["away"], fixture["away"])}


def moved_games(fixtures: list[dict], boxes: dict, names: dict) -> list[dict]:
    games = []
    for f in fixtures:
        if not counts(f) or WRONG_TEAM not in (f["home"], f["away"]):
            continue
        at_home = f["home"] == WRONG_TEAM
        side = boxes[f["id"]]["teams"][0 if at_home else 1]
        opponent = f["away"] if at_home else f["home"]
        scored, conceded = (f["home_score"], f["away_score"]) if at_home else (f["away_score"], f["home_score"])
        games.append({"date": f["date"], "published": side["name"], "abbr": side["abbr"],
                      "opponent": names[opponent]["name"], "scored": scored, "conceded": conceded,
                      "playsItself": opponent == TRUE_TEAM})
    return games


def cutoff_policy(names: dict, slugs: list[str]) -> list[dict]:
    aliases = load(DATA / "reference" / "aliases.json")
    for slug, spellings in load(ROOT / "labs" / "data" / "aliases_solution.json").items():
        aliases.setdefault(slug, []).extend(spellings)
    truth = build_index(aliases)
    pool = {slug: names[slug]["name"] for slug in slugs}
    spellings = sorted({strip_rank(n) for n in published_names()})
    rows = []
    for cutoff in CUTOFFS:
        right = review = exact = 0
        wrong = []
        for spelling in spellings:
            guess = difflib.get_close_matches(spelling, list(pool.values()), n=1, cutoff=cutoff)
            if not guess:
                review += 1
            elif next(s for s, v in pool.items() if v == guess[0]) == truth[spelling]:
                right += 1
                exact += spelling == guess[0]
            else:
                wrong.append({"name": spelling, "into": guess[0]})
        rows.append({"cutoff": cutoff, "right": right, "wrong": len(wrong), "review": review, "exact": exact,
                     "wrongNames": wrong})
    return rows


def lambert_evidence(boxes: dict, names: dict) -> dict:
    for box in boxes.values():
        for team in box["teams"]:
            if team["name"] == "Lambert St." and box["stadium"].startswith("Lambert State"):
                return {"published": team["name"], "abbr": team["abbr"], "stadium": box["stadium"],
                        "lambertStateAbbr": names["lambert-state"]["abbreviation"],
                        "stLambertAbbr": names["st-lambert"]["abbreviation"]}
    raise SystemExit("no Lambert St. evidence in the sample")


def route_examples() -> dict:
    aliases = load(DATA / "reference" / "aliases.json")
    index = build_index(aliases)
    return {"reviewed": [{"slug": slug, "spellings": aliases[slug]} for slug in LISTED],
            "names": [{"published": name, "cleaned": strip_rank(name), "slug": index.get(strip_rank(name))}
                      for name in ROUTES]}


def matcher_scope(names: dict) -> dict:
    members = load(DATA / "reference" / "membership.json")["memberships"]
    everyone = [v["name"] for v in names.values()]
    picks = {s: difflib.get_close_matches(s, everyone, n=1, cutoff=0.7) for s in ("Westbrook St.", "Westbrook State")}
    if any(pick != ["Westbrook State"] for pick in picks.values()):
        raise SystemExit("Westbrook no longer resolves to itself when every school is eligible")
    return {"members": len(members), "westbrookIsMember": "westbrook-state" in members}


def schools(fixtures: list[dict]) -> int:
    return len({team for f in fixtures if counts(f) for team in (f["home"], f["away"])})


def build() -> dict:
    names = load(DATA / "reference" / "programmes.json")["programmes"]
    fixtures = load(season_file("fixtures", 2026, "women"))["fixtures"]
    boxes = load(season_file("matches", 2026, "women"))["matches"]
    published = published_names()
    joined = [merged(f) for f in fixtures]
    members = list(load(DATA / "reference" / "membership.json")["memberships"])
    every_school = cutoff_policy(names, list(names))
    if any(row["wrong"] for row in every_school):
        raise SystemExit("the lesson says a full candidate list removes every wrong merge")
    return {
        "spellings": len(published),
        "afterCleanup": len({strip_rank(n) for n in published}),
        "clean": board(fixtures, names),
        "merged": board(joined, names),
        "schools": {"clean": schools(fixtures), "merged": schools(joined)},
        "distinctMatches": sum(TRUE_TEAM in (f["home"], f["away"]) for f in joined if counts(f)),
        "similarity": round(difflib.SequenceMatcher(None, "Westbrook State", "Eastbrook State").ratio(), 2),
        "matcher": matcher_scope(names),
        "routes": route_examples(),
        "movedGames": moved_games(fixtures, boxes, names),
        "cutoffs": cutoff_policy(names, members),
        "allCutoffs": every_school,
        "lambert": lambert_evidence(boxes, names),
    }


def main() -> int:
    text = json.dumps(build(), indent=1, ensure_ascii=False) + "\n"
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print("RESULT: identity pilot data has drifted. Run python scripts/build_identity_pilot.py")
            return 1
        print("RESULT: identity pilot data matches the sample")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
