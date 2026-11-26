#!/usr/bin/env python3
"""Check that every output block quoted in the course is real lab output.

A bare code fence in a module page is a quote from that module's lab. Each of
its lines must appear in the lab's output. A line of "..." skips output, and a
line ending in " ..." matches by its prefix.

A file in src/data/quotes/ is a quote a component renders. QUOTED_RUNS names
the one run in labs/run_all.py it quotes and the heading it starts at. Its lines
must be that run's standard output from that heading to the end, whole and exact, and the run must end with
its expected exit code. A quote that names
no run, quotes no line of real output, or is listed but missing, fails.
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
    "m02_archive.replay-report.txt": (["labs/m02_archive.py"], "Replay report: "),
    "m02_archive.tuesday-diff.txt": (["labs/m02_archive.py", "--tuesday"], "Confounded diff: "),
    "m02_archive.run.txt": (["labs/m02_archive.py"], "Capture manifest: "),
    "m02_archive.missing-report.txt": (["labs/m02_archive.py", "--missing", "hartwell-tech"], "Replay report: "),
    "m02_archive.missing-run.txt": (["labs/m02_archive.py", "--missing", "hartwell-tech"], "Capture manifest: "),
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
    for quote in sorted(q for q in QUOTES.glob("*.txt") if q.is_file()):
        block = [line.rstrip() for line in quote.read_text(encoding="utf-8").splitlines()]
        args, heading = QUOTED_RUNS.get(quote.name, (None, None))
        output = run_stdout(args) if args else None
        checked += len(block)
        if not args:
            missing.append(f"{quote.relative_to(ROOT)}: names no run in QUOTED_RUNS")
        elif not any(line.strip() and line.strip() != "..." for line in block):
            missing.append(f"{quote.relative_to(ROOT)}: quotes nothing")
        elif output is None:
            missing.append(f"{quote.relative_to(ROOT)}: python {' '.join(args)} is not in labs/run_all.py or ended unexpectedly")
        elif not block[0].startswith(heading) or any(line.strip() == "..." for line in block) or output[-len(block):] != block:
            missing.append(f"{quote.relative_to(ROOT)}: not the whole tail of python {' '.join(args)}, line for line")
    for stray in sorted(f for f in QUOTES.iterdir() if f.suffix != ".txt" or not f.is_file()):
        missing.append(f"{stray.relative_to(ROOT)}: not a .txt quote")
    for name in sorted(set(QUOTED_RUNS) - {q.name for q in QUOTES.glob("*.txt")}):
        missing.append(f"{(QUOTES / name).relative_to(ROOT)}: listed in QUOTED_RUNS but missing")
    for item in missing:
        print("not in lab output:", item)
    print(f"RESULT: {checked} quoted lines checked, {len(missing)} not found in lab output")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
