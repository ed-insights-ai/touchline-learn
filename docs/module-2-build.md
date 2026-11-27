# Module 2 build contract

How the Module 2 page is assembled, how a part is written, and who owns which
file. The spec is `docs/module-2-plan.md`; this file only says how to build it.
Module 1 is the reference implementation for every pattern named here.

## How the page is assembled

`src/content/docs/modules/02-archive.mdx` renders `ArchiveLesson.astro`, which
renders the journey header, the orientation (lead line and "By the end you can"),
the chapter rail and the nine parts in order:

| # | Part id | Component | Phase |
|---|---|---|---|
| 1 | `setup` | `archive/Setup.astro` | Discover |
| 2 | `idea` | `archive/Idea.astro` | Discover |
| 3 | `case-saturday` | `archive/CaseSaturday.astro` | Investigate |
| 4 | `case-kept` | `archive/CaseKept.astro` | Investigate |
| 5 | `case-fingerprint` | `archive/CaseFingerprint.astro` | Investigate |
| 6 | `decision` | `archive/Decision.astro` | Decide |
| 7 | `rewind` | `archive/Rewind.astro` | Decide |
| 8 | `prove-it` | `archive/ProveIt.astro` | Demonstrate |
| 9 | `carry-it` | `archive/CarryIt.astro` | Demonstrate |

The part names, rail labels, outcomes and lead line live in
`src/lib/archive-parts.ts`. Every part currently renders a dashed **Draft** box
(`archive/Draft.astro`) listing what the plan puts there. Delete the `<Draft>`
when the part is written.

## Ownership

Edit only the files your track owns. If you need a change in someone else's
file, make the smallest change and list it in your report.

| Track | Owns |
|---|---|
| Discover | `archive/Setup.astro`, `archive/Idea.astro`, `archive/TwoLanes.astro` |
| Investigate | `archive/CaseSaturday.astro`, `archive/CaseKept.astro`, `archive/CaseFingerprint.astro`, `archive/ReplayBench.astro`; may add exports to `src/lib/archive.ts` |
| Decide and Demonstrate | `archive/Decision.astro`, `archive/Rewind.astro`, `archive/ProveIt.astro`, `archive/CarryIt.astro` |
| AI | `src/lib/archive-ai.ts`, Module 2 primer components in `src/components/primer/`, the nine `02-archive-ai-*.mdx` Send pages, `02-archive-field-work.mdx` |
| Data | `src/lib/archive.ts`, `sample/`, `labs/m02_archive.py`, `labs/run_all.py` |
| Integrator | `ArchiveLesson.astro`, `src/lib/archive-parts.ts`, `src/lib/archive-state.ts`, `archive/AiCard.astro`, `archive/Draft.astro`, `src/lib/lesson.ts`, `src/lib/lessons.ts`, `src/components/lesson/*`, the shared `src/components/coverage/*` components, `JourneyTop.astro`, `JourneyContent.astro`, `scripts/compare_dist.py`, this file |

Every number on the page comes from `src/lib/archive.ts` (or is lab output that
`scripts/check_lab_output.py` checks). Never type a number into a part.

## How a part is written

A part is one `<section>` whose id is the part id, so the rail can find it.

```astro
---
import PartHead from "../coverage/PartHead.astro";
import Beat from "../coverage/Beat.astro";
import NextPart from "../coverage/NextPart.astro";
import AiCard from "./AiCard.astro";
---

<section id="case-kept">
  <PartHead id="case-kept">Case 2. What Kick kept: raw or already cooked</PartHead>
  <p>Teach the concept first.</p>
  <Beat part="case-kept" name="Look" title="Three archives Kick could have written" />
  ...
  <AiCard part="case-kept" />
  <NextPart from="case-kept">The parser is fixed. Which saved pages need parsing again?</NextPart>
</section>
```

The shared components look up the part in the right module from the page's
route, so a Module 2 part writes them exactly as Module 1 does.

- **PartHead** `id` prints the phase and "Part n of 9" above the heading.
- **Beat** `part`, `name` (Look, Name it, What Touchline does, Your claim),
  `title`: the small beat label and an `h3` with id `{part}-{beat}`. The rail
  lists every `h3[id]` in a part as a beat. Use `<h3 class="cv-step" id="...">`
  for numbered steps, as Module 1's Setup does.
- **NextPart** `from` is the one transition line at the end of every part except
  Carry it. It throws at build time on the last part.
- **KickThink** (`duration`, `thoughts`) and **KickPlan** (`steps` of
  `{ stage, text }`) are Kick's think trace and plan. Prompt cards, agent replies
  and Riley's lines use Module 1's markup (`cv-user-prompt`, `cv-agent-reply`,
  `cv-say`); copy it from `coverage/Setup.astro` and `coverage/Rewind.astro`.
- **AiCard** `part` renders that part's Learn with AI card (below).

## Gated checks

Every graded check uses Module 1's gated pattern: the learner answers, the
explanation unlocks, and the rail counts it. No new expand or collapse panels.
The runtime (`coverage/Runtime.astro`) drives all of it from data attributes, so
a check needs no script of its own.

