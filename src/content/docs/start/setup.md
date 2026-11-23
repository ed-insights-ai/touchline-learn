---
title: Set up the labs
description: Clone the repository, install two Python packages, and run every lab with one command.
sidebar:
  order: 3
---

:::note[Labs are optional]
You can learn every concept in this course on screen. Set up the labs only if
you want to run the code yourself.
:::

Every lab runs offline from a fresh clone. Nothing is downloaded while a lab
runs, and no account or key is needed.

## Install

On macOS or Linux:

```bash
git clone https://github.com/ed-insights-ai/touchline-learn.git
cd touchline-learn
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r labs/requirements.txt
```

On Windows, in PowerShell:

```powershell
git clone https://github.com/ed-insights-ai/touchline-learn.git
cd touchline-learn
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r labs/requirements.txt
```

That installs [DuckDB](https://duckdb.org/) and
[jsonschema](https://python-jsonschema.readthedocs.io/). Labs 1 to 5, 7 and 10
use only the Python standard library.

## Check everything works

```bash
python labs/run_all.py
```

Every line should start with `ok`, and the last line should say that all runs
behaved as expected. This is the same command the repository's own continuous
integration runs on every change.

## Run one lab

Run labs from the repository root:

```bash
python labs/m03_proof.py
```

| Lab | Module | What it does |
|---|---|---|
| `labs/m01_collect.py` | [1](../../modules/01-collection-lab/) | Three days of incremental collection against a pretend web |
| `labs/m02_archive.py` | [2](../../modules/02-archive/) | Fixes a parser bug by replaying the archive |
| `labs/m03_proof.py` | [3](../../modules/03-provenance/) | Refuses pages that cannot prove their season |
| `labs/m04_parse.py` | [4](../../modules/04-parsing/) | Three parsers, one of which survives a template change |
| `labs/m05_identity.py` | [5](../../modules/05-identity-lab/) | A grammar, an alias list, and a fuzzy matcher's false merges |
| `labs/m06_contracts.py` | [6](../../modules/06-contracts/) | Validates contracts; you write one; reads the coverage record |
| `labs/m07_parity.py` | [7](../../modules/07-gates/) | A parity gate with match, timing and disagreement |
| `labs/m08_products.py` | [8](../../modules/08-products/) | Standings in SQL, an agreement check, a database with a manifest |
| `labs/m09_claims.py` | [9](../../modules/09-ai/) | Recomputes every number in a drafted journal |
| `labs/m10_jobgraph.py` | [10](../../modules/10-operations/) | The daily run as a job graph with permissions |

Labs write their scratch output to `labs/_work/`, which git ignores. Delete it
whenever you like. Like everything derived, it can be rebuilt.

## How to read a lab's output

Every lab prints a line that starts `RESULT:` and sets an exit code, because a
check is more useful when a machine can act on it:

| Exit code | Meaning |
|---|---|
| `0` | The check ran and passed |
| `1` | The check ran and found a problem |
| `2` | The check could not run. This is never reported as a pass. |

Some labs are meant to end with `1`. The parity lab ships with a planted
disagreement so you can watch the gate stop the line.

## Explore the data yourself

`labs/explore.sql` holds a first query. Run it, then edit it and run it again:

```bash
python labs/query.py labs/explore.sql
```

```sql
SELECT f.date, f.home, f.away, f.home_score, f.away_score
FROM (SELECT unnest(fixtures) AS f
      FROM read_json('sample/data/fixtures/2026-men-plc.json'))
WHERE f.status = 'final'
ORDER BY f.date
LIMIT 10;
```
