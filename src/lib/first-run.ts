import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type Fixture = {
  id: string; date: string; home: string; away: string; status: string; source_url: string;
  conference_game: boolean; home_score?: number; away_score?: number;
};
export type TableRow = { slug: string; name: string; p: number; gf: number; ga: number; pts: number };

const DOWN = "dunmore";
const sample = (...parts: string[]) => join(process.cwd(), "sample", ...parts);
const json = (...parts: string[]) => JSON.parse(readFileSync(sample(...parts), "utf-8"));
const fixtures: Fixture[] = json("data", "fixtures", "2026-men-plc.json").fixtures;
const programmes = json("data", "reference", "programmes.json").programmes;
const nameOf = (slug: string): string => programmes[slug].name;
const day = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const mark = (gf: number, ga: number) => `${gf > ga ? "W" : gf === ga ? "T" : "L"} ${gf}-${ga}`;

const scored = fixtures.filter((f) => f.conference_game && f.status === "final" && f.home_score !== undefined);
const fromDown = (f: Fixture) => new URL(f.source_url).hostname.includes(DOWN);

function standings(rows: Fixture[]): TableRow[] {
  const out = new Map<string, TableRow>();
  const add = (slug: string, gf: number, ga: number) => {
    const r = out.get(slug) ?? { slug, name: nameOf(slug), p: 0, gf: 0, ga: 0, pts: 0 };
    r.p += 1; r.gf += gf; r.ga += ga; r.pts += gf > ga ? 3 : gf === ga ? 1 : 0;
    out.set(slug, r);
  };
  rows.forEach((f) => { add(f.home, f.home_score!, f.away_score!); add(f.away, f.away_score!, f.home_score!); });
  return [...out.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || a.slug.localeCompare(b.slug));
}

export const reported = standings(scored.filter((f) => !fromDown(f)));
export const repaired = standings(scored);
const place = (rows: TableRow[], slug: string) => rows.findIndex((r) => r.slug === slug) + 1;

const hosted = fixtures.filter((f) => fromDown(f) && f.conference_game).sort((a, b) => a.date.localeCompare(b.date));
export const recovered = hosted.map((f) => {
  const page = readFileSync(sample("raw_html", f.away, "2026-men-schedule.html"), "utf-8");
  const hit = page.match(new RegExp(`<td>${f.date}</td><td>at</td><td>Dunmore</td><td>[WLT] (\\d+)-(\\d+)</td>`));
  if (!hit || Number(hit[1]) !== f.away_score || Number(hit[2]) !== f.home_score) {
    throw new Error(`${f.away}'s schedule no longer matches the Dunmore fixture on ${f.date}`);
  }
  return { slug: f.away, gf: f.home_score!, ga: f.away_score! };
});

const onlyOnDown = fixtures.filter((f) => fromDown(f) && !f.conference_game);
export const unseen = onlyOnDown.map((f) => ({ date: day(f.date), opponent: nameOf(f.home === DOWN ? f.away : f.home) }));

const hartwell = fixtures.filter((f) => new Set([f.home, f.away]).size === 2 && [f.home, f.away].includes("hartwell-tech") && [f.home, f.away].includes(DOWN));
const hartwellHome = hartwell.find((f) => f.home === "hartwell-tech")!;
const hartwellAway = hartwell.find((f) => f.away === "hartwell-tech")!;
export const hartwellRows = {
  counted: `${day(hartwellHome.date)}, vs Dunmore, ${mark(hartwellHome.home_score!, hartwellHome.away_score!)}`,
  missing: `${day(hartwellAway.date)}, at Dunmore, ${mark(hartwellAway.away_score!, hartwellAway.home_score!)}`,
};

const pages = readdirSync(sample("raw_html"))
  .filter((d) => d !== "traps")
  .flatMap((d) => readdirSync(sample("raw_html", d)).filter((f) => /^2026-men-.*\.html$/.test(f)).map((f) => ({ school: d, file: f })));
const isSchedule = (p: { file: string }) => p.file === "2026-men-schedule.html";
const schedules = pages.filter(isSchedule).sort((a, b) => a.school.localeCompare(b.school));
const boxes = pages.filter((p) => !isSchedule(p));
const trace = [...schedules, ...boxes];
const sizeOf = (p: { school: string; file: string }) => statSync(sample("raw_html", p.school, p.file)).size;
const changed = readFileSync(sample("raw_html", "st-lambert", "2026-men-schedule.html"), "utf-8")
  .replace("<td></td><td></td></tr>", "<td>W 2-1</td><td></td></tr>");

export const run = {
  total: trace.length,
  schedules: schedules.length,
  boxes: boxes.length,
  downIndex: trace.findIndex((p) => p.school === DOWN && isSchedule(p)),
  changedIndex: trace.findIndex((p) => p.school === "st-lambert" && isSchedule(p)),
  allBytes: trace.reduce((n, p) => n + sizeOf(p), 0),
  rerunBytes: sizeOf(schedules.find((p) => p.school === DOWN)!) + Buffer.byteLength(changed),
};

export const dunmorePlayed = reported.find((r) => r.slug === DOWN)!.p;
export const fewestOthers = Math.min(...reported.filter((r) => r.slug !== DOWN).map((r) => r.p));
export const stillToPlay = fixtures.filter((f) => f.conference_game && f.status !== "final").length;
export const noPublishedScore = fixtures.filter((f) => f.conference_game && f.status === "final" && f.home_score === undefined).length;

if (run.total !== 20 || run.schedules !== 8 || recovered.length !== 7 || unseen.length !== 4
  || place(reported, "hartwell-tech") !== 4 || place(repaired, "hartwell-tech") !== 2
  || stillToPlay !== 2 || noPublishedScore !== 1) {
  throw new Error("the first-run story no longer matches the sample");
}
