#!/usr/bin/env python3
"""Module 2 lab: rebuild from the archive.

The first parser has a real bug from Touchline's history: it expands every
"St." to "State", which turns Saint schools into State schools. Because the
pages are archived, the fix is applied by re-reading saved pages. No request
is made, and a sidecar fingerprint tells us which pages need re-reading.
"""

from __future__ import annotations

import argparse
import hashlib
import inspect
import json
import re
import shutil
import socket
import sys
from contextlib import contextmanager
from pathlib import Path

from common import RAW, Page, heading, workdir


@contextmanager
def count_network():
    """Counts every attempt to resolve a name or open a connection, and stops it."""
    attempts: list[str] = []

    def stop(*args, **kwargs):
        attempts.append(str(args[-1] if args else kwargs))
        raise OSError("this lab does not use the network")
    real = socket.getaddrinfo, socket.socket.connect
    socket.getaddrinfo, socket.socket.connect = stop, stop
    try:
        yield attempts
    finally:
        socket.getaddrinfo, socket.socket.connect = real


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


def run(parsed_dir, expand, archive: Path = RAW) -> tuple[int, int]:
    """Parse every archived schedule whose sidecar does not carry this parser's
    fingerprint. Returns (re-parsed, skipped)."""
    fp, done, skipped = fingerprint(expand), 0, 0
    for page in sorted(archive.glob("*/2026-men-schedule.html")):
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
    ap = argparse.ArgumentParser()
    ap.add_argument("--missing", metavar="SCHOOL", help="run on a scratch copy without this school's page")
    args = ap.parse_args()

    work = workdir("m02")
    parsed = work / "parsed"
    parsed.mkdir()
    archive = RAW
    if args.missing:
        pages = sorted(RAW.glob("*/2026-men-schedule.html"))
        if args.missing not in {p.parent.name for p in pages}:
            print(f"RESULT: could not run, no archived page for {args.missing!r}")
            return 2
        archive = work / "archive"
        for page in pages:
            if page.parent.name != args.missing:
                (archive / page.parent.name).mkdir(parents=True)
                shutil.copy(page, archive / page.parent.name / page.name)

    with count_network() as attempts:
        try:
            socket.create_connection(("archive.invalid", 80), timeout=1)
        except OSError:
            pass
        counter_works = len(attempts) == 1
        attempts.clear()

        heading("Run 1: parser v1")
        print("re-parsed, skipped:", run(parsed, expand_v1, archive))
        wrong = sorted(n for n in names(parsed) if n.startswith("State "))
        print("names that cannot be right:", wrong)

        heading("Run 2: same parser, nothing to do")
        print("re-parsed, skipped:", run(parsed, expand_v1, archive))

        heading("Run 3: parser v2, replayed from the archive")
        done, skipped = run(parsed, expand_v2, archive)
        print("re-parsed, skipped:", (done, skipped))
        after = names(parsed)
        print("Saint schools now  :", sorted(n for n in after if n.startswith("Saint ")))
        print("network requests   :", len(attempts))
    print("network counter    :", "caught a test request" if counter_works else "FAILED its test request")

    if args.missing:
        print(f"\nRESULT: {args.missing} has no archived page, and this run did not report it")
        return 1

    ok = bool(wrong) and done == 8 and not any(n.startswith("State ") for n in after) \
        and "Saint Lambert" in after and not attempts and counter_works
    print("\nRESULT:", "bug fixed by replay, with no fetch" if ok else "unexpected result")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
