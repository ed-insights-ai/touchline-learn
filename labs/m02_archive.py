#!/usr/bin/env python3
"""Module 2 lab: rebuild Friday's table from the archive.

    python labs/m02_archive.py                        # replay Friday's capture with the fixed parser
    python labs/m02_archive.py --tuesday              # compare against a re-fetch instead
    python labs/m02_archive.py --missing hartwell-tech

On Tuesday, Kick's parser tidied school names with a rule that turned every
"St." into "State", so the table read "State Lambert". This lab rebuilds the
table from the pages Friday's run saved, listed in that run's capture manifest,
with the fixed parser. It makes no network request, and it counts the attempts
with a counter that is first shown to catch two. Each parsed file records the
fingerprint of the parser and config that wrote it and the content hash of the
page it read, so a rerun knows what is stale without being told.

The two parser revisions are whole modules, m02_parser_tuesday.py and
m02_parser_fixed.py. A fingerprint hashes the whole module, so any edit to it,
even a comment, makes every file it wrote stale.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import socket
import sys
from contextlib import contextmanager
from pathlib import Path

import m02_parser_fixed
import m02_parser_tuesday
from common import DATA, ROOT, SAMPLE, heading, load, workdir

SEASON, CONFERENCE = 2026, "PLC"
FRIDAY = SAMPLE / "manifests" / "2026-11-20-friday.json"
TUESDAY = SAMPLE / "manifests" / "2026-11-24-tuesday.json"
CONFIG = [DATA / "reference" / "aliases.json", DATA / "reference" / "membership.json"]
SHARED = Path(__file__).with_name("common.py")
COLUMNS = ("place", "name", "p", "w", "d", "l", "gf", "ga", "gd", "pts")


@contextmanager
def count_network():
    """Counts every name lookup and every socket connect or send, and stops each one."""
    attempts: list[str] = []

    def stop(*args, **kwargs):
        attempts.append(str(args[-1] if args else kwargs))
        raise OSError("this lab does not use the network")
    names = [(socket, "getaddrinfo"), (socket, "gethostbyname"), (socket, "gethostbyname_ex"),
             (socket, "gethostbyaddr"), (socket, "getnameinfo"), (socket.socket, "connect"),
             (socket.socket, "connect_ex"), (socket.socket, "sendto"), (socket.socket, "sendmsg")]
    patched = [(owner, name) for owner, name in names if hasattr(owner, name)]
    real = [(owner, name, getattr(owner, name)) for owner, name in patched]
    for owner, name in patched:
        setattr(owner, name, stop)
    try:
        yield attempts
    finally:
        for owner, name, fn in real:
            setattr(owner, name, fn)


def test_requests() -> None:
    """Two requests that must be counted: one by host name, one straight to an address."""
    try:
        socket.create_connection(("archive.invalid", 80), timeout=1)
    except OSError:
        pass
    with socket.socket() as s:
        try:
            s.connect_ex(("127.0.0.1", 9))
        except OSError:
            pass


def fingerprint(parser) -> str:
    """The parser's whole module, the shared page reader, and the build's config: aliases, membership and season."""
    h = hashlib.sha256()
    for path in (Path(parser.__file__), SHARED, *CONFIG):
        h.update(path.read_bytes())
    h.update(str(SEASON).encode())
    return h.hexdigest()[:12]


def build_revision() -> str:
    """The git blob id of this file: the exact build code, without needing git."""
    body = Path(__file__).read_bytes()
    return hashlib.sha1(b"blob %d\0" % len(body) + body).hexdigest()[:12]


def saved_pages(n: int) -> str:
    return f"{n} saved page{'' if n == 1 else 's'}"


def sha256(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def members() -> list[str]:
    stints = load(CONFIG[1])["memberships"]
    return sorted(s for s, by in stints.items() for m in by["men"]
                  if m["conference"] == CONFERENCE and m["from_season"] <= SEASON <= m.get("to_season", SEASON))


def replay(manifest: dict, root: Path, parser, parsed: Path) -> dict:
    """Parse every saved schedule the manifest lists whose lineage is stale. Never fetches.

    A page whose bytes differ from the manifest's hash is refused: it is not the evidence the run recorded.
    A page missing from the archive is skipped without a word (the --missing exercise asks what it should do).
    """
    fp = fingerprint(parser)
    out = {"fingerprint": fp, "reparsed": [], "skipped": [], "read": [], "refused": []}
    for entry in (p for p in manifest["pages"] if p["kind"] == "schedule" and p["state"] == "saved"):
        page = root / entry["path"]
        if not page.exists():
            continue
        body = page.read_bytes()
        if sha256(body) != entry["sha256"]:
            out["refused"].append(entry["programme"])
            continue
        out["read"].append(entry["programme"])
        lineage = {"fingerprint": fp, "content_sha256": entry["sha256"]}
        rows, side = parsed / f"{entry['programme']}.json", parsed / f"{entry['programme']}.lineage.json"
        if rows.exists() and side.exists() and load(side) == lineage:
            out["skipped"].append(entry["programme"])
            continue
        rows.write_text(json.dumps(parser.read_schedule(body.decode("utf-8")), indent=1))
        side.write_text(json.dumps(lineage))
        out["reparsed"].append(entry["programme"])
    return out


def parsed_rows(parsed: Path, pages: list[str]):
    """The parsed rows of exactly the pages this replay read, never a leftover file."""
    for slug in sorted(pages):
        yield slug, load(parsed / f"{slug}.json")


def require(ok: bool, why: str) -> None:
    if not ok:
        raise ValueError(why)


def score(result: str) -> tuple[int, int] | None:
    found = re.fullmatch(r"[WLT] (\d+)-(\d+)", result)
    return (int(found.group(1)), int(found.group(2))) if found else None


def standings(parsed: Path, pages: list[str], slugs: list[str]) -> dict:
    """The conference table, keyed by slug, from parsed rows matched by fixture id."""
    matches: dict[str, dict] = {}
    shown: dict[str, set] = {}
    for slug, rows in parsed_rows(parsed, pages):
        for r in rows:
            if r["opponent"] not in slugs:
                continue
            shown.setdefault(r["opponent"], set()).add(r["shown"])
            host, visitor = (slug, r["opponent"]) if r["side"] == "vs" else (r["opponent"], slug)
            m = matches.setdefault(r["fixture"], {"date": r["date"], "host": host, "visitor": visitor,
                                                  "finished": False, "score": None})
            require((m["date"], m["host"], m["visitor"]) == (r["date"], host, visitor), f"pages disagree on fixture {r['fixture']}")
            m["finished"] |= bool(r["result"])
            mine = score(r["result"])
            if mine:
                got = mine if r["side"] == "vs" else mine[::-1]
                require(m["score"] in (None, got), f"pages disagree on the score of fixture {r['fixture']}")
                m["score"] = got
    # The format: each member hosts every other once. A later meeting at the same host is postseason.
    regular: dict[tuple, str] = {}
    for fid, m in sorted(matches.items(), key=lambda kv: (kv[1]["date"], kv[0])):
        regular.setdefault((m["host"], m["visitor"]), fid)
    games = [matches[fid] for fid in regular.values()]
    rows = {s: {"slug": s, "name": None, "p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0} for s in slugs}
    for s, names in shown.items():
        require(len(names) == 1, f"{s} is shown as {sorted(names)}")
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
            "hosted": {s: sum(1 for m in games if m["host"] == s) for s in slugs},
            "finished": len(finished), "scored": sum(1 for m in finished if m["score"]),
            "postseason": sorted(fid for fid in matches if fid not in regular.values()),
            "no_score": sorted((m["date"], m["host"], m["visitor"]) for m in finished if not m["score"])}


def output_hash(t: dict) -> str:
    return sha256(json.dumps(t["rows"], sort_keys=True).encode())[:12]


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


def describe_manifest(manifest: dict, path: Path, root: Path) -> dict:
    pages = manifest["pages"]
    schedules = [p for p in pages if p["kind"] == "schedule"]
    saved = [p for p in schedules if p["state"] == "saved"]
    boxes = [p for p in pages if p["kind"] == "box_score" and p["state"] == "saved"]
    kept = [p for p in pages if p["state"] == "saved"]
    problems = ["it lists a page twice"] if len({(p["kind"], p.get("fixture", p["programme"])) for p in pages}) != len(pages) else []
    problems += [f"{p['programme']} {p['kind']} has state {p['state']!r}" for p in pages if p["state"] not in ("saved", "unavailable")]
    problems += [f"{p['programme']} {p['kind']} is unavailable with no reason" for p in pages
                 if p["state"] == "unavailable" and not p.get("reason")]
    if (manifest["requested"], manifest["saved"]) != (len(pages), len(kept)):
        problems.append("its requested and saved counts disagree with its pages")
    if sorted(manifest["unavailable"]) != sorted(p["programme"] for p in pages if p["state"] == "unavailable"):
        problems.append("its unavailable list disagrees with its pages")
    on_disk = [p for p in kept if (root / p["path"]).exists()]
    same = sum(1 for p in on_disk if sha256((root / p["path"]).read_bytes()) == p["sha256"])
    print(f"manifest       : {path.relative_to(ROOT)}, run {manifest['run']}")
    print(f"fetched        : {manifest['started_at']} to {manifest['finished_at']}")
    print(f"requested      : {manifest['requested']} pages, {manifest['saved']} saved")
    print(f"schedules      : {len(saved)} saved of {len(schedules)} requested")
    for p in schedules:
        if p["state"] != "saved":
            print(f"  {p['programme']:14}: {p['state']}, {p['reason']} (listed, not absent)")
    if boxes:
        print(f"box scores     : {len(boxes)} saved, kept for match detail; the table does not read them")
    print(f"content hashes : {same} of {len(kept)} saved pages on disk match the manifest")
    return {"schedules": len(saved), "boxes": len(boxes), "hashes_ok": same == len(kept) and not problems,
            "altered": len(on_disk) - same, "problems": problems,
            "missing": [p for p in kept if not (root / p["path"]).exists()]}


def main() -> int:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--tuesday", action="store_true", help="compare a re-fetch (Tuesday's pages) instead of a replay")
    mode.add_argument("--missing", metavar="SCHOOL",
                      help="replay a scratch copy of the archive without this school's schedule page")
    args = ap.parse_args()

    work, slugs = workdir("m02"), members()
    friday, root = load(FRIDAY), SAMPLE
    if args.missing:
        listed = {p["programme"] for p in friday["pages"] if p["kind"] == "schedule" and p["state"] == "saved"}
        if args.missing not in listed:
            print(f"RESULT: could not run, Friday's manifest saved no schedule page for {args.missing!r}")
            return 2
        root = work / "archive"
        for p in friday["pages"]:
            if p["state"] == "saved" and not (p["kind"] == "schedule" and p["programme"] == args.missing):
                (root / p["path"]).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(SAMPLE / p["path"], root / p["path"])

    heading("Capture manifest: Friday's run")
    seen = describe_manifest(friday, FRIDAY, root)
    lost = [p["path"] for p in seen["missing"] if not (args.missing and p["kind"] == "schedule" and p["programme"] == args.missing)]
    if seen["problems"] or seen["altered"] or lost:
        why = seen["problems"] + ([f"{saved_pages(seen['altered'])} not matching the manifest's hash"] if seen["altered"] else [])
        why += [f"{saved_pages(len(lost))} missing from the archive"] if lost else []
        print(f"\nRESULT: could not run, {'; '.join(why)}")
        return 2

    with count_network() as attempts:
        test_requests()
        counter_works = len(attempts) == 2
        print(f"network counter: {'caught 2 of 2 test requests' if counter_works else 'FAILED its test requests'}"
              " (a name lookup and a direct connection)")
        attempts.clear()

        heading("Replay 1: Tuesday's parser, labs/m02_parser_tuesday.py")
        tuesday_dir = work / "parsed"
        tuesday_dir.mkdir()
        r1 = replay(friday, root, m02_parser_tuesday, tuesday_dir)
        print(f"fingerprint    : {r1['fingerprint']}")
        print(f"re-parsed      : {len(r1['reparsed'])}, skipped {len(r1['skipped'])}")
        wrong = sorted({r["shown"] for _, rows in parsed_rows(tuesday_dir, r1["read"]) for r in rows
                        if r["shown"].startswith("State ")})
        print("names that cannot be right:", wrong)
        table_a = standings(tuesday_dir, r1["read"], slugs)
        print_table(table_a)

        heading("Replay 2: same parser, same pages")
        r2 = replay(friday, root, m02_parser_tuesday, tuesday_dir)
        print(f"re-parsed      : {len(r2['reparsed'])}, skipped {len(r2['skipped'])}: fingerprint and content hash unchanged")

        heading("Replay 3: fixed parser, labs/m02_parser_fixed.py")
        rebuilt_dir = work / "rebuilt"
        shutil.copytree(tuesday_dir, rebuilt_dir)
        r3 = replay(friday, root, m02_parser_fixed, rebuilt_dir)
        print(f"fingerprint    : {r1['fingerprint']} -> {r3['fingerprint']}")
        print(f"re-parsed      : {len(r3['reparsed'])}, skipped {len(r3['skipped'])}")
        fixed = sorted({r["shown"] for _, rows in parsed_rows(rebuilt_dir, r3["read"]) for r in rows
                        if r["shown"].startswith("Saint ")})
        print("Saint schools now:", fixed)
        table_b = standings(rebuilt_dir, r3["read"], slugs)
        print_table(table_b)
        rerun_dir = work / "rerun"
        rerun_dir.mkdir()
        rerun = standings(rerun_dir, replay(friday, root, m02_parser_fixed, rerun_dir)["read"], slugs)
        same_output = output_hash(rerun) == output_hash(table_b)

        compare = table_b
        if args.tuesday:
            heading("Re-fetch: Tuesday's capture stands in for asking every site again, fixed parser")
            refetch_dir = work / "refetched"
            refetch_dir.mkdir()
            tuesday = load(TUESDAY)
            fresh = describe_manifest(tuesday, TUESDAY, SAMPLE)
            r4 = replay(tuesday, SAMPLE, m02_parser_fixed, refetch_dir)
            why = fresh["problems"] + ([f"{saved_pages(fresh['altered'])} not matching the manifest's hash"] if fresh["altered"] else [])
            why += [f"{saved_pages(len(fresh['missing']))} missing from the capture"] if fresh["missing"] else []
            if why or r4["refused"]:
                print(f"\nRESULT: could not run, Tuesday's capture: {'; '.join(why) or 'a page was refused'}")
                return 2
            compare = standings(refetch_dir, r4["read"], slugs)
            print_table(compare)
        requests = len(attempts)
    if args.tuesday and (not counter_works or requests):
        print(f"\nRESULT: could not run, the replay made {requests} requests or the counter failed its test")
        return 2

    changes = diff(table_a, compare)
    name_of = {r["slug"]: r["name"] for r in compare["rows"]}
    by_row: dict[str, list[str]] = {}
    for slug, col, before, after in changes:
        by_row.setdefault(slug, []).append(f"{col} {show(before)} -> {show(after)}")
    gaps = [f"{d} {name_of[h]} v {name_of[v]} finished with no score" for d, h, v in compare["no_score"]]
    for p in friday["pages"]:
        if p["state"] != "saved":
            found, due = compare["hosted"][p["programme"]], len(slugs) - 1
            gaps.append(f"{name_of[p['programme']]}'s page {p['state']}, its home results read from visitors' pages" if found == due
                        else f"{name_of[p['programme']]}'s page {p['state']}, {found} of its {due} home matches read from "
                             f"visitors' pages, {due - found} with no page on either side")
    if args.tuesday:
        heading("Confounded diff: Tuesday's table against the re-fetch")
        print("inputs changed : parser code (Tuesday's -> fixed) and pages (Friday's -> Tuesday's)")
        print(f"table          : {caption(table_a)} -> {caption(compare)}")
        print(f"cells changed  : {len(changes)} in {len(by_row)} rows")
        for slug, cells in by_row.items():
            print(f"  {name_of[slug]:15} {', '.join(cells)}")
        print("cause per cell : unknown from this comparison alone; two inputs changed at once")
        print(f"\nRESULT: confounded, {len(changes)} cells changed in {len(by_row)} rows and two inputs changed, "
              "so this comparison alone cannot trace a cell to one cause")
        return 1

    heading("Replay report: Friday's pages rebuilt with the fixed parser")
    print(f"manifest       : {FRIDAY.relative_to(ROOT)}")
    print(f"replayed       : {len(r3['read'])} of the {seen['schedules']} schedules it lists as saved, "
          f"each matching its content hash")
    if r3["refused"]:
        print(f"refused        : {', '.join(r3['refused'])}, bytes differ from the manifest's hash")
    for p in friday["pages"]:
        if p["state"] != "saved":
            print(f"listed         : {name_of[p['programme']]}, {p['state']}: {p['reason']}")
    print(f"requests       : {requests}, counted by a counter that caught 2 of 2 test requests" if counter_works
          else f"requests       : {requests}, but the counter failed its test, so this proves nothing")
    print(f"fingerprint    : {r3['fingerprint']}, the fixed parser (was {r1['fingerprint']} on Tuesday)")
    print("  covers       : labs/m02_parser_fixed.py, labs/common.py, aliases.json, membership.json, "
          f"season {SEASON}")
    print(f"build revision : {build_revision()}, git blob of labs/{Path(__file__).name}")
    before = "the old parser on this archive" if args.missing else "Tuesday's"
    print(f"tables         : {before} {caption(table_a)}; rebuild {caption(compare)}")
    print(f"cells changed  : {len(changes)}")
    for slug, cells in by_row.items():
        print(f"  {name_of[slug]:15} {', '.join(cells)}: the tidy rule, the only input that changed")
    unchanged = len(COLUMNS) * len(compare["rows"]) - len(changes)
    print(f"unchanged      : the other {unchanged} cells" + (", every place and number" if all(c[1] == "name" for c in changes) else ""))
    print(f"rerun          : identical output hash {output_hash(table_b)}, a second build into an empty folder" if same_output
          else f"rerun          : output hash {output_hash(rerun)} differs from {output_hash(table_b)}, the build does not repeat")
    renamed: dict[tuple, int] = {}
    before_rows = dict(parsed_rows(tuesday_dir, r1["read"]))
    for slug, rows in parsed_rows(rebuilt_dir, r3["read"]):
        for old, new in zip(before_rows[slug], rows, strict=True):
            require({**old, "shown": None} == {**new, "shown": None}, f"the fixed parser changed more than a name on {slug}")
            if old["shown"] != new["shown"]:
                renamed[(old["shown"], new["shown"])] = renamed.get((old["shown"], new["shown"]), 0) + 1
    print(f"parsed rows    : {sum(renamed.values())} renamed, "
          + ", ".join(f"{show(a)} -> {show(b)} in {n}" for (a, b), n in sorted(renamed.items())))
    for gap in gaps:
        print(f"named gap      : {gap}")

    if args.missing:
        print(f"\nRESULT: replayed {len(r3['read'])} of the {seen['schedules']} schedules the manifest lists; "
              f"the replay skipped {args.missing}'s missing page without a word")
        return 1

    only_name = changes == [("st-lambert", "name", "State Lambert", "Saint Lambert")]
    ok = (seen["schedules"] == 7 and len(r3["read"]) == 7 and not r3["refused"] and seen["hashes_ok"]
          and counter_works and requests == 0 and wrong == ["State Brendan", "State Lambert"]
          and not r2["reparsed"] and len(r3["reparsed"]) == 7 and only_name and same_output
          and renamed == {("State Brendan", "Saint Brendan"): 4, ("State Lambert", "Saint Lambert"): 12}
          and table_a["no_score"] == table_b["no_score"] and (table_a["scored"], table_a["finished"]) == (53, 54))
    print("\nRESULT:", "rebuilt by replay with 0 requests; only Saint Lambert's name changed" if ok
          else "unexpected result")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
