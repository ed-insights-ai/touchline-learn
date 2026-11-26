#!/usr/bin/env python3
"""Run every lab from a fresh clone and check each one ends as it should.

    python labs/run_all.py

This is the repository's own gate: CI runs it on every change, after checking
that the sample regenerates byte for byte.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (command, expected exit code, text the output must contain)
RUNS = [
    (["sample/generate.py", "--check"], 0, "0 differ from disk"),
    (["labs/m01_collect.py"], 0, "7 of 8 pages saved, 46 of 54 finished matches read host-only, 53 from both pages"),
    (["labs/m01_collect.py", "--incremental"], 0, "RESULT: incremental collection behaves as expected"),
    (["labs/m02_archive.py"], 0, "RESULT: rebuilt by replay with 0 requests; only Saint Lambert's name changed"),
    (["labs/m02_archive.py", "--tuesday"], 1, "RESULT: confounded, 20 cells changed in 4 rows"),
    (["labs/m02_archive.py", "--missing", "hartwell-tech"], 1, "RESULT: replayed 6 of the 7 schedules the manifest lists; the replay skipped"),
    (["labs/m02_archive.py", "--missing", "dunmore"], 2, "saved no schedule page for 'dunmore'"),
    (["labs/m03_proof.py"], 0, "8 proven, 2 refused"),
    (["labs/m04_parse.py"], 0, "RESULT: only the caption parser matches"),
    (["labs/m05_identity.py"], 0, "14 spellings still need"),
    (["labs/m05_identity.py", "--solution"], 0, "RESULT: every name resolved exactly"),
    (["labs/m05_identity.py", "--name", "#9 Dunmore"], 0, "-> 'Dunmore'"),
    (["scripts/build_identity_pilot.py", "--check"], 0, "identity pilot data matches"),
    (["labs/m06_contracts.py"], 0, "RESULT: contracts hold"),
    (["labs/m06_contracts.py", "--rosters", "labs/contracts/rosters-1.starter.schema.json"], 1, "6 problems"),
    (["labs/m07_parity.py"], 1, "91 match, 3 timing, 1 disagreement"),
    (["labs/m07_parity.py", "--shadow", "sample/data"], 0, "GATE: passed"),
    (["labs/m07_parity.py", "--shadow", "does-not-exist"], 2, "PARITY DID NOT RUN"),
    (["labs/m08_products.py"], 0, "RESULT: two implementations agree"),
    (["labs/m08_products.py", "--verify-only"], 0, "RESULT: every table matches"),
    (["labs/m08_products.py", "--tamper"], 0, "RESULT: changed the away score"),
    (["labs/m08_products.py", "--verify-only"], 1, "changed since publishing: fixtures"),
    (["labs/m08_products.py"], 0, "RESULT: two implementations agree"),
    (["labs/m09_claims.py"], 0, "4 kept, 4 dropped"),
    (["labs/m09_claims.py", "--draft", "labs/data/journal_draft.json"], 0, "4 kept, 4 dropped"),
    (["labs/m09_claims.py", "--draft", "does-not-exist.json"], 2, "could not run"),
    (["labs/m10_jobgraph.py"], 0, "RESULT: gates stop the release"),
    (["labs/m10_jobgraph.py", "--fail", "snapshot"], 0, "RESULT: replayed the day"),
    (["labs/query.py", "labs/explore.sql"], 0, "RESULT: 10 rows"),
]


def main() -> int:
    failed = 0
    for args, want_code, want_text in RUNS:
        done = subprocess.run([sys.executable, *args], cwd=ROOT, capture_output=True, text=True)
        ok = done.returncode == want_code and want_text in done.stdout
        failed += not ok
        print(f"{'ok  ' if ok else 'FAIL'}  python {' '.join(args)}  (exit {done.returncode})")
        if not ok:
            print(done.stdout[-1500:], done.stderr[-1500:], sep="\n")
    print(f"\n{len(RUNS) - failed} of {len(RUNS)} runs behaved as expected")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
