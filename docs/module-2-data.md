# Module 2 data: `src/lib/archive.ts`

Every number Module 2's page shows comes from `src/lib/archive.ts`, computed at
build time from the sample, or from the lab report it re-exports. Import from
it; never type a number into a component. The module throws at import, which
fails the build, if any fact the page relies on stops holding (plan section 6,
"Sample facts", and the counts below). Values here are the current ones, for
reference while writing; the code is the source.

Until a page imports it, run its assertions with
`node scripts/check_archive.mjs` (Node 22.18 or later). It prints the headline
values and ends `RESULT: archive.ts imports and every assertion holds`.

## What the sample holds for Module 2

| Path | What it is |
|---|---|
| `sample/manifests/2026-11-20-friday.json` | Friday's capture manifest: 20 pages requested, 19 saved by content hash (7 schedules, 12 Alder Ridge box scores), Dunmore's schedule listed as `unavailable` with its reason. |
| `sample/raw_html/**` | Friday's pages. Every sidecar now has `fetched_at` and `sha256`. |
| `sample/raw_html/dunmore/2026-men-schedule.html` | Not Friday's: a later capture (`fetched_at` 2026-11-25T08:05), kept so Module 3's lab still finds eight 2026 pages. No Module 2 table reads it. Its bytes cannot change without changing Module 1, so its 21 November cell is still blank: Dunmore's site had not posted Saturday's result when it was taken. Do not show this page in Module 2. |
| `sample/manifests/2026-11-25-later.json` | The four pages captured after Tuesday: Dunmore's 2026 schedule, Cedar Grove's and Dunmore's 2019 requests, and the Alder Ridge 2025 page Module 3 uses. Every page in the raw zone is now listed in a manifest. |
| `sample/manifests/2026-11-24-tuesday.json` | Tuesday's manifest: schedule pages only, 7 saved, Dunmore still unavailable. |
| `sample/captures/2026-11-24-tuesday/**` | Tuesday's seven schedule pages: Friday's bytes with three result cells filled in, 7318 (Eastbrook State 1-1 Harbor Point, 21 Nov), 8779 (St. Lambert 1-0 Dunmore, 21 Nov) and 8211 (the championship, Alder Ridge 1-6 Hartwell Tech, 22 Nov). Only the result cell changes; no box-score link is added. Brightwater State's and Cedar Grove's pages are byte-identical to Friday's; the other five each change one row. The 8 September 8203 score is untouched (Module 7 owns it). |

Nothing new is under `sample/raw_html/`: `first-run.ts`, `m01_collect.py` and
`m03_proof.py` treat every folder there as a school.

## How the tables are built

The TypeScript build mirrors `labs/m02_archive.py`:

- **Parse** each schedule page into rows: fixture id (`data-game`), date,
  side (`vs`/`at`), opponent slug, opponent as shown, result. The slug is
  resolved from the raw published name through `aliases.json`; the shown
  name is the raw name with the tidy rule applied (`tidyV1` is the bug,
  `tidyV2` the fix).
- **Build**: keep rows whose opponent is a 2026 member; match the two pages of
  a fixture by its id (both pages must agree on date, host and score); apply
  the format rule, as Module 1's lab does: each member hosts every other once,
  so a later meeting at the same host is postseason (7594, 8210, 8211). Teams
  are keyed by slug; each team's displayed name is what the opponent column of
  the other pages shows, so it is the tidy rule's output, and the build throws
  if two pages show a team differently.
- Sort: points, then goal difference, then slug (Module 1's order).

Table A and table B equal Module 1's `repaired` table number for number
(asserted); Friday's original publication (Module 1's `reported`) counted 46.

## Exports

### Pages and manifests

| Export | What it is | Value now |
|---|---|---|
| `SEASON` | The season. | `2026` |
| `members` | 2026 conference members, slugs, sorted. | 8 slugs |
| `fridayManifest`, `tuesdayManifest` | The manifests as typed objects (`Manifest`, with `ManifestPage` entries). | 20 requested / 19 saved; 8 / 7 |
| `fridayPages`, `tuesdayPages` | Saved schedule captures (`Capture`: slug, path, html, sha256, fetchedAt), each checked against its manifest hash. | 7 each |
| `rawRows(html)`, `parseSchedule(html, tidy)` | The row reader and the parser. | |
| `tidyV1`, `tidyV2` | The bad and fixed tidy rules, as in `labs/m02_parser_tuesday.py` and `labs/m02_parser_fixed.py`. | `"St. Lambert"` to `"State Lambert"` / `"Saint Lambert"` |

### Case 1: tables A, B, C and the diffs

