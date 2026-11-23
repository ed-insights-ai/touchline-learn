"""Shared paths and helpers for the labs. Standard library only."""

from __future__ import annotations

import importlib.util
import json
import shutil
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE = ROOT / "sample"
DATA = SAMPLE / "data"
RAW = SAMPLE / "raw_html"
SHADOW = SAMPLE / "shadow"
WORK = ROOT / "labs" / "_work"

UNITS = [(2025, "men"), (2025, "women"), (2026, "men"), (2026, "women")]


def require(*modules: str) -> None:
    missing = [m for m in modules if importlib.util.find_spec(m) is None]
    if missing:
        print(f"RESULT: could not run, missing {', '.join(missing)}. "
              "Run: python -m pip install -r labs/requirements.txt")
        sys.exit(2)


def load(path: Path | str):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def season_file(layer: str, season: int, gender: str) -> Path:
    return DATA / layer / f"{season}-{gender}-plc.json"


def workdir(name: str) -> Path:
    """A clean scratch folder for one lab. Everything in it can be rebuilt."""
    path = WORK / name
    shutil.rmtree(path, ignore_errors=True)
    path.mkdir(parents=True)
    return path


def heading(text: str) -> None:
    print(f"\n{text}\n{'-' * len(text)}")


class Page(HTMLParser):
    """Reads a page into its title and its tables, keeping what a parser may
    need as evidence: each table's caption, each row's id, each cell's class
    and link."""

    def __init__(self, source: str):
        super().__init__()
        self.title = ""
        self.tables: list[dict] = []
        self._text: list[str] | None = None
        self._cell: dict | None = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("title", "caption"):
            self._text = []
        elif tag == "table":
            self.tables.append({"caption": "", "rows": []})
        elif tag == "tr" and self.tables:
            self.tables[-1]["rows"].append({"id": a.get("id"), "game": a.get("data-game"), "cells": []})
        elif tag in ("td", "th") and self.tables and self.tables[-1]["rows"]:
            self._cell = {"text": "", "class": a.get("class", ""), "href": None}
            self._text = []
        elif tag == "a" and self._cell is not None:
            self._cell["href"] = a.get("href")

    def handle_data(self, data):
        if self._text is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if self._text is None:
            return
        text = "".join(self._text).strip()
        if tag == "title":
            self.title = text
        elif tag == "caption":
            self.tables[-1]["caption"] = text
        elif tag in ("td", "th") and self._cell is not None:
            self._cell["text"] = text
            self.tables[-1]["rows"][-1]["cells"].append(self._cell)
            self._cell = None
        else:
            return
        self._text = None

    def table(self, caption: str) -> dict | None:
        """The table that says it is `caption`, wherever it sits on the page."""
        found = [t for t in self.tables if t["caption"] == caption]
        return found[0] if len(found) == 1 else None
