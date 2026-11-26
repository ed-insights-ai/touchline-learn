# Module 2 plan: the raw archive

Status: v3, final plan. Council R1 Opus 7, Sol 7, Neon 7; R2 Opus 7.5, Sol 8,
Neon 8; R3 Opus 8, Sol 8.5, Neon 8.5, all calling it build-ready. Their last copy
fixes are applied. 26 November 2026.
Nothing here is built yet.

Module 1 is the bar: one page, a chapter rail, four phases (Discover, Investigate,
Decide, Demonstrate), a named concept taught before any graded question, a
"Learn with AI" card in every part, an optional field work page, and two films.
Module 2 keeps that grammar and changes the middle, because this module's concept
is a mechanism (how a result is rebuilt) rather than a measurement (how much is
missing).

## 1. Place in the journey

- **The learner already knows** (Module 1): a run that finished is not a dataset
  that is complete; coverage = have ÷ expected, in the unit of analysis; the four
  page states; unknown is never zero; acceptance criteria for an agent. Monday's
  table went out at 53 of 54 finished matches, built from Friday's seven saved
  schedule pages, with Dunmore's home results recovered from visitors' pages and
  Cedar Grove's blank score named.
- **Three tables, named once.** Riley's "Friday's table" means the standings
  built from Friday's saved pages. Friday's original publication counted 46
  matches; Monday's repaired table, built from the same pages, counted 53 of 54
  and is the one readers have. Tuesday's table is Monday's numbers with the
  tidy rule's "State Lambert". The rebuild target is Monday's table with the
  name fixed.
- **The film just showed**: Tuesday. Kick adds a tidy rule so the published table
  spells out school names; "St." becomes "State", and the table says "State
  Lambert". Saint Lambert calls. Kick fixes the rule in a minute and says
  "Re-fetching!". Riley stops it: *"Can you rebuild Friday's table from the pages
  you kept, without asking a single site again, and show me you did?"*
- **The one question this module answers**: How do you recover when your own code
  is wrong? (the journey question in `src/data/journey.ts`)
- **The question it hands to Module 3**: the archive keeps whatever arrived,
  faithfully. Riley asks for Cedar Grove's 2019 season. The status is 200, a
  full table saves cleanly, and both URLs in the sidecar, requested and final,
  say 2019. Is the page 2019? (Its title says 2026; Module 3 opens there. This
  matches `03-provenance.md`.)

Riley's sentence has three clauses, and the module is built on them:

| Riley's clause | Concept it needs | Part |
|---|---|---|
| "from the pages you kept" | Raw versus derived; save before any code reads | The idea, Case 2 |
| "without asking a single site again" | Replay versus re-fetch; hold inputs fixed; a re-fetch can destroy evidence | Case 1, The decision |
| "and show me you did" | Fingerprints; reproducibility evidence | Case 3, Rewind |

## 2. The concept, named

**Derived data is a calculation over saved evidence.**

```
table = build(parse(saved pages, parser code, config))
```

Every published number is a function of three inputs: the saved pages, the code,
and the configuration (alias lists, the membership file, the season). Keep the
pages untouched and identify the code and config, and you can rebuild any output,
fix a bug by replaying, and say exactly why a number changed. Keep only the
output, and a bug in the code stays in the data.

Named terms, one at a time per `docs/writing-standard.md`:

1. **Raw data** (the raw zone; the industry also says bronze layer): bytes exactly
   as received, saved before any code reads them.
2. **Derived data**: anything computed from raw data. It can be deleted and
   rebuilt. Raw data cannot be rebuilt once the source changes.
3. **Replay**: rerunning code over saved raw data (a backfill when it covers
   history).
4. **Controlled comparison**: change one input at a time so a difference has one
   cause. When two inputs change together, their effects are **confounded**.
5. **Fingerprint**: a hash of everything that shapes a parse (code and config).
   When the stored fingerprint differs from the current one, the output is stale.
6. **Reproducibility and lineage**: the same inputs and code give the same output,
   and each output records which inputs and which code produced it.

Transferable skills ("by the end you can"):

1. Say what an archive must hold so a bug can be fixed by replay, and find the
   last layer before the damage.
