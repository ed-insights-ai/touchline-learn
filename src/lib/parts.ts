import { findPart, phases, type Lesson, type Outcome, type Part } from "./lesson";

export { phases, type PhaseKey } from "./lesson";

export const parts: Part[] = [
  { id: "setup", phase: "discover", name: "Setup", short: "Setup", what: "One prompt, one Friday" },
  { id: "coverage", phase: "discover", name: "The idea: coverage", short: "The idea", what: "What was expected vs. what you have" },
  { id: "case-dunmore", phase: "investigate", name: "Case 1. Dunmore", short: "Case 1", what: "A count needs an expected set" },
  { id: "case-hartwell", phase: "investigate", name: "Case 2. Hartwell", short: "Case 2", what: "Gaps arrive in blocks" },
  { id: "case-cedar-grove", phase: "investigate", name: "Case 3. Cedar Grove", short: "Case 3", what: "Empty, unknown, and never asked" },
  { id: "decision", phase: "decide", name: "The decision", short: "Decision", what: "What to do when a site doesn't answer" },
  { id: "rewind", phase: "decide", name: "Rewind", short: "Rewind", what: "Friday with a coverage requirement" },
  { id: "prove-it", phase: "demonstrate", name: "Prove it", short: "Prove it", what: "The season nobody called about" },
  { id: "carry-it", phase: "demonstrate", name: "Carry it", short: "Carry it", what: "Same number, three worlds" },
];

export const outcomes: Outcome[] = [
  { can: "Say what a collection should contain before it runs, from a source outside the run.", short: "Say what a collection should contain, before it runs", href: "#case-dunmore", where: "Case 1" },
  { can: "Trace one missing page to the block of records it takes with it, and bound how far a number could move.", short: "Trace a missing page to the records it takes, and bound the damage", href: "#case-hartwell", where: "Case 2" },
  { can: "Tell empty, unknown and never asked apart, and say what each lets you claim.", short: "Tell empty, unknown and never asked apart", href: "#case-cedar-grove", where: "Case 3" },
  { can: "Decide what a collector does when a page doesn't answer, and separate a run that succeeded from a table that is ready to publish.", short: "Separate a run that succeeded from a table ready to publish", href: "#decision", where: "The decision" },
];

export const collection: Lesson = {
  n: 1,
  slug: "01-collection",
  phases,
  parts,
  outcomes,
  keys: { store: "touchline-m1-coverage", progress: "touchline-m1-progress", review: "touchline-m1-review" },
};

export const partAt = (id: string) => findPart(collection, id);
