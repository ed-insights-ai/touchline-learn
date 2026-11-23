---
title: Capstone projects
description: Five one-to-two-week projects, each assessable, that can be done on the sample data or on a small source of the student's choosing.
sidebar:
  order: 1
---

Each project can be done on the sample data in this repository, or on any small
scraped source the student chooses. Each takes one to two weeks. The matching
lab is a starting point, not a solution.

## 1. A three-zone pipeline in miniature

Choose ten pages from one public site. Build fetch, archive, prove, parse and a
clean output with a written contract. Then change the parser, and rebuild the
clean output from the archive without touching the network.

- **Starts from:** labs 1 to 4, and `labs/common.py`.
- **Assessed on:** the proof step, the rebuild, and how failures are recorded.

## 2. A coverage audit

Using a coverage file and the season files, report what share of matches have
box scores, by season and conference. Then answer: would goals-per-game
estimated from box scores be biased, and in which direction?

- **Starts from:** lab 6, part 3. The sample has two seasons and both genders,
  with a planted gap.
- **Assessed on:** use of the missing-data states, and the argument about bias.

## 3. An identity ledger

Given a list of raw team strings, build the grammar, the alias list and a
ledger of rulings. Report every string you refused to match, with the reason.
Then run a fuzzy matcher over the same list and find a false merge it makes.

- **Starts from:** lab 5.
- **Assessed on:** zero false merges, and the quality of the refusals.

## 4. A parity gate

Write two versions of a small transformation, one with a deliberate bug. Build
a tool that compares their outputs record by record, classifies the
differences, and exits non-zero on a disagreement.

- **Starts from:** lab 7.
- **Assessed on:** the categories, and how it behaves when one input is
  missing.

## 5. Numbers you can defend

Have a language model write a 150-word summary of a standings table. Build a
checker that extracts every figure from the summary and verifies it against a
query.

- **Starts from:** labs 8 and 9.
- **Assessed on:** what the checker catches, and an honest list of what it
  cannot.

## A suggested rubric

| | Developing | Proficient | Strong |
|---|---|---|---|
| Correctness | Runs on the happy path | Handles the planted problems | Finds a problem that was not planted |
| Failure behavior | Crashes or passes silently | Fails loudly with a reason | Distinguishes "failed" from "did not run" |
| Reproducibility | Works on the author's machine | Runs from a fresh clone | Byte-identical output on a second run |
| Writing | Describes what the code does | Explains why each rule exists | States what the work cannot show |