2. Tell a replay from a re-fetch, and say what a re-fetch changes besides the bug,
   including the evidence it can overwrite.
3. Decide which outputs are stale after a change from a fingerprint, not a guess,
   and say why rebuilding too little is the dangerous mistake.
4. Write acceptance criteria that make an agent's rebuild checkable, and check a
   rebuild report against them.

Guessing: every graded check asks for a prediction the concept determines (which
rows change and because of which input, which archive can verify which fix, which
outputs rebuild and which pages are fetched). Each has three or more options or a
numeric answer, and the explanation names the rule.

## 3. Page outline

Lead line: *Fixing the code doesn't fix the table. Rebuilding from saved evidence does.*

Nine parts on the Module 1 rail. Each part ends with one Learn with AI card and one
NextPart line.

### Discover

**Part 1. Setup: Tuesday, one line of code** (~5 min)

- Three lines of story. Tuesday's table on screen: Monday's numbers, with "State
  Lambert" in one row. The Saint Lambert line quoted once.
- Kick's think trace and plan, in Module 1's chat components, picking up the
  film's "Re-fetching!": fix the tidy rule inside the parser, re-fetch all eight
  sites, regenerate. Every step sounds sensible. One line reconciles the film:
  you saw the rule on the published table, and Kick wrote it into the parser.
- Riley's three-clause ask as a prompt card.
- Prediction, not graded, saved and returned in Part 6: "If Kick had re-fetched,
  what would Saint Lambert's row show? Only the name changes / the name and the
  numbers change / can't tell." At this point "can't tell" is the justified
  answer, because nothing on screen says what the sites published since
  Friday. Part 6 says so before it reveals what did happen.
- AI card: "What is a re-fetch, and what is a replay?" Return task: name one thing
  that can change on a live site between two fetches.

**Part 2. The idea: raw, derived and replay** (~8 min)

- The formula card: *table = build(parse(saved pages, code, config))*.
- Terms 1 to 3, each with a Tuesday example.
- Signature figure (inline SVG), "Two ways to fix Tuesday": the replay lane keeps
  Friday's pages and changes the code; the re-fetch lane changes both, and its
  last box shows Friday's capture overwritten.
- Term 4, worked before it is graded: a plain example outside sports (a recipe
  changed on the day the oven was replaced; did the bread improve because of the
  recipe?), then the rule.
- Three rules, each tied to a clause of Riley's ask:
  1. Save the bytes before any code reads them. ("from the pages you kept")
  2. Change one thing at a time; a replay holds the evidence fixed. ("without
     asking a single site again")
  3. Record what produced each output. ("show me you did")
- Six lines of pseudocode for the archive-first loop.
- One "exact, not absolute" line: a replay can only rebuild from pages that were
  saved. Dunmore's page was never saved on Friday, so no replay recovers it; its
  results still come from visitors' pages, as on Monday.
- Knowledge check outside sports: a research team kept four things (the raw
  survey export, a cleaned spreadsheet, a summary chart, the cleaning script).
  For three situations (a bug in the cleaning script; the survey vendor deleting
  old responses; a reviewer asking how a chart number was produced), pick what
  the team needs.
- AI card: raw versus derived in three fields outside sports. Return task: the
  knowledge check above.

### Investigate

**Part 3. Case 1. Saturday's matches: replay versus re-fetch** (~8 min)

- Look: Tuesday's table (table A: Friday's pages, the old rule) and the two
  conference fixture records dated Saturday 21 November, the day after Friday's
  run: Eastbrook State v Harbor Point and St. Lambert v Dunmore, both still
  "scheduled" on Friday's pages.
- Stated before the prediction: both Saturday results were published by
  Tuesday, they are the only changes on the sites that affect the standings,
  and the code fix changes display names only.
- Graded prediction, before any other table appears: for the replay (table B:
  Friday's pages, the fixed rule) and the re-fetch (table C: Tuesday's pages, the
  fixed rule), tick the rows that change and name the input responsible for each
  (code, pages, or both).
