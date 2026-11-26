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

export type ManifestPage = {
  programme: string; kind: "schedule" | "box_score"; requested_url: string; state: "saved" | "unavailable";
  path?: string; fetched_at?: string; bytes?: number; sha256?: string; fixture?: string; reason?: string; tries?: number; note?: string;
};
export type Manifest = {
  schema: "learn.capture-manifest/1"; run: string; purpose: string; season: number; gender: string; conference: string; scope: string; started_at: string; finished_at: string; requested: number; saved: number;
  unavailable: string[]; pages: ManifestPage[];
};
type Fixture = {
  id: string; date: string; home: string; away: string; status: string; conference_game: boolean;
  home_score?: number; away_score?: number; stage?: { phase: string; round_published?: string };
};

const manifestAt = (file: string): Manifest => {
  const m: Manifest = json(sample("manifests", file));
  const saved = m.pages.filter((p) => p.state === "saved");
  check(m.pages.every((p) => p.state === "saved" || (p.state === "unavailable" && Boolean(p.reason))), `${file} has a page that is neither saved nor unavailable with a reason`);
  check(m.schema === "learn.capture-manifest/1" && m.season === SEASON && m.conference === CONFERENCE, `${file} is not a ${SEASON} ${CONFERENCE} capture manifest`);
  check(m.requested === m.pages.length && m.saved === saved.length, `${file}'s counts disagree with its pages`);
  check(m.unavailable.slice().sort().join() === m.pages.filter((p) => p.state === "unavailable").map((p) => p.programme).sort().join(), `${file}'s unavailable list disagrees with its pages`);
  saved.forEach((p) => check(sha256(bytes(sample(p.path!))) === p.sha256, `${p.path} no longer matches its manifest hash`));
  check(new Set(saved.map((p) => p.path)).size === saved.length && new Set(m.pages.map((p) => `${p.kind}:${p.fixture ?? p.programme}`)).size === m.pages.length, `${file} lists a page twice`);
  return m;
};
export const fridayManifest = manifestAt("2026-11-20-friday.json");
export const tuesdayManifest = manifestAt("2026-11-24-tuesday.json");
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
const ROW_START = /<tr data-game="/g;
const ROW = /<tr data-game="(\d+)"><td>([\d-]+)<\/td><td>([^<]*)<\/td><td>([^<]+)<\/td><td>([^<]*)<\/td><td>(.*?)<\/td><\/tr>/g;

export type RawRow = { fixture: string; date: string; side: string; opponent: string; result: string; line: string };
export type ParsedRow = { fixture: string; date: string; side: string; opponent: string; shown: string; result: string };

export const rawRows = (html: string): RawRow[] => {
  const rows = [...html.matchAll(ROW)].map((m) => ({ fixture: m[1], date: m[2], side: m[3], opponent: decode(m[4]), result: m[5], line: m[0] }));
  check(rows.length === [...html.matchAll(ROW_START)].length, "a schedule row does not have the layout the reader expects");
  return rows;
};

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
  key: "A" | "B" | "C" | "D" | "Kick"; rows: TableRow[]; expected: number; listed: number; finished: number; scored: number;
  caption: string; postseason: string[]; gaps: Gap[]; parsed: Record<string, ParsedRow[]>;
};

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const score = (result: string) => {
  const m = result.match(/^[WLT] (\d+)-(\d+)$/);
  return m ? [Number(m[1]), Number(m[2])] as const : null;
};

