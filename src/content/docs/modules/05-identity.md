---
title: "5. Identity and entity resolution"
description: Map every published name to one stable identifier, exactly, so that errors are visible and fixable instead of invisible and permanent.
---

## The idea

The same real thing arrives under many names. Before any join, every name has
to be mapped to one stable identifier. How you do that mapping decides how your
errors look: either visible and fixable, or invisible and permanent.

## How Touchline does it

Every school gets one identifier, called a slug, such as
`southwestern-oklahoma-state`. Getting from a published string to a slug takes
three steps, and none of them involves similarity scoring.

1. **A grammar strips presentation noise.** Rankings and seeds are not part of
   a name. "#9 SWOSU", "No. 23 SWOSU", "RV SWOSU" and "(3) SWOSU" all reduce to
   "SWOSU". The grammar has limits so it cannot eat real names: a rank is at
   most two digits and must be followed by a space.
2. **An exact lookup in an alias list.** Each slug has a hand-maintained set of
   spellings. "SWOSU", "Southwestern Okla." and "SW Oklahoma State" all point
   to one slug. The list is checked when the program starts. If one spelling is
   claimed by two schools, the build fails.
3. **A ledger of human rulings.** Strings that match nothing are not guessed.
   They are classified as a known school, a non-member (a real opponent outside
   the tracked divisions), or an artifact, and ambiguous cases get a recorded
   human decision.

## Why no fuzzy matching

Similarity scoring would save effort on the first day. It would also, sooner or
later, merge two different schools whose names are close. Nothing would fail,
and the season totals would just be wrong. With exact matching, the failure is
an unmatched string. It is loud, and it costs one line in the alias list.

## Examples

**The rank problem was found in the data.** One school appeared as two
identities, `no-4-csu-pueblo` and `no-15-csu-pueblo`, because its ranking
changed during the season. The rank-stripping grammar was the fix.

**Context changes the rule.** "St." at the end of a name abbreviates State
("Northeastern St."). Before another word it abbreviates Saint ("St.
Edward's").

**Players.** A box score refers to players by name. Each player record keeps a
reference that says how it was resolved: from an id on the page, from the
roster, or by matching the same match on the opponent's site. The method
travels with the data.

## Terms

Entity resolution, record linkage, canonicalization, blocking key,
deterministic versus probabilistic matching, false merge and false split.

## Questions

1. A false merge and a false split are both errors. Which is worse for a
   standings table, and why?
2. Touchline has about a thousand schools. At what scale would a
   hand-maintained alias list stop working, and what would you keep from this
   design?
3. Why store how each player was resolved, and not only the result?

## Lab: 110 spellings, 14 schools

```bash
python labs/m05_identity.py
```

The sample's box scores publish team names the way real sites do: with
rankings in front, abbreviated, and spelled several ways. The lab collects
every published name and resolves it.

```
Step 1: the grammar
'#9 Brightwater St.'         -> 'Brightwater St.'
'(3) Saint Lambert'          -> 'Saint Lambert'
110 published spellings reduce to 30

Step 2: exact lookup
resolved: 60 spellings to 14 programs

Step 3: what is left needs a ruling
  36  Alder Ridge Univ.
  24  Brightwater St.
   5  Lambert St.
  16  Saint Lambert
  11  Westbrook St.
  ...
```

The grammar alone removes most of the variety. The starting alias list
(`sample/data/reference/aliases.json`) knows only each school's full name and
abbreviation, so fourteen spellings are left over. That list is your work
queue.

The lab ends by running a fuzzy matcher (Python's `difflib`) over the same
names against the eight member schools:

```
FALSE MERGE  'Westbrook St.' -> 'Eastbrook State'
FALSE MERGE  'Westbrook State' -> 'Eastbrook State'
2 false merges, and the matcher raised no error for any of them
```

Westbrook State is a different school that plays outside the conference. The
matcher gave its results to Eastbrook State and reported success.

**Your turn.**

1. Write your own alias file, mapping each slug to its extra spellings, and run
   `python labs/m05_identity.py --aliases my.json` until step 3 prints nothing.
   Two of the fourteen need care: decide which school "Lambert St." is, and what
   evidence you would want before ruling. Compare with
   `python labs/m05_identity.py --solution`.
2. Add "St. Lambert" to the alias list of `lambert-state` as well and run again.
   What happens, and why is failing at start-up better than failing at the
   first lookup?
3. Break the grammar: in `RANK`, change `#\d{1,2}` to `#?\d{1,3}`, which makes
   the marker optional and allows three digits. Run
   `python labs/m05_identity.py --name "100 Mile College"`. What did the looser
   grammar do to the name?
4. Lower the fuzzy matcher's cutoff from 0.7 to 0.5. Count the false merges.
   Then raise it to 0.9. What does it stop matching that it should?

## Exercise

Given the strings "UT Tyler", "Texas-Tyler", "#12 UT Tyler", "Texas
A&M-Commerce" and "East Texas A&M", write the alias entries you would create.
One pair needs outside knowledge to decide. Identify it, and say who should
make that ruling.