- Reveal in the replay bench: one table with an A/B/C selector and a cell diff.
  A to B changes one cell, Saint Lambert's name. A to C also changes Saint
  Lambert's, Dunmore's, Eastbrook State's and Harbor Point's numbers, and the
  caption moves from 53 of 54 to 55 of 56 finished matches (a Module 1 callback:
  56 matches were expected all along, and two more finished). One exact line:
  the parsed rows also change, because "St. Brendan", a non-member opponent,
  stops being "State Brendan"; it never reaches the conference table.
  Saturday's results come from the sample's later
  collection (Eastbrook State 1–1 Harbor Point, St. Lambert 1–0 Dunmore).
- Name it: confounding. Table C changed two inputs, so Saint Lambert's row cannot
  say which change did what. Table B can.
- What Touchline does: a parser change re-reads archived bytes and never fetches.
  A re-fetch is a separate, deliberate act.
- Your claim: pick the honest changelog line for table B from four options.
- AI card: "Why changing two things at once hides the cause" (A/B tests, lab
  experiments). Return task: classify two new before/after comparisons.

**Part 4. Case 2. What Kick kept: raw or already cooked** (~8 min)

- Teach first: a fix can be verified only from a layer saved before the step that
  did the damage. Kick's tidy rule ran inside the parser, so parsed rows already
  carry it. Had the rule run only when the table was published, the parsed rows
  would have been enough. Rule: *replay from the last layer before the damage.*
- Look: three archives Kick could have written, each shown as a short excerpt from
  the same rows of Cedar Grove's schedule:
  - (a) parsed rows: date, opponent with the tidy rule applied, and scores,
    with a result of "Final" and no score read as 0–0; parser v1 ignored the
    vs/at column and stored every match as a home match;
  - (b) tidied HTML: Kick's saver ran its tidy step first, stripping scripts, ids
    and classes, collapsing whitespace and spelling out names; visible cell
    text, including "vs", "at" and a bare "Final", stays;
  - (c) the bytes as received, with a sidecar: requested URL, final URL, fetch
    time, status, content hash.
- Graded grid: three sample-grounded bugs × three archives. "Can you verify the
  corrected value from this archive alone?"
  1. The tidy rule turned "St. Lambert" into "State Lambert": (a) no, (b) no, (c) yes.
  2. The parser ignored the vs/at column, so away matches were stored as home
     matches: (a) no, only the opponent survives; (b) yes, the visible "vs" or
     "at" survives; (c) yes.
  3. Cedar Grove's 21 September result reads "Final" with no score and was
     read as 0–0: (a) no, a real 0–0 and a missing score look the same;
     (b) yes, the bare "Final" cell survives; (c) yes.
  Pattern: (a) 0 of 3, (b) 2 of 3, (c) 3 of 3. Each answer is visible in the
  excerpts shown.
- Name it: raw versus derived, and information loss is one-way. Saving after a
  transformation saves a derived copy. A raw copy also answers questions nobody
  has asked yet (Module 4 will want the discipline stats).
- The sidecar fields, one sentence each. The final URL is left as an open
  question for Module 3.
- What Touchline does: page bytes plus a sidecar per page; box scores stored
  beside their schedule, named by fixture id; the sidecar also records the page's
  coverage state from Module 1.
- AI card: what a raw zone keeps, and what breaks if you save after cleaning.
  Return task: one more bug to place on the grid.

**Part 5. Case 3. Which outputs are stale: fingerprints** (~8 min)

- Look: Kick's replay plan. "The bug is about Saint Lambert, so I'll re-parse
  only St. Lambert's page." It sounds careful, and it changes nothing in the
  table. St. Lambert's own page names the school only in its title; the name in
  the table comes from the opponent column of the other six pages, and those
  are the ones Kick skips. (`archive.ts` keys teams by slug and takes each
  displayed name from the opponent column, with the tidy rule applied.)
- Teach: a fingerprint is a hash of the parser code and every config input that
  shapes its output. Each parsed file keeps two things: the fingerprint that
  produced it and the content hash of the saved page it read. When either
  differs from now, the file is stale. Nobody has to guess which files a change
  touched.