function build(key: Table["key"], pages: { slug: string; html: string; tidy: Tidy }[], unavailable: ManifestPage[]): Table {
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
  [...matches.entries()].sort(([ia, a], [ib, b]) => cmp(a.date, b.date) || cmp(ia, ib))
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
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || cmp(a.slug, b.slug))
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
function attribute(a: Table, b: Table, codeOnly: Table, pagesOnly: Table): Cell[] {
  const byCode = changedIn(a, codeOnly);
  const byPages = changedIn(a, pagesOnly);
  return cellsBetween(a, b).map((c) => {
    const k = `${c.slug}/${c.column}`;
    return { ...c, input: byCode.has(k) && !byPages.has(k) ? "code" : byPages.has(k) && !byCode.has(k) ? "pages" : "both" };
  });
}
/** Every changed cell from Tuesday's table to the replay, with the input that changed it. */
export const diffAB = attribute(tableA, tableB, tableB, tableA);
/** Every changed cell from Tuesday's table to the re-fetch, attributed with the hidden table D. */
export const diffAC = attribute(tableA, tableC, tableB, tableD);

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
export const prediction: { answer: "unchanged" | "name-only" | "name-and-numbers" | "numbers-only"; columns: Column[] } = {
  answer: !lambertC ? "unchanged" : lambertC.columns.join() === "name" ? "name-only" : lambertC.columns.includes("name") ? "name-and-numbers" : "numbers-only",
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
  opponent: "St. Brendan", before: brendan[0]?.before.shown ?? fail("no St. Brendan row changes"), after: brendan[0].after.shown, member: members.includes("st-brendan"),
  rows: brendan.length, pages: [...new Set(brendan.map((x) => x.page))].map((slug) => ({ slug, name: programmes[slug].name })),
  parsedRowsChanged: parsedAB.length, stLambertRows: parsedAB.filter((x) => x.before.opponent === "st-lambert").length,
};

/** Case 3's opener: re-parsing only St. Lambert's page changes nothing in the table. */
export const kickPartial = {
  tableCellsChanged: cellsBetween(tableA, tableKick).length,
  parsedRowsChanged: shownChanges(tableA, tableKick).length,
  ownPageNamesSchool: { inTitle: /<title>[^<]*St\. Lambert/.test(fridayPages.find((p) => p.slug === "st-lambert")!.html), asOpponent: tableA.parsed["st-lambert"].some((r) => r.opponent === "st-lambert") },
  pagesNamingItAsOpponent: fridayPages.filter((p) => rawRows(p.html).some((r) => r.opponent === "St. Lambert")).map((p) => ({ slug: p.slug, name: programmes[p.slug].name })),
  pagesSkipped: fridayPages.filter((p) => p.slug !== "st-lambert").length,
};

// ---------------------------------------------------------------- fingerprints

const SHARED = root("labs", "common.py");
const PARSERS = { v1: root("labs", "m02_parser_tuesday.py"), v2: root("labs", "m02_parser_fixed.py") };
const configBytes = () => Buffer.concat([bytes(aliasPath), bytes(membershipPath)]);
const fingerprintOf = (parser: Buffer, config: Buffer) =>
  createHash("sha256").update(parser).update(bytes(SHARED)).update(config).update(String(SEASON)).digest("hex").slice(0, 12);
/** The lab's fingerprints: the parser's whole module, labs/common.py, aliases.json, membership.json and the season. */
export const fingerprints = {
  v1: fingerprintOf(bytes(PARSERS.v1), configBytes()),
  v2: fingerprintOf(bytes(PARSERS.v2), configBytes()),
};

type Lineage = { slug: string; fingerprint: string; content: string };
type PresetRun = { fingerprint: string; saved: Map<string, string> };
const stale = (files: Lineage[], run: PresetRun) => files.filter((f) => f.fingerprint !== run.fingerprint || f.content !== run.saved.get(f.slug)).length;
const upToDate = (fp: string): Lineage[] => fridayPages.map((p) => ({ slug: p.slug, fingerprint: fp, content: p.sha256 }));
const savedFriday = () => new Map(fridayPages.map((p) => [p.slug, p.sha256]));
const liveTuesday = new Map(tuesdayPages.map((p) => [p.slug, p.sha256]));
const withComment = () => Buffer.from(bytes(PARSERS.v2).toString("utf-8").replace("\ndef tidy(", "\n# Saint before a name, State at the end.\ndef tidy("));
const withAlias = () => {
  const extra = { ...aliases, "st-lambert": [...aliases["st-lambert"], "Saint Lambert"] };
  return Buffer.concat([Buffer.from(`${JSON.stringify(extra, null, 1)}\n`), bytes(membershipPath)]);
};

