#!/usr/bin/env python3
"""Module 3 lab: proof before parse.

Every archived schedule page is asked one question before anything reads its
numbers: which season are you? Two witnesses may answer, the final address and
the page title. Every witness that speaks must name the requested season. If
none speaks, the page is refused. All ten pages here arrived with HTTP 200.
"""

from __future__ import annotations

import re
import sys

from common import RAW, Page, heading, load


class SeasonNotProven(Exception):
    """A typed error: the page could not show it is the season we asked for."""


def witnesses(final_url: str, title: str) -> dict[str, int | None]:
    in_url = re.search(r"/(20\d\d)(?:/|$)", final_url)
    in_title = re.search(r"\b(20\d\d)\b", title)
    return {"address": int(in_url.group(1)) if in_url else None,
            "title": int(in_title.group(1)) if in_title else None}


def prove_season(requested: int, final_url: str, title: str) -> str:
    """Returns the evidence, or raises SeasonNotProven with the reason."""
    spoke = {k: v for k, v in witnesses(final_url, title).items() if v is not None}
    if not spoke:
        raise SeasonNotProven("no witness names any season")
    wrong = {k: v for k, v in spoke.items() if v != requested}
    if wrong:
        said = ", ".join(f"{k} says {v}" for k, v in wrong.items())
        raise SeasonNotProven(f"asked for {requested}, but {said}")
    return " and ".join(spoke) + f" name {requested}"


def main() -> int:
    heading("Season proof for every archived schedule page")
    proven, refused = [], []
    for meta_path in sorted(RAW.glob("*/*-men-schedule.html.meta.json")):
        meta = load(meta_path)
        page_path = meta_path.with_name(meta_path.name.removesuffix(".meta.json"))
        requested = int(page_path.name[:4])
        title = Page(page_path.read_text(encoding="utf-8")).title
        label = f"{page_path.parent.name:18} {requested}"
        try:
            evidence = prove_season(requested, meta["final_url"], title)
            proven.append(label)
            print(f"proven   {label}  {evidence}")
        except SeasonNotProven as why:
            refused.append(label)
            # In the real pipeline this becomes a coverage cell:
            # state "unavailable", reason "cannot prove which season was served".
            print(f"REFUSED  {label}  {why}")
    print(f"\n{len(proven)} proven, {len(refused)} refused, 0 parsed without proof")
    ok = len(proven) == 8 and len(refused) == 2
    print("RESULT:", "both wrong-season pages were refused" if ok else "unexpected result")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
