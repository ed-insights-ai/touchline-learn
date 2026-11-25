import { readFileSync } from "node:fs";
import { join } from "node:path";
import { reported, repaired, run } from "./first-run";

type Cell = { state: string; reason?: string; count?: number; programme: string; layer: string };
type Fixture = { id: string; home: string; away: string; status: string; conference_game: boolean; home_score?: number };
type Stint = { conference: string; from_season: number; to_season?: number };

const json = (...parts: string[]) => JSON.parse(readFileSync(join(process.cwd(), "sample", "data", ...parts), "utf-8"));
const programmes: { slug: string; name: string; abbr: string }[] = json("fixtures", "2026-men-plc.json").programmes;
const nameOf = (slug: string) => programmes.find((p) => p.slug === slug)!.name;
const cells: Record<string, Cell> = json("coverage.json").cells;

export const LAYERS = [
  { key: "schedule", label: "Schedule" },
  { key: "roster", label: "Roster" },
  { key: "stats", label: "Season stats" },
  { key: "matches", label: "Box scores" },
] as const;

export type GridCell = { state: "complete" | "empty" | "unavailable" | "no-collector" | "not-asked"; note: string };
export type GridRow = { slug: string; name: string; cells: GridCell[] };

const conference = (season: number): Fixture[] =>
  json("fixtures", `${season}-men-plc.json`).fixtures.filter((f: Fixture) => f.conference_game);

const now = conference(2026);
const finals = now.filter((f) => f.status === "final");
const schools = [...new Set(now.map((f) => f.home))].sort();

export const story = {
  schools: schools.length,
  requests: run.total,
  saved: run.total - 1,
  scheduled: now.length,
  finals: finals.length,
  counted: reported.reduce((n, r) => n + r.p, 0) / 2,
  afterRepair: repaired.reduce((n, r) => n + r.p, 0) / 2,
};

export const kickGrid: GridRow[] = schools.map((slug) => ({
  slug,
  name: nameOf(slug),
  cells: LAYERS.map(({ key }): GridCell => {
    if (key === "schedule") {
      return slug === "dunmore"
        ? { state: "unavailable", note: "Asked for. The site did not answer." }
        : { state: "complete", note: "Asked for, saved, and it lists this season's matches." };
    }
    if (key === "matches" && slug === "alder-ridge") return { state: "complete", note: `Asked for. ${run.boxes} box scores saved.` };
    return { state: "not-asked", note: "Never in Kick's plan, so no record exists." };
  }),
}));

const cellFor = (home: string, away: string) => {
  if (home === away) return "self";
  const f = now.find((x) => x.home === home && x.away === away)!;
  if (f.status !== "final") return "later";
  if (f.home_score === undefined) return "noscore";
  return home === "dunmore" ? "lost" : "read";
};
export const lostAtHost = schools.map((home) => ({
  slug: home,
  name: nameOf(home),
  abbr: programmes.find((p) => p.slug === home)!.abbr,
  row: schools.map((away) => cellFor(home, away)),
}));
const tally = (kind: string) => lostAtHost.flatMap((h) => h.row).filter((c) => c === kind).length;
const down = reported.find((r) => r.slug === "dunmore")!;
export const bounds = { played: down.p, points: down.pts, unseen: tally("lost"), high: down.pts + 3 * tally("lost") };

export const places = repaired.map((r, i) => ({
  slug: r.slug,
  name: r.name,
  after: i + 1,
  before: reported.findIndex((b) => b.slug === r.slug) + 1,
}));

const past = conference(2025);
const memberships: Record<string, { men: Stint[] }> = JSON.parse(readFileSync(join(process.cwd(), "sample", "data", "reference", "membership.json"), "utf-8")).memberships;
const pastSchools = Object.keys(memberships).filter((slug) => memberships[slug].men.some((m) => m.conference === "PLC" && m.from_season <= 2025 && (m.to_season ?? 2025) >= 2025)).sort();
const held = new Set(past.map((f) => `${f.home}>${f.away}`));
const unseenPairs = pastSchools.flatMap((a) => pastSchools.filter((b) => b !== a && !held.has(`${a}>${b}`)).map((b) => [a, b]));
const boxes = json("matches", "2025-men-plc.json").matches;

export const unseen = {
  schools: pastSchools.map((slug) => ({ slug, name: nameOf(slug) })),
  grid: pastSchools.map((slug): GridRow => ({
    slug,
    name: nameOf(slug),
    cells: LAYERS.map(({ key }): GridCell => {
      const c = cells[`2025/men/${slug}/${key}`];
      const reason = (c.reason ?? "").replace(/^\[2025\] /, "").replace(/^[a-z-]+: /, "");
      return {
        state: c.state as GridCell["state"],
        note: c.state === "complete" ? `${c.count} ${key === "schedule" ? "matches kept from this page, after duplicates were collapsed" : key === "matches" ? "box scores kept from this site" : "players"}.` : `${reason.charAt(0).toUpperCase()}${reason.slice(1)}.`,
      };
    }),
  })),
  cells: pastSchools.length * LAYERS.length,
  notComplete: pastSchools.flatMap((s) => LAYERS.map((l) => cells[`2025/men/${s}/${l.key}`])).filter((c) => c.state !== "complete").length,
  schedules: pastSchools.filter((s) => cells[`2025/men/${s}/schedule`].state === "complete").length,
  expected: pastSchools.length * (pastSchools.length - 1),
  held: past.length,
  missingSchools: [...new Set(unseenPairs.flat())].sort(),
  withBox: past.filter((f) => f.id in boxes).length,
  dunmoreHeld: past.filter((f) => f.home === "dunmore" || f.away === "dunmore").length,
  rosters: pastSchools.filter((s) => cells[`2025/men/${s}/roster`].state === "complete").length,
};

