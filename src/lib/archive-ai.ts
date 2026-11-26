import type { ArchivePartId } from "./archive-parts";

export type ArchiveAiCard = {
  slug: string;
  title: string;
  prompt: string;
  returnTask: string;
};

const close = "End with three questions that check my understanding. Wait for my answers before you give yours.";

export const archiveAi: Record<ArchivePartId, ArchiveAiCard> = {
  setup: {
    slug: "02-archive-ai-refetch",
    title: "What is a re-fetch, and what is a replay?",
    prompt: `I'm learning how data pipelines recover from their own bugs. Teach me the difference between fetching a source again and rerunning my code over a copy I saved, with one running example that is not about sports.\n\n1. What a re-fetch is, and what a replay is.\n2. What can change on a live source between two fetches.\n3. Which of the two can rebuild yesterday's output exactly, and why.\n4. ${close}`,
    returnTask: "Then come back and name one thing that can change on a live site between two fetches.",
  },
  idea: {
    slug: "02-archive-ai-raw",
    title: "Raw and derived, outside sports",
    prompt: `I'm learning the difference between raw data and derived data. Teach me with three short examples from three different fields, none of them sports.\n\n1. What raw data is, and why it is saved before any code reads it.\n2. What derived data is, and why it can be deleted and rebuilt.\n3. What a replay over saved raw data can and cannot recover.\n4. ${close}`,
    returnTask: "Then come back and try the research team's check below.",
  },
  "case-saturday": {
    slug: "02-archive-ai-confound",
    title: "Why changing two things at once hides the cause",
    prompt: `I'm learning about controlled comparisons. Teach me why changing two inputs at once hides which one caused a difference, using A/B tests and lab experiments as examples.\n\n1. What a controlled comparison is.\n2. What it means for two effects to be confounded.\n3. How to design a before-and-after comparison that has one cause.\n4. ${close}`,
    returnTask: "Then come back and classify two new before-and-after comparisons.",
  },
  "case-kept": {
    slug: "02-archive-ai-keep",
    title: "What a raw zone keeps",
    prompt: `I'm learning what a data archive must keep. Teach me what a raw zone holds and what breaks if a pipeline saves its data only after cleaning it, with one running example that is not about sports.\n\n1. What "the last layer before the damage" means.\n2. Why information lost in a transformation cannot be recovered from its output.\n3. What a small record saved beside each raw file should say about how it was fetched.\n4. ${close}`,
    returnTask: "Then come back and place one more bug on the grid.",
  },
  "case-fingerprint": {
    slug: "02-archive-ai-fingerprint",
    title: "How build tools decide what is stale",
    prompt: `I'm learning how build tools and caches decide which outputs to rebuild. Teach me with make, notebooks and memoisation as examples.\n\n1. What a fingerprint of code and configuration is.\n2. Why an output is stale when its stored fingerprint or its input's hash differs from now.\n3. Why rebuilding too much is safe and rebuilding too little is dangerous.\n4. ${close}`,
    returnTask: "Then come back and work one preset from a build outside sports.",
  },
  decision: {
    slug: "02-archive-ai-captures",
    title: "Latest only or every capture?",
    prompt: `I'm learning how long a data archive should keep old copies of a source. Teach me the difference between keeping only the latest copy and keeping every copy with its fetch time, with one running example that is not about sports.\n\n1. What each policy can rebuild later.\n2. What a recorded hash can prove about a copy, and what it can never recover.\n3. How to choose a policy from the questions the archive must answer.\n4. ${close}`,
    returnTask: "Then come back and pick a policy for a stated need.",
  },
  rewind: {
    slug: "02-archive-ai-criteria",
    title: "Acceptance criteria for a reproducible rebuild",
    prompt: `I'm learning how to ask an AI coding agent to rebuild a dataset so I can check what it did. Teach me how to write acceptance criteria for a reproducible rebuild, with one running example that is not about sports.\n\n1. What a rebuild report should list about its inputs and its code.\n2. How to make a claim like "no network requests" checkable.\n3. How a diff against the old output should explain each change.\n4. ${close}`,
    returnTask: "Then come back and write one criterion for a rebuild of your own.",
  },
  "prove-it": {
    slug: "02-archive-ai-recovery",
    title: "Write the recovery plan as a prompt",
    prompt: `I'm learning how to hand a parser bug fix to an AI coding agent. Help me turn a recovery plan into a prompt, with one running example that is not about sports.\n\n1. What to replay, and how the agent knows which outputs are stale.\n2. What to republish, and what to leave alone.\n3. What to tell the people who read the output.\n4. ${close}`,
    returnTask: "Then come back and check the agent's plan against the four slots.",
  },
  "carry-it": {
    slug: "02-archive-ai-carry",
    title: "Same rows, different archives",
    prompt: `I'm learning to carry one idea to new kinds of data: the same bug fix supports different recovery claims depending on what was archived. Teach me with one running example that is not about sports or healthcare.\n\n1. A world that kept every raw input, one that kept only the processed table, and one that overwrote inputs on resubmission.\n2. The honest recovery claim in each world.\n3. ${close}`,
    returnTask: "Then come back and answer three new questions.",
  },
};

export const aiCardId = (part: ArchivePartId) => `${part}-ai-study`;
export const aiHref = (part: ArchivePartId) => `../${archiveAi[part].slug}/`;
