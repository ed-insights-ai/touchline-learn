"""Kick's schedule parser with the tidy rule fixed: "St." before a name is Saint, at the end it is State."""

from __future__ import annotations

import re

from common import DATA, Page, load

ALIASES = DATA / "reference" / "aliases.json"


def tidy(name: str) -> str:
    name = re.sub(r"\bSt\.(?=\s+\w)", "Saint", name)
    return re.sub(r"\bSt\.$", "State", name)


def read_schedule(source: str) -> list[dict]:
    """Every row of a schedule page: fixture id, date, side, opponent's slug, opponent as shown, result."""
    names = {name: slug for slug, spellings in load(ALIASES).items() for name in spellings}
    rows = []
    for row in Page(source).table("Schedule")["rows"][1:]:
        date, side, opponent, result = (c["text"] for c in row["cells"][:4])
        rows.append({"fixture": row["game"], "date": date, "side": side, "opponent": names[opponent],
                     "shown": tidy(opponent), "result": result})
    return rows
