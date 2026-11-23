#!/usr/bin/env python3
"""Module 5 lab: resolve names without guessing.

Every team name the sample's box scores published is resolved to one slug in
three steps: a grammar strips rankings, an exact lookup consults a
hand-maintained alias list, and whatever is left is reported for a ruling.
Nothing is matched by similarity.

    python labs/m05_identity.py                 # the starting alias list
    python labs/m05_identity.py --solution      # with the lab's completed list
    python labs/m05_identity.py --aliases my.json

The last part runs a fuzzy matcher over the same names to show what it merges.
"""

from __future__ import annotations

import argparse
import difflib
import re
import sys
from collections import Counter
from pathlib import Path

from common import DATA, UNITS, heading, load, season_file

# A rank is "#9", "No. 14", "RV" or a seed "(3)", then a space. At most two
# digits, so the grammar cannot eat a name that starts with a number.
RANK = re.compile(r"^(?:#\d{1,2}|No\.\s?\d{1,2}|RV|\(\d{1,2}\))\s+")


def strip_rank(published: str) -> str:
    return RANK.sub("", published.strip())


class AliasConflict(Exception):
    pass


def build_index(aliases: dict[str, list[str]]) -> dict[str, str]:
    """Spelling -> slug. One spelling claimed by two schools fails the build."""
    index: dict[str, str] = {}
    for slug, spellings in aliases.items():
        for s in spellings:
            if index.get(s, slug) != slug:
                raise AliasConflict(f"{s!r} is claimed by {index[s]} and {slug}")
            index[s] = slug
    return index


def published_names() -> Counter:
    seen: Counter = Counter()
    for season, gender in UNITS:
        for box in load(season_file("matches", season, gender))["matches"].values():
            for team in box["teams"]:
                seen[team["name"]] += 1
    return seen


def resolve(names: Counter, index: dict[str, str]) -> tuple[dict[str, str], Counter]:
    resolved, unknown = {}, Counter()
    for name, n in names.items():
        slug = index.get(strip_rank(name))
        if slug:
            resolved[name] = slug
        else:
            unknown[strip_rank(name)] += n
    return resolved, unknown


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--aliases", type=Path, help="extra alias entries, slug -> [spellings]")
    ap.add_argument("--solution", action="store_true")
    args = ap.parse_args()

    aliases = load(DATA / "reference" / "aliases.json")
    extra = Path(__file__).parent / "data" / "aliases_solution.json" if args.solution else args.aliases
    if extra:
        for slug, spellings in load(extra).items():
            aliases.setdefault(slug, []).extend(spellings)
    index = build_index(aliases)

    names = published_names()
    heading("Step 1: the grammar")
    for example in ("#9 Brightwater St.", "No. 14 Pine Barrens", "RV Dunmore", "(3) Saint Oswin"):
        print(f"{example!r:28} -> {strip_rank(example)!r}")
    print(f"{len(names)} published spellings reduce to {len({strip_rank(n) for n in names})}")

    heading("Step 2: exact lookup")
    resolved, unknown = resolve(names, index)
    print(f"resolved: {len(resolved)} spellings to {len(set(resolved.values()))} programmes")

    heading("Step 3: what is left needs a ruling")
    for name, n in sorted(unknown.items()):
        print(f"{n:4}  {name}")
    if not unknown:
        print("nothing: every published name has one identity")

    heading("The same names through a fuzzy matcher")
    members = {s: load(DATA / "reference" / "programmes.json")["programmes"][s]["name"]
               for s in load(DATA / "reference" / "membership.json")["memberships"]}
    full = {slug: list(spellings) for slug, spellings in load(DATA / "reference" / "aliases.json").items()}
    for slug, spellings in load(Path(__file__).parent / "data" / "aliases_solution.json").items():
        full[slug].extend(spellings)
    truth = build_index(full)
    merges = 0
    for name in sorted({strip_rank(n) for n in names}):
        guess = difflib.get_close_matches(name, list(members.values()), n=1, cutoff=0.7)
        if not guess:
            continue
        guessed = next(s for s, v in members.items() if v == guess[0])
        if guessed != truth[name]:
            merges += 1
            print(f"FALSE MERGE  {name!r} -> {guess[0]!r}")
    print(f"{merges} false merges, and the matcher raised no error for any of them")

    if args.solution:
        ok = not unknown and merges > 0
        print("\nRESULT:", "every name resolved exactly, none guessed" if ok else "unexpected result")
        return 0 if ok else 1
    print(f"\nRESULT: {len(unknown)} spellings still need an alias entry or a ruling")
    return 0


if __name__ == "__main__":
    sys.exit(main())