const pick = ({ state, reason, count, confirmed_at }: Cell & { confirmed_at: string }) => ({ state, ...(count === undefined ? {} : { count }), ...(reason ? { reason } : {}), confirmed_at });
export const sampleCells = ["2025/men/alder-ridge/schedule", "2025/men/eastbrook-state/schedule"].map((key) => `"${key}": ${JSON.stringify(pick(cells[key] as Cell & { confirmed_at: string }), null, 2)}`).join(",\n");

const keptFromHarbor = past.filter((f) => !(f.id in boxes));
export const harborDark = keptFromHarbor.filter((f) => [f.home, f.away].some((x) => x === "dunmore" || x === "eastbrook-state")).length;

const text = (v: string) => v.replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
const rowRe = /<tr data-game="(\d+)"><td>([\d-]+)<\/td><td>(vs|at)<\/td><td>([^<]+)<\/td><td>([^<]*)<\/td>/g;
const postseason = new Set<string>(json("fixtures", "2026-men-plc.json").fixtures.filter((f: { stage?: { phase: string } }) => f.stage?.phase === "postseason").map((f: Fixture) => f.id.split(":").pop()));
const memberNames = schools.map(nameOf);
const buildPack = (absent: string) => {
  const pages = schools.filter((slug) => slug !== absent).map((slug) => {
    const html = readFileSync(join(process.cwd(), "sample", "raw_html", slug, "2026-men-schedule.html"), "utf-8");
    return { name: nameOf(slug), rows: [...html.matchAll(rowRe)].filter((m) => !postseason.has(m[1])).map((m) => ({ date: m[2], side: m[3], opp: text(m[4]), result: m[5] })) };
  });
  const seen = new Map<string, string>();
  pages.forEach((page) => page.rows.filter((r) => memberNames.includes(r.opp)).forEach((r) => {
    const key = `${r.date} ${[page.name, r.opp].sort().join(" v ")}`;
    if (!seen.has(key) || /\d/.test(r.result)) seen.set(key, r.result);
  }));
  const row = repaired.find((r) => r.slug === absent)!;
  const hostOnly = pages.reduce((n, page) => n + page.rows.filter((r) => r.side === "vs" && r.opp === nameOf(absent) && /\d/.test(r.result)).length, 0);
  return {
    absent: nameOf(absent),
    hostOnly,
    text: pages.map((page) => `${page.name}, 2026 men's soccer schedule\n${page.rows.map((r) => `${r.date}  ${r.side}  ${r.opp}  ${r.result}`.trimEnd()).join("\n")}`).join("\n\n"),
    listed: seen.size,
    scored: [...seen.values()].filter((r) => /\d/.test(r)).length,
    played: row.p,
    points: row.pts,
  };
};
const first = buildPack("dunmore");
export const pack = { members: memberNames, text: first.text, listed: first.listed, scored: first.scored, dunmorePlayed: first.played, dunmorePoints: first.points };
export const packB = buildPack("hartwell-tech");

const emptyCell = cells["2025/women/st-lambert/stats"];

if (story.schools !== 8 || story.requests !== 20 || story.finals !== 54 || story.counted !== 46 || story.afterRepair !== 53
  || story.scheduled !== 56 || tally("read") !== 46 || tally("lost") !== 7 || tally("later") !== 2 || tally("noscore") !== 1
  || bounds.played !== 6 || bounds.points !== 10 || bounds.high !== 31 || unseen.dunmoreHeld !== 10 || unseen.rosters !== 6
  || cells["2025/men/harbor-point/matches"].state !== "unavailable" || cells["2025/men/eastbrook-state/matches"].state !== "unavailable"
  || unseen.schools.length !== 7 || unseen.cells !== 28 || unseen.notComplete !== 7 || unseen.schedules !== 5
  || unseen.expected !== 42 || unseen.held !== 40 || unseen.withBox !== 32
  || keptFromHarbor.length !== 8 || harborDark !== 4 || keptFromHarbor.some((f) => !f.id.startsWith("tally:harbor-point:"))
  || first.hostOnly !== bounds.played || packB.listed !== 56 || packB.scored !== 53 || pack.listed !== 56 || pack.scored !== 53 || pack.dunmorePlayed !== 13 || pack.dunmorePoints !== 18
  || unseen.missingSchools.join() !== "dunmore,eastbrook-state"
  || cells["2025/men/dunmore/schedule"].state !== "no-collector" || cells["2025/men/eastbrook-state/schedule"].state !== "unavailable"
  || emptyCell.state !== "empty" || places.filter((p) => p.before !== p.after).length !== 5) {
  throw new Error("the coverage lesson no longer matches the sample");
}