export type Preset = {
  id: string; label: string; fingerprintBefore: string; fingerprintAfter: string; files: number;
  rebuilt: number; fetched: number;
  /** Latest-only archive: a fetch replaces the saved capture of that page. */
  replacesFridayCapture: boolean;
  /** The replaced capture differed from the new one, so Friday's evidence for that page is gone. */
  fridayEvidenceLost: boolean;
  /** The page this preset is about, and whether the live site differs from what the archive holds for it after the run. */
  watch?: { slug: string; name: string; liveDiffersFromArchive: boolean };
  /** Counts come from the staleness model, not from a measured run. */
  simulated: true;
};
function preset(id: string, label: string, before: string, after: string, fetch: string[] = [], watch?: string): Preset {
  const files = upToDate(before);
  const saved = savedFriday();
  fetch.forEach((slug) => saved.set(slug, liveTuesday.get(slug)!));
  const run: PresetRun = { fingerprint: after, saved };
  const slug = watch ?? fetch[0];
  const watched = slug ? { slug, name: programmes[slug].name, liveDiffersFromArchive: liveTuesday.get(slug) !== saved.get(slug) } : undefined;
  return {
    id, label, fingerprintBefore: before, fingerprintAfter: after, files: files.length, rebuilt: stale(files, run), fetched: fetch.length,
    replacesFridayCapture: fetch.length > 0,
    fridayEvidenceLost: fetch.some((s) => liveTuesday.get(s) !== savedFriday().get(s)),
    ...(watched ? { watch: watched } : {}),
    simulated: true,
  };
}
/** Case 3's six presets, each from a full set of up-to-date parsed schedules. Counts come from the staleness model. */
export const presets: Preset[] = [
  preset("fix-rule", "Fix the tidy rule", fingerprints.v1, fingerprints.v2),
  preset("comment", "Edit a comment in the parser", fingerprints.v2, fingerprintOf(withComment(), configBytes())),
  preset("alias", "Add \"Saint Lambert\" to the alias list", fingerprints.v2, fingerprintOf(bytes(PARSERS.v2), withAlias())),
  preset("nothing", "Run again with nothing changed", fingerprints.v2, fingerprints.v2),
  preset("refetch-harbor", "Re-fetch Harbor Point's page on purpose", fingerprints.v2, fingerprints.v2, ["harbor-point"]),
  preset("live-changed", "Harbor Point's live site changed; replay without fetching", fingerprints.v2, fingerprints.v2, [], "harbor-point"),
];

// ---------------------------------------------------------------- Rewind: the lab's own report

const quotePath = root("src", "data", "quotes", "m02_archive.replay-report.txt");
/** The replay report exactly as `python labs/m02_archive.py` prints it; scripts/check_lab_output.py verifies it. */
export const replayReport = readFileSync(quotePath, "utf-8").replace(/\n$/, "");
check(replayReport.startsWith("Replay report: ") && /^manifest {7}: .*\nreplayed {7}: 7 of the 7 schedules/m.test(replayReport), "the quoted replay report does not start at its heading");
const reportField = (label: string) => replayReport.split("\n").find((l) => l.startsWith(`${label} `))?.split(": ").slice(1).join(": ") ?? fail(`the replay report has no ${label} line`);
const labBlob = () => { const body = bytes(root("labs", "m02_archive.py")); return createHash("sha1").update(`blob ${body.length}\0`).update(body).digest("hex").slice(0, 12); };
export const rewind = {
  manifest: reportField("manifest"),
  schedulesSaved: fridayPages.length,
  boxScoresSaved: fridayBoxes.length,
  requested: fridayManifest.requested,
  unavailable: down(fridayManifest).map((p) => ({ slug: p.programme, name: programmes[p.programme].name, reason: p.reason! })),
  requests: Number(replayReport.match(/^requests\s+: (\d+), counted by a counter that caught ([1-9]\d*) of \2 test requests$/m)?.[1] ?? fail("the replay report's requests line is not a counted 0")),
  fingerprint: reportField("fingerprint").split(",")[0],
  fingerprintTuesday: reportField("fingerprint").match(/was (\w+) on Tuesday/)?.[1] ?? fail("the replay report does not name Tuesday's fingerprint"),
  buildRevision: reportField("build revision").split(",")[0],
  cellsChanged: Number(reportField("cells changed")),
  lines: replayReport.split("\n"),
};
check(rewind.manifest === "sample/manifests/2026-11-20-friday.json", "the quoted report did not replay Friday's manifest");
check(rewind.fingerprintTuesday === fingerprints.v1, `the quoted report's Tuesday fingerprint is not ${fingerprints.v1}`);
check(rewind.fingerprint === fingerprints.v2, `the quoted report's fingerprint ${rewind.fingerprint} is not the fixed parser's ${fingerprints.v2}; rerun the lab and update ${quotePath}`);
check(rewind.buildRevision === labBlob(), "the quoted report's build revision is not labs/m02_archive.py as it stands; rerun the lab and update the quote");
check(rewind.requests === 0 && rewind.cellsChanged === diffAB.length, "the quoted report disagrees with the replay computed here");
check(replayReport.includes(`Tuesday's ${tableA.caption}; rebuild ${tableB.caption}`), "the quoted report's caption differs");
const repr = (v: string | number) => (typeof v === "string" ? `'${v}'` : String(v));
const cellText = (c: Cell) => `${c.column} ${repr(c.before)} -> ${repr(c.after)}`;
const renames = new Map<string, number>();
parsedAB.forEach((x) => { const k = `${repr(x.before.shown)} -> ${repr(x.after.shown)}`; renames.set(k, (renames.get(k) ?? 0) + 1); });
const renameLine = `parsed rows    : ${parsedAB.length} renamed, ${[...renames].sort(([a], [b]) => cmp(a, b)).map(([k, n]) => `${k} in ${n}`).join(", ")}`;
check(rewind.lines.includes(renameLine), "the lab's parsed rows were renamed differently from the rows parsed here; the two tidy rules have drifted");
check(diffAB.length === 1 && rewind.lines.includes(`  ${diffAB[0].name.padEnd(15)} ${cellText(diffAB[0])}: the tidy rule, the only input that changed`), "the quoted report's changed cell is not the one computed here");

