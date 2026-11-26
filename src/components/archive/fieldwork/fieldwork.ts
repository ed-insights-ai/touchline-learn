import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SEASON, championship, fingerprints, members, presets, saturday, fridayManifest, fridayPages, parseSchedule, rawRows, replayReport, tableC, tableD, tidyV1, tidyV2, tuesdayDiff, tuesdayPages,
} from "../../../lib/archive";

// The Module 2 field work page's numbers, computed at build time from the sample and archive.ts.

const root = (...parts: string[]) => join(process.cwd(), ...parts);
const read = (...parts: string[]) => readFileSync(root(...parts));
const sha = (...chunks: (Buffer | string)[]) => chunks.reduce((h, c) => h.update(c), createHash("sha256")).digest("hex");
const short = (hex: string) => hex.slice(0, 12);
const fail = (what: string): never => { throw new Error(`Module 2 field work: ${what}`); };
const check = (ok: boolean, what: string) => { if (!ok) fail(what); };
const programmes: Record<string, { name: string }> = JSON.parse(read("sample", "data", "reference", "programmes.json").toString("utf-8")).programmes;
const nameOf = (slug: string) => programmes[slug]?.name ?? fail(`no programme ${slug}`);
const pageOf = (pages: typeof fridayPages, slug: string) => pages.find((p) => p.slug === slug) ?? fail(`no capture for ${slug}`);

// ---------------------------------------------------------------- content signatures

/** Known render noise: comments (render stamps), the per-visit token, and whitespace between tags. */
export const normalise = (html: string) =>
  html.replace(/<!--[\s\S]*?-->/g, "").replace(/<meta name="visit-token"[^>]*>/g, "").replace(/>\s+</g, "><").trim();
const signatureOf = (html: string) => short(sha(normalise(html)));
const stampAfter = (fetchedAt: string, minutes: number) => new Date(Date.parse(fetchedAt) + minutes * 60_000).toISOString().replace(/\.\d+Z$/, "Z");
const rerender = (html: string, stamp: string, token = sha(stamp).slice(0, 10)) =>
  html
    .replace("<head>\n", `<head>\n  <meta name="visit-token" content="${token}">\n`)
    .replace(/\n {2}(?=<(?:h1|table|\/table))/g, "\n    ")
    .replace(/\n {4}(?=<(?:caption|tr))/g, "\n      ")
    .replace("</body>", `  <!-- rendered ${stamp} -->\n</body>`);

const SIG_SLUG = "harbor-point";
const SAME_SLUG = "brightwater-state";
const fridayHarbor = pageOf(fridayPages, SIG_SLUG);
const tuesdayHarbor = pageOf(tuesdayPages, SIG_SLUG);
const fridayOther = pageOf(fridayPages, SAME_SLUG);
const tuesdayOther = pageOf(tuesdayPages, SAME_SLUG);
check(fridayOther.html === tuesdayOther.html, `${SAME_SLUG}'s Tuesday page is no longer byte-identical to Friday's`);
check(fridayHarbor.html !== tuesdayHarbor.html, `${SIG_SLUG}'s Tuesday page no longer differs from Friday's`);

