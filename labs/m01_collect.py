#!/usr/bin/env python3
"""Module 1 lab: incremental collection.

A registry lists what to ask for. The collector remembers a validator (an
ETag) for every page it has seen and sends it back; the site answers 304 when
nothing changed. Day two of a season therefore downloads almost nothing.

No network is used. The "web" here is a small in-memory stand-in that serves
the archived sample pages and counts the bytes it sends.
"""

from __future__ import annotations

import hashlib
import json
import sys

from common import RAW, heading, load, workdir


class FakeWeb:
    """Serves pages by URL and honors If-None-Match, as a real server would."""

    def __init__(self):
        self.pages: dict[str, str] = {}
        self.unavailable: set[str] = set()
        self.bytes_sent = 0

    def get(self, url: str, etag: str | None = None):
        if any(url.startswith(host) for host in self.unavailable):
            return 503, None, None
        body = self.pages[url]
        current = '"' + hashlib.sha256(body.encode()).hexdigest()[:16] + '"'
        if etag == current:
            return 304, None, current
        self.bytes_sent += len(body)
        return 200, body, current


def registry() -> list[dict]:
    """One entry per page to ask for. Adding a school is a new entry, not new code."""
    entries = []
    for meta in sorted(RAW.glob("*/2026-men-*.html.meta.json")):
        m = load(meta)
        entries.append({"programme": meta.parent.name, "url": m["requested_url"],
                        "file": meta.name.removesuffix(".meta.json")})
    return entries


def collect(web: FakeWeb, entries: list[dict], archive, validators: dict) -> dict:
    """One run. Returns the run record: what happened to every page."""
    record = {"downloaded": [], "unchanged": [], "unavailable": []}
    for e in entries:
        status, body, etag = web.get(e["url"], validators.get(e["url"]))
        if status == 503:
            record["unavailable"].append(e["url"])
        elif status == 304:
            record["unchanged"].append(e["url"])
        else:
            path = archive / e["programme"] / e["file"]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(body, encoding="utf-8")  # archive first, parse later
            validators[e["url"]] = etag
            record["downloaded"].append(e["url"])
    return record


def main() -> int:
    work = workdir("m01")
    entries = registry()
    web = FakeWeb()
    for e in entries:
        web.pages[e["url"]] = (RAW / e["programme"] / e["file"]).read_text(encoding="utf-8")
    validators: dict[str, str] = {}

    def report(day, rec):
        heading(day)
        print(f"registry entries : {len(entries)}")
        print(f"downloaded       : {len(rec['downloaded'])}")
        print(f"unchanged (304)  : {len(rec['unchanged'])}")
        print(f"unavailable      : {len(rec['unavailable'])}")
        print(f"bytes sent so far: {web.bytes_sent:,}")

    day1 = collect(web, entries, work / "archive", validators)
    report("Day 1: nothing is known yet", day1)

    day2 = collect(web, entries, work / "archive", validators)
    report("Day 2: nothing changed overnight", day2)

    # Day 3: one school posts a result, and one site is unavailable.
    changed = next(e["url"] for e in entries if e["file"] == "2026-men-schedule.html"
                   and e["programme"] == "st-lambert")
    web.pages[changed] = web.pages[changed].replace("<td></td><td></td></tr>", "<td>W 2-1</td><td></td></tr>", 1)
    web.unavailable.add("https://athletics.dunmore.example")
    day3 = collect(web, entries, work / "archive", validators)
    report("Day 3: one page changed, one site unavailable", day3)
    print("changed :", day3["downloaded"])
    print("unavailable :", day3["unavailable"])

    (work / "run-record.json").write_text(json.dumps(day3, indent=1))
    ok = (len(day1["downloaded"]) == len(entries) and not day2["downloaded"]
          and day3["downloaded"] == [changed] and len(day3["unavailable"]) == 1)
    print("\nRESULT:", "incremental collection behaves as expected" if ok else "unexpected counts")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
