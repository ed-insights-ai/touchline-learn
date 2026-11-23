---
title: "1. Sources and collection"
description: A registry that drives everything, units of work, incremental fetching, and honesty about what could not be collected.
---

## The idea

Collection is the step that decides what you ask the world for, how often, and
how you behave while asking. A good collector is configured rather than
hard-coded, does only the new work each day, and is honest about what it could
not get.

## How Touchline does it

- **A registry drives everything.** One configuration file lists each
  programme: its website, its vendor platform, its conference. Adding a school
  is a configuration change, not new code. A separate read-only tool, the
  probe, inspects a new site, identifies its platform and drafts the entry
  before any data is collected.
- **One reader per platform.** About a thousand sites reduce to four vendors.
  Each vendor gets one collector, so a fix for one site fixes several hundred.
- **Four layers per programme:** the schedule, the roster, cumulative season
  statistics, and a box score for each played match.
- **Work is split into units.** A unit is one conference, one gender, one
  season. Units are independent, so one failing does not stop the others, and
  they can run in parallel.
- **Incremental fetching.** The collector remembers a validator for each page
  it has seen, such as an ETag, and asks the site whether the page changed.
  Unchanged pages are re-read from the archive without being downloaded again.
- **Blocks are respected.** One vendor refuses requests from cloud data
  centres. Touchline does not disguise itself or work around this. It records
  the block, and collects those schools from an ordinary home connection
  instead.

## Example

A daily run in November covers a few dozen units. For a conference whose season
has ended, almost every page is unchanged and the unit finishes in seconds. For
a conference in its tournament week, the schedule pages and a handful of new
box scores are fetched. The run's record lists each unit with its time and
outcome.

## Terms

Extract (the E in ETL), incremental load, conditional request, idempotent run,
source registry, crawl politeness.

## Questions

1. Why collect from each school's site instead of one aggregator site that
   already lists every score?
2. A full re-fetch every day would be simpler to write. What does incremental
   fetching buy besides speed?
3. A site starts blocking you. List three possible responses and argue for one.

## Lab: three days of collection

```bash
python labs/m01_collect.py
```

The lab builds a registry from the sample's archived pages and runs a collector
against a pretend web for three days. No network is used: the pretend web
serves the sample pages, honours `If-None-Match`, and counts the bytes it
sends.

```
Day 1: nothing is known yet
registry entries : 20
downloaded       : 20

Day 2: nothing changed overnight
downloaded       : 0
unchanged (304)  : 20

Day 3: one page changed, one site blocks us
downloaded       : 1
unchanged (304)  : 18
blocked          : 1
```

Read `collect()` in the lab. It is fifteen lines, and three of the module's
rules are visible in it: the page is written to the archive before anything
else touches it, the validator is stored only after a successful save, and a
block is recorded and passed over.

**Your turn.**

1. Add a fourth day on which the blocked site answers again. What should the
   run record say about the day it missed?
2. The collector trusts the ETag. Make the pretend web lie, by returning the
   same ETag for a changed page, and describe what breaks. How would you detect
   it?
3. Add a unit boundary: collect one school at a time, and make one school's
   failure leave the others unaffected.

## Exercise

Pick any public site with dated pages, such as a city council's meeting
minutes. Write the registry entry you would need for it: the address pattern,
what counts as one unit of work, and how you would know a page changed.