const lineDiff = (before: string, after: string) => {
  const trim = (t: string) => t.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  const was = new Set(trim(before)), now = new Set(trim(after));
  return { removed: trim(before).filter((l) => !now.has(l)), added: trim(after).filter((l) => !was.has(l)) };
};
type Fetch = { id: string; label: string; what: string; real: boolean; html: string; baseline: string; slug: string };
const fetches: Fetch[] = [
  { id: "same", label: `${nameOf(SAME_SLUG)}, Tuesday's capture`, what: "From the sample.", real: true, html: tuesdayOther.html, baseline: fridayOther.html, slug: SAME_SLUG },
  { id: "noise", label: `${nameOf(SIG_SLUG)}, re-rendered the morning after Friday's run`, what: "Made up for this page.", real: false, html: rerender(fridayHarbor.html, stampAfter(fridayHarbor.fetchedAt, 18 * 60)), baseline: fridayHarbor.html, slug: SIG_SLUG },
  { id: "result", label: `${nameOf(SIG_SLUG)}, Tuesday's capture`, what: "From the sample.", real: true, html: tuesdayHarbor.html, baseline: fridayHarbor.html, slug: SIG_SLUG },
  { id: "both", label: `${nameOf(SIG_SLUG)}, Tuesday's capture re-rendered`, what: "Made up for this page.", real: false, html: rerender(tuesdayHarbor.html, stampAfter(tuesdayHarbor.fetchedAt, 40)), baseline: fridayHarbor.html, slug: SIG_SLUG },
];
export type HashAnswer = "neither" | "bytes" | "both" | "signature";
export const hashAnswers: [HashAnswer, string][] = [
  ["neither", "Neither hash"],
  ["bytes", "Byte hash only"],
  ["signature", "Signature only"],
  ["both", "Both hashes"],
];
/** Four later fetches, each compared with Friday's capture of the same page. */
export const signatures = {
  slug: SIG_SLUG,
  name: nameOf(SIG_SLUG),
  friday: { bytes: Buffer.byteLength(fridayHarbor.html), byteHash: short(fridayHarbor.sha256), signature: signatureOf(fridayHarbor.html) },
  fetches: fetches.map((f) => {
    const byteChanged = sha(f.html) !== sha(f.baseline);
    const sigChanged = signatureOf(f.html) !== signatureOf(f.baseline);
    const answer: HashAnswer = byteChanged ? (sigChanged ? "both" : "bytes") : sigChanged ? "signature" : "neither";
    return {
      id: f.id, label: f.label, what: f.what, real: f.real, name: nameOf(f.slug),
      bytes: Buffer.byteLength(f.html), byteHash: short(sha(f.html)), signature: signatureOf(f.html),
      baselineByteHash: short(sha(f.baseline)), baselineSignature: signatureOf(f.baseline),
      byteChanged, sigChanged, answer, ...lineDiff(f.baseline, f.html),
    };
  }),
};
check(signatures.fetches.map((f) => f.answer).join() === "neither,bytes,both,both", "the four fetches no longer split as neither, bytes, both, both");
check(signatures.friday.byteHash === short(sha(fridayHarbor.html)), "Friday's capture no longer matches its manifest hash");
check(!signatures.fetches.some((f) => f.answer === "signature"), "a fetch changed its signature without changing its bytes");
check(signatures.fetches[3].signature === signatures.fetches[2].signature, "the noisy Tuesday re-render no longer has the real Tuesday capture's signature");

// ---------------------------------------------------------------- fingerprint scope

const PARSER = { v1: read("labs", "m02_parser_tuesday.py").toString("utf-8"), v2: read("labs", "m02_parser_fixed.py").toString("utf-8") };
const reader = read("labs", "common.py");
const config = Buffer.concat([read("sample", "data", "reference", "aliases.json"), read("sample", "data", "reference", "membership.json")]);
const aliases: Record<string, string[]> = JSON.parse(read("sample", "data", "reference", "aliases.json").toString("utf-8"));

const functionSource = (module: string, name: string) => {
  const lines = module.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`def ${name}(`));
  check(start >= 0, `the parser has no function ${name}`);
  const end = lines.findIndex((l, i) => i > start && l.trim() !== "" && !/^\s/.test(l));
  return lines.slice(start, end < 0 ? undefined : end).join("\n").trimEnd();
};
const scopes = (module: string, cfg: Buffer = config) => ({
  fn: short(sha(functionSource(module, "tidy"))),
  module: short(sha(module)),
  lab: short(sha(module, reader, cfg, String(SEASON))),
});
check(scopes(PARSER.v1).lab === fingerprints.v1 && scopes(PARSER.v2).lab === fingerprints.v2, "the lab-scope fingerprint here is not the lab's");

const SIDE = '"side": side,';
check(functionSource(PARSER.v2, "read_schedule").includes(SIDE), "read_schedule() no longer stores the side as read");
const homeOnly = PARSER.v2.replace(SIDE, '"side": "vs",');
const withComment = PARSER.v2.replace("\ndef tidy(", "\n# Saint before a name, State at the end.\ndef tidy(");
const aliasConfig = Buffer.concat([
  Buffer.from(`${JSON.stringify({ ...aliases, "st-lambert": [...aliases["st-lambert"], "Saint Lambert"] }, null, 1)}\n`),
  read("sample", "data", "reference", "membership.json"),
]);

const allRaw = fridayPages.flatMap((p) => rawRows(p.html));
const renamedRows = fridayPages.flatMap((p) => {
  const a = parseSchedule(p.html, tidyV1), b = parseSchedule(p.html, tidyV2);
  return a.filter((r, i) => r.shown !== b[i].shown);
}).length;
const awayRows = allRaw.filter((r) => r.side === "at").length;
const saved = new Set(fridayPages.map((p) => p.slug));
const away = fridayPages.flatMap((p) => parseSchedule(p.html, tidyV2)).filter((r) => r.side === "at");
const awayGroups = {
  compared: away.filter((r) => members.includes(r.opponent) && saved.has(r.opponent)).length,
  hostUnsaved: away.filter((r) => members.includes(r.opponent) && !saved.has(r.opponent)).length,
  nonMember: away.filter((r) => !members.includes(r.opponent)).length,
};
check(awayGroups.compared + awayGroups.hostUnsaved + awayGroups.nonMember === awayRows && Object.values(awayGroups).every((x) => x > 0), "the away rows no longer split into compared, one-sided and non-member rows");
const spelledSaint = allRaw.filter((r) => r.opponent === "Saint Lambert").length;
check(renamedRows > 0 && awayRows > 0 && spelledSaint === 0, "the parsed-row counts behind the fingerprint table changed shape");

