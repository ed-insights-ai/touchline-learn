import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repaired, reported } from "./first-run";

// Module 2's numbers, computed from the sample at build time. docs/module-2-data.md lists every export.

const root = (...parts: string[]) => join(process.cwd(), ...parts);
const sample = (...parts: string[]) => root("sample", ...parts);
const bytes = (path: string) => readFileSync(path);
const json = (path: string) => JSON.parse(readFileSync(path, "utf-8"));
const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
const fail = (what: string): never => { throw new Error(`Module 2 data: ${what}`); };
const check = (ok: boolean, what: string) => { if (!ok) fail(what); };

export const SEASON = 2026;
const CONFERENCE = "PLC";

type ManifestPage = {
  programme: string; kind: "schedule" | "box_score"; requested_url: string; state: "saved" | "unavailable";
  path?: string; fetched_at?: string; bytes?: number; sha256?: string; fixture?: string; reason?: string; tries?: number;
};
export type Manifest = {
  run: string; scope: string; started_at: string; finished_at: string; requested: number; saved: number;
  unavailable: string[]; pages: ManifestPage[];
};
type Fixture = {
  id: string; date: string; home: string; away: string; status: string; conference_game: boolean;
  home_score?: number; away_score?: number; stage?: { phase: string; round_published?: string };
};

export const fridayManifest: Manifest = json(sample("manifests", "2026-11-20-friday.json"));
export const tuesdayManifest: Manifest = json(sample("manifests", "2026-11-24-tuesday.json"));
const fixtures: Fixture[] = json(sample("data", "fixtures", "2026-men-plc.json")).fixtures;
const laterFixtures: Fixture[] = json(sample("shadow", "fixtures", "2026-men-plc.json")).fixtures;
const aliasPath = sample("data", "reference", "aliases.json");
const membershipPath = sample("data", "reference", "membership.json");
const aliases: Record<string, string[]> = json(aliasPath);
const programmes: Record<string, { name: string }> = json(sample("data", "reference", "programmes.json")).programmes;
const nameIndex = new Map(Object.entries(aliases).flatMap(([slug, names]) => names.map((n) => [n, slug] as const)));
const stints: Record<string, { men: { conference: string; from_season: number; to_season?: number }[] }> = json(membershipPath).memberships;
export const members = Object.keys(stints)
  .filter((s) => stints[s].men.some((m) => m.conference === CONFERENCE && m.from_season <= SEASON && SEASON <= (m.to_season ?? SEASON)))
  .sort();

// ---------------------------------------------------------------- the parser

export type Tidy = (name: string) => string;
export const tidyV1: Tidy = (name) => name.replaceAll("St.", "State");
export const tidyV2: Tidy = (name) => name.replace(/\bSt\.(?=\s+\w)/g, "Saint").replace(/\bSt\.$/, "State");

const decode = (t: string) => t.replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
const ROW = /<tr data-game="(\d+)"><td>([\d-]+)<\/td><td>([^<]*)<\/td><td>([^<]+)<\/td><td>([^<]*)<\/td><td>(.*?)<\/td><\/tr>/g;

export type RawRow = { fixture: string; date: string; side: string; opponent: string; result: string; line: string };
export type ParsedRow = { fixture: string; date: string; side: string; opponent: string; shown: string; result: string };

export const rawRows = (html: string): RawRow[] =>
  [...html.matchAll(ROW)].map((m) => ({ fixture: m[1], date: m[2], side: m[3], opponent: decode(m[4]), result: m[5], line: m[0] }));

export const parseSchedule = (html: string, tidy: Tidy): ParsedRow[] =>
  rawRows(html).map((r) => ({
    fixture: r.fixture, date: r.date, side: r.side, result: r.result, shown: tidy(r.opponent),
    opponent: nameIndex.get(r.opponent) ?? fail(`no alias for ${r.opponent}`),
  }));

// ---------------------------------------------------------------- pages

export type Capture = { slug: string; path: string; html: string; sha256: string; fetchedAt: string };
const capturesOf = (m: Manifest): Capture[] =>
  m.pages.filter((p) => p.kind === "schedule" && p.state === "saved").map((p) => {
    const body = bytes(sample(p.path!));
    check(sha256(body) === p.sha256, `${p.path} no longer matches its manifest hash`);
    return { slug: p.programme, path: p.path!, html: body.toString("utf-8"), sha256: p.sha256!, fetchedAt: p.fetched_at! };
  });
export const fridayPages = capturesOf(fridayManifest);
export const tuesdayPages = capturesOf(tuesdayManifest);
const fridayBoxes = fridayManifest.pages.filter((p) => p.kind === "box_score" && p.state === "saved");

// ---------------------------------------------------------------- the table

export const COLUMNS = ["place", "name", "p", "w", "d", "l", "gf", "ga", "gd", "pts"] as const;
export type Column = (typeof COLUMNS)[number];
export type TableRow = { slug: string; name: string; place: number; p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number };
export type Gap = { kind: "no-score"; date: string; home: string; away: string } | { kind: "unavailable"; programme: string; reason: string };
export type Table = {
  key: string; rows: TableRow[]; expected: number; listed: number; finished: number; scored: number;
  caption: string; postseason: string[]; gaps: Gap[]; parsed: Record<string, ParsedRow[]>;
};

