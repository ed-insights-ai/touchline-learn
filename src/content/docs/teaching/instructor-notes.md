---
title: Instructor's notes
description: Pacing for a three-week unit, the opening and closing discussion, and the points a good answer to each module's questions should reach.
sidebar:
  order: 2
---

## Pacing

A module fits one 50-minute session. A three-week unit, three sessions a week:

| Week | Session 1 | Session 2 | Session 3 |
|---|---|---|---|
| 1 | Opening discussion, the Overview's seven steps, lab setup | Modules 1 and 2 | Module 3 |
| 2 | Module 4 | Module 5 | Module 6, contract-writing lab |
| 3 | Module 7 | Modules 8 and 9 | Module 10, closing discussion, capstone briefing |

The Module 1 core path takes about 55 minutes with its two films, and its field work page suits
homework.

For a single guest lecture, use the Overview's seven steps, then Modules 3 and 6.
They carry the two ideas students are least likely to have met: proof before
parse, and kinds of missing data.

## Opening and closing discussion

Before Module 1, ask: "You have a list of 1,000 website URLs and a month.
How would you build this dataset?" Write the class's plan on the board and keep
it. Most plans skip archiving, proof and gates. At the end of the unit, put the
plan back up and ask what they would add, and what each addition would have
cost them to leave out.

## Running the labs in class

- Have students run `python labs/run_all.py` before the first lab session. It
  takes a few seconds and surfaces setup problems early.
- Every lab prints the same output for everyone, because the sample is
  generated deterministically. You can quote line numbers and figures.
- Labs 5 and 6 have a starter and a worked answer. The answers are in the
  repository (`labs/data/aliases_solution.json`,
  `labs/contracts/rosters-1.schema.json`). If you set these as assessed work,
  change the planted spellings or the bad files in a fork.
- The "Your turn" tasks are ordered from a ten-minute change to a half-day
  extension. The first one in each module works as an in-class exercise.

## Notes on the discussion questions

These are the points a good answer should reach. They are not the only good
answers.

**Module 1.** A count needs an expected set written before the run and from
outside it: a membership list kept by season gives the pages, and the
competition's format gives the matches (8 schools, each hosting the other 7
once, make 56). Each match was read only from the host's page, so one page down
removed Dunmore's seven home matches as a block, and because each of them
involved another school, all eight table rows went wrong. Unknown is not zero,
and the states keep that apart: `empty` means the page was read, proved its
season and listed nothing, while `unavailable` means nothing could be read. All
46 rows are real and correctly read, so cleansing and validation pass the
table, and completeness needs its own record.

**Module 2.** Rebuilding from the archive is reproducible. Re-fetching samples
a source that has moved. When the archive and the live site disagree, keep both
observations with their dates, and let a rule decide. Do not overwrite.

**Module 3.** Detailed is not the same as correct, and the richer source was
the one that lied. Identifiers are assigned by the system and are hard to reuse
by accident, while labels are written for display. Low coverage with named gaps
can be reasoned about. High coverage with unknown errors cannot.

**Module 4.** Roughly, from strong to weak: stable ids, visible labels and
captions, attributes, then position. The lab complicates this usefully: the
template's id was wrong and the visible label was right, so "stable ids" means
ids that identify data, not ids that decorate a template. The raw line allows
re-classification when patterns improve. `unknown` is better whenever a wrong
value would be aggregated.

**Module 5.** A false merge is worse, because it silently corrupts both schools
and is hard to undo. A split shows up as an oddly short season. At larger
scale, keep the principle: automatic matching may propose, but a durable
recorded ruling decides.

**Module 6.** `no-collector` and `unavailable` depend on the site and platform,
not on the match, so missingness is related to school and era and is unlikely
to be completely random. `empty` after proof means the source is silent.
Without proof it could be a failed fetch. In the lab, all 12 missing box scores
come from one school's site, so the mechanism is known. The 12 games average
more goals (3.42 against 2.79), but a permutation test gives p = 0.33, so the
gap alone does not establish that the box-score estimate is biased.

**Module 7.** A crash gets investigated, and a false pass gets trusted. Rosters
do not change between two same-day scrapes, so any difference is a real
disagreement. Scores legitimately change as games finish. Two implementations
catch a shared misunderstanding of the data, which each one's own tests encode.
For the lab's September disagreement, the archived page decides.

**Module 8.** Two implementations cost effort and can drift, which is why an
agreement gate exists. They also check each other. Per-table hashes locate a
problem and verify a delta without re-downloading the base.

**Module 9.** Shape checks prove the output is well-formed, complete and fresh.
They do not prove a claim is true. That needs comparison with the data. The
lab's "leads the league" claim shows the remaining gap: a correct figure inside
a sentence that says slightly more than the figure does.

**Module 10.** Git suits data that is text, moderate in size, changes a little
each day, and benefits from diffs. Bugs that depend on rare real-world shapes
only appear on real data, so real-data checks run inside the private workflow
and report only pass or fail.

## Notes on selected lab tasks

- **Lab 3, task 3** (trust the URL). `run_all.py` fails because the Cedar
  Grove 2019 page is now accepted: the count becomes 9 proven, 1 refused. The
  point is that the repository's own gate caught a plausible-looking change.
- **Lab 4, task 2.** Lines such as "Goal disallowed, ARU flagged offside."
  should stay untyped. A pattern that looks only for the word "goal" would
  record a goal that never counted.
- **Lab 5, task 1.** "Lambert St." is Lambert State, a non-member. The evidence a
  student should ask for is the box score it came from: who the opponent was,
  and where the game was played.
- **Lab 6, task 1.** Numbers such as "00" and "0" are different shirts, and a
  leading zero does not survive a numeric type.
- **Lab 7, task 1.** Without the recency condition, a September game that was
  wrongly left as `scheduled` on the official side and is `final` in the shadow
  is waved through as timing, hiding a two-month-old gap in the official copy.
- **Lab 8, task 1.** Only teams with a conference exhibition would move, and
  the sample has none: exhibitions are all non-conference. The Python recount
  filters on `conference_game` first, so the totals still agree. Students who
  notice this have understood why an agreement check is not a proof of
  correctness.
