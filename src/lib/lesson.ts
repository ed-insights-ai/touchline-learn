export type PhaseKey = "discover" | "investigate" | "decide" | "demonstrate";
export type Phase = { key: PhaseKey; name: string; what: string };
export type Part = { id: string; phase: PhaseKey; name: string; short: string; what: string };
export type Outcome = { can: string; short: string; href: string; where: string };

export type Lesson = {
  n: number;
  slug: string;
  phases: Phase[];
  parts: Part[];
  outcomes: Outcome[];
  keys: { store: string; progress: string; review: string };
};

export const phases: Phase[] = [
  { key: "discover", name: "Discover", what: "the problem" },
  { key: "investigate", name: "Investigate", what: "the evidence" },
  { key: "decide", name: "Decide", what: "what to do" },
  { key: "demonstrate", name: "Demonstrate", what: "that it transfers" },
];

export const findPart = (lesson: Lesson, id: string) => {
  const n = lesson.parts.findIndex((p) => p.id === id);
  if (n < 0) throw new Error(`Module ${lesson.n} has no part called ${id}`);
  const part = lesson.parts[n];
  return { ...part, n: n + 1, of: lesson.parts.length, phaseName: lesson.phases.find((p) => p.key === part.phase)!.name, next: lesson.parts[n + 1] };
};
