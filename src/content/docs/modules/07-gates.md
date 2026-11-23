---
title: "7. Validation gates and parity"
description: A check that can stop the release is a gate. What gates Touchline runs, and what a gate does when it cannot run.
---

## The idea

A check that only writes a report is advice. A check that can stop the release
is a gate. Reliable pipelines put gates between stages, and are careful about
what a gate does when it cannot run.

## How Touchline does it

- **Contract check.** Before anything is uploaded, every real season file is
  validated against its contract. A mismatch stops the run.
- **Two species of check.** A gate fails the run with a non-zero exit code, so
  nothing downstream runs on unproven input. A monitor always finishes and
  reports its verdict, so one finding does not hide the others. You should be
  able to say which species each check below is, and why.
- **A check that did not run is never a zero.** If a measurement comes back
  empty because a command failed, the check reports "did not run". It does not
  report "0 problems". This rule came from a real incident, where a check
  against a store that no longer existed reported a pass.
- **Severity only rises.** Verdicts go from ok to warn to alarm. No later line
  of a check is allowed to lower a verdict an earlier line raised.
- **Parity, or shadow running.** Touchline is moving its daily collection from
  one machine to a cloud workflow. During the move, the new pipeline writes to
  a separate "shadow" copy of the dataset and the old one stays official. A
  parity tool compares the two copies record by record and sorts each record
  into match, timing or disagreement. Timing means the two sides scraped a
  recent game hours apart and the later one has moved forward. The new pipeline
  takes over only after a clean comparison.
- **Agreement between consumers.** The website and the desktop app compute team
  records with different code. A daily check compares wins, draws, losses and
  goals from both. A difference holds back the release.
- **Release is the last step.** The pointer that tells users "this is the
  latest dataset" moves only after every gate has passed and the published site
  has been checked. If anything fails, yesterday's version stays in place.

## Example

The first cloud run on one conference was compared with the official copy. The
result was 224 records matching, 7 timing differences and 0 disagreements. All
7 timing differences were one school's weekend tournament games, which the
later run had seen as final. Without the timing category, those 7 would have
been false alarms, and people learn to ignore a check that raises false alarms.

## Terms

Data validation, quality gate, fail closed versus fail open, monotone severity,
shadow deployment or parallel run, reconciliation, atomic release, rollback.

## Questions

1. Why is "0 errors" from a check that crashed more dangerous than a crash?
2. The parity tool treats any roster difference as a disagreement, but allows
   timing differences in scores. Defend that asymmetry.
3. The agreement check uses two implementations of the same figures. That is
   deliberate redundancy. What does it catch that unit tests on either one
   would miss?

## Lab: a parity gate

```bash
python labs/m07_parity.py; echo "exit code $?"
```

`sample/data` is the official copy, collected on 20 November. `sample/shadow`
is what a second pipeline wrote three days later.

```
timing        pressbox:eastmarch-state:7318   official: 2026-11-21 scheduled ---  shadow: 2026-11-21 final 1-1
timing        pressbox:st-oswin:8779          official: 2026-11-21 scheduled ---  shadow: 2026-11-21 final 1-0
disagreement  tally:alder-ridge:8203          official: 2026-09-08 final 1-0  shadow: 2026-09-08 final 1-1
timing        tally:alder-ridge:8211          official: 2026-11-22 scheduled ---  shadow: 2026-11-22 final 1-6

91 match, 3 timing, 1 disagreement
GATE: failed. The new pipeline does not take over.
exit code 1
```

Three games were played after the official copy was taken. Those are timing:
the later run moved forward, as it should. One game from September has a
different score on each side. Nothing about a September result should change in
November, so it is a disagreement, and one is enough to fail the gate.

Now run the gate where it cannot do its job:

```bash
python labs/m07_parity.py --shadow does-not-exist; echo "exit code $?"
```

```
PARITY DID NOT RUN: FileNotFoundError: ...
This is not a pass. Nothing was compared.
exit code 2
```

A lazier tool would have found no files, compared nothing, and printed "0
disagreements".

**Your turn.**

1. `classify_fixture` calls a difference timing only when the official side was
   `scheduled`, the shadow side is `final`, nothing else differs, and the game
   is recent. Remove the "recent" condition and construct a case where a real
   problem is waved through.
2. Which side is right about the September game? The lab cannot tell you. Write
   down what you would look at to decide. (Module 2 has the answer.)
3. Add a rule that a fixture present on only one side is timing if it was
   scheduled within the last three days. Argue for or against keeping it.
4. Turn the gate into a monitor: make it print every finding and always exit 0.
   Describe one place in a pipeline where that is the right species, and one
   where it would be dangerous.

## Exercise

Design a parity check for two versions of a pipeline you know, such as a
model's old and new feature code. Define your match, timing and disagreement
categories, and state the rule that lets the new version take over.
