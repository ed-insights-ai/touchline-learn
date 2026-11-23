---
title: "6. The data model, contracts and missing data"
description: A written, versioned shape that producers and consumers agree on, and a way to say what is missing and why.
---

## The idea

Clean data needs a shape that producers and consumers both agree on, written
down and versioned. That shape also has to say what is missing and why, because
"nothing here" can mean several different things.

## The data model

The clean zone is a set of season files, one per season, gender and conference,
in four layers plus two reference files.

| File | One record is | Key |
|---|---|---|
| Fixtures | a scheduled or played match | fixture id, such as `tally:alder-ridge:8203` |
| Rosters | a player on a team in a season | school slug + player |
| Stats | a player's cumulative season line | school slug + player id |
| Matches | a box score: periods, team stats, player lines, events | fixture id |
| Coverage | the outcome of one collection attempt | season / gender / school / layer |
| Membership | which conference a school was in, by season | school slug + season range |

A fixture record from the sample:

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
  "home_score": 1,
  "away_score": 0
}
```

Three things to notice. The id names the source system and the publishing
school, so it is traceable. Teams are slugs, not display names (Module 5). And
`source_url` means every record carries its own citation.

## Contracts

Each file starts with a schema tag such as `touchline.fixtures/2`. The number
is a version. A contract states the fields, their types and which are required.
A breaking change gets a new number, and readers can refuse a version they do
not understand.

On the platform, the contracts and a matching sample live in their own
repository, so the code that consumes the data can be built and tested without
the private dataset. A writer may not emit a shape its contract does not carry:
a change to a writer lands with its contract change and a changelog line in the
same commit.

## Season is a dimension

Schools change conferences. Conference membership is therefore not a property
of a school. It is a property of a school in a season, stored as dated ranges.
A 2018 standings table must use 2018 membership. In the sample, Hartwell Tech
is an independent in 2025 and a conference member from 2026.

## Missing data has kinds

Each collection attempt ends in one of four states:

| State | Meaning |
|---|---|
| `complete` | served, proven, and has rows |
| `empty` | served and proven, and the source really lists nothing |
| `unavailable` | could not be collected; the reason is recorded |
| `no-collector` | no reader exists for this site's platform |

A fifth case needs no state: a cell with no record is a question nobody has
asked yet. A coverage record from the sample:

```json
{
  "collector": "pressbox-live",
  "confirmed_at": "2025-12-16T12:30:00+00:00",
  "gender": "men",
  "layer": "schedule",
  "programme": "eastbrook-state",
  "reason": "[2025] cannot prove which season was served",
  "season": 2025,
  "state": "unavailable"
}
```

## Null is not zero

A final with no published score has no scores. If it were stored as 0–0, one
missing value would invent a draw, a clean sheet for both keepers and a
shutout. Aggregates count a match only when it is final, has both scores and is
not an exhibition, and they report how many matches were counted beside the
total played.

## Terms

Schema, data contract, schema versioning, slowly changing dimension,
missingness (compare MCAR, MAR and MNAR from statistics), null semantics,
coverage manifest, natural key.

## Questions

1. In statistics you classify missing data by its mechanism. How do Touchline's
   four states help an analyst decide whether missing box scores bias a
   goals-per-game estimate?
2. Why is `empty` only allowed after the page has passed its proof?
3. Who should be allowed to change a contract, and what should happen to
   consumers when it changes?

## Lab: hold a file to its contract, then write one

```bash
python labs/m06_contracts.py
```

**Part 1** validates all four fixtures files against
`labs/contracts/fixtures-2.schema.json`, a contract written as JSON Schema.
Then it damages a copy seven ways and checks each is refused. Every damaged
file is still valid JSON:

```
refused   a score written as text
refused   a status the contract never promised
refused   a display name where a slug belongs
refused   one score without the other
refused   a 0-0 invented for an unplayed game
refused   a record with no citation
refused   a version this reader does not know
```

Open the schema and find the rule behind each line. The fifth is the "null is
not zero" rule written as a contract: a scheduled match may not carry scores.

**Part 2 is the contract-writing exercise.** A starter contract for rosters
accepts almost anything:

```bash
python labs/m06_contracts.py --rosters labs/contracts/rosters-1.starter.schema.json
```

```
ACCEPTED  a player with no name
ACCEPTED  a shirt number stored as a number
ACCEPTED  a gender the writer never emits
ACCEPTED  a team keyed by display name
ACCEPTED  players as an object, not a list
ACCEPTED  a season written as text
6 problems with this contract
```

Copy the starter, tighten it, and point `--rosters` at your copy until it
reports `0 problems`. Your contract must refuse all six bad files and must
still accept the four real ones. A contract that rejects real data is as wrong
as one that accepts bad data. One possible answer is
`labs/contracts/rosters-1.schema.json`. Read it only after you have yours.

**Part 3** reads the coverage record and asks whether the gaps matter:

```
2025 | men | harbor-point | matches | unavailable | [2025] box score pages are no longer served
...
2025 men, counted games (3 exhibitions excluded)
  every counted game  : 2.92 goals per game over 59
  with a box score    : 2.79 over 47
  without a box score : 3.42 over 12
All 12 missing box scores come from harbor-point's site (9 home, 3 away).
Permutation test on the gap: p = 0.33.
The coverage record names the mechanism. With 12 games, the gap alone does not establish bias.

2026 men, baseline rankings on the box-score subset (79 of 79 counted games)
  conference table order       : holds
  goal difference per game order: holds
```

The missing games are not a random sample: they share one cause, a site whose
box scores could not be collected. The coverage record names that mechanism,
and it is a reason for caution. The size of the effect is a separate question.
The 12 missing games average more goals, but a gap that size appears in about a
third of random splits of the same games. Twelve games cannot establish that
the box-score estimate is biased. In 2026, every counted game has a box score,
so neither ranking depends on this gap.

**Your turn.**

1. Shirt numbers are stored as text. Find a reason in the roster files or in
   your own experience of sport. What would be lost by storing them as numbers?
2. Add a field to your rosters contract that the data does not have yet, and
   mark it required. What should the version number do, and who has to change
   first: the writer or the readers?
3. Write the SQL that counts box scores per school for 2025 men and joins it to
   the coverage record. Which school's gap would you not have noticed from the
   counts alone?
4. St. Lambert's 2025 women's stats cell is `empty`, not `unavailable`. Write one
   sentence an analyst could put in a report for each of the two states.

## Exercise

Using the fixture record above, write a contract for it in plain language: each
field, its type, whether it is required, and whether it may be absent. Then
decide what a reader should do with a record whose `status` is `final` and
which has no scores. The 2026 men's file contains one.
