---
title: "3. Provenance, or proof before parse"
description: A page must prove it is the thing you asked for. If it cannot, you record a gap and do not read it.
---

## The idea

The first question about a fetched page is "what is this page?", and only then
"what does it say?". A page must prove it is the thing you asked for. If it
cannot, you record a gap. You do not read it anyway.

## Why it matters

Sports sites are accommodating in an unhelpful way. Ask many of them for the
2019 schedule and they answer with HTTP 200 and a well-formed page for the
current season. A parser run on that page produces clean, plausible, wrong
data. This is the worst failure a dataset can have, because no later step can
detect it.

## How Touchline does it

- **Season proof.** Two witnesses are consulted: the year in the final URL
  and the year in the page title. Every witness that speaks must name
  the requested year. If both speak, they must agree. If neither speaks, the
  page is refused. No evidence counts as failure.
- **Redirects are allowed when proven.** Sites often redirect the current
  season to a `/schedule` URL with no year. That is accepted only when the page
  still independently names the requested year.
- **The payload trap.** A page can carry its schedule twice: as embedded JSON
  and as rendered HTML. The JSON is richer, but at a past-season URL it can
  still describe the current season. So an embedded event is kept only when its
  own title and date both name the requested year. As a last defense, if its
  event ids also appear on a page proven for another year, the whole page is
  refused.
- **Match proof.** A box score is only fetched through a link that a proven
  schedule page published. URLs are never built by guessing. The
  fetched page's title must name the fixture's own date, and its score table
  must show exactly two teams.

## Example

A request for one school's 2016 men's schedule returns a page titled with the
2026 season. The collector raises a typed error, and the coverage record for
that cell reads `unavailable`, with the reason "cannot prove which season was
served". The dataset has a named hole instead of ten seasons of duplicated 2026
fixtures.

## Terms

Provenance, data lineage, silent failure, fail closed, precondition or
assertion, typed error.

## Questions

1. Why require agreement between witnesses instead of trusting the more
   detailed one?
2. What makes an identifier stronger evidence than a label?
3. Refusing pages lowers coverage. When is lower coverage the better outcome?

## Lab: ten pages, all served with HTTP 200

```bash
python labs/m03_proof.py
```

The sample archive holds ten schedule pages. Eight were requested for 2026. Two
were requested for 2019, and the site answered both with a success code.

```
proven   alder-ridge        2026  URL and title name 2026
proven   brightwater-state  2026  title name 2026
REFUSED  cedar-grove        2019  asked for 2019, but title says 2026
proven   cedar-grove        2026  URL and title name 2026
REFUSED  dunmore            2019  no witness names any season
...
8 proven, 2 refused, 0 parsed without proof
```

Three cases are worth opening in an editor, each with its `.meta.json` sidecar:

- **Brightwater State 2026** was redirected to a URL with no year, so the URL
  is silent. The title still names 2026, and one witness that speaks is enough.
- **Cedar Grove 2019** kept its 2019 URL but served the 2026 page. The URL says
  2019 and the title says 2026. A collector that trusted the URL would have
  filed a whole season under the wrong year.
- **Dunmore 2019** was redirected and its title names no year. Nothing is
  wrong on the page. There is simply no evidence, and no evidence is a refusal.

The lab then opens a harder page. Both witnesses are right, and the embedded
data is from another season:

```
season proof : URL and title name 2025
embedded     : 20 events, 0 name 2025
shared ids   : 20 with the proven 2026 page
REFUSED      : the embedded schedule belongs to another season
```

**Your turn.**

1. Add a third witness: the dates in the schedule table itself. Decide how many
   rows must agree, and what to do about a season that crosses New Year.
2. Write match proof for the box scores in `raw_html/alder-ridge/`: the title
   must name the fixture's date from the season file, and the score table must
   show two teams.
3. Change `prove_season` to "trust the URL when the witnesses disagree".
   Run the lab, then run `python labs/run_all.py`. Which check caught you?

## Exercise

Take a dataset you have used that came from an API or a download. List the
checks you ran to confirm it was the dataset you meant to get: the right year,
region and version. Then design two witnesses you could have checked
automatically.