- Fingerprint bench, as six presets (one scenario each, not free controls),
  each starting from a full set of up-to-date parsed files. For each, the
  learner predicts how many of the seven parsed schedules are rebuilt
  and how many pages are fetched:
  1. Fix the tidy rule: 7 rebuilt, 0 fetched.
  2. Edit a comment in the parser: 7 rebuilt, 0 fetched. Safe over-rebuilding.
  3. Add "Saint Lambert" to the alias list: 7 rebuilt, 0 fetched. Config is part
     of the fingerprint.
  4. Run again with nothing changed: 0 rebuilt, 0 fetched.
  5. Deliberately re-fetch Harbor Point's page with the same code, after it
     posted Saturday's result: 1 fetched, 1 rebuilt, because the saved page's
     content hash changed; Friday's capture of it is overwritten.
  6. Harbor Point's live site has changed since Friday, and you replay without
     fetching: 0 rebuilt, 0 fetched, and the change is invisible. Only a fetch
     can see the live site.
- Name it: cache invalidation, and its asymmetry. Rebuilding too much costs
  minutes. Rebuilding too little publishes a stale number with no error. A
  whole-file fingerprint over-rebuilds on purpose.
- What Touchline does: its fingerprint covers the parser's whole module plus its
  configured inputs, so an alias edit re-reads the archive without a single fetch.
- AI card: how build tools and caches decide what is stale (make, notebooks,
  memoisation). Return task: one preset from a non-sports build.

### Decide

**Part 6. The decision: what a re-fetch would have cost** (~6 min)

- Return the learner's Part 1 prediction and resolve it with Case 1's diff.
- Teach: two archive policies. In both, the parser, build code and config of
  every past run are kept in version control, so only page retention differs. *Latest only*: one capture per page, and a new
  fetch overwrites it. *Every capture*: each fetch is stored beside the last,
  with its fetch time. State plainly what each can rebuild.
- Touchline keeps the latest capture of each page, with its fetch time. So
  Friday's table could be rebuilt on Tuesday only because nothing had re-fetched
  those pages since. Kick's "Re-fetching!" would have overwritten Friday's
  evidence. After that, no replay of Friday is possible, and nobody can show what
  Monday's table was built from.
- Graded prediction: for each policy, after Tuesday's re-fetch, which of three
  questions can still be answered? (What does the table say today? Rebuild
  Monday's table exactly from its pages. What did Harbor Point's result cell for
  21 November say on Friday: blank, or a result Kick missed?) Latest only: the
  first. Every capture: all three. Harbor Point's page changed on Tuesday
  (blank to "T 1-1"), so the question has teeth. The explanation adds one line:
  a recorded hash can prove an unchanged page is identical, but it can never
  recover a page that changed.
- Your call, one fixed scenario with three options: a league office that must
  answer disputes about past tables for a season, with a stated storage budget.
  The answer follows from the questions the scenario says it must answer.
- AI card: latest-only versus versioned storage. Return task: pick a policy for a
  stated need.

**Part 7. Rewind: Tuesday with a replay requirement** (~5 min)

- The rebuild target is Monday's table with the name fixed (section 1).
- Riley's ask with acceptance criteria added (callback to Module 1's Rewind):
  a capture manifest of Friday's run (seven schedules saved and identified by
  content hash, Dunmore listed as unavailable, not absent); zero network requests,
  counted by a counter shown to catch a test request; the fingerprint of the fixed
  parser; a diff of Tuesday's table against the rebuild that explains every
  changed cell.
- Kick's replay report, taken from real lab output.
- Before the report appears, the learner writes one acceptance criterion of
  their own and compares it with Riley's (Module 1's write-and-compare pattern).
- The report names the build revision beside the parser fingerprint, so the
  code that produced the table is identified.
- The learner matches each report line to the criterion it meets and picks which
  claim would be unsupported without it (for example, "0 requests" is evidence
  only because the counter caught a test request).
- AI card: acceptance criteria for a reproducible rebuild. Return task: write one
  criterion for a rebuild of their own.

### Demonstrate

**Part 8. Prove it: the bug found in March** (~5 min)

- Unseen case, inspectable evidence: months later, someone notices that the
  match detail for Alder Ridge's 4–3 overtime win over Eastbrook State, a
  tournament semifinal, says 3–3 and shows no overtime. The box-score parser
  summed only the regulation periods. The learner sees two excerpts from the
  saved box score: the Score by Period table (1, 2, OT, F) and the 101:44
  penalty-kick goal, shown as time, team, scorer and play with the generated
  assist left off. Nothing else from that page, whose play-by-play is a
  Module 4 trap.
