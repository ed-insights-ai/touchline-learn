import { phases, type Lesson, type Outcome, type Part } from "./lesson";

export type ArchivePartId = "setup" | "idea" | "case-saturday" | "case-kept" | "case-fingerprint" | "decision" | "rewind" | "prove-it" | "carry-it";

export const parts: (Part & { id: ArchivePartId })[] = [
  { id: "setup", phase: "discover", name: "Setup", short: "Setup", what: "Tuesday, one line of code" },
  { id: "idea", phase: "discover", name: "The idea: raw, derived and replay", short: "The idea", what: "Raw, derived and replay" },
  { id: "case-saturday", phase: "investigate", name: "Case 1. Saturday's matches", short: "Case 1", what: "Replay versus re-fetch" },
  { id: "case-kept", phase: "investigate", name: "Case 2. What Kick kept", short: "Case 2", what: "Raw or already cooked" },
  { id: "case-fingerprint", phase: "investigate", name: "Case 3. Which outputs are stale", short: "Case 3", what: "Fingerprints, not guesses" },
  { id: "decision", phase: "decide", name: "The decision", short: "Decision", what: "What a re-fetch would have cost" },
  { id: "rewind", phase: "decide", name: "Rewind", short: "Rewind", what: "Tuesday with a replay requirement" },
  { id: "prove-it", phase: "demonstrate", name: "Prove it", short: "Prove it", what: "The bug found in March" },
  { id: "carry-it", phase: "demonstrate", name: "Carry it", short: "Carry it", what: "Same fix, three archives" },
];

export const outcomes: Outcome[] = [
  { can: "Tell a replay from a re-fetch, and say what a re-fetch changes besides the bug, including the evidence it can overwrite.", short: "Tell a replay from a re-fetch, and what a re-fetch changes besides the bug", href: "#case-saturday", where: "Case 1" },
  { can: "Say what an archive must hold so a bug can be fixed by replay, and find the last layer before the damage.", short: "Say what an archive must hold, and find the last layer before the damage", href: "#case-kept", where: "Case 2" },
  { can: "Decide which outputs are stale after a change from a fingerprint, not a guess, and say why rebuilding too little is the dangerous mistake.", short: "Decide what is stale from a fingerprint, not a guess", href: "#case-fingerprint", where: "Case 3" },
  { can: "Write acceptance criteria that make an agent's rebuild checkable, and check a rebuild report against them.", short: "Write acceptance criteria that make a rebuild checkable", href: "#rewind", where: "Rewind" },
];

export const lead = "Fixing the code doesn't fix the table. Rebuilding from saved evidence does.";

export const archive: Lesson = {
  n: 2,
  slug: "02-archive",
  phases,
  parts,
  outcomes,
  keys: { store: "touchline-m2-archive", progress: "touchline-m2-progress", review: "touchline-m2-review" },
};
