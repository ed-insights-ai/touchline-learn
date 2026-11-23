export type JourneyModule = {
  n: number;
  slug: string;
  name: string;
  question: string;
  gained: string;
  step: string;
  bridge: string;
};

export type JourneyPart = { title: string; aim: string; modules: JourneyModule[] };

export const journey: JourneyPart[] = [
  {
    title: "Get evidence you can stand on",
    aim: "Before you can trust a number, you need the source it came from.",
    modules: [
      { n: 1, slug: "01-collection", name: "Sources and collection", question: "What did we collect, and what did we miss?", gained: "You can say what was collected and name what was not.", step: "Fetch", bridge: "Collecting a page once is no help if your code later misreads it and the site has changed." },
      { n: 2, slug: "02-archive", name: "The raw archive", question: "How do you recover when your own code is wrong?", gained: "You can fix a bug by replaying saved evidence.", step: "Archive", bridge: "The archive faithfully keeps whatever arrived, including the wrong page." },
      { n: 3, slug: "03-provenance", name: "Proof before parse", question: "Is this page really the one you asked for?", gained: "You can refuse a page that cannot prove what it is.", step: "Prove", bridge: "A proven page is still a page, written for fans rather than programs." },
    ],
  },
  {
    title: "Make the data mean one thing",
    aim: "Proven pages still have to become records that agree with each other.",
    modules: [
      { n: 4, slug: "04-parsing", name: "Parsing", question: "How do you read a page that was never meant to be data?", gained: "You can turn messy pages into typed records.", step: "Parse", bridge: "Those records still carry team names the way each site spelled them." },
      { n: 5, slug: "05-identity", name: "Identity", question: "When are two names the same thing?", gained: "You can give each entity one identity and catch a false merge.", step: "Resolve", bridge: "An identified team can still have a blank where a score should be." },
      { n: 6, slug: "06-contracts", name: "Contracts and missing data", question: "What does a record promise, and what does a blank mean?", gained: "You can write what a record promises and say why a value is missing.", step: "Resolve", bridge: "A written promise does nothing until something enforces it." },
    ],
  },
  {
    title: "Release one checked truth",
    aim: "Stop a bad record before anyone sees it, then publish every product from the same checked files.",
    modules: [
      { n: 7, slug: "07-gates", name: "Gates and parity", question: "What has the power to stop a bad release?", gained: "You can stop a release when the data breaks its promises.", step: "Check", bridge: "A checked season still has to reach readers in more than one form." },
      { n: 8, slug: "08-products", name: "Derived products", question: "How can many products tell one truth?", gained: "You can build several products from one set of checked files.", step: "Build", bridge: "Once the numbers agree, it is tempting to let a model write about them." },
    ],
  },
  {
    title: "Use AI and run it responsibly",
    aim: "With the foundations in place, decide what AI may touch and who runs it all.",
    modules: [
      { n: 9, slug: "09-ai", name: "Where AI fits", question: "Where can AI help without risking the numbers?", gained: "You can keep AI in the role where its mistakes can be caught.", step: "Build", bridge: "Every safeguard so far still depends on who can change it and what runs when." },
      { n: 10, slug: "10-operations", name: "Repositories and operations", question: "Who holds the keys, what runs when, and what does it cost?", gained: "You can say who holds the keys, what runs when, and what it costs.", step: "All steps", bridge: "You have now seen every step. One thing is left: answer the agent that started this." },
    ],
  },
];

export const journeyModules = journey.flatMap((part, partIndex) =>
  part.modules.map((module) => ({ ...module, part, partNumber: partIndex + 1 })),
);
