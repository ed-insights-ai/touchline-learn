export type PhaseKey = "discover" | "investigate" | "decide" | "demonstrate";

export const phases: { key: PhaseKey; name: string; what: string }[] = [
  { key: "discover", name: "Discover", what: "the problem" },
  { key: "investigate", name: "Investigate", what: "the evidence" },
  { key: "decide", name: "Decide", what: "what to do" },
  { key: "demonstrate", name: "Demonstrate", what: "that it transfers" },
];

export const parts: { id: string; phase: PhaseKey; name: string; short: string; what: string }[] = [
  { id: "setup", phase: "discover", name: "Setup", short: "Setup", what: "One prompt, one Friday" },
  { id: "coverage", phase: "discover", name: "The idea: coverage", short: "The idea", what: "What was expected vs. what arrived" },
  { id: "case-dunmore", phase: "investigate", name: "Case 1. Dunmore", short: "Case 1", what: "A count needs an expected set" },
  { id: "case-hartwell", phase: "investigate", name: "Case 2. Hartwell", short: "Case 2", what: "Gaps arrive in blocks" },
  { id: "case-cedar-grove", phase: "investigate", name: "Case 3. Cedar Grove", short: "Case 3", what: "Empty, unknown, and never asked" },
  { id: "decision", phase: "decide", name: "The decision", short: "Decision", what: "What to do when a site is silent" },
  { id: "rewind", phase: "decide", name: "Rewind", short: "Rewind", what: "The same Friday, prompted properly" },
  { id: "prove-it", phase: "demonstrate", name: "Prove it", short: "Prove it", what: "The season nobody called about" },
  { id: "carry-it", phase: "demonstrate", name: "Carry it", short: "Carry it", what: "Same number, three worlds" },
];

export const partAt = (id: string) => {
  const n = parts.findIndex((p) => p.id === id);
  if (n < 0) throw new Error(`Module 1 has no part called ${id}`);
  const part = parts[n];
  return { ...part, n: n + 1, of: parts.length, phaseName: phases.find((p) => p.key === part.phase)!.name, next: parts[n + 1] };
};

export const outcomes: { can: string; href: string; where: string }[] = [
  { can: "Say what a collection should contain before it runs, from a source outside the run.", href: "#case-dunmore", where: "Case 1" },
  { can: "Trace one missing source to the block of records it takes with it, and bound how far a number could move.", href: "#case-hartwell", where: "Case 2" },
  { can: "Tell empty, unknown and never asked apart, and say what each lets you claim.", href: "#case-cedar-grove", where: "Case 3" },
  { can: "Decide what a collector does when a source is silent, and separate a run that succeeded from a table that is ready to publish.", href: "#decision", where: "The decision" },
];
