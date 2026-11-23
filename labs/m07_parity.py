#!/usr/bin/env python3
"""Module 7 lab: a parity gate.

Two pipelines collected the same conference three days apart. The official
copy is sample/data, the newcomer's is sample/shadow. Every record is sorted
into one of three categories:

  match         identical
  timing        the later run saw a recent game the earlier run saw unplayed
  disagreement  anything else

The gate exits 0 only with no disagreements. If an input is missing it exits
2 and says it did not run. It never reports "0 disagreements" for a
comparison it could not make.

    python labs/m07_parity.py
    python labs/m07_parity.py --shadow sample/data      # compare a copy with itself
    python labs/m07_parity.py --shadow nowhere           # a check that cannot run
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

from common import DATA, SHADOW, heading, load

RECENT = timedelta(days=3)


def classify_fixture(official: dict | None, shadow: dict | None, official_seen: date) -> str:
    if official == shadow:
        return "match"
    if official is None or shadow is None:
        return "disagreement"  # a game only one side knows about
    volatile = {"status", "home_score", "away_score"}
    same_otherwise = all(official.get(k) == shadow.get(k) for k in official.keys() | shadow.keys() if k not in volatile)
    moved_forward = official["status"] == "scheduled" and shadow["status"] == "final"
    recent = date.fromisoformat(official["date"]) >= official_seen - RECENT
    return "timing" if same_otherwise and moved_forward and recent else "disagreement"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shadow", type=Path, default=SHADOW)
    args = ap.parse_args()

    try:
        official_f = load(DATA / "fixtures" / "2026-men-plc.json")
        official_r = load(DATA / "rosters" / "2026-men-plc.json")
        shadow_f = load(args.shadow / "fixtures" / "2026-men-plc.json")
        shadow_r = load(args.shadow / "rosters" / "2026-men-plc.json")
    except (OSError, ValueError) as why:
        print(f"PARITY DID NOT RUN: {type(why).__name__}: {why}")
        print("This is not a pass. Nothing was compared.")
        return 2

    seen = date.fromisoformat(official_f["collected_at"][:10])
    a = {f["id"]: f for f in official_f["fixtures"]}
    b = {f["id"]: f for f in shadow_f["fixtures"]}
    tally = {"match": 0, "timing": 0, "disagreement": 0}
    notes = []
    for fid in sorted(a.keys() | b.keys()):
        kind = classify_fixture(a.get(fid), b.get(fid), seen)
        tally[kind] += 1
        if kind != "match":
            notes.append((kind, fid, a.get(fid), b.get(fid)))

    # A roster does not change between two runs a few days apart, so there is
    # no timing category for it: any difference is a disagreement.
    for slug in sorted(official_r["rosters"].keys() | shadow_r["rosters"].keys()):
        same = official_r["rosters"].get(slug) == shadow_r["rosters"].get(slug)
        tally["match" if same else "disagreement"] += 1
        if not same:
            notes.append(("disagreement", f"roster:{slug}", None, None))

    heading("Parity: official vs shadow, 2026 men")
    for kind, fid, x, y in notes:
        def brief(f):
            return "absent" if f is None else f"{f['date']} {f['status']} {f.get('home_score', '-')}-{f.get('away_score', '-')}"
        print(f"{kind:13} {fid:34} official: {brief(x) if x or y else ''}  shadow: {brief(y) if x or y else ''}")
    print(f"\n{tally['match']} match, {tally['timing']} timing, {tally['disagreement']} disagreement")
    if tally["disagreement"]:
        print("GATE: failed. The new pipeline does not take over.")
        return 1
    print("GATE: passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