export type Scope = "fn" | "module" | "lab" | "none";
export const scopeNames: [Scope, string][] = [
  ["fn", "The tidy function alone"],
  ["module", "The parser's whole module"],
  ["lab", "Module, page reader and config"],
  ["none", "None of the three"],
];
type Edit = { id: string; label: string; where: string; before: ReturnType<typeof scopes>; after: ReturnType<typeof scopes>; rows: number | null; rowsNote: string };
const edits: Edit[] = [
  { id: "rule", label: "Fix the tidy rule", where: "Saint before a name, State at the end, as the lesson's fix does.", before: scopes(PARSER.v1), after: scopes(PARSER.v2), rows: renamedRows, rowsNote: "renamed" },
  { id: "side", label: "Fix a parser that stored every match as a home match", where: "Store the vs or at cell as read, where the old code wrote home for every row.", before: scopes(homeOnly), after: scopes(PARSER.v2), rows: awayRows, rowsNote: "away rows read as home until rebuilt" },
  { id: "comment", label: "Add a comment line above tidy()", where: "One line of explanation just above the rule. The code is the same.", before: scopes(PARSER.v2), after: scopes(withComment), rows: 0, rowsNote: "a comment changes no output" },
  { id: "alias", label: "Add \"Saint Lambert\" to the alias list", where: "A spelling no saved page uses yet, mapped to St. Lambert.", before: scopes(PARSER.v2), after: scopes(PARSER.v2, aliasConfig), rows: spelledSaint, rowsNote: "no saved page spells it that way yet" },
  { id: "runtime", label: "Upgrade the Python that runs the parser", where: "A newer Python runs exactly the same files.", before: scopes(PARSER.v2), after: scopes(PARSER.v2), rows: null, rowsNote: "only a replay compared with the last output can say" },
];
const narrowest = (e: Edit): Scope => (e.before.fn !== e.after.fn ? "fn" : e.before.module !== e.after.module ? "module" : e.before.lab !== e.after.lab ? "lab" : "none");
/** Five edits, the three fingerprint scopes before and after each, and how many parsed rows of Friday's pages each one changes. */
export const scopeTable = edits.map((e) => ({ ...e, narrowest: narrowest(e) }));
const presetAfter = (id: string) => presets.find((p) => p.id === id)?.fingerprintAfter ?? fail(`no preset ${id}`);
check(scopeTable[2].after.lab === presetAfter("comment") && scopeTable[3].after.lab === presetAfter("alias"), "the comment and alias edits here are not the lesson's presets");
check(scopeTable.map((e) => e.narrowest).join() === "fn,module,module,lab,none", "the five edits no longer fall one per scope as expected");
export const fingerprintScope = { away: awayGroups, tidyBefore: functionSource(PARSER.v1, "tidy"), functionLinesBefore: functionSource(PARSER.v1, "tidy").split("\n").length, moduleLinesBefore: PARSER.v1.trimEnd().split("\n").length, functionLines: functionSource(PARSER.v2, "tidy").split("\n").length, moduleLines: PARSER.v2.trimEnd().split("\n").length, tidy: functionSource(PARSER.v2, "tidy") };

// ---------------------------------------------------------------- retention

const schedules = fridayManifest.pages.filter((p) => p.kind === "schedule" && p.state === "saved");
const boxes = fridayManifest.pages.filter((p) => p.kind === "box_score" && p.state === "saved");
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const sizeOf = (p: { bytes?: number }) => p.bytes ?? fail("a saved page has no size");
const fridaySchedBytes = sum(schedules.map(sizeOf));
const tuesdayBytes = sum(tuesdayPages.map((p) => Buffer.byteLength(p.html)));
const newOnTuesday = tuesdayPages.filter((p) => pageOf(fridayPages, p.slug).sha256 !== p.sha256);
const newBytes = sum(newOnTuesday.map((p) => Buffer.byteLength(p.html)));
check(schedules.every((p) => Buffer.byteLength(pageOf(fridayPages, p.programme).html) === p.bytes), "a manifest size disagrees with its page");

