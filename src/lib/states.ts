export const states = [
  { key: "complete", name: "Complete", means: "Fetched, verified as the requested page, and contains rows.", claim: "You can count what is on it." },
  { key: "empty", name: "Empty", means: "Fetched and verified, and it genuinely contains no rows.", claim: "You can report that the source has nothing here (zero)." },
  { key: "unavailable", name: "Unavailable", means: "Could not be fetched, or could not be verified as the right page. The reason is recorded.", claim: "Report it as unknown, never as zero." },
  { key: "no-collector", name: "No collector", means: "Published in a format your collector cannot read.", claim: "Report that you cannot read it yet." },
];

export const stateOptions = [...states.map((s) => [s.key, s.name]), ["none", "None of the four"]];
export const stateName = (key: string) => stateOptions.find(([k]) => k === key)![1];
