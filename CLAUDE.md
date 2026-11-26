# touchline-learn

A public teaching site about the Touchline platform: Astro Starlight pages in
`src/content/docs/`, runnable Python labs in `labs/`, and an invented sample
data home in `sample/`.

## This repository is public. Rules that follow from that

- Use only the invented sample in `sample/`. Never copy a record, a player
  name, a page or a file from `d1-soccer`, `d2-soccer`, or the samples in
  `touchline-contracts`.
- Do not describe the school registry or the scrapers beyond what the module
  pages already say. No real vendor markup, no site quirks, no addresses.
- No account ids, bucket names, hostnames or keys. The workflow uses no secrets.
- Link only to public repositories. `touchline-ui` and this one are public.
  Name the others without linking them.

## Checks

```bash
python sample/generate.py --check   # the sample is exactly what the generator writes
python labs/run_all.py              # every lab ends as expected (needs labs/requirements.txt)
python scripts/check_lab_output.py  # output quoted in the pages is real lab output
node scripts/check_archive.mjs      # Module 2's build-time data imports and its assertions hold
npm run check && npm run build && python3 scripts/check_links.py
```

## Conventions

- The sample is generated. Change `sample/generate.py`, run it, and commit the
  generator and its output together. Never hand-edit files under `sample/`.
- A lab prints a line starting `RESULT:` and exits 0 (passed), 1 (found a
  problem) or 2 (could not run). `labs/run_all.py` lists the expected exit code
  and a line of output for each; update it when a lab's output changes.
- Output quoted in a module page is real lab output. If the sample or a lab
  changes, rerun the lab and update the page.
- The Module 5 lesson reads `src/data/identity-pilot.json`. Regenerate it with
  `python scripts/build_identity_pilot.py` when the sample changes.
- Internal links in the docs are relative (`../02-archive/`), because the site
  is served under `/touchline-learn/`.
- Labs use the standard library, DuckDB and jsonschema, and never the network.
