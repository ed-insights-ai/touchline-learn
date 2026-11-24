# The story path

The course's running story, projected across every module. Riley and Kick were
written after the modules, so most of this is planned, not yet on the pages.
Keep it here so each module's opener and close, and each film, follow one line.

## The shape

Riley's one-off table grows into something other people depend on. Each module
adds a reader, a season, a league or a product, and each addition forces the
next piece of the system into existence. By Module 10, "where does each piece
run, and who owns it?" is the story's own question, which is how the course
reaches its destination: seeing how separate components and repositories are
stitched together, built, and run on a cloud provider as one platform.

## Cast

- **Riley**, a final-year data science student. Narrated by Harper.
- **Kick**, an AI coding agent. Never a villain: each choice is defensible, and
  the gap is in what it was asked.
- **The callers** from the opening film: Coach Dolan (Hartwell), Dunmore
  athletics, Cedar Grove men's soccer.

## Beats

Each beat names the sample fact or lab output it hangs on. Every fact comes
from the invented sample in `sample/`.

| Module | Scene | Hangs on | What grows |
|---|---|---|---|
| Opening film | Friday 4:12. Riley asks Kick for a conference table from eight school sites, publishes it, and three calls follow. | `src/components/FilmOpening.astro` | One table, one Friday |
| 1 Coverage | The three calls, slowly. Riley learns to ask what should exist before trusting what arrived. Monday's table goes out at 53 of 54 with the gap named. | The Module 1 lesson (built) | Riley learns to ask |
| 1 closer film | Tuesday. Kick adds a rule that "St." means State, and the table lists "State Lambert". Kick fixes the code in a minute. "Can you rebuild Friday's table from the pages you kept, without asking a single site again, and show me you did?" | `labs/m02_archive.py` prints `'State Lambert'` | The table has a history |
| 2 Archive | Replay Friday from the saved pages, with zero requests to the web; the fingerprint says what is stale. | `02-archive.md` lab | Evidence that can be replayed |
| 3 Provenance | Riley wants past seasons for context. Cedar Grove answers a request for 2019 with its 2026 page, and reports success. | Lab refuses `cedar-grove 2019`, `dunmore 2019` | One season becomes several |
| 4 Parsing | Riley wants discipline stats from the twelve Alder Ridge box scores Kick fetched on Friday. Did Kick read the fouls and cards right? | `labs/m04_parse.py` parses `alder-ridge/2026-men-box-*` | Results become match detail |
| 5 Identity | Riley adds the women's league. Names arrive as "#9 Brightwater St." and "Lambert St."; Kick resolves them all and says "no errors". | `05-identity-lab.md` output; the lesson's AI assistant becomes Kick | One league becomes two |
| 6 Contracts | The campus paper starts using Riley's file (to be written). The file needs a written promise, including what the blank on September 21 means. | September 21 match, `06-contracts.md` exercises | The first reader who is not Riley |
| 7 Gates | A rerun quietly turns the September 8 Alder Ridge match from 1-0 into 1-1, and the paper is about to print. What has the power to stop the release? | `07-gates.md` lab, `tally:alder-ridge:8203` (the match the platform tour follows) | Mistakes now reach other people |
| 8 Products | Riley's table becomes a site and a downloadable database, and the two have to agree. | `08-products.md` standings lab | One table becomes several products |
| 9 AI | Kick offers to write the weekly recap under the table. | `09-ai.md` journal draft | Words generated from the numbers |
| 10 Operations | It can't live on Riley's laptop anymore: it has to run daily, someone else holds the keys, and it costs money. Where does each piece run, and who owns it? (to be written) | Repository diagram, `labs/m10_jobgraph.py`, this repo's `.github/workflows/site.yml` | A table becomes a platform |
| Finish | Riley answers Kick, and sketches the system that would let them check it every week. | `finish/back-to-the-agent.mdx` | Riley can see the whole system |

## Rules for writing a beat

- A module opens with three lines of story and closes with one line that
  raises the next module's question.
- Teach the concept before any graded story decision. A case applies an idea
  the learner has already met; it never introduces it by testing it.
- Tell each scene once. A later part may quote a line of it, never replay it.
- The story uses only sample facts a lab or page already shows. A number in a
  scene must be one the module computes.
- Public-repo rules hold: no real sites, hosts, buckets or keys; private
  repositories are named, never linked.
- The step-to-component bridge (which job runs each step, which repository owns
  it, where its output rests) belongs in Module 10 and is planned with the
  off-the-laptop scene.

## Decisions

Agreed on 24 November 2026:

- Module 1 keeps one page with a chapter rail (no sub-pages).
- The season arc above is adopted.
- The Module 1 closer film hooks into Module 2 with the Tuesday "State Lambert"
  scene.
- The Module 6 reader is the campus paper, which gives Module 7 a printing
  deadline.

Deferred: re-scoping Module 6 toward "what one repository promises another".
Take it up when the Module 2 to 9 openers are written.

## Risks to settle before the later beats are written

- Module 5's plan has the lesson's AI assistant become Kick. That can blur the
  line between Kick, the agent being audited, and the learner's own assistant
  used as a tutor. Keep the two roles distinct.
- "St." carries two meanings across the arc: the Module 1 closer's "St. means
  State" bug and Module 5's "Brightwater St." name variants. Pick which module
  owns it, or make the second use call back to the first on purpose.
- Do not write the Module 2 to 9 openers until Module 1 follows the rules above.

Source: the navigation and learning-path reviews of 24 November 2026.