- Four auto-graded slots, as Module 1's Prove it uses controls, not free text,
  with answers computed in `archive.ts`:
  1. What to replay: all twelve saved Alder Ridge box scores.
  2. What is stale, and how you know: all twelve parsed box scores, because the
     box-score parser's fingerprint changed (not only the one with overtime).
     The box-score parser is its own module with its own fingerprint, so the
     seven schedules stay fresh; the page says so, and Part 5's presets count
     schedules only for the same reason.
  3. What to republish: the match detail built from box scores. Not the
     standings: a semifinal is not a regular season conference match, and both
     schools' schedules already show 4–3.
  4. What to tell readers: a correction note naming the match and the cause.
- Contrast line: a system that kept only parsed rows could still correct the
  final score from the schedule's "W 4-3", but could never recover the period
  breakdown or that the match went to overtime.
- AI card: write the recovery plan as a prompt to an agent. Return task: check
  the agent's plan against the four slots.

**Part 9. Carry it: same fix, three archives** (~5 min)

- Transfer: a clinic network (continuity with Module 1). For six months a
  downstream mapping step filed a form's "follow-up visit" box as "new patient".
  World A kept every raw submission. World B kept only the mapped table. World C
  kept raw submissions but overwrote each clinic's file whenever a clinic
  resubmitted. Learner picks the honest recovery claim for each.
- Recap of outcomes. Takeaway prompt: *"Can you rebuild this from saved inputs,
  with no new requests, and show me what changed and why?"*
- Handoff: Riley asks Kick for past seasons. Cedar Grove's 2019 page saves with a
  200 and a full table, and both URLs in its sidecar say 2019. Is it 2019?
- AI card: same rows, different archives (moves the worlds to another field).
  Return task: three new questions.

Estimated core time: 55 to 60 minutes, close to Module 1.

## 4. Media

- **Signature figure** (Part 2): inline SVG, replay lane versus re-fetch lane,
  with the overwrite drawn. Module 1's visual language.
- **Replay bench** (Parts 3 and 5): one component with an A/B/C table selector and
  a cell diff (Case 1), and six fingerprint presets (Case 3). It shows the table,
  the diff against Tuesday's table, fingerprints, and a request count labelled as
  simulated. The measured count appears only in Rewind, from the lab. All values
  are computed at build time from the sample, as Module 1's Bench does. Laid out
  for iPad landscape first.
- **Lesson video** (phase 2, optional): "Replay, Don't Refetch", about 2 minutes,
  to the lesson video standard. Built only after the page passes council.
- **Closer film** (phase 2): hooks Module 3 with Cedar Grove 2019. Page first.
- No new expand/collapse panels. Reveals follow Module 1's gated check pattern.

## 5. Learn with AI cards

Nine cards, one per part, listed above with their return tasks. Each has a Send
page with a reply the owner pastes from ChatGPT (`src/components/primer/`
pattern). Slugs: `02-archive-ai-refetch`, `-raw`, `-confound`, `-keep`,
`-fingerprint`, `-captures`, `-criteria`, `-recovery`, `-carry`.

## 6. Technical grounding

Checked against the sample and the Touchline pipeline source on 26 November 2026.
The page describes these mechanisms generically, never the private code, hosts
or storage.

- Archive layout: one file per page, named by school, season, gender and kind,
  with a sidecar. Box scores sit under the school whose schedule linked them,
  named by fixture id. (Already public.)
- Real sidecar contents: requested and final URL, ETag and Last-Modified, a
  content signature, the parse fingerprint, fetch and verify times, the page's
  coverage outcome, and a cached parse.
- Fingerprint: a hash of the parser's whole module source plus configured inputs
  (aliases, membership, season). A stale fingerprint re-reads archived bytes and
  never forces a fetch.
- Captures: latest only. A deliberate re-fetch rewrites the capture.
- Content signature with render-noise normalisation: field work only.
- Conditional requests and atomic writes are on the Module 1 field work page;
  Module 2 links there.

Sample facts the page uses (all verified):

- Saturday 21 November: `pressbox:eastbrook-state:7318` and
  `pressbox:st-lambert:8779`, both scheduled on Friday's pages; the later
  collection has them 1–1 and 1–0.
