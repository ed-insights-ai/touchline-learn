export const states = [
  { key: "complete", name: "Complete", means: "Served, proved to be the page asked for, and it holds rows.", claim: "You may count what is on it." },
  { key: "empty", name: "Empty", means: "Served and proved, and it really holds nothing.", claim: "You may say the source publishes nothing here." },
  { key: "unavailable", name: "Unavailable", means: "Not collected, or collected and not proved. The reason is recorded.", claim: "You may say you do not know. You may not say zero." },
  { key: "no-collector", name: "No collector", means: "Published in a form nothing you have can read.", claim: "You may say you cannot know yet." },
];

export const stateOptions = [...states.map((s) => [s.key, s.name]), ["none", "None of the four"]];
export const stateName = (key: string) => stateOptions.find(([k]) => k === key)![1];
