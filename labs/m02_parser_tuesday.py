"""Kick's schedule parser as it stood on Tuesday. Its tidy rule turns every "St." into "State"."""

from __future__ import annotations

from common import DATA, Page, load

ALIASES = DATA / "reference" / "aliases.json"


def tidy(name: str) -> str:
    return name.replace("St.", "State")


def read_schedule(source: str) -> list[dict]:
    """Every row of a schedule page: fixture id, date, side, opponent's slug, opponent as shown, result."""
    names = {name: slug for slug, spellings in load(ALIASES).items() for name in spellings}
    rows = []
    for row in Page(source).table("Schedule")["rows"][1:]:
        date, side, opponent, result = (c["text"] for c in row["cells"][:4])
        rows.append({"fixture": row["game"], "date": date, "side": side, "opponent": names[opponent],
                     "shown": tidy(opponent), "result": result})
    return rows