const runDate = fridayManifest.started_at.slice(0, 10);
const firstDate = allRaw.map((r) => r.date).sort()[0];
const days = Math.round((Date.parse(runDate) - Date.parse(firstDate)) / 86_400_000) + 1;
const versionsOf = (html: string) => new Set(rawRows(html).filter((r) => r.result !== "" && r.date <= runDate).map((r) => r.date)).size + 1;
const versions = fridayPages.map((p) => ({ slug: p.slug, versions: versionsOf(p.html), bytes: Buffer.byteLength(p.html) }));
const every = days * fridaySchedBytes;
const deduped = sum(versions.map((v) => v.versions * v.bytes));
/** Sizes from Friday's and Tuesday's captures, and a season model of the seven schedule pages. */
export const retention = {
  schedules: schedules.length,
  boxes: boxes.length,
  fridaySchedBytes,
  fridayBoxBytes: sum(boxes.map(sizeOf)),
  tuesday: { pages: tuesdayPages.length, bytes: tuesdayBytes, newFiles: newOnTuesday.length, newBytes, unchanged: tuesdayPages.length - newOnTuesday.length },
  model: {
    firstDate, runDate, days,
    versions: sum(versions.map((v) => v.versions)),
    minVersions: Math.min(...versions.map((v) => v.versions)),
    maxVersions: Math.max(...versions.map((v) => v.versions)),
    latest: fridaySchedBytes,
    every,
    deduped,
    everyRatio: every / fridaySchedBytes,
    dedupedRatio: deduped / fridaySchedBytes,
  },
};
check(retention.tuesday.newFiles === 5 && retention.tuesday.unchanged === 2, "Tuesday's re-fetch no longer changes five of seven pages");
const oneResultCell = (before: string, after: string) => {
  const a = rawRows(before), b = rawRows(after);
  const differ = a.filter((r, i) => r.line !== b[i]?.line);
  return a.length === b.length && differ.length === 1 && differ.every((r) => {
    const t = b[a.indexOf(r)];
    return r.fixture === t.fixture && r.result !== t.result && r.line.replace(`<td>${r.result}</td>`, `<td>${t.result}</td>`) === t.line;
  });
};
check(newOnTuesday.every((p) => oneResultCell(pageOf(fridayPages, p.slug).html, p.html)), "a page that changed on Tuesday no longer differs from Friday's in exactly one result cell");
const posted = [...saturday, championship];
const touched = new Set(posted.flatMap((f) => [f.home, f.away]).filter((slug) => saved.has(slug)));
check([...touched].sort().join() === newOnTuesday.map((p) => p.slug).sort().join(), "the pages Tuesday changed are no longer the saved pages of the teams whose results were posted");
/** The results posted between Friday's run and Tuesday's capture, as the learner reads them before the check. */
export const postedSinceFriday = posted.map((f) => ({ home: f.homeName, away: f.awayName, date: f.date }));
check(deduped < every && fridaySchedBytes < deduped, "the season model's three sizes are out of order");

// ---------------------------------------------------------------- the lab's quotes

const quote = (name: string) => read("src", "data", "quotes", name).toString("utf-8").replace(/\n$/, "");
const sections = (text: string) => {
  const lines = text.split("\n");
  const out: { heading: string; body: string }[] = [];
  lines.forEach((line, i) => {
    if (/^-+$/.test(line) && i > 0 && line.length === lines[i - 1].length) out.push({ heading: lines[i - 1], body: "" });
  });
  return out.map((s, n) => {
    const start = lines.indexOf(s.heading);
    const end = n + 1 < out.length ? lines.indexOf(out[n + 1].heading) : lines.length;
    return { heading: s.heading, text: lines.slice(start, end).join("\n").replace(/\n+$/, "") };
  });
};
const run = quote("m02_archive.run.txt");
/** `python labs/m02_archive.py`, whole, split at its headings. */
export const labRun = sections(run);
check(labRun.map((s) => s.heading.split(":")[0]).join() === "Capture manifest,Replay 1,Replay 2,Replay 3,Replay report", "the quoted lab run no longer has its five sections");
check(labRun.map((s) => s.text).join("\n\n") === run, "the quoted lab run does not split back into itself");
check(run.endsWith(replayReport), "the quoted lab run and the lesson's replay report differ; regenerate both quotes");
/** The tail of `python labs/m02_archive.py --missing hartwell-tech` from its replay report. */
export const missingReport = quote("m02_archive.missing-report.txt");
check(missingReport.startsWith("Replay report: ") && /^replayed {7}: 6 of the 7 schedules/m.test(missingReport), "the quoted --missing report does not start at its heading");
const MISSING = "hartwell-tech";
const elsewhere = new Set(fridayPages.filter((p) => p.slug !== MISSING).flatMap((p) => rawRows(p.html).map((r) => r.fixture)));
const lostRows = parseSchedule(pageOf(fridayPages, MISSING).html, tidyV2).filter((r) => !elsewhere.has(r.fixture) && members.includes(r.opponent) && r.result !== "");
const finishedIn = (text: string) => Number((text.match(/^tables {9}: .*rebuild (\d+) of/m) ?? fail("a quoted report has no tables line"))[1]);
check(lostRows.length === 2 && lostRows.every((r) => !saved.has(r.opponent)) && new Set(lostRows.map((r) => r.side)).size === 2, "the --missing page no longer holds one home and one away match against an unsaved school, on no other saved page");
check(finishedIn(replayReport) - finishedIn(missingReport) === lostRows.length, "the --missing table no longer loses exactly the matches that were only on the missing page");
/** --missing hartwell-tech: the page, and the conference matches that were on no other saved page. */
export const missing = { slug: MISSING, name: nameOf(MISSING), lost: lostRows.length, opponent: nameOf(lostRows[0].opponent) };
check(missingReport.includes(`skipped ${missing.slug}'s missing page`), "the quoted --missing report names a different page");
export { tuesdayDiff };

