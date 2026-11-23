#!/usr/bin/env python3
"""Module 4 lab: parse a page that was never meant to be data.

Twelve archived box scores are parsed three ways:

  by position  the first table is the score, the second the team statistics
  by id        rows are found by the template's id attribute
  by caption   tables are found by what they say they are, rows by their
               visible label, and card colour by the cell's styling

A third of the pages use a second template with the tables in another order,
and the template marks its Fouls row with the id "offsides". Each parse is
then checked against the clean season file.
"""

from __future__ import annotations

import sys

from common import RAW, Page, heading, load, season_file


class NotABoxScore(Exception):
    pass


def ints(cells) -> list[int]:
    return [int(c["text"]) for c in cells]


def by_position(page: Page) -> dict:
    score, stats = page.tables[0], page.tables[1]
    return {"score": [ints(r["cells"][1:])[-1] for r in score["rows"][1:3]],
            "fouls": ints(stats["rows"][5]["cells"][1:])}


def by_id(page: Page) -> dict:
    rows = {r["id"]: r for t in page.tables for r in t["rows"] if r["id"]}
    return {"fouls": ints(rows["fouls"]["cells"][1:]) if "fouls" in rows else None,
            "offsides": ints(rows["offsides"]["cells"][1:]) if "offsides" in rows else None}


def by_caption(page: Page) -> dict:
    score = page.table("Score by Period")
    if score is None or len(score["rows"]) != 3:  # a header and exactly two teams
        raise NotABoxScore("the score table does not show exactly two teams")
    away, home = score["rows"][1], score["rows"][2]
    stats = {r["cells"][0]["text"]: ints(r["cells"][1:]) for r in page.table("Team Statistics")["rows"][1:]}
    cards = []
    for r in page.table("Cautions and Ejections")["rows"][1:]:
        css = r["cells"][3]["class"].split()
        colour = "yellow" if "card-y" in css else "red" if "card-r" in css else "unknown"
        cards.append({"time": r["cells"][0]["text"], "player": r["cells"][3]["text"], "type": colour})
    return {
        # the page lists the away side first; the season file lists home first
        "names": [home["cells"][0]["text"], away["cells"][0]["text"]],
        "periods": [ints(home["cells"][1:-1]), ints(away["cells"][1:-1])],
        "score": [int(home["cells"][-1]["text"]), int(away["cells"][-1]["text"])],
        "fouls": stats["Fouls"][::-1], "shots": stats["Shots"][::-1],
        "cards": cards,
    }


def expected(box: dict) -> dict:
    h, a = box["teams"]
    return {"names": [h["name"], a["name"]], "periods": [h["periods"], a["periods"]],
            "score": [h["score"], a["score"]], "fouls": [h["fouls"], a["fouls"]],
            "shots": [h["shots"], a["shots"]],
            "cards": [{"time": c["time"], "player": c["player"], "type": c["type"]}
                      for c in box.get("cards", [])]}


def main() -> int:
    clean = load(season_file("matches", 2026, "men"))["matches"]
    pages = sorted(RAW.glob("alder-ridge/2026-men-box-*.html"))
    tally = {"position": 0, "id": 0, "caption": 0}
    heading(f"{len(pages)} archived box scores, three parsers")
    for path in pages:
        fid = "tally:alder-ridge:" + path.stem.rsplit("-", 1)[1]
        want = expected(clean[fid])
        page = Page(path.read_text(encoding="utf-8"))
        try:
            got = by_position(page)
            pos_ok = got["score"] == want["score"][::-1] and got["fouls"] == want["fouls"][::-1]
        except (ValueError, IndexError):
            pos_ok = False
        id_ok = by_id(page)["fouls"] == want["fouls"][::-1]
        cap_ok = by_caption(page) == want
        tally["position"] += pos_ok
        tally["id"] += id_ok
        tally["caption"] += cap_ok
        print(f"{fid}  position={'ok ' if pos_ok else 'BAD'} id={'ok ' if id_ok else 'BAD'} "
              f"caption={'ok' if cap_ok else 'BAD'}")
    print("\npages parsed correctly:", tally)

    heading("What the id-based parser did with fouls")
    sample = by_id(Page(pages[0].read_text(encoding="utf-8")))
    print("fouls    :", sample["fouls"])
    print("offsides :", sample["offsides"], " <- these are the fouls, filed under the template's id")

    heading("A page with three teams in its score table")
    try:
        by_caption(Page((RAW / "traps" / "three-team-box.html").read_text(encoding="utf-8")))
        refused = False
    except NotABoxScore as why:
        refused = True
        print("refused:", why)

    colours = {c["type"] for p in pages for c in by_caption(Page(p.read_text(encoding="utf-8")))["cards"]}
    print("\ncard types read from styling:", sorted(colours))
    ok = tally["caption"] == len(pages) and tally["position"] < len(pages) and tally["id"] == 0 and refused
    print("RESULT:", "only the caption parser matches the clean file on every page" if ok else "unexpected result")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
