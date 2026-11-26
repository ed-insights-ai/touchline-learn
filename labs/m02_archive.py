#!/usr/bin/env python3
"""Module 2 lab: rebuild Friday's table from the archive.

    python labs/m02_archive.py                        # replay Friday's capture with the fixed rule
    python labs/m02_archive.py --tuesday              # compare against a re-fetch instead
    python labs/m02_archive.py --missing hartwell-tech

On Tuesday, Kick's parser tidied school names with a rule that turned every
"St." into "State", so the table read "State Lambert". This lab rebuilds the
table from the pages Friday's run saved, listed in that run's capture manifest,
with the fixed rule. It makes no network request, and it counts the attempts
with a counter that is first shown to catch one. Each parsed file records the
fingerprint of the parser and config that wrote it and the content hash of the
page it read, so a rerun knows what is stale without being told.
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

from common import DATA, ROOT, SAMPLE, Page, heading, load, workdir

SEASON, CONFERENCE = 2026, "PLC"
FRIDAY = SAMPLE / "manifests" / "2026-11-20-friday.json"
TUESDAY = SAMPLE / "manifests" / "2026-11-24-tuesday.json"
CONFIG = [DATA / "reference" / "aliases.json", DATA / "reference" / "membership.json"]
COLUMNS = ("place", "name", "p", "w", "d", "l", "gf", "ga", "gd", "pts")


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


def tidy_v1(name: str) -> str:
    return name.replace("St.", "State")


def tidy_v2(name: str) -> str:
    """"St." before another word is Saint. At the end of a name it is State."""
    name = re.sub(r"\bSt\.(?=\s+\w)", "Saint", name)
    return re.sub(r"\bSt\.$", "State", name)


def read_schedule(source: str, tidy, names: dict) -> list[dict]:
    """Every row of a schedule page: fixture id, date, side, opponent's slug, opponent as shown, result."""
    rows = []
    for row in Page(source).table("Schedule")["rows"][1:]:
        date, side, opponent, result = (c["text"] for c in row["cells"][:4])
        rows.append({"fixture": row["game"], "date": date, "side": side, "opponent": names[opponent],
                     "shown": tidy(opponent), "result": result})
    return rows


def fingerprint(tidy) -> str:
    """The parser's source plus every config input that shapes what it writes."""
    h = hashlib.sha256()
    for part in (Page, read_schedule, tidy):
        h.update(inspect.getsource(part).encode())
    for path in CONFIG:
        h.update(path.read_bytes())
    h.update(str(SEASON).encode())
    return h.hexdigest()[:12]


def build_revision() -> str:
    """The git blob id of this file: the exact build code, without needing git."""
    body = Path(__file__).read_bytes()
    return hashlib.sha1(b"blob %d\0" % len(body) + body).hexdigest()[:12]


