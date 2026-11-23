#!/usr/bin/env python3
"""Run a SQL file against the sample with DuckDB, from the repository root.

    python labs/query.py labs/explore.sql
"""

from __future__ import annotations

import sys
from pathlib import Path

from common import ROOT, require

require("duckdb")

import duckdb  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2 or not Path(sys.argv[1]).is_file():
        print("RESULT: could not run, give the path of one SQL file")
        return 2
    db = duckdb.connect()
    db.execute(f"SET file_search_path = '{ROOT.as_posix()}'")
    try:
        result = db.sql(Path(sys.argv[1]).read_text(encoding="utf-8"))
        result.show()
    except duckdb.Error as why:
        print(f"RESULT: the query failed: {why}")
        return 1
    print(f"RESULT: {len(result.fetchall())} rows")
    return 0


if __name__ == "__main__":
    sys.exit(main())
