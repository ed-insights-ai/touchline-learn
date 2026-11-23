import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SAMPLE = join(process.cwd(), "sample");

export interface ArchivedPage {
  source: string;
  title: string;
  requestedUrl?: string;
  finalUrl?: string;
  status?: number;
}

const decode = (text: string) =>
  text.replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");

export function archivedPage(file: string): ArchivedPage {
  const path = join(SAMPLE, "raw_html", file);
  const source = readFileSync(path, "utf-8");
  const title = decode(source.match(/<title>(.*?)<\/title>/)?.[1] ?? "");
  if (!existsSync(`${path}.meta.json`)) return { source, title };
  const meta = JSON.parse(readFileSync(`${path}.meta.json`, "utf-8"));
  return { source, title, requestedUrl: meta.requested_url, finalUrl: meta.final_url, status: meta.status };
}

export function programme(slug: string): { name: string; nickname?: string } {
  const { programmes } = JSON.parse(readFileSync(join(SAMPLE, "data/reference/programmes.json"), "utf-8"));
  return programmes[slug];
}

export function cleanRecord(id: string, view: "fouls" | "cards" | "identity") {
  const season = "2026-men-plc.json";
  const { matches } = JSON.parse(readFileSync(join(SAMPLE, "data/matches", season), "utf-8"));
  const { fixtures } = JSON.parse(readFileSync(join(SAMPLE, "data/fixtures", season), "utf-8"));
  const box = matches[id];
  const fixture = fixtures.find((f: { id: string }) => f.id === id);
  if (!box || !fixture) throw new Error(`no clean record for ${id}`);
  const slugs = [fixture.home, fixture.away];
  if (view === "fouls") {
    return { id, teams: box.teams.map((t: { name: string; fouls: number }) => ({ name: t.name, fouls: t.fouls })) };
  }
  if (view === "cards") {
    return { id, cards: box.cards.map((c: { time: string; player: string; type: string }) => ({ time: c.time, player: c.player, type: c.type })) };
  }
  return { id, teams: box.teams.map((t: { name: string }, i: number) => ({ published: t.name, programme: slugs[i] })) };
}
