export type SharedAnswer = { key: string; options: [value: string, label: string][] };

export const refetchPredict: SharedAnswer = {
  key: "refetch-predict",
  options: [
    ["name", "Only the name changes"],
    ["numbers", "The name and the numbers change"],
    ["unknown", "Can't tell"],
  ],
};

export const labelsOf = (answer: SharedAnswer) => JSON.stringify(Object.fromEntries(answer.options));
