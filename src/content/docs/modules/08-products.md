---
title: "8. Derived products"
description: A static website and an analytical database, built from the same season files in two very different shapes.
---

## The idea

Nobody reads season files. People use products computed from them. A derived
product should be reproducible from the clean zone, shaped for how it will be
used, and verifiable by whoever receives it.

Touchline has two products, built from the same data on the same day, in two
very different shapes.

## Product 1: a static website

A build program reads the current season's files, computes standings, records
and player pages, and writes plain HTML: about fifteen thousand pages across
four editions (two divisions, men and women). There is no database behind the
site and no server code. It is files on a content delivery network.

- **Why static?** It costs almost nothing to host, cannot be taken down by a
  query, and every page is exactly what the build produced.
- **Deterministic builds.** Two builds from the same data produce
  byte-identical files. Only the home page carries the build time. So the daily
  deploy uploads only the pages whose numbers changed, and "what changed today"
  is answered by a file comparison.

The site's code is open: [touchline-ui](https://github.com/ed-insights-ai/touchline-ui).
The published site is at [ed-insights-ai.github.io/touchline-ui](https://ed-insights-ai.github.io/touchline-ui/).

## Product 2: an analytical database for the desk app

The desktop app answers arbitrary questions, including ones written by an AI
assistant as SQL, across every season. For that it needs a real query engine,
so the pipeline packs the season files into one DuckDB file, which is a
columnar, single-file analytical database.

The design was chosen by measuring alternatives:

| Option | Download | Then, on the user's machine | Problem |
|---|---|---|---|
| Ship the raw JSON | 94 MB | 22 to 40 s build | every machine builds its own copy, and results cannot be checked |
| Ship Parquet files | about 150 MB | 13 s build, 2 GB of memory | same |
| Query remote files in place | none | 0.1 to 0.7 s a query, up to 124 MB for one page | no offline use |
| Ship the finished database plus daily deltas | 168 MB once, then about 1 MB a day | opens immediately | larger first download |

- **Snapshots and deltas.** A full snapshot is published when needed. Each day
  after that, a small delta holds only the changed rows. A manifest lists every
  table with its row count and a hash, so after applying a delta the app can
  confirm it holds exactly the publisher's rows.
- **Scopes.** The snapshot is also cut per division and gender, so access can
  later be granted by scope.
- **Signing.** The manifest is signed with a private key held in a cloud key
  service. The key never leaves that service. The app carries the public key
  and rejects anything that does not verify. A signature proves where the data
  came from. It does not control who may download it. That is a separate
  mechanism, short-lived download links.
- **Atomic swap.** The app downloads to a temporary file, verifies it, then
  swaps it in and keeps the previous file for rollback.

## Example

On its first day the pipeline built a snapshot of 53,707 games, verified it
through the app's own download code, both from the full base and by delta, and
only then moved the "latest" pointer. An earlier build that day was never
released, because a gate had not yet passed.

## Terms

Data product, materialized view, static site generation, OLAP versus OLTP,
columnar storage, snapshot and delta (or change data capture), checksum,
digital signature, content-addressed storage, atomic swap.

## Questions

1. The site and the app are computed from the same files by different code.
   What are the costs and the benefits of not sharing one implementation?
2. Why hash each table in the manifest when the whole file already has a
   checksum?
3. "A signature proves origin, not permission." Give an example of a system
   that confused the two.

## Lab: standings, twice, and a database you can verify

```bash
python labs/m08_products.py
```

**Standings in SQL.** The query is in `labs/m08_standings.sql`. It applies the
counting rule from Module 6 and reports `listed` beside `counted`:

```
team                 listed counted   W   D   L  GF  GA  Pts
alder-ridge              14      14   9   2   3  24  11   29
hartwell-tech            14      14   5   6   3  29  17   21
brightwater-state        14      14   5   5   4  25  20   20
eastmarch-state          14      13   5   4   4  20  19   19  <- not every listed game could be counted
...
```

Five teams have a listed game that is not counted: two games were still to be
played, and one final never had its score published.

**An agreement check.** The same table is then recounted in plain Python by
code written separately on purpose, and the two are compared. This is the
platform's site-versus-desk check in miniature:

```
teams compared: 8 | disagreements: 0
```

**Null is not zero.** One line shows what the missing score would have done:

```
goalless draws if a missing score is read as 0: 4
goalless draws that were actually published   : 3
```

**A database with a manifest.** The lab packs every fixture and every player
line into one DuckDB file, writes a manifest with a row count and hash per
table, then reopens the file as a receiver would and verifies it.

**JSON against Parquet.** Finally it times the same query over both. On a
sample this small the gap is modest. The exercise below asks you to find out
where it stops being modest.

**Your turn.**

1. Break the agreement on purpose: make the Python recount include
   exhibitions. Which teams disagree? Now imagine both implementations had the
   same bug. What would catch it?
2. Change one score in `labs/_work/m08/plc.duckdb` with an `UPDATE` and rerun
   only the receiver's verification. Which table's hash moves? Why is that more
   useful than a single checksum for the file?
3. Write a delta: given yesterday's and today's fixtures tables, produce the
   rows to insert, update and delete, apply them to yesterday's, and confirm
   the result matches today's manifest. `sample/data` and `sample/shadow` are
   your two days.
4. Overall records, not conference records: write the query. Check your Alder
   Ridge row against the schedule page in `sample/raw_html/alder-ridge/`.
5. Concatenate the fixtures table a thousand times and repeat the JSON and
   Parquet timing. Report both file sizes as well.

## Exercise

Design the manifest for a dataset you work with. What does a receiver need to
know to be sure they hold exactly what you published, and to find out which
part is wrong if they do not?
