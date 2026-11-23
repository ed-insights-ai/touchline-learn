---
title: "4. Parsing pages that were never meant to be data"
description: Treat every structural assumption as a hypothesis, and prefer evidence a human reader would also see.
---

## The idea

A web page is a rendering for human eyes. Its structure is whatever the
template happened to produce. A robust parser treats every structural
assumption as a hypothesis, and prefers evidence a human reader would also see.

## How Touchline does it

- **Find tables by what they claim to be.** A box-score page holds a pile of
  tables. The parser picks each one by its caption text, such as "Scoring
  Summary" or "Team Statistics", never by its position on the page. Templates
  reorder tables between versions. Captions stay.
- **Read the label the reader sees.** One vendor's template marks the Fouls
  group with the internal id `offsides`. A parser keyed on ids would file every
  foul as an offside. Touchline keys on the visible header text.
- **Sometimes the fact is only in the markup.** Whether a card is yellow or red
  is carried by a styling class on the cell and not by its text. So the rule is
  to choose the extraction method per fact, not per page. When neither colour
  is present, the value is stored as `unknown`.
- **Type free text conservatively.** Play-by-play lines are typed by each home
  team's statistics crew. The raw line is always kept. A type such as goal or
  card is assigned only when the wording matches a known pattern. A line that
  matches nothing stays untyped.
- **Refuse impossible shapes.** A score table with three teams is an error to
  report and never something to repair by guessing.

## Example

The line "PENALTY KICK GOAL by ..." matches both the penalty pattern and the
goal pattern. Patterns are ordered, and the first match wins, so it is typed as
a goal. The original text is still stored beside the type, so a later analyst
can re-classify it.

## Terms

Information extraction, wrapper (a parser built for one template), schema
drift, defensive parsing, typed versus untyped fields, lossless capture.

## Questions

1. Position is the weakest evidence, and visible labels are stronger. Can you
   rank other kinds of evidence a page offers?
2. Why keep the raw play-by-play line when a typed field exists?
3. When is `unknown` a better value than the most likely guess? When is it
   worse?

## Lab: three parsers, twelve pages

```bash
python labs/m04_parse.py
```

Twelve archived box scores are parsed three ways, and each result is compared
with the clean season file.

| Parser | How it finds things | Pages it gets right |
|---|---|---|
| By position | "the first table is the score" | 8 of 12 |
| By id | the template's `id` attributes | 0 of 12 |
| By caption | captions, visible labels, and styling for card colour | 12 of 12 |

The position parser works on the first template and fails on every page that
uses the second, where the tables come in another order. The id parser looks
for a row with the id `fouls`, finds none, and files the fouls it does find
under `offsides`:

```
fouls    : None
offsides : [16, 8]  <- these are the fouls, filed under the template's id
```

Neither failure raises an error by itself. Both are caught only because the
lab compares against a known-good file, which is the subject of Module 7.

The lab then feeds the caption parser a page whose score table lists three
teams, and it refuses:

```
refused: the score table does not show exactly two teams
```

**Your turn.**

1. Open `sample/raw_html/alder-ridge/` and find a page in each template. Write
   down what differs. Would a parser keyed on the `<h1>` survive?
2. `by_caption` reads card colour from a class. Extend it to type the
   play-by-play lines, keeping the raw text. Which line in the sample should
   stay untyped, and what would a careless pattern type it as?
3. The team names on the page carry rankings ("#9 Alder Ridge"). The lab
   compares them as published. Why should the parser leave them alone? Module 5
   picks this up.

## Exercise

Find a public HTML table, such as a transit timetable. Write down three
assumptions your first parser would make about it. For each, describe a
redesign that would break it without raising an error.
