# touchline-learn

Learn how the Touchline data platform works: a teaching guide for data science
students, with labs you can run.

**Read it: https://ed-insights-ai.github.io/touchline-learn/**

Touchline collects what about a thousand college soccer websites publish, turns
it into one consistent dataset, and serves it as a public website and a desktop
analysis app. This repository uses it as a case study in data engineering: ten
modules in the order data flows, from collection to operations.

## What is here

| Path | What it is |
|---|---|
| `src/content/docs/` | The guide: one page per module, plus setup, capstones, instructor's notes and a glossary |
| `labs/` | One runnable lab per module. Python, offline, the same output for everyone |
| `sample/` | The data the labs run on: an invented conference in the shape of a Touchline data home, and the generator that writes it |
| `scripts/check_links.py` | Checks every internal link in the built site |
| `.github/workflows/site.yml` | Runs the labs, builds the site, and publishes it to GitHub Pages |

## Run the labs

```bash
git clone https://github.com/ed-insights-ai/touchline-learn.git
cd touchline-learn
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r labs/requirements.txt
python labs/run_all.py
```

You should see `15 of 15 runs behaved as expected`. Then run any lab by itself,
for example `python labs/m03_proof.py`. Python 3.10 or newer.

## Build the site

```bash
npm ci
npm run dev        # http://localhost:4321/touchline-learn/
npm run build && python3 scripts/check_links.py
```

Node 22. The site is [Astro Starlight](https://starlight.astro.build/).

## About the data

Everything in `sample/` is invented: the conference, the schools, the players,
the scores and the web pages. Nothing was copied from Touchline's datasets,
which are private. The files follow the field names and layout of the real
season files so that what you practise here transfers.

The stories told in the guide's text are real: they describe things that
happened on the platform.

`python sample/generate.py --check` confirms the committed sample is exactly
what the generator writes.
