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

- **Rewind** was run twice. The first reply was sound but used a library example, the
  third library example in Module 2's replies after Module 1 used one throughout.
  The prompt now asks for an example "not about sports or libraries", and the page
  shows the second reply (a street-tree inventory).
- **Case 3**: the reply's "hash a whole file on purpose" is about a data file. The
  Course note carries it to Touchline's whole-module code fingerprint.
- **Prove it**: the reply uses "fingerprint" for an artifact's whole provenance. The
  Course note says how the course's narrower meaning relates.
