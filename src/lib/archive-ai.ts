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
    prompt: `I'm learning how a data pipeline recovers when a bug is found in its own code. Teach me with one running example with small numbers, not about sports, shops, food businesses, or meters and sensors.

1. The difference between fetching the source again (a re-fetch) and rerunning my fixed code over copies I saved earlier (a replay).
2. What can change on a live source between two fetches besides the thing I meant to fix, and what that does when I compare the new output with the old one.
3. Which of the two can reproduce yesterday's output exactly with the old code, or correct it with the fixed code, and what a re-fetch overwrites if I keep only the latest copy of each source.
4. When a re-fetch is still the right step, and why it should be a deliberate step of its own rather than part of a bug fix.
5. ${close}`,
    returnTask: "Then come back and name one change a site could have made since Friday that would move Saint Lambert's numbers.",
  },
  idea: {
    slug: "02-archive-ai-raw",
    title: "What can you rebuild from raw data?",
    prompt: `I'm learning the difference between raw data and derived data, and why it decides whether a bug can be fixed later. Teach me with three worked examples, each from a different field, none of them sports, libraries or shops. Work each one through with small numbers.

1. What raw data is, and why it is saved exactly as received, before any of my code reads it.
2. What derived data is, and why it can be deleted and rebuilt as long as the raw data and the code and settings that produced it are kept.
3. What a replay over saved raw data can recover after a bug, and what no replay can recover: a version of the source that was never saved, or a saved copy that was later overwritten.
4. Why each output should record which raw inputs, which version of the code and which settings produced it. Show two outputs that disagree and how that record explains why.
5. ${close}`,
    returnTask: "Then come back and take the research team's reviewer question again with the cleaning script lost: what can the team still show?",
  },
  "case-saturday": {
    slug: "02-archive-ai-confound",
    title: "Why two changes at once hide the cause",
    prompt: `I'm learning about controlled comparisons. Teach me why changing two inputs at once hides which one caused a difference, using an A/B test on a website and a laboratory experiment as examples.

1. What a controlled comparison is, and why it changes one input at a time.
2. What it means for two effects to be confounded, with a before-and-after comparison where two things changed together and the difference can't be split between them.
3. How to redesign that comparison so the difference has one cause, and what to hold fixed.
4. How the same idea applies when I fix a bug in a data pipeline: why I rerun the fixed code on the inputs I already have instead of on freshly collected ones. Show it with a small before-and-after example with numbers.
5. ${close}`,
    returnTask: "Then come back and write the changelog line that table B supports, and nothing more.",
  },
  "case-kept": {
    slug: "02-archive-ai-keep",
    title: "What a raw zone keeps",
    prompt: `I'm learning what a data archive must keep so a bug can be fixed later. Teach me with one running example: a museum that imports its collection records from a partner's website every night.

1. What a raw zone (also called a bronze layer) holds, and why it is written before any cleaning step runs.
2. What "replay from the last layer before the damage" means: when a bug is in one particular step, which saved copies can verify the fix and which already carry the bug.
3. Why information a transformation throws away, such as stripped markup, rewritten names or a blank read as zero, can never be recovered from its output, and how a raw copy also answers questions nobody has asked yet.
4. What a small record saved beside each raw file should say about how and when it was fetched, and why each field is worth keeping.
5. ${close}`,
    returnTask: "Then come back and place one more bug on the grid: the table step gives Cedar Grove two points, not one, for its home draw with Dunmore.",
  },
  "case-fingerprint": {
    slug: "02-archive-ai-fingerprint",
    title: "How build tools decide what is stale",
    prompt: `I'm learning how build tools and caches decide which outputs to rebuild after a change. Teach me with make, notebook caches and memoisation as examples.

1. What a fingerprint of code and configuration is, and why the settings a step reads belong in it, not only its code.
2. Why an output is stale when either its stored fingerprint or the hash of the input it read differs from now, so nobody has to guess which outputs a change touched.
3. Why rebuilding too much only costs time while rebuilding too little gives a wrong result with no error, and why some systems hash a whole source file on purpose, so that even editing a comment triggers a rebuild.
4. What a fingerprint can't see, such as a source that changed but was never fetched again.
5. ${close}`,
    returnTask: "Then come back and write a preset for the notebook when inventory.csv is corrected.",
  },
  decision: {
    slug: "02-archive-ai-captures",
    title: "Latest only or every capture?",
    prompt: `I'm learning how much history a data archive should keep of a source that changes. Teach me with one running example: a university's course listings page that my archive fetches every morning.

1. Two policies: keeping only the latest copy of each source, overwritten by every new fetch, and keeping every copy with the time it was fetched. What each can rebuild later.
2. What a recorded hash can show about a copy, and why it can never bring back a copy that has been overwritten.
3. How to choose a policy from the questions the archive will have to answer, such as disputes about past results, weighed against what storage costs.
4. Why the code and configuration also need their own history for a rebuild of a past output to be exact.
5. ${close}`,
    returnTask: "Then come back and pick the league office's policy and name the question that decides it.",
  },
  rewind: {
    slug: "02-archive-ai-criteria",
    title: "Making a rebuild checkable",
    prompt: `I'm learning how to ask an AI coding agent to rebuild a dataset from saved inputs so I can check what it did. Teach me how to write acceptance criteria for a reproducible rebuild, with one running example: rebuilding a research lab's table of daily sensor readings.

1. What a rebuild report should list about its inputs: which saved files it read, each identified by a content hash, and which expected inputs were missing.
2. How to identify the code and configuration that produced the output, for example a commit and a fingerprint.
3. How to make a claim like "no network requests" checkable rather than taken on trust.
4. How a diff between the old output and the rebuild should explain every changed value, and what an unexplained change tells me. Then show a short example report that meets all of these criteria.
5. ${close}`,
    returnTask: "Then come back and write one criterion for a rebuild of your own, as checkable as a line of Kick's report.",
  },
  "prove-it": {
    slug: "02-archive-ai-recovery",
    title: "Turning a recovery plan into a prompt",
    prompt: `I'm learning how to hand a bug fix to an AI coding agent when the bug is found months after the data was published. Help me turn a recovery plan into a prompt for the agent, with one running example that is not about sports.

1. What to replay, and how the agent decides which outputs are stale from a fingerprint rather than a guess about which records the bug touched.
2. What to republish, and what to leave alone because the bug never reached it.
3. What to tell the people who used the published output: a correction note that names what changed and why.
4. What the agent should report back before anything is republished, and the finished prompt with all of this in it.
5. ${close}`,
    returnTask: "Then come back and check the finished prompt against the four slots.",
  },
  "carry-it": {
    slug: "02-archive-ai-carry",
    title: "Same fix, different archives",
    prompt: `I'm learning to carry one idea to new kinds of data: after the same bug is fixed, what I can honestly claim depends on what was archived. Teach me with one running example that is not about sports, healthcare, public libraries or city government.

1. One processing bug that ran for months, in three situations: one that kept every raw input, one that kept only the processed table, and one that kept raw inputs but overwrote a source's file whenever it resubmitted.
2. The honest recovery claim in each situation: what can be rebuilt exactly, what can only be flagged or estimated, and what is lost.
3. What each situation would have needed to keep for a full recovery.
4. How to say what was lost in a correction note without claiming more than the archive supports.
5. End with three questions that check my understanding, each set in a different field. Wait for my answers before you give yours.`,
    returnTask: "Then come back and give the honest claim for a world that kept every file but not which one each report used.",
  },
};

export const aiCardId = (part: ArchivePartId) => `${part}-ai-study`;
export const aiHref = (part: ArchivePartId) => `../${archiveAi[part].slug}/`;
