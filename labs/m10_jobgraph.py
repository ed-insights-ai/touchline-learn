#!/usr/bin/env python3
"""Module 10 lab: the daily run as a graph of jobs.

Each job names what it needs and what it is permitted to touch. The script
orders the jobs, checks that no job holds a permission it does not use, and
then replays the day with one job failing to show what still publishes.

    python labs/m10_jobgraph.py
    python labs/m10_jobgraph.py --fail collect-second   # a soft dependency
    python labs/m10_jobgraph.py --fail contract-check   # a gate
"""

from __future__ import annotations

import argparse
import sys
from graphlib import TopologicalSorter

from common import heading

# needs: hard dependencies. A job is skipped if any of them did not succeed.
# soft:  the job waits for these but runs either way, and reports them stale.
# uses:  what the job's steps actually touch.  may: what its credentials allow.
JOBS = {
    "collect-first":  {"needs": [], "uses": {"archive:write", "shadow:write"},
                       "may": {"archive:write", "shadow:write"}},
    "collect-second": {"needs": [], "uses": {"archive:write", "shadow:write"},
                       "may": {"archive:write", "shadow:write"}},
    "contract-check": {"needs": ["collect-first"], "soft": ["collect-second"],
                       "uses": {"data:read"}, "may": {"data:read"}},
    "bundle":         {"needs": ["contract-check"], "uses": {"data:read"}, "may": {"data:read"}},
    "snapshot":       {"needs": ["bundle"], "uses": {"dataset:write", "signing-key:use"},
                       "may": {"dataset:write", "signing-key:use"}},
    "site":           {"needs": ["bundle"], "uses": {"site:write"}, "may": {"site:write"}},
    "release":        {"needs": ["snapshot", "site"], "uses": {"latest-pointer:write"},
                       "may": {"latest-pointer:write"}},
}


def order(jobs: dict) -> list[str]:
    graph = {name: set(j["needs"]) | set(j.get("soft", [])) for name, j in jobs.items()}
    return list(TopologicalSorter(graph).static_order())


def run(jobs: dict, failing: set[str]) -> dict[str, str]:
    outcome: dict[str, str] = {}
    for name in order(jobs):
        job = jobs[name]
        if name in failing:
            outcome[name] = "failed"
        elif any(outcome[n] != "ok" and not outcome[n].startswith("ok ") for n in job["needs"]):
            outcome[name] = "skipped"
        else:
            stale = [n for n in job.get("soft", []) if outcome[n] != "ok"]
            outcome[name] = "ok" if not stale else f"ok (stale: {', '.join(stale)})"
    return outcome


def over_privileged(jobs: dict) -> dict[str, set[str]]:
    return {name: j["may"] - j["uses"] for name, j in jobs.items() if j["may"] - j["uses"]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fail", action="append", default=[], choices=sorted(JOBS))
    args = ap.parse_args()

    heading("Order of work")
    print(" -> ".join(order(JOBS)))

    heading("Least privilege")
    extra = over_privileged(JOBS)
    print("jobs holding a permission they never use:", extra or "none")
    readers = [n for n, j in JOBS.items() if "data:read" in j["may"]]
    print("jobs that can read the dataset:", readers)
    print("can the site deploy job read the dataset?", "data:read" in JOBS["site"]["may"])

    scenarios = [set(args.fail)] if args.fail else [set(), {"collect-second"}, {"contract-check"}, {"site"}]
    results = []
    for failing in scenarios:
        heading(f"Today, with {sorted(failing) or 'nothing'} failing")
        outcome = run(JOBS, failing)
        results.append(outcome)
        for name, state in outcome.items():
            print(f"{name:15} {state}")
        released = outcome["release"] == "ok" or outcome["release"].startswith("ok ")
        print("released today" if released else "nothing new published; yesterday's release stays in place")

    if args.fail:
        print(f"\nRESULT: replayed the day with {sorted(args.fail)} failing")
        return 0
    ok = (not extra and results[0]["release"] == "ok" and results[1]["release"] == "ok"
          and results[1]["contract-check"].startswith("ok (stale")
          and results[2]["release"] == "skipped" and results[3]["release"] == "skipped"
          and results[3]["snapshot"] == "ok")
    print("\nRESULT:", "gates stop the release; a stale source does not" if ok else "unexpected result")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