/** The controlled half of Tuesday's comparison: Tuesday's pages, Tuesday's parser, against the --tuesday table. */
const dc = tableD.rows.flatMap((d) => {
  const c = tableC.rows.find((r) => r.slug === d.slug)!;
  return (["place", "name", "p", "w", "d", "l", "gf", "ga", "gd", "pts"] as const).filter((k) => d[k] !== c[k]).map((k) => ({ slug: d.slug, column: k, before: d[k], after: c[k] }));
});
check(dc.length === 1 && dc[0].slug === "st-lambert" && dc[0].column === "name", "Tuesday's pages with each parser no longer differ only in Saint Lambert's name");
export const controlled = { name: String(dc[0].after), was: String(dc[0].before) };

const unavailable = fridayManifest.pages.filter((p) => p.kind === "schedule" && p.state === "unavailable");
/** Friday's run in one line, and the pages Tuesday's re-fetch found unchanged. */
export const week = {
  schedulesRequested: fridayManifest.pages.filter((p) => p.kind === "schedule").length,
  schedulesSaved: schedules.length,
  boxesSaved: boxes.length,
  unavailable: unavailable.map((p) => nameOf(p.programme)),
  unchangedOnTuesday: tuesdayPages.filter((p) => pageOf(fridayPages, p.slug).sha256 === p.sha256).map((p) => nameOf(p.slug)),
};
check(week.unavailable.length === 1, "Friday's run no longer has exactly one unavailable schedule");

/** Each schedule page's byte hash on Friday and in Tuesday's capture. */
export const tuesdayHashes = tuesdayPages.map((p) => {
  const f = pageOf(fridayPages, p.slug);
  return { name: nameOf(p.slug), friday: short(f.sha256), tuesday: short(p.sha256), same: f.sha256 === p.sha256 };
});
/** The results posted between Friday's run and Tuesday's capture. */
export const sinceFriday = { saturday: saturday.length, championship: `${championship.homeName} v ${championship.awayName}` };

const runAll = read("labs", "run_all.py").toString("utf-8");
const exitOf = (args: string[]) => {
  const listed = `[${args.map((a) => JSON.stringify(a)).join(", ")}]`;
  const line = runAll.split("\n").find((l) => l.trim().startsWith(`(${listed},`)) ?? fail(`labs/run_all.py does not list ${args.join(" ")}`);
  return Number(line.trim().slice(listed.length + 2).match(/^\s*(\d)/)?.[1] ?? fail(`no exit code for ${args.join(" ")}`));
};
/** The exit code labs/run_all.py expects from each run the page quotes. */
export const exits = { tuesday: exitOf(["labs/m02_archive.py", "--tuesday"]), missing: exitOf(["labs/m02_archive.py", "--missing", "hartwell-tech"]) };
check(exits.tuesday === 1 && exits.missing === 1, "the m02 exit codes in labs/run_all.py are not the ones the page explains");

const counter = labRun[0].text.match(/network counter: caught (\d+) of (\d+) test requests/) ?? fail("the quoted run has no network counter line");
check(counter[1] === counter[2], "the quoted run's counter missed a test request");
/** How many test requests the lab's counter must catch before it is trusted. */
export const testRequests = Number(counter[2]);
