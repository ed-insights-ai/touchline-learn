import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRESETS, simulate, truthTable, type BenchData, type Fixture } from "./bench-core";

export * from "./bench-core";

type Source = { home: string; away: string; date: string; status: string; conference_game: boolean; home_score?: number; away_score?: number };

const json = (...parts: string[]) => JSON.parse(readFileSync(join(process.cwd(), "sample", "data", ...parts), "utf-8"));
const fixtures: Source[] = json("fixtures", "2026-men-plc.json").fixtures.filter((f: Source) => f.conference_game);
const programmes: Record<string, { name: string; abbreviation: string }> = json("reference", "programmes.json").programmes;
const slugs = [...new Set(fixtures.flatMap((f) => [f.home, f.away]))].sort();

export const benchData: BenchData = {
  schools: slugs.map((slug) => ({ slug, name: programmes[slug].name, abbr: programmes[slug].abbreviation })),
  fixtures: fixtures
    .map((f): Fixture => [slugs.indexOf(f.home), slugs.indexOf(f.away), f.date, f.home_score ?? null, f.away_score ?? null, f.status === "final" ? 1 : 0])
    .sort((x, y) => x[2].localeCompare(y[2]) || x[0] - y[0]),
};
export const truth = truthTable(benchData);

const friday = simulate(benchData, PRESETS.friday);
const both = simulate(benchData, PRESETS.both);
const fill = simulate(benchData, { ...PRESETS.friday, design: "fill" });
const stop = simulate(benchData, { ...PRESETS.friday, design: "stop" });
const record = simulate(benchData, PRESETS.record);
const dunmore = friday.table.find((r) => r.slug === "dunmore")!;
const fridayOrder = ["alder-ridge", "brightwater-state", "eastbrook-state", "hartwell-tech", "dunmore", "st-lambert", "cedar-grove", "harbor-point"];

if (benchData.schools.length !== 8 || benchData.fixtures.length !== 56 || friday.scored !== 53
  || friday.read !== 46 || friday.finished !== 54 || friday.unread !== 7 || friday.noscore !== 1 || friday.inTable !== 46
  || friday.table.map((r) => r.slug).join() !== fridayOrder.join() || dunmore.p !== 6 || dunmore.pts !== 10 || friday.wrong !== 8
  || both.read !== 53 || both.table[1].slug !== "hartwell-tech" || both.wrong !== 0
  || fill.inTable !== 53 || fill.invented !== 7 || !stop.stopped || stop.wrong !== null
  || !friday.says.includes(" 46 conference matches") || !record.says.includes("September 21") || !record.says.endsWith("I would not publish this.")) {
  throw new Error("the Friday bench no longer matches the sample");
}