const score = (result: string) => {
  const m = result.match(/^[WLT] (\d+)-(\d+)$/);
  return m ? [Number(m[1]), Number(m[2])] as const : null;
};

function build(key: string, pages: { slug: string; html: string; tidy: Tidy }[], unavailable: ManifestPage[]): Table {
  const parsed = Object.fromEntries(pages.map((p) => [p.slug, parseSchedule(p.html, p.tidy)]));
  type Match = { date: string; home: string; away: string; finished: boolean; score: readonly [number, number] | null };
  const matches = new Map<string, Match>();
  const shown = new Map<string, Set<string>>();
  for (const slug of Object.keys(parsed).sort()) {
    for (const r of parsed[slug]) {
      if (!members.includes(r.opponent)) continue;
      shown.set(r.opponent, (shown.get(r.opponent) ?? new Set()).add(r.shown));
      const [home, away] = r.side === "vs" ? [slug, r.opponent] : [r.opponent, slug];
      const m = matches.get(r.fixture) ?? { date: r.date, home, away, finished: false, score: null };
      check(m.date === r.date && m.home === home && m.away === away, `fixture ${r.fixture} differs between pages`);
      m.finished ||= r.result !== "";
      const mine = score(r.result);
      if (mine) {
        const got = r.side === "vs" ? mine : ([mine[1], mine[0]] as const);
        check(!m.score || (m.score[0] === got[0] && m.score[1] === got[1]), `pages disagree on fixture ${r.fixture}`);
        m.score = got;
      }
      matches.set(r.fixture, m);
    }
  }
  const regular = new Map<string, string>();
  [...matches.entries()].sort(([ia, a], [ib, b]) => a.date.localeCompare(b.date) || ia.localeCompare(ib))
    .forEach(([id, m]) => { if (!regular.has(`${m.home}>${m.away}`)) regular.set(`${m.home}>${m.away}`, id); });
  const games = [...regular.values()].map((id) => matches.get(id)!);
  const rows = new Map(members.map((s) => [s, { slug: s, name: "", place: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }]));
  shown.forEach((names, s) => { check(names.size === 1, `${s} is shown as ${[...names].join(" and ")}`); rows.get(s)!.name = [...names][0]; });
  for (const m of games.filter((g) => g.score)) {
    for (const [side, gf, ga] of [[m.home, m.score![0], m.score![1]], [m.away, m.score![1], m.score![0]]] as const) {
      const r = rows.get(side)!;
      r.p += 1; r.gf += gf; r.ga += ga;
      if (gf > ga) r.w += 1; else if (gf === ga) r.d += 1; else r.l += 1;
    }
  }
  const table = [...rows.values()].map((r) => ({ ...r, gd: r.gf - r.ga, pts: 3 * r.w + r.d }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || a.slug.localeCompare(b.slug))
    .map((r, i) => ({ ...r, place: i + 1 }));
  const finished = games.filter((g) => g.finished);
  const scored = finished.filter((g) => g.score).length;
  return {
    key, rows: table, parsed, expected: members.length * (members.length - 1), listed: games.length,
    finished: finished.length, scored, caption: `${scored} of ${finished.length} finished matches`,
    postseason: [...matches.keys()].filter((id) => ![...regular.values()].includes(id)).sort(),
    gaps: [
      ...finished.filter((g) => !g.score).map((g): Gap => ({ kind: "no-score", date: g.date, home: g.home, away: g.away })),
      ...unavailable.map((p): Gap => ({ kind: "unavailable", programme: p.programme, reason: p.reason! })),
    ],
  };
}

const down = (m: Manifest) => m.pages.filter((p) => p.kind === "schedule" && p.state === "unavailable");
const withRule = (pages: Capture[], tidy: Tidy) => pages.map((p) => ({ slug: p.slug, html: p.html, tidy }));

/** Tuesday's table: Friday's pages, the bad tidy rule. */
export const tableA = build("A", withRule(fridayPages, tidyV1), down(fridayManifest));
/** The replay: Friday's pages, the fixed rule. */
export const tableB = build("B", withRule(fridayPages, tidyV2), down(fridayManifest));
/** The re-fetch: Tuesday's pages, the fixed rule. */
export const tableC = build("C", withRule(tuesdayPages, tidyV2), down(tuesdayManifest));
/** The controlled half of C, never shown as a choice: Tuesday's pages, the bad rule. It attributes C's cells. */
export const tableD = build("D", withRule(tuesdayPages, tidyV1), down(tuesdayManifest));
/** Kick's plan: re-parse only St. Lambert's page with the fixed rule. */
export const tableKick = build("Kick", fridayPages.map((p) => ({ slug: p.slug, html: p.html, tidy: p.slug === "st-lambert" ? tidyV2 : tidyV1 })), down(fridayManifest));

export type Cell = { slug: string; name: string; column: Column; before: string | number; after: string | number; input: "code" | "pages" | "both" };
const cellsBetween = (a: Table, b: Table) => {
  const before = new Map(a.rows.map((r) => [r.slug, r]));
  return b.rows.flatMap((r) => COLUMNS.filter((c) => before.get(r.slug)![c] !== r[c]).map((c) => ({ slug: r.slug, name: r.name, column: c, before: before.get(r.slug)![c], after: r[c] })));
};
const changedIn = (t: Table, x: Table) => new Set(cellsBetween(t, x).map((c) => `${c.slug}/${c.column}`));
function attribute(a: Table, b: Table): Cell[] {
  const byCode = changedIn(a, tableB);
  const byPages = changedIn(a, tableD);
  return cellsBetween(a, b).map((c) => {
    const k = `${c.slug}/${c.column}`;
    return { ...c, input: byCode.has(k) && !byPages.has(k) ? "code" : byPages.has(k) && !byCode.has(k) ? "pages" : "both" };
  });
}
/** Every changed cell from Tuesday's table to the replay, with the input that changed it. */
export const diffAB = attribute(tableA, tableB);
/** Every changed cell from Tuesday's table to the re-fetch, attributed with the hidden table D. */
export const diffAC = attribute(tableA, tableC);

export type RowChange = { slug: string; name: string; input: "code" | "pages" | "both"; columns: Column[] };
const rowsOf = (cells: Cell[]): RowChange[] => {
  const out = new Map<string, RowChange>();
  cells.forEach((c) => {
    const r = out.get(c.slug) ?? { slug: c.slug, name: c.name, input: c.input, columns: [] };
    r.columns.push(c.column);
    if (r.input !== c.input) r.input = "both";
    out.set(c.slug, r);
  });
  return [...out.values()];
};
/** Case 1's graded answers: which rows change in B and C, and the input responsible for each. */
export const rowChanges = { B: rowsOf(diffAB), C: rowsOf(diffAC) };
const lambertC = rowChanges.C.find((r) => r.slug === "st-lambert");
/** Part 1's ungraded prediction, resolved in Part 6: what a re-fetch did to Saint Lambert's row. */
export const prediction = {
  answer: !lambertC ? "unchanged" : lambertC.columns.length === 1 ? "name-only" : lambertC.columns.includes("name") ? "name-and-numbers" : "numbers-only",
  columns: lambertC?.columns ?? [],
};
export const tables = {
  A: { table: tableA, label: "Tuesday's table", pages: "Friday's pages", rule: "old tidy rule" },
  B: { table: tableB, label: "Replay", pages: "Friday's pages", rule: "fixed tidy rule" },
  C: { table: tableC, label: "Re-fetch", pages: "Tuesday's pages", rule: "fixed tidy rule" },
} as const;

const shownChanges = (a: Table, b: Table) => Object.keys(a.parsed).sort().flatMap((slug) =>
  a.parsed[slug].map((r, i) => ({ page: slug, before: r, after: b.parsed[slug][i] })).filter((x) => x.before.shown !== x.after.shown));
const parsedAB = shownChanges(tableA, tableB);
const brendan = parsedAB.filter((x) => x.before.opponent === "st-brendan");
/** The exact line under Case 1: parsed rows change for St. Brendan too, a non-member that never reaches the table. */
export const stBrendanNote = {
  opponent: "St. Brendan", before: brendan[0]?.before.shown, after: brendan[0]?.after.shown, member: members.includes("st-brendan"),
  rows: brendan.length, pages: [...new Set(brendan.map((x) => programmes[x.page].name))],
  parsedRowsChanged: parsedAB.length, stLambertRows: parsedAB.filter((x) => x.before.opponent === "st-lambert").length,
};

/** Case 3's opener: re-parsing only St. Lambert's page changes nothing in the table. */
export const kickPartial = {
  tableCellsChanged: cellsBetween(tableA, tableKick).length,
  parsedRowsChanged: shownChanges(tableA, tableKick).length,
  ownPageNamesSchool: { inTitle: /<title>[^<]*St\. Lambert/.test(fridayPages.find((p) => p.slug === "st-lambert")!.html), asOpponent: tableA.parsed["st-lambert"].some((r) => r.opponent === "st-lambert") },
  pagesNamingItAsOpponent: fridayPages.filter((p) => rawRows(p.html).some((r) => r.opponent === "St. Lambert")).map((p) => p.slug),
  pagesSkipped: fridayPages.filter((p) => p.slug !== "st-lambert").length,
};

// ---------------------------------------------------------------- fingerprints

const pySource = (file: string, name: string) => {
  const lines = readFileSync(root("labs", file), "utf-8").split("\n");
  const start = lines.findIndex((l) => l.startsWith(`def ${name}(`) || l.startsWith(`class ${name}(`));
  check(start >= 0, `labs/${file} has no ${name}`);
  let end = start + 1;
  while (end < lines.length && (lines[end] === "" || /^\s/.test(lines[end]))) end += 1;
  while (lines[end - 1] === "") end -= 1;
  return `${lines.slice(start, end).join("\n")}\n`;
};
const configBytes = () => Buffer.concat([bytes(aliasPath), bytes(membershipPath)]);
const fingerprintOf = (sources: string[], config: Buffer) =>
  createHash("sha256").update(sources.join("")).update(config).update(String(SEASON)).digest("hex").slice(0, 12);
const parserSources = (tidy: "tidy_v1" | "tidy_v2") => [pySource("common.py", "Page"), pySource("m02_archive.py", "read_schedule"), pySource("m02_archive.py", tidy)];
/** The lab's own fingerprints (parser source plus aliases, membership and season), recomputed here. */
export const fingerprints = {
  v1: fingerprintOf(parserSources("tidy_v1"), configBytes()),
  v2: fingerprintOf(parserSources("tidy_v2"), configBytes()),
};

type Lineage = { slug: string; fingerprint: string; content: string };
type PresetRun = { fingerprint: string; saved: Map<string, string>; fetch: { slug: string; live: string }[] };
const stale = (files: Lineage[], run: PresetRun) => files.filter((f) => f.fingerprint !== run.fingerprint || f.content !== run.saved.get(f.slug)).length;
const upToDate = (fp: string): Lineage[] => fridayPages.map((p) => ({ slug: p.slug, fingerprint: fp, content: p.sha256 }));
const savedFriday = () => new Map(fridayPages.map((p) => [p.slug, p.sha256]));
const liveTuesday = new Map(tuesdayPages.map((p) => [p.slug, p.sha256]));
const withComment = () => { const s = parserSources("tidy_v2"); s[2] = s[2].replace("\n", "\n    # Saint before a name, State at the end.\n"); return s; };
const withAlias = () => {
  const extra = { ...aliases, "st-lambert": [...aliases["st-lambert"], "Saint Lambert"] };
  return Buffer.concat([Buffer.from(`${JSON.stringify(extra, null, 1)}\n`), bytes(membershipPath)]);
};

export type Preset = {
  id: string; label: string; fingerprintBefore: string; fingerprintAfter: string; files: number;
  rebuilt: number; fetched: number; overwritesFriday: boolean; liveDiffers: boolean;
};
function preset(id: string, label: string, before: string, after: string, fetch: string[] = [], watch?: string): Preset {
  const files = upToDate(before);
  const saved = savedFriday();
  fetch.forEach((slug) => saved.set(slug, liveTuesday.get(slug)!));
  const run: PresetRun = { fingerprint: after, saved, fetch: fetch.map((slug) => ({ slug, live: liveTuesday.get(slug)! })) };
  const slug = watch ?? fetch[0];
  return {
    id, label, fingerprintBefore: before, fingerprintAfter: after, files: files.length, rebuilt: stale(files, run), fetched: fetch.length,
    overwritesFriday: fetch.some((s) => liveTuesday.get(s) !== savedFriday().get(s)),
    liveDiffers: slug ? liveTuesday.get(slug) !== saved.get(slug) : false,
  };
}
/** Case 3's six presets, each from a full set of up-to-date parsed schedules. Counts come from the staleness model. */
export const presets: Preset[] = [
  preset("fix-rule", "Fix the tidy rule", fingerprints.v1, fingerprints.v2),
  preset("comment", "Edit a comment in the parser", fingerprints.v2, fingerprintOf(withComment(), configBytes())),
  preset("alias", "Add \"Saint Lambert\" to the alias list", fingerprints.v2, fingerprintOf(parserSources("tidy_v2"), withAlias())),
  preset("nothing", "Run again with nothing changed", fingerprints.v2, fingerprints.v2),
  preset("refetch-harbor", "Re-fetch Harbor Point's page on purpose", fingerprints.v2, fingerprints.v2, ["harbor-point"]),
  preset("live-changed", "Harbor Point's live site changed; replay without fetching", fingerprints.v2, fingerprints.v2, [], "harbor-point"),
];

// ---------------------------------------------------------------- Rewind: the lab's own report

const quotePath = root("src", "data", "quotes", "m02_archive.replay-report.txt");
/** The replay report exactly as `python labs/m02_archive.py` prints it; scripts/check_lab_output.py verifies it. */
export const replayReport = readFileSync(quotePath, "utf-8").replace(/\n$/, "");
const reportField = (label: string) => replayReport.split("\n").find((l) => l.startsWith(`${label} `))?.split(": ").slice(1).join(": ") ?? fail(`the replay report has no ${label} line`);
const labBlob = () => { const body = bytes(root("labs", "m02_archive.py")); return createHash("sha1").update(`blob ${body.length}\0`).update(body).digest("hex").slice(0, 12); };
export const rewind = {
  manifest: "sample/manifests/2026-11-20-friday.json",
  schedulesSaved: fridayPages.length,
  boxScoresSaved: fridayBoxes.length,
  requested: fridayManifest.requested,
  unavailable: down(fridayManifest).map((p) => ({ programme: p.programme, name: programmes[p.programme].name, reason: p.reason! })),
  requests: Number(reportField("requests").split(",")[0]),
  fingerprint: reportField("fingerprint").split(",")[0],
  buildRevision: reportField("build revision").split(",")[0],
  cellsChanged: Number(reportField("cells changed")),
  lines: replayReport.split("\n"),
};
check(rewind.fingerprint === fingerprints.v2, `the quoted report's fingerprint ${rewind.fingerprint} is not the fixed parser's ${fingerprints.v2}; rerun the lab and update ${quotePath}`);
check(rewind.buildRevision === labBlob(), "the quoted report's build revision is not labs/m02_archive.py as it stands; rerun the lab and update the quote");
check(rewind.requests === 0 && rewind.cellsChanged === diffAB.length, "the quoted report disagrees with the replay computed here");
check(replayReport.includes(`${tableA.caption} before and ${tableB.caption} after`), "the quoted report's caption differs");

// ---------------------------------------------------------------- Case 2: what Kick kept

const cedar = fridayPages.find((p) => p.slug === "cedar-grove")!;
const cedarRows = rawRows(cedar.html);
const pick = (date: string) => cedarRows.find((r) => r.date === date) ?? fail(`Cedar Grove has no row on ${date}`);
const CASE2 = ["2026-09-21", "2026-10-02", "2026-10-18"].map(pick);
const v1Parse = (r: { date: string; opponent: string; result: string }) => {
  const s = score(r.result) ?? [0, 0];
  return { date: r.date, home: "Cedar Grove", away: tidyV1(r.opponent), home_score: s[0], away_score: s[1] };
};
const tidyHtml = (line: string) => tidyV1(line.replace(/<(\w+)(\s[^>]*)?>/g, (_, tag: string, attrs = "") => {
  const href = attrs.match(/\shref="[^"]*"/);
  return `<${tag}${href ? href[0] : ""}>`;
}).replace(/\s+/g, " "));
const cedarSidecar = json(sample(`${cedar.path}.meta.json`));
const archives = {
  a: { label: "Parsed rows", rows: CASE2.map(v1Parse), excerpt: CASE2.map((r) => JSON.stringify(v1Parse(r))).join("\n") },
  b: { label: "Tidied HTML", rows: CASE2.map((r) => tidyHtml(r.line)), excerpt: CASE2.map((r) => tidyHtml(r.line)).join("\n") },
  c: {
    label: "Bytes as received, with a sidecar", rows: CASE2.map((r) => r.line),
    excerpt: CASE2.map((r) => r.line).join("\n"),
    sidecar: { requested_url: cedarSidecar.requested_url, final_url: cedarSidecar.final_url, fetched_at: cedarSidecar.fetched_at, status: cedarSidecar.status, sha256: cedarSidecar.sha256 },
  },
};
type Kept = "a" | "b" | "c";
const cellText = (kept: Kept, i: number, col: number) => {
  if (kept === "a") return null;
  const cells = [...archives[kept].rows[i].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((m) => decode(m[1]));
  return cells[col];
};
const opponentFrom = (kept: Kept, i: number) => kept === "a" ? archives.a.rows[i].away : cellText(kept, i, 2)!;
const sideFrom = (kept: Kept, i: number) => kept === "a" ? undefined : cellText(kept, i, 1);
const resultLooksLikeRealDraw = (kept: Kept, i: number) => {
  if (kept === "a") return JSON.stringify(archives.a.rows[i]) === JSON.stringify(v1Parse({ ...CASE2[i], result: "T 0-0" }));
  return cellText(kept, i, 3) === "T 0-0";
};
const KEPT: Kept[] = ["a", "b", "c"];
const bugs = [
  { id: "name", label: "The tidy rule turned \"St. Lambert\" into \"State Lambert\"", row: CASE2[0], truth: "Saint Lambert",
    can: (k: Kept) => tidyV2(opponentFrom(k, 0)) === "Saint Lambert" },
  { id: "side", label: "The parser ignored the vs/at column, so away matches were stored as home matches", row: CASE2[1], truth: CASE2[1].side,
    can: (k: Kept) => sideFrom(k, 1) === CASE2[1].side },
  { id: "blank", label: "Cedar Grove's 21 September result reads \"Final\" with no score and was read as 0-0", row: CASE2[0], truth: "no score published",
    can: (k: Kept) => !resultLooksLikeRealDraw(k, 0) },
];
/** Case 2: the same three Cedar Grove rows in three archive forms, and the 3x3 grid answered from them. */
export const case2 = {
  rows: CASE2.map(({ line, ...r }) => r),
  archives,
  grid: bugs.map((b) => ({ id: b.id, label: b.label, truth: b.truth, answers: Object.fromEntries(KEPT.map((k) => [k, b.can(k)])) as Record<Kept, boolean> })),
  pattern: Object.fromEntries(KEPT.map((k) => [k, bugs.filter((b) => b.can(k)).length])) as Record<Kept, number>,
};

// ---------------------------------------------------------------- Part 6: two archive policies

type Store = Map<string, { fetchedAt: string; sha256: string; html: string }[]>;
const storeAfterTuesday = (policy: "latest" | "every"): Store => {
  const store: Store = new Map(fridayPages.map((p) => [p.slug, [{ fetchedAt: p.fetchedAt, sha256: p.sha256, html: p.html }]]));
  tuesdayPages.forEach((p) => {
    const capture = { fetchedAt: p.fetchedAt, sha256: p.sha256, html: p.html };
    store.set(p.slug, policy === "latest" ? [capture] : [...store.get(p.slug)!, capture]);
  });
  return store;
};
const cellOn = (html: string, fixture: string) => rawRows(html).find((r) => r.fixture === fixture)?.result;
const answers = (policy: "latest" | "every") => {
  const store = storeAfterTuesday(policy);
  const fridayHashes = new Map(fridayPages.map((p) => [p.slug, p.sha256]));
  const has = (slug: string, hash: string) => store.get(slug)!.some((c) => c.sha256 === hash);
  const today = tuesdayPages.every((p) => has(p.slug, p.sha256));
  const monday = [...fridayHashes].every(([slug, hash]) => has(slug, hash));
  const harborFriday = store.get("harbor-point")!.find((c) => c.sha256 === fridayHashes.get("harbor-point"));
  return { today, monday, harborFriday: Boolean(harborFriday), harborFridayCell: harborFriday ? cellOn(harborFriday.html, "7318") : undefined };
};
const unchangedSinceFriday = fridayPages.filter((p) => liveTuesday.get(p.slug) === p.sha256).map((p) => p.slug);
/** Part 6: after Tuesday's re-fetch, which questions each policy can still answer. */
export const policies = {
  latest: answers("latest"),
  every: answers("every"),
  harborCell: { friday: cellOn(fridayPages.find((p) => p.slug === "harbor-point")!.html, "7318"), tuesday: cellOn(tuesdayPages.find((p) => p.slug === "harbor-point")!.html, "7318") },
  unchangedSinceFriday,
  changedSinceFriday: fridayPages.filter((p) => !unchangedSinceFriday.includes(p.slug)).map((p) => p.slug),
};

// ---------------------------------------------------------------- Part 8: Prove it, box 8210

const BOX = "tally:alder-ridge:8210";
const boxEntry = fridayBoxes.find((p) => p.fixture === BOX) ?? fail("box 8210 is not in Friday's manifest");
const boxHtml = bytes(sample(boxEntry.path!)).toString("utf-8");
const tableOf = (html: string, caption: string) => {
  const t = html.match(new RegExp(`<caption>${caption}</caption>([\\s\\S]*?)</table>`)) ?? fail(`no ${caption} table`);
  return [...t[1].matchAll(/<tr[^>]*>(.*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/g)].map((c) => decode(c[1])));
};
const periodRows = tableOf(boxHtml, "Score by Period");
const goalRows = tableOf(boxHtml, "Scoring Summary");
const overtimeGoal = goalRows.find((r) => r[0] === "101:44") ?? fail("box 8210 has no 101:44 goal");
const abbrName: Record<string, string> = { ARU: "Alder Ridge", EBSU: "Eastbrook State" };
const fx8210 = fixtures.find((f) => f.id === BOX)!;
const regulation = periodRows.slice(1).map((r) => ({ team: r[0], sum: Number(r[1]) + Number(r[2]), final: Number(r[r.length - 1]) }));
const boxHtmlOf = (p: ManifestPage) => bytes(sample(p.path!)).toString("utf-8");
const withOvertime = fridayBoxes.filter((p) => tableOf(boxHtmlOf(p), "Score by Period")[0].includes("OT")).map((p) => p.fixture!);
const scheduleCell = (slug: string) => cellOn(fridayPages.find((p) => p.slug === slug)!.html, "8210");
const boxFiles = fridayBoxes.map((p): Lineage => ({ slug: p.fixture!, fingerprint: "box-v1", content: p.sha256! }));
const scheduleFiles = upToDate(fingerprints.v2);
const boxRun: PresetRun = { fingerprint: "box-v2", saved: new Map(fridayBoxes.map((p) => [p.fixture!, p.sha256!])), fetch: [] };
const scheduleRun: PresetRun = { fingerprint: fingerprints.v2, saved: savedFriday(), fetch: [] };
const day = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
/** Part 8: the March bug in box 8210, its two excerpts, and the four slot answers. */
export const proveIt = {
  fixture: BOX,
  date: fx8210.date,
  round: fx8210.stage?.round_published,
  conferenceGame: fx8210.conference_game,
  scoreByPeriod: { head: periodRows[0], rows: periodRows.slice(1) },
  goal: { time: overtimeGoal[0], team: abbrName[overtimeGoal[1]], abbr: overtimeGoal[1], scorer: overtimeGoal[2], play: overtimeGoal[4] },
  published: { home: fx8210.home_score!, away: fx8210.away_score! },
  buggy: { home: regulation.find((r) => r.team === "Alder Ridge")!.sum, away: regulation.find((r) => r.team !== "Alder Ridge")!.sum },
  schedules: { "alder-ridge": scheduleCell("alder-ridge"), "eastbrook-state": scheduleCell("eastbrook-state") },
  slots: {
    replay: { boxScores: fridayBoxes.length, school: "Alder Ridge", withOvertime: withOvertime.length },
    stale: { boxScores: stale(boxFiles, boxRun), of: boxFiles.length, schedules: stale(scheduleFiles, scheduleRun), schedulesFresh: scheduleFiles.length - stale(scheduleFiles, scheduleRun) },
    republish: { matchDetail: true, standings: !tableA.postseason.includes("8210") },
    tell: { note: "correction", match: `Alder Ridge ${fx8210.home_score}-${fx8210.away_score} Eastbrook State, ${fx8210.stage?.round_published?.toLowerCase().replace(/s$/, "")}, ${day(fx8210.date)}`, cause: "the box-score parser summed only the regulation periods" },
  },
};

// ---------------------------------------------------------------- the story numbers

const weekend = ["7318", "8779"].map((n) => fixtures.find((f) => f.id.endsWith(`:${n}`))!);
/** Saturday's two conference matches, scheduled on Friday's pages, with their later results. */
export const saturday = weekend.map((f) => {
  const later = laterFixtures.find((x) => x.id === f.id)!;
  return { fixture: f.id, date: f.date, home: f.home, away: f.away, homeName: programmes[f.home].name, awayName: programmes[f.away].name, fridayStatus: f.status, home_score: later.home_score!, away_score: later.away_score! };
});
const final8211 = laterFixtures.find((f) => f.id === "tally:alder-ridge:8211")!;
export const championship = { fixture: final8211.id, date: final8211.date, home_score: final8211.home_score!, away_score: final8211.away_score!, conferenceGame: final8211.conference_game, inStandings: !tableC.postseason.includes("8211") };
export const story = {
  fridayOriginal: reported.reduce((n, r) => n + r.p, 0) / 2,
  monday: { scored: tableA.scored, finished: tableA.finished },
  refetch: { scored: tableC.scored, finished: tableC.finished },
  expected: tableA.expected,
  mondayName: programmes["st-lambert"].name,
  tuesdayName: tableA.rows.find((r) => r.slug === "st-lambert")!.name,
  fixedName: tableB.rows.find((r) => r.slug === "st-lambert")!.name,
  sites: fridayManifest.pages.filter((p) => p.kind === "schedule").length,
};

// ---------------------------------------------------------------- assertions: plan section 6 and the module's claims

const sameNumbers = (t: Table, rows: typeof repaired) => t.rows.length === rows.length && t.rows.every((r, i) => r.slug === rows[i].slug && r.p === rows[i].p && r.gf === rows[i].gf && r.ga === rows[i].ga && r.pts === rows[i].pts);
const laterScore = (id: string) => { const f = laterFixtures.find((x) => x.id === id)!; return `${f.home_score}-${f.away_score}`; };
const fridayOf = (slug: string) => fridayPages.find((p) => p.slug === slug)!;
const tuesdayOf = (slug: string) => tuesdayPages.find((p) => p.slug === slug)!;
const allRows = fridayPages.flatMap((p) => rawRows(p.html));

check(fridayManifest.pages.filter((p) => p.kind === "schedule").length === 8 && fridayPages.length === 7 && fridayBoxes.length === 12, "Friday's manifest is not 7 schedules and 12 box scores of 8 sites");
check(fridayManifest.unavailable.join() === "dunmore" && down(fridayManifest)[0]?.programme === "dunmore", "Dunmore is not listed as unavailable on Friday");
check(tuesdayManifest.unavailable.join() === "dunmore" && tuesdayPages.length === 7, "Dunmore is not still unavailable on Tuesday");
const dunmoreLater = json(sample("raw_html", "dunmore", "2026-men-schedule.html.meta.json")).fetched_at as string;
check(dunmoreLater > tuesdayManifest.finished_at, "Dunmore's page on disk is not a capture made after Tuesday");
check(sameNumbers(tableA, repaired) && sameNumbers(tableB, repaired), "tables A and B are not Monday's table");
check(story.fridayOriginal === 46 && tableA.scored === 53 && tableA.finished === 54 && tableC.scored === 55 && tableC.finished === 56 && tableA.expected === 56, "the captions are not 53 of 54 and 55 of 56");
check(story.tuesdayName === "State Lambert" && story.fixedName === "Saint Lambert" && story.mondayName === "St. Lambert", "the St. Lambert names are wrong");
check(diffAB.length === 1 && diffAB[0].slug === "st-lambert" && diffAB[0].column === "name" && diffAB[0].input === "code", "A to B is not exactly Saint Lambert's name");
check(JSON.stringify(tableA.gaps) === JSON.stringify(tableB.gaps) && tableA.gaps.length === 2, "A to B does not keep the named gaps");
check(rowChanges.C.map((r) => r.slug).sort().join() === "dunmore,eastbrook-state,harbor-point,st-lambert", "A to C does not change exactly four rows");
check(rowChanges.C.every((r) => r.input === (r.slug === "st-lambert" ? "both" : "pages")), "A to C's inputs are not code+pages for Saint Lambert and pages for the rest");
check(diffAC.every((c) => c.column !== "place"), "a place changed from A to C; the Case 1 copy assumes none does");
check(stBrendanNote.before === "State Brendan" && stBrendanNote.after === "Saint Brendan" && !stBrendanNote.member && stBrendanNote.rows > 0, "the St. Brendan note no longer holds");
const ownPage = fridayOf("st-lambert").html;
check(ownPage.split("St. Lambert").length === 2 && /<title>[^<]*St\. Lambert[^<]*<\/title>/.test(ownPage), "St. Lambert's own page names the school somewhere other than its title");
check(prediction.answer === "name-and-numbers", "the re-fetch no longer changes Saint Lambert's name and numbers");
check(kickPartial.tableCellsChanged === 0 && kickPartial.ownPageNamesSchool.inTitle && !kickPartial.ownPageNamesSchool.asOpponent, "re-parsing only St. Lambert's page changes the table");
check(saturday.every((s) => s.fridayStatus === "scheduled" && s.date === "2026-11-21") && laterScore(saturday[0].fixture) === "1-1" && laterScore(saturday[1].fixture) === "1-0", "Saturday's two matches are not 1-1 and 1-0");
check(weekend[0].id === "pressbox:eastbrook-state:7318" && weekend[1].id === "pressbox:st-lambert:8779", "Saturday's fixture ids changed");
check(championship.date === "2026-11-22" && !championship.conferenceGame && !championship.inStandings && `${championship.home_score}-${championship.away_score}` === "1-6", "Sunday's championship is not 1-6 and outside the standings");
check(cellOn(tuesdayOf("alder-ridge").html, "8211") === "L 1-6" && cellOn(tuesdayOf("hartwell-tech").html, "8211") === "W 6-1", "Tuesday's pages do not show 8211");
check(fridayPages.every((p) => p.html.includes("St. Lambert")) && fridayPages.filter((p) => rawRows(p.html).some((r) => r.opponent === "St. Lambert")).length === 6, "not all seven Friday pages contain St. Lambert, six as an opponent");
check(allRows.every((r) => r.side === "vs" || r.side === "at"), "a schedule row has no vs or at cell");
check(periodRows[0].join() === "Team,1,2,OT,F" && fx8210.home === "alder-ridge" && fx8210.home_score === 4 && fx8210.away_score === 3 && !fx8210.conference_game, "box 8210 is not Alder Ridge 4-3 with periods 1, 2, OT, F");
check(proveIt.buggy.home === 3 && proveIt.buggy.away === 3 && proveIt.goal.scorer !== "" && overtimeGoal[3] !== "" && withOvertime.join() === BOX, "the March bug no longer reads 3-3, or 8210 is not the only overtime box score");
const plays = tableOf(boxHtml, "Play-by-Play").slice(1).map((r) => r[0]);
check(plays.indexOf("101:44") < plays.indexOf("10:57"), "box 8210's play-by-play is no longer out of order");
check(/<tr id="offsides"><th>Fouls<\/th>/.test(boxHtml), "the Fouls row is no longer marked offsides");
check(proveIt.schedules["alder-ridge"] === "W 4-3" && proveIt.schedules["eastbrook-state"] === "L 3-4", "the schedules no longer show 8210 as 4-3");
check(proveIt.slots.stale.boxScores === 12 && proveIt.slots.stale.schedules === 0 && proveIt.slots.stale.schedulesFresh === 7 && !proveIt.slots.republish.standings, "the Prove it slots no longer hold");
const cedarFinal = [fridayOf("cedar-grove"), fridayOf("st-lambert")].map((p) => rawRows(p.html).find((r) => r.date === "2026-09-21")!.result);
check(cedarFinal.every((r) => r === "Final"), "Cedar Grove's 21 September result is not a bare Final on both pages");
const cg2019 = json(sample("raw_html", "cedar-grove", "2019-men-schedule.html.meta.json"));
check(cg2019.final_url === cg2019.requested_url && cg2019.final_url.endsWith("/2019") && readFileSync(sample("raw_html", "cedar-grove", "2019-men-schedule.html"), "utf-8").includes("<title>2026 "), "Cedar Grove's 2019 page no longer proves the Module 3 handoff");
check(laterScore("tally:alder-ridge:8203") === "1-1" && cellOn(tuesdayOf("alder-ridge").html, "8203") === "W 1-0", "Tuesday's pages touch the 8 September score");
check(case2.pattern.a === 0 && case2.pattern.b === 2 && case2.pattern.c === 3 && case2.grid[0].answers.c && !case2.grid[0].answers.b && case2.grid[1].answers.b && !case2.grid[1].answers.a, "the Case 2 grid is no longer 0, 2 and 3 of 3");
check(presets.map((p) => `${p.rebuilt}/${p.fetched}`).join() === "7/0,7/0,7/0,0/0,1/1,0/0" && presets[4].overwritesFriday && presets[5].liveDiffers, "the fingerprint presets no longer give 7, 7, 7, 0, 1 and 0 rebuilt");
check(policies.latest.today && !policies.latest.monday && !policies.latest.harborFriday && policies.every.today && policies.every.monday && policies.every.harborFriday, "the policy answers are no longer one of three and three of three");
check(policies.harborCell.friday === "" && policies.harborCell.tuesday === "T 1-1" && policies.every.harborFridayCell === "", "Harbor Point's 21 November cell is not blank on Friday and T 1-1 on Tuesday");