const tuesdayQuotePath = root("src", "data", "quotes", "m02_archive.tuesday-diff.txt");
/** The confounded diff exactly as `python labs/m02_archive.py --tuesday` prints it; scripts/check_lab_output.py verifies it. */
export const tuesdayDiff = readFileSync(tuesdayQuotePath, "utf-8").replace(/\n$/, "");
check(tuesdayDiff.startsWith("Confounded diff: ") && tuesdayDiff.includes("\ninputs changed : parser code"), "the quoted Tuesday diff does not start at its heading");
const diffLines = tuesdayDiff.split("\n");
const tuesdayRows = rowsOf(diffAC).map((r) => `  ${r.name.padEnd(15)} ${diffAC.filter((c) => c.slug === r.slug).map(cellText).join(", ")}`);
const at = diffLines.findIndex((l) => l.startsWith("cells changed"));
check(diffLines[at] === `cells changed  : ${diffAC.length} in ${rowChanges.C.length} rows` && tuesdayRows.every((l, i) => diffLines[at + 1 + i] === l), "the quoted Tuesday diff is not the A to C diff computed here; rerun the lab and update the quote");
check(diffLines.includes(`table          : ${tableA.caption} -> ${tableC.caption}`), "the quoted Tuesday diff's captions differ");

// ---------------------------------------------------------------- Case 2: what Kick kept