`lesson/Check.astro` and `lesson/Choice.astro` write the common case:

```astro
---
import Check from "../lesson/Check.astro";
import Choice from "../lesson/Choice.astro";
const archives = [["parsed", "Parsed rows"], ["tidied", "Tidied HTML"], ["raw", "Bytes as received"]] as [string, string][];
---

<Check once="kept-grid" note="Answer all three, then check.">
  <Choice save="kept-lambert" label="Which archive can verify the Saint Lambert fix on its own?"
    options={archives} answer="raw"
    why="Bytes as received. The tidy rule ran inside the parser, so the parsed rows already carry it."
    wrong={{ parsed: "Parsed rows were written after the tidy rule ran." }} />
  <Choice radio save="kept-home" label="..." options={archives} answer="raw" why="..." />
  <p slot="reveal">What the learner reads once the check is answered.</p>
</Check>
```

- `once` names the check. `save` names the stored answer. Both share one store
  for the whole module, so **prefix every name with the part** (`kept-`,
  `stale-`, `decide-`) to keep tracks from colliding.
- A select's `answer` may list several right values with `|`; a radio's takes one. `why` is the explanation
  (shown on submit, and in review mode). `wrong` maps a wrong value to a hint.
- `<Check predict="...">` makes an ungraded prediction: the feedback line is the
  text you pass (an empty string gives Module 1's line).

For other question shapes write the markup directly inside a `Check`, as Module 1
does: a `[data-q]` element with `data-type` of `number`, `range` (two numbers,
any order, `data-answer="110,230"`), `pair` or `radio`, a `[data-save]` field,
and a `<p class="cv-fb" role="status"></p>`. See `coverage/Concept.astro` and
`coverage/CarryIt.astro`.

Two more gates, both from Module 1:

- **Write and compare** (`data-commit`): a textarea with `data-save`, a button
  with `data-commit-btn`, a skip button with `data-commit-skip`, and a
  `.cv-reveal` holding the model answer. See `coverage/Rewind.astro`.
- **Ungraded choice** (`data-gate`): a fieldset of radios with `data-save`. It
  counts as done once anything is picked. See `archive/Setup.astro`.

## Cross-part state

Answers are kept in the runtime's store for this module (`touchline-m2-archive`
in `localStorage`, set by `ArchiveLesson`). If storage is blocked the store lives
in memory for the visit, so a later part still sees an earlier answer on the
same page load. Nothing here needs a script.

- Write: any field with `data-save="key"`.
- Read back as text: `<span data-show="key">nothing yet</span>`. Add
  `data-show-labels='{"value":"label"}'` to show a label instead of the raw value.
- Show only for some answers: `<p data-when="key" data-is="a|b" hidden>`. Omit
  `data-is` to show once anything is saved; `data-is=""` shows while it is still
  unanswered.
- A custom script can listen for `lesson:answer` on the `[data-coverage]` root;
  `event.detail` is `{ key, value }`. Wrap any storage access of your own in
  try/catch, as the runtime does.

A key used by more than one track is registered in `src/lib/archive-state.ts`
with its options, so both sides import the same values. `refetch-predict` is the
Setup prediction that The decision returns:

```astro
<p data-show={refetchPredict.key} data-show-labels={labelsOf(refetchPredict)}>nothing yet</p>
<p data-when={refetchPredict.key} data-is="unknown" hidden>“Can't tell” was the justified answer on Tuesday.</p>
```

## Learn with AI cards

`src/lib/archive-ai.ts` holds one card per part: the Send page `slug`, `title`,
`prompt` and `returnTask` (a full sentence that follows the card's lead line).
A part renders its card with `<AiCard part="..." />`.

The card shows a Send button only once
`src/content/docs/modules/{slug}.mdx` exists, so the page builds and the link
check passes before the Send pages land. Until then the lead line says "Copy this
prompt into your own AI assistant." A Send page follows Module 1's pattern (see
`01-collection-ai-coverage.mdx` and `primer/CoveragePrimer.astro`): hidden from
the sidebar, `prev: false`, `next: false`, `tableOfContents: false`. The rail's
"Optional field work & lab" link appears the same way once
`02-archive-field-work.mdx` exists.

## Film slots

`lesson/FilmSlot.astro` renders nothing until `public/film/{name}.mp4` exists,
then a Module 1 style `<figure class="cv-film">`, adding the poster
(`{name}.jpg`), captions (`{name}.vtt`) and chapters (`{name}-chapters.vtt`) when
those files exist. Two slots are reserved:

- `replay-dont-refetch` in `archive/Idea.astro`: the lesson video.
- `on-purpose-this-time` in `archive/CarryIt.astro`: the closer film, captioned “On Purpose, This Time”.

## Styles

Module 2 uses Module 1's `cv-` classes. Do not edit `coverage/Styles.astro` and
do not add global rules.

A part's own styles go in a scoped `<style>` block at the bottom of that part's
component, with class names prefixed `ar-`. Astro scopes the block to the
component, so tracks cannot collide. A scoped rule does not reach markup that a
child component renders; wrap the child's selector in `:global()` under one of
your own scoped classes (`.ar-grid :global(.cv-fb)`).

