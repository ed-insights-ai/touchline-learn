#!/usr/bin/env python3
"""Module 1 lab: coverage, then incremental collection.

    python labs/m01_collect.py                 # part one: Friday's run, with a record
    python labs/m01_collect.py --incremental   # part two: three days of collection

Part one writes down what the run should collect before it fetches anything,
collects through a pretend web where one site does not answer, and compares
what arrived with what was expected, in pages and in matches. Every expected
page gets a state, and anything not complete gets a reason. A named gap does
not fail the run. No network is used: the "web" is an in-memory stand-in that
serves the archived sample pages and counts the bytes it sends.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from urllib.parse import urlsplit

from common import DATA, RAW, ROOT, Page, heading, load, workdir

SEASON, GENDER, CONFERENCE = 2026, "men", "PLC"
SCHEDULE = f"{SEASON}-{GENDER}-schedule.html"
DOWN = ["dunmore"]
TRIES = 3


class FakeWeb:
    """Serves pages by URL and honors If-None-Match, as a real server would."""

    def __init__(self, entries: list[dict]):
        self.pages = {e["url"]: (RAW / e["programme"] / e["file"]).read_text(encoding="utf-8") for e in entries}
        self.unavailable = {urlsplit(e["url"]).netloc for e in entries if e["programme"] in DOWN}
        self.bytes_sent = 0

    def get(self, url: str, etag: str | None = None):
        if urlsplit(url).netloc in self.unavailable:
            return 503, None, None
        body = self.pages[url]
        current = '"' + hashlib.sha256(body.encode()).hexdigest()[:16] + '"'
        if etag == current:
            return 304, None, current
        self.bytes_sent += len(body)
        return 200, body, current


def registry() -> list[dict]:
    """Where to ask for each page. Adding a school is a new entry, not new code."""
    return [{"programme": m.parent.name, "url": load(m)["requested_url"], "file": m.name.removesuffix(".meta.json")}
            for m in sorted(RAW.glob(f"*/{SEASON}-{GENDER}-*.html.meta.json"))]


def expected_set() -> dict:
    """What this run should collect, from sources kept outside the run."""
    stints = load(DATA / "reference" / "membership.json")["memberships"]
    schools = sorted(slug for slug, by in stints.items() for s in by[GENDER]
                     if s["conference"] == CONFERENCE and s["from_season"] <= SEASON <= s.get("to_season", SEASON))
    return {"season": SEASON, "gender": GENDER, "conference": CONFERENCE, "schools": schools,
            "pages": [f"{SEASON}/{GENDER}/{s}/schedule" for s in schools],
            "matches": len(schools) * (len(schools) - 1), "rule": "each member hosts every other member once"}


def member_rows(slug: str, body: str, names: dict) -> list[tuple]:
    """(date, host, visitor, result) for every row of this page against another member."""
    rows = []
    for row in (Page(body).table("Schedule") or {"rows": []})["rows"]:
        date, side, opponent, result = ([c["text"] for c in row["cells"]] + [""] * 4)[:4]
        if row["game"] and opponent in names:
            host, visitor = (slug, names[opponent]) if side == "vs" else (names[opponent], slug)
            rows.append((date, host, visitor, result))
    return rows


def scored(result: str) -> bool:
    return any(ch.isdigit() for ch in result)


def read(pages: dict, host_only: bool) -> tuple[dict, int]:
    """One (date, result) per host and visitor. A second meeting at the same host is outside the format."""
    seen: dict[tuple, str] = {}
    for slug, rows in pages.items():
        for date, host, visitor, result in rows:
            if (host == slug or not host_only) and (not seen.get((host, visitor, date)) or scored(result)):
                seen[(host, visitor, date)] = result
    matches, repeats = {}, 0
    for host, visitor, date in sorted(seen, key=lambda k: k[2]):
        repeats += (host, visitor) in matches
        matches.setdefault((host, visitor), (date, seen[(host, visitor, date)]))
    return matches, repeats


def friday(entries: list[dict]) -> int:
    work = workdir("m01")
    heading("Before fetching: what this run expects")
    expected = expected_set()
    schools, n = expected["schools"], len(expected["schools"])
    (work / "expected.json").write_text(json.dumps(expected, indent=1))
    print(f"schools  : {n} in the {SEASON} {GENDER}'s membership list")
    print(f"pages    : {len(expected['pages'])}, one schedule page for each school")
    print(f"matches  : {expected['matches']}, each school hosts the other {n - 1} once")

    heading("Friday's run")
    web, stamp = FakeWeb(entries), datetime.now(timezone.utc).isoformat(timespec="seconds")
    url_of = {e["programme"]: e["url"] for e in entries if e["file"] == SCHEDULE}
    programmes = load(DATA / "reference" / "programmes.json")["programmes"]
    names = {programmes[s]["name"]: s for s in schools}
    cells, pages = {}, {}
    for slug in schools:
        cell = {"collector": "m01-lab", "confirmed_at": stamp, "gender": GENDER, "layer": "schedule",
                "programme": slug, "season": SEASON}
        body = None
        for _ in range(TRIES if slug in url_of else 0):
            if body is None:
                body = web.get(url_of[slug])[1]
        if slug not in url_of:
            cell.update(state="no-collector", reason="no address is registered for this page")
        elif body is None:
            cell.update(state="unavailable", reason=f"site did not answer after {TRIES} tries")
        else:
            (work / f"{slug}-{SCHEDULE}").write_text(body, encoding="utf-8")
            pages[slug] = member_rows(slug, body, names)
            cell.update(state="complete" if pages[slug] else "empty", count=len(pages[slug]), source_url=url_of[slug])
            if not pages[slug]:
                cell["reason"] = "page saved and lists no matches against members"
        cells[f"{SEASON}/{GENDER}/{slug}/schedule"] = dict(sorted(cell.items()))
        print(f"{cell['state']:12} {slug:18} {cell.get('reason') or str(cell['count']) + ' rows against members'}")

    both, repeats = read(pages, host_only=False)
    host, _ = read(pages, host_only=True)
    finished = {k: v for k, v in both.items() if v[1]}
    noscore = {k: v for k, v in finished.items() if not scored(v[1])}
    with_score, host_read = len(finished) - len(noscore), sum(scored(r) for _, r in host.values())
    unexplained = [(a, b) for a in schools for b in schools if a != b and (a, b) not in both and {a, b} & set(pages)]

    heading("Expected against arrived")
    print(f"pages             : {len(pages)} of {n} saved")
    print(f"matches scheduled : {expected['matches']} by the format, {len(both)} listed on saved pages")
    if len(both) < expected["matches"]:
        print(f"on no saved page  : {expected['matches'] - len(both)}, so whether they were played is unknown")
    print(f"finished          : {len(finished)}, and {len(both) - len(finished)} still to play")
    print(f"with a score      : {with_score} on a saved page")
    print(f"host's page only  : {host_read} of {len(finished)} finished matches read")
    print(f"both pages        : {with_score} of {len(finished)} finished matches read")
    print(f"set aside         : {repeats} repeat meetings at the same host, outside the format")
    for a, b in unexplained:
        print(f"DISAGREE          : the format has {a} hosting {b}, and no saved page lists it")

    heading("Named gaps")
    for cell in (c for c in cells.values() if c["state"] != "complete"):
        print(f"{cell['programme']} schedule page: {cell['state']}, {cell['reason']}")
        print(f"  read from the host's page only, its {sum(h == cell['programme'] for h, _ in finished)}"
              " finished home matches are missing")
    for (h, v), (date, result) in sorted(noscore.items(), key=lambda kv: kv[1]):
        print(f"{date} {programmes[h]['name']} v {programmes[v]['name']}: {result.lower()}, no score on any saved page")

    record = {"schema": "touchline.coverage/1", "updated_at": stamp, "cells": cells,
              "matches": {"expected": expected["matches"], "listed": len(both), "finished": len(finished),
                          "with_score": with_score, "read_host_only": host_read,
                          "no_score": [{"date": d, "home": h, "away": v} for (h, v), (d, _) in noscore.items()]}}
    (work / "coverage.json").write_text(json.dumps(record, indent=1))
    states = [c["state"] for c in cells.values()]
    print(f"\nwritten : {(work / 'coverage.json').relative_to(ROOT)}, "
          + ", ".join(f"{states.count(s)} {s}" for s in dict.fromkeys(states)))
    gaps = sum(s != "complete" for s in states) + len(noscore)
    if unexplained:
        print(f"\nRESULT: the format and the pages disagree on {len(unexplained)} of {expected['matches']} pairings")
        return 1
    print(f"\nRESULT: record written, {len(pages)} of {n} pages saved, {host_read} of {len(finished)} finished matches "
          f"read host-only, {with_score} from both pages, {gaps} {'gap' if gaps == 1 else 'gaps'} named")
    return 0


def incremental(entries: list[dict]) -> int:
    """Part two: send back each saved page's ETag, and the site answers 304 when nothing changed."""
    work, web, validators = workdir("m01-incremental"), FakeWeb(entries), {}
    down, web.unavailable = web.unavailable, set()

    def day(title: str) -> dict:
        rec = {"downloaded": [], "unchanged": [], "unavailable": []}
        for e in entries:
            status, body, etag = web.get(e["url"], validators.get(e["url"]))
            if status == 200:
                path = work / "archive" / e["programme"] / e["file"]
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(body, encoding="utf-8")  # archive first, parse later
                validators[e["url"]] = etag
            rec[{200: "downloaded", 304: "unchanged", 503: "unavailable"}[status]].append(e["url"])
        heading(title)
        print(f"registry entries : {len(entries)}")
        for key, found in rec.items():
            print(f"{key + (' (304)' if key == 'unchanged' else ''):17}: {len(found)}")
        print(f"bytes sent so far: {web.bytes_sent:,}")
        return rec

    day1 = day("Day 1: nothing is known yet")
    day2 = day("Day 2: nothing changed overnight")
    changed = next(e["url"] for e in entries if e["file"] == SCHEDULE and e["programme"] == "st-lambert")
    web.pages[changed] = web.pages[changed].replace("<td></td><td></td></tr>", "<td>W 2-1</td><td></td></tr>", 1)
    web.unavailable = down
    day3 = day("Day 3: one page changed, one site unavailable")
    print("changed :", day3["downloaded"])
    print("unavailable :", day3["unavailable"])

    (work / "run-record.json").write_text(json.dumps(day3, indent=1))
    ok = (len(day1["downloaded"]) == len(entries) and not day2["downloaded"]
          and day3["downloaded"] == [changed] and len(day3["unavailable"]) == 1)
    print("\nRESULT:", "incremental collection behaves as expected" if ok else "unexpected counts")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--incremental", action="store_true", help="part two: three days of conditional requests")
    return incremental(registry()) if ap.parse_args().incremental else friday(registry())


if __name__ == "__main__":
    sys.exit(main())
