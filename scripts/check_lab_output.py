#!/usr/bin/env python3
"""Check that every output block quoted in the course is real lab output.

A bare code fence in a module page is a quote from that module's lab. Each of
its lines must appear in the lab's output. A line of "..." skips output, and a
line ending in " ..." matches by its prefix.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "src" / "content" / "docs"
sys.path.insert(0, str(ROOT / "labs"))

from run_all import RUNS  # noqa: E402


def bare_blocks(text: str) -> list[list[str]]:
    blocks, current, fenced = [], None, False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            if fenced:
                if current is not None:
                    blocks.append(current)
                current, fenced = None, False
            else:
                fenced = True
                current = [] if line.strip() == "```" else None
        elif current is not None:
            current.append(line.rstrip())
    return blocks


def lab_output(key: str) -> set[str]:
    lines: set[str] = set()
    for args, _, _ in RUNS:
        if key in args[0]:
            done = subprocess.run([sys.executable, *args], cwd=ROOT, capture_output=True, text=True)
            lines.update(line.rstrip() for line in (done.stdout + done.stderr).splitlines())
    return lines


def quoted(line: str, output: set[str]) -> bool:
    if not line.strip() or line.strip() == "...":
        return True
    if line.endswith(" ..."):
        return any(o.startswith(line[:-3]) for o in output)
    return line in output


def main() -> int:
    pages = {p: f"m{p.name[:2]}_" for p in sorted((DOCS / "modules").glob("*.md*"))}
    pages[DOCS / "start" / "sample-data.md"] = "generate.py"
    pages[DOCS / "practice" / "source-to-record.mdx"] = "labs/m0"
    checked = 0
    missing = []
    for page, key in pages.items():
        blocks = bare_blocks(page.read_text(encoding="utf-8"))
        output = lab_output(key)
        for block in blocks:
            for line in block:
                checked += 1
                if not quoted(line, output):
                    missing.append(f"{page.relative_to(ROOT)}: {line}")
    for item in missing:
        print("not in lab output:", item)
    print(f"RESULT: {checked} quoted lines checked, {len(missing)} not found in lab output")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
