#!/usr/bin/env python3
"""Check every internal link in the built site resolves to a built file.

    python scripts/check_links.py            # after `npm run build`

External links are listed, not fetched: the build must not depend on someone
else's server being up. Standard library only.
"""

from __future__ import annotations

import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse

DIST = Path(__file__).resolve().parent.parent / "dist"
BASE = "/touchline-learn/"
ORIGIN = "https://site.invalid"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.found: list[str] = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and ((tag == "a" and key == "href") or (tag in ("img", "script") and key == "src")
                          or (tag == "link" and key == "href")):
                self.found.append(value)


def main() -> int:
    if not DIST.is_dir():
        print("LINK CHECK DID NOT RUN: there is no dist/ folder. Run `npm run build` first.")
        return 2
    pages = sorted(DIST.rglob("*.html"))
    broken, external, checked = [], set(), 0
    for page in pages:
        rel = page.relative_to(DIST).as_posix()
        here = ORIGIN + BASE + (rel[: -len("index.html")] if rel.endswith("index.html") else rel)
        parser = Links()
        parser.feed(page.read_text(encoding="utf-8"))
        for href in parser.found:
            url = urlparse(urljoin(here, urldefrag(href)[0]))
            if f"{url.scheme}://{url.netloc}" != ORIGIN:
                if url.scheme in ("http", "https"):
                    external.add(f"{url.scheme}://{url.netloc}{url.path}")
                continue
            checked += 1
            if not url.path.startswith(BASE):
                broken.append((rel, href, "leaves the site's base path"))
                continue
            target = DIST / url.path[len(BASE):]
            if url.path.endswith("/"):
                target = target / "index.html"
            if not target.is_file():
                broken.append((rel, href, "no such file in dist/"))
    for rel, href, why in broken:
        print(f"BROKEN  {rel}: {href}  ({why})")
    print(f"{len(pages)} pages, {checked} internal links checked, {len(broken)} broken")
    print("external links (not fetched):")
    for url in sorted(external):
        print("  ", url)
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