def sha256(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def alias_index() -> dict[str, str]:
    return {name: slug for slug, names in load(CONFIG[0]).items() for name in names}


def members() -> list[str]:
    stints = load(CONFIG[1])["memberships"]
    return sorted(s for s, by in stints.items() for m in by["men"]
                  if m["conference"] == CONFERENCE and m["from_season"] <= SEASON <= m.get("to_season", SEASON))


def replay(manifest: dict, root: Path, tidy, parsed: Path) -> dict:
    """Parse every saved schedule the manifest lists whose lineage is stale. Never fetches."""
    fp, names, done, skipped, read, verified = fingerprint(tidy), alias_index(), [], [], [], []
    for entry in (p for p in manifest["pages"] if p["kind"] == "schedule" and p["state"] == "saved"):
        page = root / entry["path"]
        if not page.exists():
            continue
        body = page.read_bytes()
        read.append(entry["programme"])
        if sha256(body) == entry["sha256"]:
            verified.append(entry["programme"])
        lineage = {"fingerprint": fp, "content_sha256": sha256(body)}
        out, side = parsed / f"{entry['programme']}.json", parsed / f"{entry['programme']}.lineage.json"
        if side.exists() and load(side) == lineage:
            skipped.append(entry["programme"])
            continue
        out.write_text(json.dumps(read_schedule(body.decode("utf-8"), tidy, names), indent=1))
        side.write_text(json.dumps(lineage))
        done.append(entry["programme"])
    return {"fingerprint": fp, "reparsed": done, "skipped": skipped, "read": read, "verified": verified}


def score(result: str) -> tuple[int, int] | None:
    found = re.fullmatch(r"[WLT] (\d+)-(\d+)", result)
    return (int(found.group(1)), int(found.group(2))) if found else None


def standings(parsed: Path, slugs: list[str]) -> dict:
    """The conference table, keyed by slug, from parsed rows matched by fixture id."""
    matches: dict[str, dict] = {}
    shown: dict[str, set] = {}
    for f in sorted(parsed.glob("*.json")):
        if f.name.endswith(".lineage.json"):
            continue
        slug = f.stem
        for r in load(f):
            if r["opponent"] not in slugs:
                continue
            shown.setdefault(r["opponent"], set()).add(r["shown"])
            host, visitor = (slug, r["opponent"]) if r["side"] == "vs" else (r["opponent"], slug)
            m = matches.setdefault(r["fixture"], {"date": r["date"], "host": host, "visitor": visitor,
                                                  "finished": False, "score": None})
            assert (m["date"], m["host"], m["visitor"]) == (r["date"], host, visitor), r["fixture"]
            m["finished"] |= bool(r["result"])
            mine = score(r["result"])
            if mine:
                got = mine if r["side"] == "vs" else mine[::-1]
                assert m["score"] in (None, got), f"pages disagree on fixture {r['fixture']}"
                m["score"] = got
    # The format: each member hosts every other once. A later meeting at the same host is postseason.
    regular: dict[tuple, str] = {}
    for fid, m in sorted(matches.items(), key=lambda kv: (kv[1]["date"], kv[0])):
        regular.setdefault((m["host"], m["visitor"]), fid)
    games = [matches[fid] for fid in regular.values()]
    rows = {s: {"slug": s, "name": None, "p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0} for s in slugs}
    for s, names in shown.items():
        assert len(names) == 1, f"{s} is shown as {sorted(names)}"
        rows[s]["name"] = names.pop()
    for m in games:
        if not m["score"]:
            continue
        for side, (gf, ga) in ((m["host"], m["score"]), (m["visitor"], m["score"][::-1])):
            r = rows[side]
            r["p"] += 1
            r["gf"] += gf
            r["ga"] += ga
            r["w" if gf > ga else "d" if gf == ga else "l"] += 1
    table = sorted(rows.values(), key=lambda r: (-(3 * r["w"] + r["d"]), -(r["gf"] - r["ga"]), r["slug"]))
    for i, r in enumerate(table):
        r.update(place=i + 1, gd=r["gf"] - r["ga"], pts=3 * r["w"] + r["d"])
    finished = [m for m in games if m["finished"]]
    return {"rows": table, "expected": len(slugs) * (len(slugs) - 1), "listed": len(games),
            "finished": len(finished), "scored": sum(1 for m in finished if m["score"]),
            "postseason": sorted(fid for fid in matches if fid not in regular.values()),
            "no_score": sorted((m["date"], m["host"], m["visitor"]) for m in finished if not m["score"])}


def caption(t: dict) -> str:
    return f"{t['scored']} of {t['finished']} finished matches"


def diff(a: dict, b: dict) -> list[tuple]:
    """(slug, column, before, after) for every cell that differs, by slug."""
    rows_a = {r["slug"]: r for r in a["rows"]}
    return [(r["slug"], c, rows_a[r["slug"]][c], r[c]) for r in b["rows"] for c in COLUMNS
            if rows_a[r["slug"]][c] != r[c]]


def show(cell) -> str:
    return repr(cell) if isinstance(cell, str) else str(cell)


def print_table(t: dict) -> None:
    print(f"{'#':>2}  {'team':18} {'P':>2} {'W':>2} {'D':>2} {'L':>2} {'GF':>3} {'GA':>3} {'GD':>4} {'Pts':>4}")
    for r in t["rows"]:
        print(f"{r['place']:>2}  {r['name']:18} {r['p']:>2} {r['w']:>2} {r['d']:>2} {r['l']:>2} "
              f"{r['gf']:>3} {r['ga']:>3} {r['gd']:>+4} {r['pts']:>4}")
    print(f"    {caption(t)}; {t['expected']} expected by the format")


def check_manifest(manifest: dict, root: Path) -> tuple[int, int]:
    saved = [p for p in manifest["pages"] if p["state"] == "saved"]
    same = sum(1 for p in saved if (root / p["path"]).exists() and sha256((root / p["path"]).read_bytes()) == p["sha256"])
    return same, len(saved)


def describe_manifest(manifest: dict, path: Path, root: Path) -> dict:
    pages = manifest["pages"]
    schedules = [p for p in pages if p["kind"] == "schedule"]
    saved = [p for p in schedules if p["state"] == "saved"]
    boxes = [p for p in pages if p["kind"] == "box_score" and p["state"] == "saved"]
    same, total = check_manifest(manifest, root)
    print(f"manifest       : {path.relative_to(ROOT)}, run {manifest['run']}")
    print(f"fetched        : {manifest['started_at']} to {manifest['finished_at']}")
    print(f"requested      : {manifest['requested']} pages, {manifest['saved']} saved")
    print(f"schedules      : {len(saved)} saved of {len(schedules)} requested")
    for p in schedules:
        if p["state"] != "saved":
            print(f"  {p['programme']:14}: {p['state']}, {p['reason']} (listed, not absent)")
    if boxes:
        print(f"box scores     : {len(boxes)} saved, kept for match detail; the table does not read them")
    print(f"content hashes : {same} of {total} saved pages on disk match the manifest")
    return {"schedules": len(saved), "boxes": len(boxes), "hashes_ok": same == total}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tuesday", action="store_true", help="compare a re-fetch (Tuesday's pages) instead of a replay")
    ap.add_argument("--missing", metavar="SCHOOL", help="replay a scratch copy of the archive without this school's page")
    args = ap.parse_args()

    work, slugs = workdir("m02"), members()
    friday, root = load(FRIDAY), SAMPLE
    if args.missing:
        listed = {p["programme"] for p in friday["pages"] if p["kind"] == "schedule" and p["state"] == "saved"}
        if args.missing not in listed:
            print(f"RESULT: could not run, Friday's manifest saved no page for {args.missing!r}")
            return 2
        root = work / "archive"
        for p in friday["pages"]:
            if p["state"] == "saved" and p["programme"] != args.missing:
                (root / p["path"]).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(SAMPLE / p["path"], root / p["path"])

    heading("Capture manifest: Friday's run")
    seen = describe_manifest(friday, FRIDAY, root)

    with count_network() as attempts:
        try:
            socket.create_connection(("archive.invalid", 80), timeout=1)
        except OSError:
            pass
        counter_works = len(attempts) == 1
        print(f"network counter: {'caught a test request' if counter_works else 'FAILED its test request'}")
        attempts.clear()

        heading("Replay 1: Tuesday's parser, tidy_v1")
        tuesday_dir = work / "parsed"
        tuesday_dir.mkdir()
        r1 = replay(friday, root, tidy_v1, tuesday_dir)
        print(f"fingerprint    : {r1['fingerprint']}")
        print(f"re-parsed      : {len(r1['reparsed'])}, skipped {len(r1['skipped'])}")
        rows = [r for f in tuesday_dir.glob("*.json") if not f.name.endswith(".lineage.json") for r in load(f)]
        wrong = sorted({r["shown"] for r in rows if r["shown"].startswith("State ")})
        print("names that cannot be right:", wrong)
        table_a = standings(tuesday_dir, slugs)
        print_table(table_a)

        heading("Replay 2: same parser, same pages")
        r2 = replay(friday, root, tidy_v1, tuesday_dir)
        print(f"re-parsed      : {len(r2['reparsed'])}, skipped {len(r2['skipped'])}: fingerprint and content hash unchanged")

        heading("Replay 3: fixed parser, tidy_v2")
        rebuilt_dir = work / "rebuilt"
        shutil.copytree(tuesday_dir, rebuilt_dir)
        r3 = replay(friday, root, tidy_v2, rebuilt_dir)
        print(f"fingerprint    : {r1['fingerprint']} -> {r3['fingerprint']}")
        print(f"re-parsed      : {len(r3['reparsed'])}, skipped {len(r3['skipped'])}")
        fixed = sorted({r["shown"] for f in rebuilt_dir.glob("*.json") if not f.name.endswith(".lineage.json")
                        for r in load(f) if r["shown"].startswith("Saint ")})
        print("Saint schools now:", fixed)
        table_b = standings(rebuilt_dir, slugs)
        print_table(table_b)

        compare, label = table_b, "the rebuild"
        if args.tuesday:
            heading("Re-fetch: Tuesday's capture stands in for asking every site again, tidy_v2")
            refetch_dir = work / "refetched"
            refetch_dir.mkdir()
            tuesday = load(TUESDAY)
            describe_manifest(tuesday, TUESDAY, SAMPLE)
            replay(tuesday, SAMPLE, tidy_v2, refetch_dir)
            compare, label = standings(refetch_dir, slugs), "the re-fetch"
            print_table(compare)
        requests = len(attempts)

    changes = diff(table_a, compare)
    name_of = {r["slug"]: r["name"] for r in compare["rows"]}
    by_row: dict[str, list[str]] = {}
    for slug, col, before, after in changes:
        by_row.setdefault(slug, []).append(f"{col} {show(before)} -> {show(after)}")
    gaps = [f"{d} {name_of[h]} v {name_of[v]} finished with no score" for d, h, v in compare["no_score"]]
    gaps += [f"{name_of[p['programme']]}'s page {p['state']}, its home results read from visitors' pages"
             for p in friday["pages"] if p["state"] != "saved"]
    if args.tuesday:
        heading("Confounded diff: Tuesday's table against the re-fetch")
        print("inputs changed : parser code (tidy_v1 -> tidy_v2) and pages (Friday's -> Tuesday's)")
        print(f"table          : {caption(table_a)} -> {caption(compare)}")
        print(f"cells changed  : {len(changes)} in {len(by_row)} rows")
        for slug, cells in by_row.items():
            print(f"  {name_of[slug]:15} {', '.join(cells)}")
        print("cause per cell : unknown from this comparison; two inputs changed at once")
        print(f"\nRESULT: confounded, {len(changes)} cells changed in {len(by_row)} rows and two inputs changed, "
              "so no cell can be traced to one cause")
        return 1

    heading("Replay report: Tuesday's table rebuilt from Friday's pages")
    print(f"manifest       : {FRIDAY.relative_to(ROOT)}")
    print(f"replayed       : {len(r3['read'])} of the {seen['schedules']} schedules it lists as saved, "
          f"{len(r3['verified'])} matching their content hash")
    for p in friday["pages"]:
        if p["state"] != "saved":
            print(f"listed         : {name_of[p['programme']]}, {p['state']}: {p['reason']}")
    print(f"requests       : {requests}, counted by a counter that caught a test request" if counter_works
          else f"requests       : {requests}, but the counter failed its test, so this proves nothing")
    print(f"fingerprint    : {r3['fingerprint']}, the fixed parser (source, aliases.json, membership.json, "
          f"season {SEASON})")
    print(f"build revision : {build_revision()}, git blob of labs/{Path(__file__).name}")
    print(f"table          : {caption(table_a)} before and {caption(compare)} after")
    print(f"cells changed  : {len(changes)}")
    for slug, cells in by_row.items():
        print(f"  {name_of[slug]:15} {', '.join(cells)}: the tidy rule, the only input that changed")
    unchanged = len(COLUMNS) * len(compare["rows"]) - len(changes)
    print(f"unchanged      : the other {unchanged} cells, every place and number")
    for gap in gaps:
        print(f"named gap      : {gap}")

    if args.missing:
        print(f"\nRESULT: replayed {len(r3['read'])} of the {seen['schedules']} schedules the manifest lists; "
              f"{args.missing}'s page is missing and the replay did not stop")
        return 1
    only_name = [(s, c) for s, c, _, _ in changes] == [("st-lambert", "name")]
    ok = (seen["schedules"] == 7 and len(r3["verified"]) == 7 and seen["hashes_ok"] and counter_works
          and requests == 0 and wrong == ["State Brendan", "State Lambert"] and not r2["reparsed"]
          and len(r3["reparsed"]) == 7 and only_name and table_a["no_score"] == table_b["no_score"]
          and (table_a["scored"], table_a["finished"]) == (53, 54))
    print("\nRESULT:", "rebuilt by replay with 0 requests; only Saint Lambert's name changed" if ok
          else "unexpected result")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
