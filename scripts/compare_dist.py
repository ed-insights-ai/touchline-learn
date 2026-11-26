#!/usr/bin/env python3
"""Compare two builds of the site page by page.

    cp -R dist /tmp/dist-before      # build on the old commit first
    npm run build
    python3 scripts/compare_dist.py /tmp/dist-before dist

For each page that is not byte-identical it reports which of three things
differ: the markup (with hashed asset names masked), the CSS cascade (every
stylesheet and inline style in order, by content), and the set of scripts.
Exits 1 if any page under modules/01-collection differs in markup or CSS.
Standard library only.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ASSET = re.compile(r"(/touchline-learn/_astro/[^\"]+?)\.[A-Za-z0-9_-]{8}\.(css|js)")
STYLE = re.compile(r'<link rel="stylesheet" href="/touchline-learn/([^"]+)"[^>]*>|<style[^>]*>(.*?)</style>', re.S)
SCRIPT = re.compile(r'_astro/([^"]+\.js)')
FROZEN = "modules/01-collection"


def cascade(root: Path, html: str) -> str:
    return "".join((root / m.group(1)).read_text(encoding="utf-8") if m.group(1) else m.group(2) for m in STYLE.finditer(html))


def markup(html: str) -> str:
    return ASSET.sub(r"\1.HASH.\2", STYLE.sub("", html))


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    before, after = Path(sys.argv[1]), Path(sys.argv[2])
    pages = sorted({p.relative_to(before) for p in before.rglob("*.html")} | {p.relative_to(after) for p in after.rglob("*.html")})
    same, frozen_bad = 0, False
    for rel in pages:
        a, b = before / rel, after / rel
        if not a.is_file() or not b.is_file():
            print(f"{rel}: only in {'after' if b.is_file() else 'before'}")
            continue
        old, new = a.read_text(encoding="utf-8"), b.read_text(encoding="utf-8")
        if old == new:
            same += 1
            continue
        what = []
        if markup(old) != markup(new):
            what.append("markup")
        if cascade(before, old) != cascade(after, new):
            what.append("css")
        gone = sorted(set(SCRIPT.findall(old)) - set(SCRIPT.findall(new)))
        came = sorted(set(SCRIPT.findall(new)) - set(SCRIPT.findall(old)))
        if gone or came:
            what.append(f"scripts {gone} -> {came}")
        print(f"{rel}: {', '.join(what) or 'whitespace only'}")
        if str(rel).startswith(FROZEN) and ("markup" in what or "css" in what):
            frozen_bad = True
    print(f"RESULT: {same} of {len(pages)} pages byte-identical; Module 1 markup and CSS {'CHANGED' if frozen_bad else 'unchanged'}")
    return 1 if frozen_bad else 0


if __name__ == "__main__":
    sys.exit(main())
