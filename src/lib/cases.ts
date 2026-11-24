import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hartwellRows, reported, repaired, run, scheduleLog, stillToPlay } from "./first-run";

type Fixture = { date: string; home: string; away: string; status: string; conference_game: boolean; home_score?: number };

const root = (...parts: string[]) => join(process.cwd(), ...parts);
const season = JSON.parse(readFileSync(root("sample", "data", "fixtures", "2026-men-plc.json"), "utf-8"));
const nameOf = (slug: string): string => season.programmes.find((p: { slug: string }) => p.slug === slug).name;
const conference: Fixture[] = season.fixtures.filter((f: Fixture) => f.conference_game);

export const rileyAsk = "Collect this season's men's soccer results from all eight school sites and build a conference table I can publish.";

const blank = conference.filter((f) => f.status === "final" && f.home_score === undefined);
const longDay = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
export const noScore = { day: longDay(blank[0].date), home: nameOf(blank[0].home), away: nameOf(blank[0].away) };

export const pipeline = {
  asked: run.schedules,
  silent: scheduleLog.filter((l) => l.result !== "saved").length,
  saved: scheduleLog.filter((l) => l.result === "saved").length,
  boxes: run.boxes,
  rows: reported.length,
};

const row = (rows: typeof reported, slug: string) => rows.find((r) => r.slug === slug)!;
const split = (r: (typeof reported)[number]) => ({ p: r.p, ga: r.ga, perMatch: (r.ga / r.p).toFixed(2), gd: r.gf - r.ga });
export const dunmoreSplit = { kick: split(row(reported, "dunmore")), all: split(row(repaired, "dunmore")) };

const ht = row(reported, "hartwell-tech");
export const hartwell = { pts: ht.pts, p: ht.p, high: ht.pts + 3, seven: hartwellRows.missing.split(" ").at(-1)!, place: reported.indexOf(ht) + 1, after: repaired.findIndex((r) => r.slug === "hartwell-tech") + 1 };

export const toPlay = stillToPlay;

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen"];
export const spell = (n: number, start = false) => {
  const w = WORDS[n] ?? String(n);
  return start ? w.charAt(0).toUpperCase() + w.slice(1) : w;
};

export const clips = {
  dolan: [40.6, 51.2],
  dunmore: [51.5, 60.8],
  cedar: [61.2, 72.3],
} as const;

const film = readFileSync(root("src", "components", "FilmOpening.astro"), "utf-8");

if (!film.includes(rileyAsk) || blank.length !== 1 || noScore.day !== "September 21" || noScore.home !== "Cedar Grove" || noScore.away !== "St. Lambert"
  || pipeline.asked !== 8 || pipeline.silent !== 1 || pipeline.saved !== 7 || pipeline.boxes !== 12 || pipeline.rows !== 8
  || dunmoreSplit.kick.p !== 6 || dunmoreSplit.kick.perMatch !== "0.83" || dunmoreSplit.kick.gd !== 3
  || dunmoreSplit.all.p !== 13 || dunmoreSplit.all.perMatch !== "1.54" || dunmoreSplit.all.gd !== -5
  || hartwell.pts !== 18 || hartwell.high !== 21 || hartwell.place !== 4 || hartwell.after !== 2 || hartwell.seven !== "7-0" || !hartwellRows.missing.includes("at Dunmore, W ") || toPlay !== 2) {
  throw new Error("the Module 1 cases no longer match the sample or the film");
}