`ArchiveLesson.astro` imports `FirstRunTable.astro` and `CoverageGrid.astro` for
their styles only. That keeps Module 1's shared stylesheet in one piece; without
it the build splits it and Module 1's table and grid rules lose ties to the
`cv-` rules. If a part starts using another Module 1 component, run the
comparison below before you report.

## Module 1 stays frozen

Build the commit you started from, then yours, and compare:

```bash
git worktree add /tmp/m2-before module-2
cp -Rc node_modules /tmp/m2-before/ && (cd /tmp/m2-before && npm run build)
npm run build
python3 scripts/compare_dist.py /tmp/m2-before/dist dist
git worktree remove --force /tmp/m2-before
```

The last line must say "Module 1 markup and CSS unchanged". A changed script
bundle name on Module 1's pages is expected only when someone edits
`coverage/Runtime.astro` or `coverage/Rail.astro`, which only the integrator does.

## Checks before you report

```bash
python sample/generate.py --check && python labs/run_all.py && python scripts/check_lab_output.py && npm run check && npm run build && python3 scripts/check_links.py
```

## Note: the previous Module 2 page

The page this module replaces, kept for the field work author to reuse. Its lab
transcript was quoted before the lab changed; rerun the lab before quoting
anything from it.

> **The idea.** Save the source exactly as you received it, before any of your
> code interprets it. Treat that saved copy as the truth and everything else as
> a calculation.
>
> **Why it matters.** The web does not replay the past. Sites are redesigned, old
> seasons are removed, and a page fetched in September may not exist in March.
> Parsers also have bugs, and some are found months later. If you kept only the
> parsed output, a bug means the data is wrong and the evidence is gone. If you
> kept the page, a bug means you fix the parser and run it again.
>
> **How Touchline does it.**
> - Each fetched page is written to disk before any parser reads it, under a
>   predictable name: `raw_html/{school}/{year}-{gender}-schedule.html`, and the
>   same for roster and stats.
> - Box scores are stored beside them, named by fixture id. In the sample, the
>   fixture `tally:alder-ridge:8203` is stored as
>   `2026-men-box-tally-alder-ridge-8203.html`.
> - Each stored box score carries a small sidecar file with a fingerprint of the
>   parser version that last read it. When the parser changes, the fingerprint
>   no longer matches, and the page is re-parsed from disk with no network
>   request.
> - In the cloud pipeline the archive lives in private object storage and is
>   synced at the start and end of each run.
>
> **Example.** Early in the project, team names that began with "St." were all
> expanded to "State". That turned every Saint school into a State school. The
> fix was a change to one function. Because the pages are archived, a fix like
> this is applied by re-reading the saved pages with the corrected rule. Nothing
> has to be downloaded again, which matters because some old pages can no longer
> be fetched.
>
> **Terms.** Raw zone or bronze layer, immutable storage, replay or backfill,
> schema-on-read, lineage.
>
> **Questions.**
> 1. The archive is much larger than the clean data. What would you weigh in
>    deciding how long to keep it?
> 2. What is the difference between fetching a page again and rebuilding from
>    the archive? Which one is reproducible?
> 3. What should happen if the archive and the live site disagree about a past
>    match?
>
> **Lab: fix a bug by replay.** `python labs/m02_archive.py` reproduces the "St."
> bug on the sample's archived schedule pages, then fixes it. Its output was:
>
> ```text
> Run 1: parser v1
> re-parsed, skipped: (8, 0)
> names that cannot be right: ['State Brendan', 'State Lambert']
>
> Run 2: same parser, nothing to do
> re-parsed, skipped: (0, 8)
>
> Run 3: parser v2, replayed from the archive
> re-parsed, skipped: (8, 0)
> Saint schools now  : ['Saint Brendan', 'Saint Lambert']
> network requests   : 0
> network counter    : caught a test request
> ```
>
> Run 2 does nothing because each parsed file has a sidecar holding the
> fingerprint of the parser that wrote it. Run 3 re-parses everything because
> the fingerprint changed with the code. Nobody had to remember which files were
> stale. The network count is measured: the lab intercepts every connection
> attempt, and first sends a test request to prove the counter works.
>
> **Your turn.**
> 1. `fingerprint()` hashes the source of one function. Change a comment inside
>    `expand_v2` and run again. Everything is re-parsed although the behavior did
>    not change. Is that a bug or a feature? What would a finer fingerprint cost
>    you?
> 2. Run `python labs/m02_archive.py --missing dunmore`, which works on a scratch
>    copy without that school's page. The lab reparses seven pages and says
>    nothing about the eighth. Decide what should happen: a crash, a silent skip,
>    or something else. Then make the lab do it.
> 3. The sidecars in `sample/raw_html/` record `requested_url` and `final_url`.
>    Why is the final URL worth keeping? Module 3 depends on the answer.
>
> **Exercise.** You find that your parser has dropped overtime goals for two
> years. Write the recovery plan twice: once for a system that kept raw pages,
> once for a system that did not. Estimate what is lost in the second case.
