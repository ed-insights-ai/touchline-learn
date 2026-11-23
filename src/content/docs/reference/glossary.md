---
title: Glossary
description: The terms this guide uses, each with the meaning it has here, and where to read further.
sidebar:
  order: 1
---

| Term | Meaning in this guide |
|---|---|
| Atomic | Happens completely or not at all. A reader never sees a half-written file. |
| Backfill | Running the pipeline over past periods, usually from the archive. |
| Box score | One match's detailed record: score by period, team statistics, player lines, events. |
| Bronze, silver, gold | Raw, clean and derived layers of a data platform. |
| Canonical | The one agreed form of a name or record. |
| Contract | A versioned, written definition of a file's shape that producers and consumers both rely on. |
| Coverage | A record of what was collected and what was not, with reasons. |
| Delta | A file holding only the rows that changed since the last snapshot. |
| Deterministic | Same input, same output, every time. |
| Entity resolution | Deciding which records refer to the same real-world thing. |
| Fail closed | When a check cannot run, treat it as a failure, not a pass. |
| Fixture | One scheduled or played match. |
| Gate | A check with the power to stop the pipeline. |
| Idempotent | Safe to run more than once. Repeating it changes nothing further. |
| Lineage, provenance | Where a piece of data came from, and the evidence for that. |
| Manifest | A small file that lists what a release contains, with sizes and hashes. |
| Monitor | A check that always finishes and reports, without stopping anything. |
| Parity | Agreement between two pipelines' outputs for the same period. |
| Pinning | Fixing a dependency to one exact version. |
| Programme | One school's team: its men's or women's soccer side. |
| Schema | A written rule for a file's shape: which fields exist and what type each one is. |
| Shadow run | Running a new pipeline beside the old one without making its output official. |
| Sidecar | A small file stored beside another to describe it, such as the address a page was fetched from. |
| Slug | A short, stable, lowercase identifier such as `alder-ridge`. |
| Snapshot | A complete copy of the dataset at one moment. |
| System of record | The copy everyone agrees is authoritative. |
| Unit | The smallest independently runnable piece of collection: one conference, gender and season. |
| Validator (HTTP) | A value such as an ETag that lets a client ask "has this changed?" |
| Witness | An independent piece of evidence about what a page is, such as the year in its title. |

## Further reading

- Kleppmann, *Designing Data-Intensive Applications*, chapters 10 and 11, on
  derived data and reprocessing.
- Reis and Housley, *Fundamentals of Data Engineering*, on the data engineering
  lifecycle.
- Christen, *Data Matching*, on record linkage.
- Little and Rubin, *Statistical Analysis with Missing Data*, for the theory
  behind Module 6.

## See the platform

- The public site built by this pipeline: [ed-insights-ai.github.io/touchline-ui](https://ed-insights-ai.github.io/touchline-ui/)
- The site's source code: [github.com/ed-insights-ai/touchline-ui](https://github.com/ed-insights-ai/touchline-ui)
- This guide's source, sample and labs: [github.com/ed-insights-ai/touchline-learn](https://github.com/ed-insights-ai/touchline-learn)