const cedar = fridayPages.find((p) => p.slug === "cedar-grove")!;
const cedarRows = rawRows(cedar.html);
const pick = (date: string) => cedarRows.find((r) => r.date === date) ?? fail(`Cedar Grove has no row on ${date}`);
const CASE2 = ["2026-09-21", "2026-10-02", "2026-10-18"].map(pick);
/** A hypothetical early parser for Case 2, not the lab's: it keeps the date, the tidied opponent and the scores, stores every match as a home match, and reads a bare "Final" as 0-0. */
const hypotheticalParse = (r: RawRow) => {
  const s = score(r.result) ?? [0, 0];
  return { date: r.date, home: "Cedar Grove", away: tidyV1(r.opponent), home_score: s[0], away_score: s[1] };
};
const tidyHtml = (line: string) => tidyV1(line.replace(/<(\w+)(\s[^>]*)?>/g, (_, tag: string, attrs = "") => {
  const href = attrs.match(/\shref="[^"]*"/);
  return `<${tag}${href ? href[0] : ""}>`;
}).replace(/\s+/g, " "));
export type Kept = "a" | "b" | "c";
const KEPT: Kept[] = ["a", "b", "c"];
const keep: Record<Kept, (r: RawRow) => string> = {
  a: (r) => JSON.stringify(hypotheticalParse(r)),
  b: (r) => tidyHtml(r.line),
  c: (r) => r.line,
};
const variant = (r: RawRow, field: "side" | "opponent" | "result", value: string): RawRow => {
  const line = r.line.replace(`<td>${r[field]}</td>`, `<td>${value}</td>`);
  check(line !== r.line, `could not vary ${field} in ${r.fixture}`);
  return { ...r, [field]: value, line };
};
const cedarSidecar = json(sample(`${cedar.path}.meta.json`));
export type Case2Archive = { label: string; rows: string[]; excerpt: string };
const archiveOf = (k: Kept, label: string): Case2Archive => ({ label, rows: CASE2.map(keep[k]), excerpt: CASE2.map(keep[k]).join("\n") });
const archives = {
  a: { ...archiveOf("a", "Parsed rows"), hypothetical: true as const,
    note: "An example parser for this case. The lab's own parser keeps the side, the opponent's slug and the raw result, so its rows hold more than these." },
  b: archiveOf("b", "Tidied HTML"),
  c: { ...archiveOf("c", "Bytes as received, with a sidecar"),
    sidecar: { requested_url: cedarSidecar.requested_url, final_url: cedarSidecar.final_url, fetched_at: cedarSidecar.fetched_at, status: cedarSidecar.status, sha256: cedarSidecar.sha256 } },
};
// A bug's correct value can be verified from an archive only if the archive keeps the true row and the bug's wrong reading apart.
const bugs = [
  { id: "name", label: "The tidy rule turned \"St. Lambert\" into \"State Lambert\"", truth: "Saint Lambert",
    row: CASE2[0], wrong: variant(CASE2[0], "opponent", "State Lambert") },
  { id: "side", label: "The parser ignored the vs/at column, so away matches were stored as home matches", truth: CASE2[1].side,
    row: CASE2[1], wrong: variant(CASE2[1], "side", CASE2[1].side === "at" ? "vs" : "at") },
  { id: "blank", label: "Cedar Grove's 21 September result reads \"Final\" with no score and was read as 0-0", truth: "no score published",
    row: CASE2[0], wrong: variant(CASE2[0], "result", "T 0-0") },
] as const;
const verifiable = (b: (typeof bugs)[number], k: Kept) => keep[k](b.row) !== keep[k](b.wrong);
export type Case2Bug = { id: "name" | "side" | "blank"; label: string; truth: string; fixture: string; answers: Record<Kept, boolean> };
/** Case 2: the same three Cedar Grove rows in three archive forms, and the 3x3 grid answered from them. Archive (a) comes from a hypothetical parser, not the lab's. */
export const case2: { rows: Omit<RawRow, "line">[]; archives: typeof archives; grid: Case2Bug[]; pattern: Record<Kept, number> } = {
  rows: CASE2.map(({ line, ...r }) => r),
  archives,
  grid: bugs.map((b) => ({ id: b.id, label: b.label, truth: b.truth, fixture: b.row.fixture, answers: Object.fromEntries(KEPT.map((k) => [k, verifiable(b, k)])) as Record<Kept, boolean> })),
  pattern: Object.fromEntries(KEPT.map((k) => [k, bugs.filter((b) => verifiable(b, k)).length])) as Record<Kept, number>,
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
const cellOn = (html: string, fixture: string): string => rawRows(html).find((r) => r.fixture === fixture)?.result ?? fail(`no row for fixture ${fixture}`);
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
  unchangedSinceFriday: unchangedSinceFriday.map((slug) => ({ slug, name: programmes[slug].name })),
  changedSinceFriday: fridayPages.filter((p) => !unchangedSinceFriday.includes(p.slug)).map((p) => ({ slug: p.slug, name: programmes[p.slug].name })),
  simulated: true as const,
};

// ---------------------------------------------------------------- Part 8: Prove it, box 8210