`Table` has `key` (`"A"`, `"B"`, `"C"`, `"D"` or `"Kick"`), `rows`
(`TableRow`: slug, name, place, p, w, d, l, gf, ga, gd, pts; a superset of
Module 1's `TableRow`, so `FirstRunTable` can render it), `expected`, `listed`,
`finished`, `scored`, `caption`, `postseason` (fixture numbers), `gaps` and
`parsed` (parsed rows by page slug).

Lists of schools are `{ slug, name }` objects throughout, with `name` the
school's display name from `programmes.json`.

| Export | What it is | Value now |
|---|---|---|
| `tableA` | Tuesday's table: Friday's pages, `tidyV1`. | caption `53 of 54 finished matches`, 56 expected; St. Lambert shown as `State Lambert`, 6th, P12 Pts 12 |
| `tableB` | Replay: Friday's pages, `tidyV2`. | `53 of 54 finished matches`; `Saint Lambert`, every number as A |
| `tableC` | Re-fetch: Tuesday's pages, `tidyV2`. | `55 of 56 finished matches` |
| `tableD` | Tuesday's pages with `tidyV1`. Not a choice for learners; it is the controlled half that attributes C's cells. | |
| `tables` | `{A, B, C}` each with `table`, `label`, `pages`, `rule`, for the selector. | |
| `COLUMNS` | Diffed columns. | `place, name, p, w, d, l, gf, ga, gd, pts` |
| `diffAB` | Changed cells A to B (`Cell`: slug, name, column, before, after, input). | 1 cell: st-lambert `name` `State Lambert` to `Saint Lambert`, input `code` |
| `diffAC` | Changed cells A to C, each attributed by comparing with B (code only) and D (pages only). | 20 cells in 4 rows; Saint Lambert's name `code`, every number `pages`; no place changes |
| `rowChanges` | Case 1's graded answers by row: `{B, C}` of `RowChange` (slug, name, input, columns). | B: st-lambert `code`. C: eastbrook-state `pages` (p, d, gf, ga, pts), dunmore `pages` (p, l, ga, gd), st-lambert `both` (name, p, w, gf, gd, pts), harbor-point `pages` (p, d, gf, ga, pts) |
| `prediction` | Part 1's ungraded prediction, resolved: what a re-fetch did to Saint Lambert's row. | `answer: "name-and-numbers"` |
| `stBrendanNote` | The parsed rows also change for St. Brendan, a non-member that never reaches the table. `pages` lists `{slug, name}`. | `State Brendan` to `Saint Brendan`, 4 rows on Alder Ridge, Cedar Grove, Eastbrook State and St. Lambert's pages; 16 parsed rows change A to B in all, 12 of them St. Lambert's |
| `saturday` | Saturday's two matches: id, date, slugs and names, Friday status, later score. | 7318 Eastbrook State 1-1 Harbor Point; 8779 St. Lambert 1-0 Dunmore; both `scheduled` on Friday |
| `championship` | 8211, with `home`/`away` slugs and `homeName`/`awayName`. | Alder Ridge 1-6 Hartwell Tech, 2026-11-22, `conferenceGame: false`, `inStandings: false` |
| `story` | Story numbers. | `fridayOriginal` 46; `monday` 53 of 54; `refetch` 55 of 56; `expected` 56; names `St. Lambert` / `State Lambert` / `Saint Lambert`; `sites` 8 |

Table A gaps (`tableA.gaps`, equal in B): `no-score` 2026-09-21 cedar-grove v
st-lambert; `unavailable` dunmore, "site did not answer after 3 tries".

### Case 2: what Kick kept

`case2.rows` are the same three Cedar Grove rows from Friday's page: 21 Sep vs
St. Lambert `Final`; 2 Oct at Hartwell Tech `W 2-1`; 18 Oct at St. Lambert
`L 0-1`. `case2.archives` holds each form, built from those bytes, with an
`excerpt` string to show:

- `a`, parsed rows: what parser v1 wrote (tidy rule applied, every match stored
  as a Cedar Grove home match, a bare `Final` read as 0-0).
- `b`, tidied HTML: attributes except `href` stripped, whitespace collapsed,
  the tidy rule applied; visible cell text stays.
- `c`, bytes as received, plus `sidecar` (requested and final URL, fetched_at,
  status, sha256).

`case2.grid` answers each bug from those forms by code, not by a typed table:
the name is verifiable only where `tidyV2` of the kept opponent gives
`Saint Lambert`; the side only where a `vs`/`at` cell survives; the blank score
only where the kept form of `Final` differs from the kept form of a real
`T 0-0`. Current: name a no, b no, c yes; side a no, b yes, c yes; blank a no,
b yes, c yes. `case2.pattern` is `{a: 0, b: 2, c: 3}`.

### Case 3: fingerprints

| Export | What it is | Value now |
|---|---|---|
| `fingerprints` | The lab's fingerprints, recomputed here from the same bytes: SHA-256 of the parser's whole module (`labs/m02_parser_tuesday.py` or `labs/m02_parser_fixed.py`), then `labs/common.py` (its page reader), `aliases.json`, `membership.json` and the season, first 12 hex. Whole files, so any edit to them, even a comment, changes it. | `v1` `16ede3aa872b`, `v2` `cceba9f64b7c` |
| `kickPartial` | Kick's "re-parse only St. Lambert's page". `pagesNamingItAsOpponent` lists `{slug, name}`. | `tableCellsChanged` 0; `parsedRowsChanged` 1 (St. Brendan on St. Lambert's own page); St. Lambert's page names the school only in its title; the 6 pages naming it as an opponent are the 6 skipped |
| `tableKick` | That table. | equal to `tableA` |
| `presets` | The six presets (`Preset`: id, label, fingerprintBefore, fingerprintAfter, files, rebuilt, fetched, replacesFridayCapture, fridayEvidenceLost, liveDiffers, `simulated: true`). | see below |

Presets run a small staleness model: seven parsed schedules, each recording
the fingerprint that wrote it and the content hash of the page it read; a file
is rebuilt when either differs from now. Fingerprints are real hashes: the
comment preset adds a comment line to `labs/m02_parser_fixed.py`, the alias
preset adds "Saint Lambert" to `st-lambert` in `aliases.json`, and both are
hashed. A "live" page is Tuesday's capture. Rebuilt and fetched counts are
simulated (every preset carries `simulated: true`; label them so on the page);
the measured request count is the lab's, in Rewind.

`replacesFridayCapture` is true whenever the preset fetches: the archive keeps
the latest capture only. `fridayEvidenceLost` is true when the replaced capture
differed from the new one, so Friday's bytes for that page are gone.

| id | rebuilt | fetched | fingerprint | notes |
|---|---|---|---|---|
| `fix-rule` | 7 | 0 | `16ede3aa872b` to `cceba9f64b7c` | |
| `comment` | 7 | 0 | `cceba9f64b7c` to `1dda271d65ce` | |
| `alias` | 7 | 0 | `cceba9f64b7c` to `c959a2f9a449` | |
| `nothing` | 0 | 0 | unchanged | |
| `refetch-harbor` | 1 | 1 | unchanged | `replacesFridayCapture` and `fridayEvidenceLost` true (content hash changed) |
| `live-changed` | 0 | 0 | unchanged | `liveDiffers: true`: the change is invisible without a fetch |

### Part 6: two archive policies

`policies.latest` and `policies.every` simulate Tuesday's re-fetch of every
schedule into a store holding Friday's captures, then answer the three
questions: `today` (what the table says now), `monday` (rebuild Monday's table
exactly: every Friday hash still held), `harborFriday` (Harbor Point's 21
November cell on Friday can be read). `harborFridayCell` holds that cell's
text where it can be read. `policies.simulated` is true.

| | today | monday | harborFriday |
|---|---|---|---|
| `latest` | true | false | false |
| `every` | true | true | true; `harborFridayCell` is `""` (blank) |

`policies.harborCell` is `{friday: "", tuesday: "T 1-1"}`.
`policies.unchangedSinceFriday` is `[{slug: "brightwater-state", name:
"Brightwater State"}, {slug: "cedar-grove", name: "Cedar Grove"}]`: the two
pages a recorded hash can still prove identical. `changedSinceFriday` lists
the other five the same way.

### Part 7: Rewind

`replayReport` is the lab's replay report as one string, and `rewind.lines`
the same split into lines. Render it verbatim (a `<pre>`). It is stored in
`src/data/quotes/m02_archive.replay-report.txt`.

`rewind` also gives the parsed fields: `manifest`, `schedulesSaved` 7,
`boxScoresSaved` 12, `requested` 20, `unavailable` (Dunmore and its reason),
`requests` 0, `fingerprint` `cceba9f64b7c`, `fingerprintTuesday`
`16ede3aa872b`, `buildRevision` (the git blob id of `labs/m02_archive.py`, so
it changes whenever the lab does; it hashes the file's bytes, so a checkout
that rewrites line endings would fail it), `cellsChanged` 1. At import the
build checks that both quoted fingerprints are the parsers', its build
revision is the lab file as it stands, and its cell count and caption match
`diffAB` and the tables.

The report currently reads:

```text
Replay report: Friday's pages rebuilt with the fixed parser
-----------------------------------------------------------
manifest       : sample/manifests/2026-11-20-friday.json
replayed       : 7 of the 7 schedules it lists as saved, each matching its content hash
listed         : Dunmore, unavailable: site did not answer after 3 tries
requests       : 0, counted by a counter that caught 2 of 2 test requests
fingerprint    : cceba9f64b7c, the fixed parser (was 16ede3aa872b on Tuesday)
  covers       : labs/m02_parser_fixed.py, labs/common.py, aliases.json, membership.json, season 2026
build revision : <blob>, git blob of labs/m02_archive.py
tables         : Tuesday's 53 of 54 finished matches; rebuild 53 of 54 finished matches
cells changed  : 1
  Saint Lambert   name 'State Lambert' -> 'Saint Lambert': the tidy rule, the only input that changed
unchanged      : the other 79 cells, every place and number
named gap      : 2026-09-21 Cedar Grove v Saint Lambert finished with no score
named gap      : Dunmore's page unavailable, its home results read from visitors' pages

RESULT: rebuilt by replay with 0 requests; only Saint Lambert's name changed
```

**How the quote is verified.** `scripts/check_lab_output.py` reads every file in
`src/data/quotes/`. The name's first part names the lab (`m02_archive`), and
the file's lines must appear in order, unbroken except at a line of `...`, in
the standard output of one of that lab's runs listed in `labs/run_all.py` that
ended with its expected exit code. A quote with no real line fails. **After any
change to the lab or the sample**, regenerate the quote:

```bash
python labs/m02_archive.py | sed -n '/^Replay report/,$p' > src/data/quotes/m02_archive.replay-report.txt
```

A component that quotes other lab output (the `--tuesday` diff, for instance)
should add another file here, such as `m02_archive.tuesday-diff.txt`, cut from
`python labs/m02_archive.py --tuesday`, rather than a bare code fence.

### Part 8: Prove it, box 8210

| Field | Value now |
|---|---|
| `proveIt.fixture`, `date`, `round`, `conferenceGame` | `tally:alder-ridge:8210`, 2026-11-15, `Semifinals`, false |
| `proveIt.home`, `proveIt.away` | `{slug, name}`: Alder Ridge, Eastbrook State |
| `proveIt.scoreByPeriod` | head `Team, 1, 2, OT, F`; rows `Eastbrook St. 2 1 0 3`, `Alder Ridge 1 2 1 4` (as published) |
| `proveIt.goal` | time `101:44`, team `Alder Ridge` (abbr `ARU`), scorer `Victor Holm`, play `Penalty kick`; the assist is deliberately not exported |
| `proveIt.published`, `proveIt.buggy` | 4-3, read from the F column and checked against the fixture; the regulation-only sum, 3-3 |
| `proveIt.schedules` | Alder Ridge's page `W 4-3`, Eastbrook State's `L 3-4` |
| `proveIt.slots.replay` | `boxScores` 12 (Alder Ridge, all of Friday's box scores), `withOvertime` 1 |
| `proveIt.slots.stale` | `boxScores` 12 of 12; `schedules` 0, `schedulesFresh` 7; `boxParser` fingerprints; `simulated: true` |
| `proveIt.slots.republish` | `matchDetail: true`, `standings: false` (8210 is postseason by the format rule) |
| `proveIt.slots.tell` | a correction note: `Alder Ridge 4-3 Eastbrook State, semifinal, 15 November`; cause `the box-score parser summed only the regulation periods` |

The stale counts run the Case 3 model with the box-score parser as its own
module. Its fingerprint is the same recipe over `labs/m04_parse.py` (the
course's box-score parser), before and after a one-line fix is appended
(`b18d1839e46e` to `56ee1b475732`); the schedule parser's fingerprint does not
change. Simulated: no lab runs this fix.

Do not show the 8210 play-by-play (it is a Module 4 trap, out of order by
design) or the Fouls row (id `offsides`, Module 4's).

## The lab

```bash
python labs/m02_archive.py                          # the replay and its report (exit 0)
python labs/m02_archive.py --tuesday                # the confounded diff against Tuesday's pages (exit 1)
python labs/m02_archive.py --missing hartwell-tech  # a schedule page missing from the archive (exit 1)
```

The two parser revisions are whole modules, `labs/m02_parser_tuesday.py` and
`labs/m02_parser_fixed.py`, identical except for the tidy rule and their
docstrings. The default run reads Friday's manifest, checks every saved page's
content hash, proves its network counter on two test requests (a name lookup
and a direct connection), then replays three times: Tuesday's parser (table A),
the same again (0 re-parsed: fingerprint and content hash unchanged), and the
fixed parser (7 re-parsed), and prints the report. A page whose bytes differ
from the manifest is refused, not parsed; a parsed file whose output is missing
is rebuilt even if its lineage record survives. `--tuesday` builds table C from
Tuesday's capture and prints all 20 changed cells with "inputs changed: parser
code and pages"; it stops with exit 2 if any page fails its hash. `--missing`
replays a scratch archive without one school's schedule page (its box scores
stay): the manifest check before and the count after both notice, but the
replay itself skips the page without a word, which is the learner's exercise.
`--tuesday` and `--missing` cannot be combined.
