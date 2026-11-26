#!/usr/bin/env python3
"""Check that every output block quoted in the course is real lab output.

A bare code fence in a module page is a quote from that module's lab. Each of
its lines must appear in the lab's output. A line of "..." skips output, and a
line ending in " ..." matches by its prefix.

A file in src/data/quotes/ is a quote a component renders. QUOTED_RUNS names
the one run in labs/run_all.py it quotes. Its lines must appear in that order,
unbroken except at a line of "...", in that run's standard output, and the run
must end with its expected exit code. Lines match exactly. A quote that names
no run, or quotes no line of real output, fails.
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

QUOTED_RUNS = {
    "m02_archive.replay-report.txt": ["labs/m02_archive.py"],
    "m02_archive.tuesday-diff.txt": ["labs/m02_archive.py", "--tuesday"],
}


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


def run_stdout(args: list[str]) -> list[str] | None:
    """The stdout of this exact run from labs/run_all.py, or None if it is not listed or ended unexpectedly."""
    for listed, code, _ in RUNS:
        if listed == args:
            done = subprocess.run([sys.executable, *args], cwd=ROOT, capture_output=True, text=True)
            return [line.rstrip() for line in done.stdout.splitlines()] if done.returncode == code else None
    return None


def in_order(block: list[str], lines: list[str]) -> bool:
    """True if block appears in lines as one unbroken run, where a line of "..." skips any number of lines."""
    def match(b: int, i: int) -> bool:
        if b == len(block):
            return True
        if block[b].strip() == "...":
            return any(match(b + 1, j) for j in range(i, len(lines) + 1))
        return i < len(lines) and block[b] == lines[i] and match(b + 1, i + 1)
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
        args = QUOTED_RUNS.get(quote.name)
        output = run_stdout(args) if args else None
        checked += len(block)
        if not args:
            missing.append(f"{quote.relative_to(ROOT)}: names no run in QUOTED_RUNS")
        elif not any(line.strip() and line.strip() != "..." for line in block):
            missing.append(f"{quote.relative_to(ROOT)}: quotes nothing")
        elif output is None:
            missing.append(f"{quote.relative_to(ROOT)}: python {' '.join(args)} is not in labs/run_all.py or ended unexpectedly")
        elif not in_order(block, output):
            missing.append(f"{quote.relative_to(ROOT)}: not one unbroken block of python {' '.join(args)}")
    for item in missing:
        print("not in lab output:", item)
    print(f"RESULT: {checked} quoted lines checked, {len(missing)} not found in lab output")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
