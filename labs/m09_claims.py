#!/usr/bin/env python3
"""Module 9 lab: code computes, the model writes.

A drafted journal arrives with eight claims. Each claim is supposed to name
its basis: the metric, the team and the value it rests on. The validator
recomputes every basis from the season files and keeps only the claims whose
numbers come back the same. A claim with no basis, or one built on a metric
the validator cannot compute, is dropped too. A dropped claim is the system
working.

No language model is called. The draft is a fixed file, so the lab is
reproducible; swap in a draft from any model to try it for real.
"""

from __future__ import annotations

import sys
from pathlib import Path

import duckdb

from common import heading, load, season_file

HERE = Path(__file__).parent
STANDINGS_SQL = (HERE / "m08_standings.sql").read_text()


def digest(season: int, gender: str) -> dict:
    """Every figure a journal for this unit is allowed to state."""
    db = duckdb.connect()
    db.execute("""CREATE TABLE fixtures AS SELECT f.* FROM
                  (SELECT unnest(fixtures) AS f FROM read_json(?))""", [str(season_file("fixtures", season, gender))])
    figures = {}
    for team, listed, counted, w, d, l, gf, ga, pts in db.execute(STANDINGS_SQL).fetchall():
        figures[team] = {"listed": listed, "counted": counted, "wins": w, "draws": d, "losses": l,
                         "goals_for": gf, "goals_against": ga, "points": pts}
    goals: dict[tuple[str, str], int] = {}
    for box in load(season_file("matches", season, gender))["matches"].values():
        for team in box["teams"]:
            for p in team["players"]:
                goals[(team["abbr"], p["name"])] = goals.get((team["abbr"], p["name"]), 0) + p["goals"]
    return {"teams": figures, "player_goals": goals}


def check(claim: dict, figures: dict) -> tuple[bool, str]:
    basis = claim.get("basis")
    if not basis:
        return False, "no basis: nothing to recompute"
    metric, team = basis["metric"], basis.get("team")
    if metric == "player_goals":
        actual = figures["player_goals"].get((team, basis["player"]))
    elif metric in next(iter(figures["teams"].values())):
        actual = figures["teams"].get(team, {}).get(metric)
    else:
        return False, f"{metric!r} is not in the digest, so the journal cannot say it"
    if actual is None:
        return False, "the data has no such team or player"
    if actual != basis["value"]:
        return False, f"claimed {basis['value']}, recomputed {actual}"
    return True, f"recomputed {actual}"


def main() -> int:
    draft = load(HERE / "data" / "journal_draft.json")
    figures = digest(draft["season"], draft["gender"])
    kept, dropped = [], []
    heading(f"Validating: {draft['headline']}")
    for claim in draft["claims"]:
        ok, why = check(claim, figures)
        (kept if ok else dropped).append(claim)
        print(f"{'keep' if ok else 'DROP'}  {claim['text']}\n      {why}")

    heading("What gets published")
    for claim in kept:
        print(" ", claim["text"])
    print(f"\n{len(kept)} kept, {len(dropped)} dropped")
    tied = sorted(k for k, v in figures["player_goals"].items() if v == max(figures["player_goals"].values()))
    print(f"\nA claim that passed and is still misleading: 'leads the league' is shared by {len(tied)} players:")
    print(" ", tied)
    print("The validator proved the number. It did not prove the sentence.")

    ok = len(kept) == 4 and len(dropped) == 4 and len(tied) > 1
    print("\nRESULT:", "every published number was recomputed from the data" if ok else "unexpected result")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
