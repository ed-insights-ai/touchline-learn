---
title: "2. The raw archive"
description: Save the source exactly as received, treat it as the truth, and fix bugs by replaying it.
---

## The idea

Save the source exactly as you received it, before any of your code interprets
it. Treat that saved copy as the truth and everything else as a calculation.

## Why it matters

The web does not replay the past. Sites are redesigned, old seasons are
removed, and a page fetched in September may not exist in March. Parsers also
have bugs, and some are found months later. If you kept only the parsed output,
a bug means the data is wrong and the evidence is gone. If you kept the page, a
bug means you fix the parser and run it again.

## How Touchline does it

- Each fetched page is written to disk before any parser reads it, under a
  predictable name: `raw_html/{school}/{year}-{gender}-schedule.html`, and the
  same for roster and stats.
- Box scores are stored beside them, named by fixture id. In the sample, the
  fixture `tally:alder-ridge:8203` is stored as
  `2026-men-box-tally-alder-ridge-8203.html`.
- Each stored box score carries a small sidecar file with a fingerprint of the
  parser version that last read it. When the parser changes, the fingerprint no
  longer matches, and the page is re-parsed from disk with no network request.
- In the cloud pipeline the archive lives in private object storage and is
  synced at the start and end of each run.

## Example

Early in the project, team names that began with "St." were all expanded to
"State". That turned every Saint school into a State school. The fix was a
change to one function. Because the pages are archived, a fix like this is
applied by re-reading the saved pages with the corrected rule. Nothing has to
be downloaded again, which matters because some old pages can no longer be
fetched.

## Terms

Raw zone or bronze layer, immutable storage, replay or backfill,
schema-on-read, lineage.

## Questions

1. The archive is much larger than the clean data. What would you weigh in
   deciding how long to keep it?
2. What is the difference between fetching a page again and rebuilding from
   the archive? Which one is reproducible?
3. What should happen if the archive and the live site disagree about a past
   match?

## Lab: fix a bug by replay

```bash
python labs/m02_archive.py
```

The lab reproduces the "St." bug on the sample's archived schedule pages, then
fixes it.

```
Run 1: parser v1
re-parsed, skipped: (8, 0)
names that cannot be right: ['State Brendan', 'State Lambert']

Run 2: same parser, nothing to do
re-parsed, skipped: (0, 8)

Run 3: parser v2, replayed from the archive
re-parsed, skipped: (8, 0)
Saint schools now  : ['Saint Brendan', 'Saint Lambert']
network requests   : 0
network counter    : caught a test request
```

Run 2 does nothing because each parsed file has a sidecar holding the
fingerprint of the parser that wrote it. Run 3 re-parses everything because the
fingerprint changed with the code. Nobody had to remember which files were
stale. The network count is measured: the lab intercepts every connection
attempt, and first sends a test request to prove the counter works.

**Your turn.**

1. `fingerprint()` hashes the source of one function. Change a comment inside
   `expand_v2` and run again. Everything is re-parsed although the behavior
   did not change. Is that a bug or a feature? What would a finer fingerprint
   cost you?
2. Run `python labs/m02_archive.py --missing dunmore`, which works on a scratch
   copy without that school's page. The lab reparses seven pages and says
   nothing about the eighth. Decide what should happen: a crash, a silent skip,
   or something else. Then make the lab do it.
3. The sidecars in `sample/raw_html/` record `requested_url` and `final_url`.
   Why is the final URL worth keeping? Module 3 depends on the answer.

## Exercise

You find that your parser has dropped overtime goals for two years. Write the
recovery plan twice: once for a system that kept raw pages, once for a system
that did not. Estimate what is lost in the second case.
