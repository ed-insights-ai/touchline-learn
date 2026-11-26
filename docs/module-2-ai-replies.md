# Module 2 AI replies

Each Learn with AI card in Module 2 has a Send page that shows the card's prompt and
one reply an AI assistant gave to it. Module 1's replies were pasted from ChatGPT by
the owner. Module 2's first replies were produced by sending the exact prompt from
`src/lib/archive-ai.ts` to a fresh GPT-6.2 Sol session (reasoning effort medium) with
no tools, told to answer as a general chat assistant would. Each reply is used as
given; only its formatting was adapted to the primer components, which add figures
built from the reply's own numbers and a Course note that maps it to the module.

To swap in your own reply, paste the prompt into your assistant, then replace the
reply text inside the primer component and keep or rewrite its Course note.

| Part | Send page | Primer component | Reply from | Date |
|---|---|---|---|---|
| 1. Setup | `02-archive-ai-refetch` | `primer/archive/RefetchPrimer.astro` | GPT-6.2 Sol, medium | 26 November 2026 |
| 2. The idea | `02-archive-ai-raw` | `primer/archive/RawPrimer.astro` | GPT-6.2 Sol, medium | 26 November 2026 |
| 3. Case 1 | `02-archive-ai-confound` | `primer/archive/ConfoundPrimer.astro` | GPT-6.2 Sol, medium | 26 November 2026 |
| 4. Case 2 | `02-archive-ai-keep` | `primer/archive/KeepPrimer.astro` | GPT-6.2 Sol, medium | 26 November 2026 |
| 5. Case 3 | `02-archive-ai-fingerprint` | `primer/archive/FingerprintPrimer.astro` | GPT-6.2 Sol, medium | 26 November 2026 |
| 6. The decision | `02-archive-ai-captures` | `primer/archive/CapturesPrimer.astro` | GPT-6.2 Sol, medium | 26 November 2026 |
| 7. Rewind | `02-archive-ai-criteria` | `primer/archive/CriteriaPrimer.astro` | GPT-6.2 Sol, medium | 26 November 2026 |
| 8. Prove it | `02-archive-ai-recovery` | `primer/archive/RecoveryPrimer.astro` | GPT-6.2 Sol, medium | 26 November 2026 |
| 9. Carry it | `02-archive-ai-carry` | `primer/archive/CarryPrimer.astro` | GPT-6.2 Sol, medium | 26 November 2026 |

Notes on individual replies:

- **Six replies were rerun** after the first council round changed their prompts, each
  in a fresh session with the same model and settings on the same date. Prove it keeps its
  first reply.
  - **The idea** asks for two outputs that disagree with the record that explains why, and
    item 3 names both unrecoverable cases: a version never saved, and a saved copy later
    overwritten. It was run twice in round 2 and again after round 7. The first rerun's examples were one or two
    sentences each, and one was a shop. The prompt now asks for three worked examples with
    small numbers. After the seventh council round its exclusion list was cut to sports and
    sensors, to stop meters recurring across the module, and the page shows that fourth reply
    (a shop receipt, a teacher's quiz scores and a headline draft).
  - **Case 1** asks for a before-and-after example with numbers in the pipeline item.
  - **Case 2** uses one running example, a museum's nightly import from a partner site.
  - **Case 3** asks why some systems hash a whole source file on purpose, so a comment
    edit triggers a rebuild.
  - **The decision** asks what a recorded hash can show about a copy and why it cannot
    bring one back. Its running example was first a shop's price list. After the second
    council round it became a university's course listings page, to cut the number of
    shop and sales examples, and the page shows that third reply.
  - **Rewind** uses one running example, a research lab's daily sensor readings, and asks
    for an example report that meets every criterion.
- **Setup** was rerun after the fifth and seventh council rounds. Its first reply was set in a
  bakery, and the next rerun picked a water meter, the same setting as The idea's examples then.
  A list of excluded fields fixed that, but reviewers found the list odd to send, so the prompt
  now names its setting instead: a volunteer archive's daily count of approved transcribed
  pages. The page shows that fourth reply.
- **Carry it** was rerun after the second and seventh council rounds. Its first reply was set
  in a city's permit offices, right after Prove it's city electricity reports. The second rerun
  excluded four fields by name; the prompt now names its setting instead, a coffee roaster
  importing its suppliers' shipment weights, and the page shows that third reply.
- **Rewind** has had three replies. The first used a library example, the third in
  Module 2 after Module 1 used one throughout. The second used a street-tree inventory.
  The page shows the third (lab sensor readings), which also includes a sample report.
- **Case 3**: the reply hashes a whole source file, comments included. The Course note
  ties it to Touchline's whole-module parser fingerprint.
- **The decision**: the reply's "fingerprint" means a content hash of a file. The Course
  note says how the course uses the two words.
- **Prove it**: the reply uses "fingerprint" for an artifact's whole provenance. The
  Course note says how the course's narrower meaning relates, and states the staleness
  rule in full.