- Sunday 22 November: the championship `tally:alder-ridge:8211` is not a regular
  season conference game and does not enter the standings.
- All seven Friday schedule pages contain "St. Lambert" (six as an opponent).
- Box 8210: Score by Period 1, 2, OT, F; Alder Ridge 4–3, with a 101:44 goal.
- Every schedule row carries a "vs" or "at" cell before the opponent.
- Box 8210 is a tournament semifinal (`conference_game: false`); its
  play-by-play is internally inconsistent by design, so only the Score by
  Period table and one goal line are shown.
- The Fouls row's id is "offsides". Module 4 owns it, so Module 2 does not use it.
- Cedar Grove's 21 September final with St. Lambert reads "Final" with no score
  on both schools' pages.
- Cedar Grove 2019: final URL equals requested URL (2019); the title says 2026.
- The later collection also changes the 8 September Alder Ridge score. Module 7
  owns that beat, so Module 2's Tuesday pages leave it alone: the sites still say
  1–0, and the change is the second pipeline's.

## 7. Sample, lab and data changes

1. **Friday's capture set.** The film and Module 1 say Dunmore never answered on
   Friday and was still unavailable on Monday, but the sample holds eight 2026
   schedule pages and the lab replays all eight. The generator adds `fetched_at`
   to every sidecar (as the real sidecar has) and writes Friday's capture
   manifest at `sample/manifests/2026-11-20-friday.json`: seven schedules and
   twelve box scores saved, Dunmore unavailable. Nothing new goes under
   `sample/raw_html/`, because `first-run.ts`, `m01_collect.py` and
   `m03_proof.py` treat every entry there as a school.
   Dunmore's 2026 page stays on disk as a later capture (dated after Tuesday), so
   `m03_proof.py` still finds eight files.
2. **Tuesday's pages**, as a separate scratch capture set at
   `sample/captures/2026-11-24-tuesday/` for table C: Friday's pages with
   Saturday's two results filled in from the generator's existing later scores,
   and Sunday's championship result (8211, 1–6) filled in on the Alder Ridge
   and Hartwell Tech pages and excluded from the standings as postseason, as
   `m01_collect.py` does. Dunmore still not answering. Nothing else changes.
3. **Lab** `m02_archive.py`: replay what the manifest lists (assert 7, not 8);
   build standings from the replayed pages by fixture id and check that A to B
   changes only Saint Lambert's name and keeps every number and the named gap;
   fingerprint the parser plus its config; add `--tuesday` to print the
   confounded diff; move `--missing` to `hartwell-tech`. Update `run_all.py` and
   the quoted output together.
4. `src/lib/archive.ts` computes tables A, B and C, the diffs and the preset
   results at build time, resolving teams by slug before display names. The page
   quotes no hand-typed number.
5. `scripts/check_lab_output.py` covers the lab output quoted in Rewind.

## 8. Field work page (optional deep dive)

`02-archive-field-work`: the lab; content signatures and render noise; why the
platform hashes a whole module rather than one function; retention cost of the
two archive policies; bronze, silver and gold as an industry pattern and where
Touchline's steps sit in it. Storage location gets one generic sentence at most.

## 9. Scope and risks

- In scope: the page, the bench, the SVG figure, nine AI cards, the field work
  page, the sample and lab changes above.
- Deferred until the page passes council: both films.
- Not taught: Desk internals, scraper specifics, real site quirks.
- Risk: the film says the rule is "on the published table". Part 4 states where
  Kick put it (inside the parser) and uses that to teach "the last layer before
  the damage".
- Risk: "St." also appears in Module 5's name variants. Module 2 owns the bug;
  Module 5 calls back to it on purpose (`docs/story-path.md` open risk).
- Risk: length. If council finds the built page long, merge Rewind into the
  Decision before cutting teaching.

## 10. Build order

1. Sample and lab changes, checks green.
2. `archive.ts` and the replay bench.
3. Parts 1 to 9, writing standard applied.
4. AI cards and Send pages (owner supplies the replies).
5. Field work page.
6. Council rounds on the built page toward 8 or 9, then push to main.
7. Films, if the owner wants them.
