import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { journeyModules } from "../data/journey";

export const FIXTURE = "tally:alder-ridge:8203";
const sample = (...parts: string[]) => join(process.cwd(), "sample", ...parts);
const json = (...parts: string[]) => JSON.parse(readFileSync(sample(...parts), "utf-8"));

const fixture = json("data", "fixtures", "2026-men-plc.json").fixtures.find((f: { id: string }) => f.id === FIXTURE);
const box = json("data", "matches", "2026-men-plc.json").matches[FIXTURE];
const rawName = "2026-men-box-tally-alder-ridge-8203.html";
const html = readFileSync(sample("raw_html", "alder-ridge", rawName), "utf-8");
const lines = html.split("\n");
const titleLine = lines.find((l) => l.includes("<title>"))!.trim().replaceAll("&#x27;", "'");
const tableStart = lines.findIndex((l) => l.includes("Score by Period"));
const tableEnd = lines.findIndex((l, i) => i > tableStart && l.includes("</table>"));
const scoreRows = lines.slice(tableStart + 1, tableEnd).map((l) => l.trim());
const rawSnippet = [titleLine, ...scoreRows].join("\n");
const teamRows = scoreRows.length - 1;
const scheduleLinks = readdirSync(sample("raw_html", "alder-ridge"))
  .filter((f) => f.startsWith("2026-men-") && f.endsWith(".html") && !f.includes("-box-"))
  .some((f) => readFileSync(sample("raw_html", "alder-ridge", f), "utf-8").includes("boxscore/8203"));
if (!scheduleLinks) throw new Error("the tour's schedule no longer links to this match");
export const [home, away] = box.teams as { name: string; abbr: string; score: number; periods: number[] }[];
const total = (periods: number[]) => periods.reduce((a, b) => a + b, 0);
if (teamRows !== 2 || !titleLine.includes("9/8/2026")) throw new Error("the tour's proof example no longer holds");
if (total(home.periods) !== home.score || total(away.periods) !== away.score) throw new Error("the tour's period totals no longer add up");
if (home.score !== fixture.home_score || away.score !== fixture.away_score) throw new Error("the tour's fixture and box score disagree");

const parsed = `home: ${home.name}, ${home.score} (periods ${home.periods.join(", ")})
away: ${away.name}, ${away.score} (periods ${away.periods.join(", ")})
date: ${fixture.date}`;

export type Zone = "raw" | "clean" | "derived";

const modulesFor = (...ns: number[]) => ns.map((n) => journeyModules.find((m) => m.n === n)!);

export const stops = [
  { name: "Fetch", zone: "raw", modules: modulesFor(1), title: "Ask for the page", body: "The collector works from a list of the sites it must ask and follows the links each schedule page publishes. It never guesses a URL, and it records which pages answered and which did not.", artifact: `asked: ${box.source_url}\nresult: answered, saved`, risk: "Without it: a page that never arrived leaves no trace, and a guessed URL quietly returns the wrong page." },
  { name: "Archive", zone: "raw", modules: modulesFor(2), title: "Save it untouched", body: "The page is stored byte for byte before any code reads it.", artifact: rawSnippet, risk: "Without it: a parser bug means collecting everything again, if the page still exists." },
  { name: "Prove", zone: "clean", modules: modulesFor(3), title: "Make the page prove itself", body: "The school's own schedule must list this match and link to this page. Then the page itself must name the match date and show exactly two teams.", artifact: `schedule lists this match and links here: yes\ntitle names 9/8/2026: yes\nteams in the score table: ${teamRows}\nresult: accepted`, risk: "Without it: a page from the wrong season parses perfectly." },
  { name: "Parse", zone: "clean", modules: modulesFor(4), title: "Turn the page into a record", body: "Code reads the tables into typed fields. Pages are written for fans, so the parser expects layouts to vary.", artifact: parsed, risk: "Without it: the numbers stay trapped in page layout." },
  { name: "Resolve", zone: "clean", modules: modulesFor(5, 6), title: "Give each team one identity", body: "Published names become stable ids, so every later join means the same school.", artifact: `${home.name} → ${fixture.home}\n${away.name} → ${fixture.away}`, risk: "Without it: one school splits into several, or two schools become one." },
  { name: "Check", zone: "clean", modules: modulesFor(7), title: "Let a gate stop the line", body: "Automatic checks compare the record against its contract, the written rules for its shape, and against itself.", artifact: `${home.name}: ${home.periods.join(" + ")} = ${home.score}\n${away.name}: ${away.periods.join(" + ")} = ${away.score}\nschedule and match page agree: yes`, risk: "Without it: a bad record reaches everything built on it." },
  { name: "Build", zone: "derived", modules: modulesFor(8, 9), title: "Publish from the clean files", body: "The website, the analytical database and the written season summaries, called journals, all read the same record.", artifact: `${home.name} ${home.score}, ${away.name} ${away.score}\nwebsite · database · journal`, risk: "Without it: each product tells its own version of the result." },
] as const satisfies readonly { zone: Zone; [key: string]: unknown }[];

export const zones = [
  { key: "raw", name: "Raw", holds: "Every page, byte for byte", also: "Also called bronze", lost: "Gone. Nothing can recreate these pages." },
  { key: "clean", name: "Clean", holds: "Season files in a fixed shape", also: "Also called silver", lost: "Rebuilt from raw." },
  { key: "derived", name: "Derived", holds: "Website, database, journals", also: "Also called gold", lost: "Rebuilt from clean." },
] as const;

export const ideas = [
  ["Archive first, parse later", "The saved pages are the evidence of what each site served. The clean files are a calculation from them."],
  ["Prove the page before extracting records", "A page has to show it is what was asked for. No proof means no data, and a named gap."],
  ["Absence is data", "The pipeline records what it did not find and why. Unknown never becomes zero."],
  ["Code computes, the model writes", "Code computes every number. AI may only repeat one that can be traced, and anything else is dropped."],
] as const;

export const matchLabel = `${away.name} at ${home.name}, September 8`;

const homeRow = scoreRows.find((r) => r.includes(home.name))!;
export const trail: Record<Zone, { what: string; text: string }> = {
  raw: { what: "the saved page's score row", text: homeRow },
  clean: { what: "the parsed record", text: `home: ${home.name}, ${home.score} (periods ${home.periods.join(", ")})` },
  derived: { what: "the published result", text: `${home.name} ${home.score}, ${away.name} ${away.score}` },
};
