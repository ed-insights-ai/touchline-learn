#!/usr/bin/env python3
"""Check that every output block quoted in the course is real lab output.

A bare code fence in a module page is a quote from that module's lab. Each of
its lines must appear in the lab's output. A line of "..." skips output, and a
line ending in " ..." matches by its prefix.

A file in src/data/quotes/ is a quote a component renders. Its name starts with
the lab it quotes (m02_archive.replay-report.txt quotes labs/m02_archive.py),
and its lines must appear in that order, unbroken except at "...", in the
standard output of one of that lab's runs in labs/run_all.py that ended with
its expected exit code. A quote with no line of real output fails.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "src" / "content" / "docs"
QUOTES = ROOT / "src" / "data" / "quotes"
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


def lab_runs(lab: str) -> list[list[str]]:
    """The stdout of each of this lab's runs that ended with its expected exit code."""
    runs = []
    for args, code, _ in RUNS:
        if Path(args[0]).stem == lab:
            done = subprocess.run([sys.executable, *args], cwd=ROOT, capture_output=True, text=True)
            if done.returncode == code:
                runs.append([line.rstrip() for line in done.stdout.splitlines()])
    return runs


def same(line: str, out: str) -> bool:
    return out.startswith(line[:-3]) if line.endswith(" ...") else line == out


def in_order(block: list[str], lines: list[str]) -> bool:
    """True if block appears in lines as one unbroken run, where a line of "..." skips any number of lines."""
    def match(b: int, i: int) -> bool:
        if b == len(block):
            return True
        if block[b].strip() == "...":
            return any(match(b + 1, j) for j in range(i, len(lines) + 1))
        return i < len(lines) and same(block[b], lines[i]) and match(b + 1, i + 1)
    return any(match(0, start) for start in range(len(lines)))


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
    for quote in sorted(QUOTES.glob("*.txt")):
        block = [line.rstrip() for line in quote.read_text(encoding="utf-8").splitlines()]
        runs = lab_runs(quote.name.split(".")[0])
        checked += len(block)
        if not any(line.strip() and line.strip() != "..." for line in block):
            missing.append(f"{quote.relative_to(ROOT)}: quotes nothing")
        elif not runs:
            missing.append(f"{quote.relative_to(ROOT)}: no run of {quote.name.split('.')[0]} in labs/run_all.py")
        elif not any(in_order(block, run) for run in runs):
            missing.append(f"{quote.relative_to(ROOT)}: not one unbroken block of any run's output")
    for item in missing:
        print("not in lab output:", item)
    print(f"RESULT: {checked} quoted lines checked, {len(missing)} not found in lab output")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
