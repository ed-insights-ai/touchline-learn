---
title: How to use this guide
description: How the modules are organised, how long they take, and what the examples are drawn from.
sidebar:
  order: 2
---

## How it is organised

There are ten modules, in the order data flows. Each one has the same parts:

- **The idea**, in a paragraph.
- **How Touchline does it**, with the specific rules the platform follows.
- **An example** from the platform's own history.
- **Terms**, so you can connect it to the wider literature.
- **Questions** for discussion.
- **A lab** you run on your own machine, and an exercise to take further.

A module fits one 50-minute session, or the whole guide fits a three-week unit.
Capstone projects and an answer key are under [Teaching](../../teaching/capstones/).

## Two kinds of example

**Stories in the text are real.** When a module says a parser once turned every
Saint school into a State school, or that the first parity run found 7 timing
differences, that happened on the real platform. The schools named in those
stories are real schools, and the facts are ones their own sites published.

**Data in the labs is invented.** The labs run on a small sample built for this
site: a made-up conference with made-up schools, players, scores and web pages.
It follows the field names and layout of the real season files, so everything
you practise transfers. The full Division I and II datasets are private and are
not needed for anything here. See [The sample data](../sample-data/).

## What you need

- For reading: nothing.
- For the labs: Python 3.10 or newer and two packages. See [Set up the labs](../setup/).

## How to read a lab's output

Every lab ends with a line that starts `RESULT:`. Labs that are gates also set
an exit code, because a gate is a check a machine can act on:

| Exit code | Meaning |
|---|---|
| `0` | The check ran and passed |
| `1` | The check ran and found a problem |
| `2` | The check could not run. This is never reported as a pass. |

Some labs are meant to end with `1`. The parity lab ships with a planted
disagreement so you can watch the gate stop the line.