const BOX = "tally:alder-ridge:8210";
const boxSchool = fridayBoxes[0]?.programme ?? fail("Friday's manifest saved no box scores");
check(fridayBoxes.every((p) => p.programme === boxSchool && p.fixture?.startsWith(`tally:${boxSchool}:`)), "Friday's box scores are not all one school's");
const boxEntry = fridayBoxes.find((p) => p.fixture === BOX) ?? fail("box 8210 is not in Friday's manifest");
const boxBytes = bytes(sample(boxEntry.path!));
check(createHash("sha256").update(boxBytes).digest("hex") === boxEntry.sha256, "box 8210 no longer matches Friday's manifest hash");
const boxHtml = boxBytes.toString("utf-8");
const tableOf = (html: string, caption: string) => {
  const t = html.match(new RegExp(`<caption>${caption}</caption>([\\s\\S]*?)</table>`)) ?? fail(`no ${caption} table`);
  return [...t[1].matchAll(/<tr[^>]*>(.*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/g)].map((c) => decode(c[1])));
};
const periodRows = tableOf(boxHtml, "Score by Period");
const goalRows = tableOf(boxHtml, "Scoring Summary");
const overtimeGoal = goalRows.find((r) => r[0] === "101:44") ?? fail("box 8210 has no 101:44 goal");
const abbrSlug = (abbr: string) => nameIndex.get(abbr) ?? fail(`no alias for ${abbr}`);
const fx8210 = fixtures.find((f) => f.id === BOX)!;
const regulation = periodRows.slice(1).map((r) => ({ team: r[0], sum: Number(r[1]) + Number(r[2]), all: r.slice(1, -1).reduce((n, v) => n + Number(v), 0), final: Number(r[r.length - 1]) }));
check(regulation.length === 2 && regulation.every((r) => r.all === r.final), "box 8210's periods do not sum to its final score");
const homeRow = regulation.find((r) => nameIndex.get(tidyV2(r.team)) === fx8210.home || nameIndex.get(r.team) === fx8210.home)!;
const awayRow = regulation.find((r) => r !== homeRow)!;
check(Boolean(awayRow) && (nameIndex.get(tidyV2(awayRow.team)) ?? nameIndex.get(awayRow.team)) === fx8210.away, "box 8210's away row is not the fixture's away team");
const boxHtmlOf = (p: ManifestPage) => bytes(sample(p.path!)).toString("utf-8");
const withOvertime = fridayBoxes.filter((p) => tableOf(boxHtmlOf(p), "Score by Period")[0].includes("OT")).map((p) => p.fixture!);
const scheduleCell = (slug: string) => cellOn(fridayPages.find((p) => p.slug === slug)!.html, "8210");
const moduleFingerprint = (module: Buffer) => createHash("sha256").update(module).update(bytes(SHARED)).digest("hex").slice(0, 12);
const boxParserModule = bytes(root("labs", "m04_parse.py"));
/** The box-score parser's module and labs/common.py, before and after a simulated edit to the module. */
const boxParser = { before: moduleFingerprint(boxParserModule), after: moduleFingerprint(Buffer.concat([boxParserModule, Buffer.from("# score = every period, overtime included\n")])), simulated: true as const };
const boxFiles = fridayBoxes.map((p): Lineage => ({ slug: p.fixture!, fingerprint: boxParser.before, content: p.sha256! }));
const scheduleFiles = upToDate(fingerprints.v2);
const boxRun: PresetRun = { fingerprint: boxParser.after, saved: new Map(fridayBoxes.map((p) => [p.fixture!, p.sha256!])) };
const scheduleRun: PresetRun = { fingerprint: fingerprints.v2, saved: savedFriday() };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const day = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
/** Part 8: the March bug in box 8210, its two excerpts, and the four slot answers. */
export const proveIt = {
  fixture: BOX,
  date: fx8210.date,
  round: fx8210.stage?.round_published ?? fail("box 8210's fixture has no published round"),
  conferenceGame: fx8210.conference_game,
  scoreByPeriod: { head: periodRows[0], rows: periodRows.slice(1) },
  home: { slug: fx8210.home, name: programmes[fx8210.home].name },
  away: { slug: fx8210.away, name: programmes[fx8210.away].name },
  goal: { time: overtimeGoal[0], team: programmes[abbrSlug(overtimeGoal[1])].name, abbr: overtimeGoal[1], scorer: overtimeGoal[2], play: overtimeGoal[4] },
  published: { home: homeRow.final, away: awayRow.final },
  buggy: { home: homeRow.sum, away: awayRow.sum },
  schedules: { "alder-ridge": scheduleCell("alder-ridge"), "eastbrook-state": scheduleCell("eastbrook-state") },
  slots: {
    replay: { boxScores: fridayBoxes.length, school: programmes[boxSchool].name, withOvertime: withOvertime.length },
    stale: { boxScores: stale(boxFiles, boxRun), of: boxFiles.length, schedules: stale(scheduleFiles, scheduleRun), schedulesFresh: scheduleFiles.length - stale(scheduleFiles, scheduleRun), boxParser, simulated: true as const },
    republish: { matchDetail: true, standings: !tableA.postseason.includes("8210") },
    tell: { note: "correction", match: `${programmes[fx8210.home].name} ${homeRow.final}-${awayRow.final} ${programmes[fx8210.away].name}, ${fx8210.stage?.round_published?.toLowerCase().replace(/s$/, "")}, ${day(fx8210.date)}`, cause: "the box-score parser summed only the regulation periods" },
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
export const championship = { fixture: final8211.id, date: final8211.date, home: final8211.home, away: final8211.away, homeName: programmes[final8211.home].name, awayName: programmes[final8211.away].name, home_score: final8211.home_score!, away_score: final8211.away_score!, conferenceGame: final8211.conference_game, inStandings: !tableC.postseason.includes("8211") };
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
const fixtureByNumber = new Map(fixtures.map((f) => [f.id.split(":").pop()!, f]));
check([...fridayPages, ...tuesdayPages].every((p) => rawRows(p.html).every((r) => !fixtureByNumber.has(r.fixture) || fixtureByNumber.get(r.fixture)!.date === r.date)), "a saved page dates a fixture differently from the fixture list");

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
check(rawRows(readFileSync(sample("raw_html", "cedar-grove", "2019-men-schedule.html"), "utf-8")).length === rawRows(fridayOf("cedar-grove").html).length, "Cedar Grove's 2019 request no longer saved a full schedule table");
check(cg2019.final_url === cg2019.requested_url && cg2019.final_url.endsWith("/2019") && readFileSync(sample("raw_html", "cedar-grove", "2019-men-schedule.html"), "utf-8").includes("<title>2026 "), "Cedar Grove's 2019 page no longer proves the Module 3 handoff");
check(laterScore("tally:alder-ridge:8203") === "1-1" && cellOn(tuesdayOf("alder-ridge").html, "8203") === "W 1-0", "Tuesday's pages touch the 8 September score");
check(case2.pattern.a === 0 && case2.pattern.b === 2 && case2.pattern.c === 3 && case2.grid[0].answers.c && !case2.grid[0].answers.b && case2.grid[1].answers.b && !case2.grid[1].answers.a, "the Case 2 grid is no longer 0, 2 and 3 of 3");
check(presets.map((p) => `${p.rebuilt}/${p.fetched}`).join() === "7/0,7/0,7/0,0/0,1/1,0/0" && presets[4].fridayEvidenceLost && presets[4].replacesFridayCapture && presets[5].watch?.liveDiffersFromArchive === true && presets[4].watch?.liveDiffersFromArchive === false && presets.filter((p) => p.watch).length === 2, "the fingerprint presets no longer give 7, 7, 7, 0, 1 and 0 rebuilt");
check(policies.latest.today && !policies.latest.monday && !policies.latest.harborFriday && policies.every.today && policies.every.monday && policies.every.harborFriday, "the policy answers are no longer one of three and three of three");
check(policies.harborCell.friday === "" && policies.harborCell.tuesday === "T 1-1" && policies.every.harborFridayCell === "", "Harbor Point's 21 November cell is not blank on Friday and T 1-1 on Tuesday");
check(Boolean(homeRow) && homeRow !== awayRow && homeRow.final === fx8210.home_score && awayRow.final === fx8210.away_score, "box 8210's Score by Period does not total the fixture's 4-3");
check(proveIt.round === "Semifinals" && proveIt.goal.play === "Penalty kick" && proveIt.goal.team === "Alder Ridge" && cg2019.status === 200, "box 8210's round, goal or Cedar Grove's 2019 status changed");
const weekendCells = { "eastbrook-state": ["7318", "T 1-1"], "harbor-point": ["7318", "T 1-1"], "st-lambert": ["8779", "W 1-0"], "alder-ridge": ["8211", "L 1-6"], "hartwell-tech": ["8211", "W 6-1"] } as const;
check(Object.entries(weekendCells).every(([slug, [id, cell]]) => cellOn(fridayOf(slug).html, id) === "" && cellOn(tuesdayOf(slug).html, id) === cell), "Tuesday's result cells are not the weekend's results");
const changedLines = (slug: string) => { const a = fridayOf(slug).html.split("\n"); const b = tuesdayOf(slug).html.split("\n"); return a.length === b.length ? a.filter((l, i) => l !== b[i]).length : -1; };
check(fridayPages.every((p) => changedLines(p.slug) === (p.slug in weekendCells ? 1 : 0)), "Tuesday's pages change more than one row each");
check(fridayPages.every((p) => { const a = rawRows(p.html); const b = rawRows(tuesdayOf(p.slug).html); return a.every((r, i) => r.result === b[i].result || (r.result === "" && b[i].line === r.line.replace("<td></td><td></td></tr>", `<td>${b[i].result}</td><td></td></tr>`))); }), "a Tuesday row changes anything but its result cell");
check(["b", "c"].every((k) => archives[k as "b" | "c"].rows[0].includes("<td>Final</td>")) && archives.b.rows[1].includes("<td>at</td>") && !archives.a.excerpt.includes("Final"), "Case 2's tidied and raw rows no longer keep Final and at");
check(policies.unchangedSinceFriday.map((x) => x.slug).sort().join() === "brightwater-state,cedar-grove", "the unchanged pages are not Brightwater State and Cedar Grove");

// ---------------------------------------------------------------- the replay bench and Case 2's fourth bug

const presetFetches: Record<string, string[]> = { "refetch-harbor": ["harbor-point"] };
export type PresetFile = {
  slug: string; name: string; storedFingerprint: string; nowFingerprint: string;
  storedContent: string; nowContent: string; liveContent: string; fetched: boolean; rebuilt: boolean;
};
/** Each preset's seven parsed schedules: what each recorded, what the run sees now, and whether it is rebuilt. Hashes are 12 hex. */
export const presetFiles: Record<string, PresetFile[]> = Object.fromEntries(presets.map((p) => {
  const fetch = presetFetches[p.id] ?? [];
  check(fetch.length === p.fetched, `preset ${p.id} fetches a page the bench does not know`);
  const saved = savedFriday();
  fetch.forEach((slug) => saved.set(slug, liveTuesday.get(slug)!));
  const files = upToDate(p.fingerprintBefore).map((f): PresetFile => ({
    slug: f.slug, name: programmes[f.slug].name, storedFingerprint: f.fingerprint, nowFingerprint: p.fingerprintAfter,
    storedContent: f.content.slice(0, 12), nowContent: saved.get(f.slug)!.slice(0, 12), liveContent: liveTuesday.get(f.slug)!.slice(0, 12),
    fetched: fetch.includes(f.slug), rebuilt: f.fingerprint !== p.fingerprintAfter || f.content !== saved.get(f.slug),
  }));
  check(files.filter((f) => f.rebuilt).length === p.rebuilt, `the bench's files for ${p.id} disagree with its rebuilt count`);
  return [p.id, files];
}));

const resultOf = (cell: string) => (cell === "Final" ? null : score(cell) ?? fail(`unreadable result ${cell}`));
const pointsFor = (results: (readonly [number, number] | null)[]) => results.reduce((n, s) => n + (!s ? 0 : s[0] > s[1] ? 3 : s[0] === s[1] ? 1 : 0), 0);
const resultsKept: Record<Kept, (row: string) => readonly [number, number] | null> = {
  a: (row) => { const r = JSON.parse(row); return [r.home_score, r.away_score] as const; },
  b: (row) => resultOf(row.match(/<td>([WLT] \d+-\d+|Final)<\/td>/)?.[1] ?? fail("a tidied row has no result cell")),
  c: (row) => resultOf(row.match(/<td>([WLT] \d+-\d+|Final)<\/td>/)?.[1] ?? fail("a raw row has no result cell")),
};
const drawTruth = pointsFor(CASE2.map((r) => resultOf(r.result)));
const drawPoints = Object.fromEntries(KEPT.map((k) => [k, pointsFor(archives[k].rows.map(resultsKept[k]))])) as Record<Kept, number>;
/** Case 2's fourth bug, a build step bug: replaying the fixed scoring rule over each archive's three rows, with bug 3 still in archive (a). */
export const case2Draws = {
  id: "draws" as const,
  label: "The build scored a draw as two points, not one",
  truth: drawTruth,
  points: drawPoints,
  answers: Object.fromEntries(KEPT.map((k) => [k, drawPoints[k] === drawTruth])) as Record<Kept, boolean>,
};
check(drawTruth === 3 && drawPoints.a === 4 && !case2Draws.answers.a && case2Draws.answers.b && case2Draws.answers.c, "Case 2's draw bug no longer gives Cedar Grove 3 points from (b) and (c) and 4 from (a)");
check(Object.values(presetFiles).every((files) => files.length === fridayPages.length) && presetFiles["live-changed"].some((f) => f.liveContent !== f.nowContent && !f.fetched), "the bench's preset files no longer show the unseen live change");
