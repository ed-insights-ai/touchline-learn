---
title: The sample data
description: The invented Prairie Lakes Conference that every lab runs on, what is in it, the gaps planted in it, and how to regenerate it.
sidebar:
  order: 4
---

Every lab runs on one small data home in `sample/`. It describes the **Prairie
Lakes Conference**, which does not exist.

:::note[Everything in the sample is invented]
The conference, the eight schools and their opponents, every player, every
score and every web page were made up for this site by `sample/generate.py`.
The URLs end in `.example`, a name reserved so that it can never resolve.
No record was copied from Touchline's real datasets. What is real is the
**shape**: the files use the field names and layout of the platform's season
files, so a query you write here would read the real thing.
:::

## What is in it

```text
sample/
  generate.py                 the generator; standard library only
  data/                       the clean zone
    fixtures/                 2025 and 2026, men and women: one file each
    rosters/
    stats/
    matches/                  box scores, keyed by fixture id
    coverage.json             what was collected, what was not, and why
    reference/
      membership.json         which conference a school was in, by season
      programmes.json         display facts for each school
      aliases.json            the starting spelling list for the identity lab
    sample.json               a manifest: every file with its size and SHA-256
  raw_html/                   the raw zone: pages as a site would serve them
  shadow/                     a second pipeline's copy, for the parity lab
```

| | 2025 | 2026 |
|---|---|---|
| Member schools | 7 | 8 (Hartwell Tech joined) |
| Fixtures, men / women | 62 / 67 | 87 / 87 |
| Box scores, men / women | 50 / 67 | 83 / 84 |

A fixture record looks like this:

```json
{
  "id": "tally:alder-ridge:8203",
  "date": "2026-09-08",
  "home": "alder-ridge",
  "away": "hartwell-tech",
  "status": "final",
  "source_url": "https://athletics.alder-ridge.example/sports/mens-soccer/schedule/2026",
  "conference_game": true,
  "stage": { "phase": "regular" },
  "time": "13:00",
  "venue": "Alder Ridge Soccer Field",
  "home_score": 1,
  "away_score": 0
}
```

## What was planted, and why

A tidy sample would teach nothing about the problems the platform exists to
solve. These were put in on purpose, and each one mirrors something the real
pipeline has met.

| Planted | Where | Module |
|---|---|---|
| A redirect to a URL with no year that still proves its season | `raw_html/brightwater-state/` | [3](../../modules/03-provenance/) |
| Two requests for 2019 answered, with HTTP 200, by 2026 pages | `raw_html/cedar-grove/`, `raw_html/dunmore/` | [3](../../modules/03-provenance/) |
| A page whose URL and title are right, with another season's events embedded | `raw_html/traps/` | [3](../../modules/03-provenance/) |
| A second page template with the tables in another order | every third box score | [4](../../modules/04-parsing/) |
| A Fouls row whose template id is `offsides` | every box score | [4](../../modules/04-parsing/) |
| Card color carried only by a styling class, and sometimes absent | every box score | [4](../../modules/04-parsing/) |
| A score table with three teams | `raw_html/traps/` | [4](../../modules/04-parsing/) |
| A play-by-play line that says "Goal" and is not a goal | some box scores | [4](../../modules/04-parsing/) |
| Rankings and seeds in front of team names; several spellings per school | `data/matches/` | [5](../../modules/05-identity/) |
| Eastbrook State and Westbrook State; St. Lambert and Lambert State | `data/matches/` | [5](../../modules/05-identity/) |
| Shirt numbers "0" and "00", which are different shirts | `data/rosters/` | [6](../../modules/06-contracts/) |
| A school that changed conference between seasons | `reference/membership.json` | [6](../../modules/06-contracts/) |
| All four missing-data states | `data/coverage.json` | [6](../../modules/06-contracts/) |
| Twelve box scores missing because one school's site could not be collected (9 home games, 3 away) | 2025 men | [6](../../modules/06-contracts/) |
| A final whose score was never published | 2026 men | [6](../../modules/06-contracts/), [8](../../modules/08-products/) |
| Exhibition games with scores | every season | [8](../../modules/08-products/) |
| Three games played since the official copy; one old score that disagrees | `shadow/` | [7](../../modules/07-gates/) |

## It is deterministic

The generator uses seeded random streams and no clock. Run it twice and every
file is byte for byte the same. The repository checks that on every change:

```bash
python sample/generate.py --check
```

```
70 files generated, 0 differ from disk
```

That is the platform's determinism rule, applied to this
site's own data. If you change the generator, run `python sample/generate.py`
to rewrite the files, then update any lab whose expected output moved.

## Differences from the real files

- The real fixture ids name real website platforms. The sample uses two
  invented platform names, `tally` and `pressbox`.
- `reference/programmes.json` and `sample.json` are simplified and carry a
  `learn.` schema tag instead of a `touchline.` one.
- The contracts in `labs/contracts/` were written for this guide from the
  sample. They are teaching copies, not the platform's own contract files.
- Real play-by-play runs to more than a hundred lines a match. The sample keeps
  goals, cards and a few untyped lines.
