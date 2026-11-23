#!/usr/bin/env python3
"""Module 2 lab: rebuild from the archive.

The first parser has a real bug from Touchline's history: it expands every
"St." to "State", which turns Saint schools into State schools. Because the
pages are archived, the fix is applied by re-reading saved pages. No request
is made, and a sidecar fingerprint tells us which pages need re-reading.
"""

from __future__ import annotations

import hashlib
import inspect
import json
import re
import sys

from common import RAW, Page, heading, workdir

NETWORK_REQUESTS = 0  # this lab never raises it; that is the point


def expand_v1(name: str) -> str:
    return name.replace("St.", "State")


def expand_v2(name: str) -> str:
    """"St." before another word is Saint. At the end of a name it is State."""
    name = re.sub(r"\bSt\.(?=\s+\w)", "Saint", name)
    return re.sub(r"\bSt\.$", "State", name)


def fingerprint(fn) -> str:
    """A parser's identity is its source. Change the code, change the fingerprint."""
    return hashlib.sha256(inspect.getsource(fn).encode()).hexdigest()[:12]


def parse_opponents(source: str, expand) -> list[str]:
    table = Page(source).table("Schedule")
    return [expand(row["cells"][2]["text"]) for row in table["rows"][1:]]


def run(parsed_dir, expand) -> tuple[int, int]:
    """Parse every archived schedule whose sidecar does not carry this parser's
    fingerprint. Returns (re-parsed, skipped)."""
    fp, done, skipped = fingerprint(expand), 0, 0
    for page in sorted(RAW.glob("*/2026-men-schedule.html")):
        out = parsed_dir / f"{page.parent.name}.json"
        side = parsed_dir / f"{page.parent.name}.parser"
        if side.exists() and side.read_text() == fp:
            skipped += 1
            continue
        out.write_text(json.dumps(parse_opponents(page.read_text(encoding="utf-8"), expand), indent=1))
        side.write_text(fp)
        done += 1
    return done, skipped


def names(parsed_dir) -> set[str]:
    return {n for f in parsed_dir.glob("*.json") for n in json.loads(f.read_text())}


def main() -> int:
    parsed = workdir("m02") / "parsed"
    parsed.mkdir()

    heading("Run 1: parser v1")
    print("re-parsed, skipped:", run(parsed, expand_v1))
    wrong = sorted(n for n in names(parsed) if n.startswith("State "))
    print("names that cannot be right:", wrong)

    heading("Run 2: same parser, nothing to do")
    print("re-parsed, skipped:", run(parsed, expand_v1))

    heading("Run 3: parser v2, replayed from the archive")
    done, skipped = run(parsed, expand_v2)
    print("re-parsed, skipped:", (done, skipped))
    after = names(parsed)
    print("Saint schools now  :", sorted(n for n in after if n.startswith("Saint ")))
    print("network requests   :", NETWORK_REQUESTS)

    ok = bool(wrong) and done == 8 and not any(n.startswith("State ") for n in after) \
        and "Saint Oswin" in after and NETWORK_REQUESTS == 0
    print("\nRESULT:", "bug fixed by replay, with no fetch" if ok else "unexpected result")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
