export type Rule = "host" | "both";
export type Design = "skip" | "fill" | "stop" | "record";
export type Preset = "friday" | "both" | "all" | "record";
export type Control = "pages" | "rule" | "design";
export type Output = "says" | "counts" | "matrix" | "table";
export type BenchState = { down: string[]; rule: Rule; design: Design };

export type School = { slug: string; name: string; abbr: string };
export type Fixture = [host: number, visitor: number, date: string, hostScore: number | null, visitorScore: number | null, final: 0 | 1];
export type BenchData = { schools: School[]; fixtures: Fixture[] };

export type Cell = "read" | "lost" | "fill" | "noscore" | "later";
export type TableRow = { i: number; slug: string; name: string; p: number; gf: number; ga: number; pts: number };
export type RowCheck = { place: number; short: number; invented: number; wrong: boolean; words: string };
export type Outcome = {
  cells: Cell[];
  down: number[];
  stopped: boolean;
  table: TableRow[];
  checks: RowCheck[];
  finished: number;
  scored: number;
  read: number;
  unread: number;
  noscore: number;
  inTable: number;
  invented: number;
  wrong: number | null;
  says: string;
};

export const RULES: Rule[] = ["host", "both"];
export const DESIGNS: Design[] = ["skip", "fill", "stop", "record"];
export const PRESETS: Record<Preset, BenchState> = {
  friday: { down: ["dunmore"], rule: "host", design: "skip" },
  both: { down: ["dunmore"], rule: "both", design: "skip" },
  all: { down: [], rule: "host", design: "skip" },
  record: { down: ["dunmore"], rule: "host", design: "record" },
};
export const LABELS = {
  preset: { friday: "Friday as it happened", both: "Same outage, both pages read", all: "Every page answers", record: "Friday, with a record" } as Record<Preset, string>,
  rule: { host: "Host's page only", both: "Both schools' pages" } as Record<Rule, string>,
  design: { skip: "Skip it and carry on", fill: "Fill in 0-0", stop: "Stop the run", record: "Record the gap" } as Record<Design, string>,
};

const GLYPH: Record<Cell, string> = { read: "●", lost: "✕", noscore: "?", fill: "0-0", later: "" };
const MEANS: Record<Cell, string> = {
  read: "counted in the table",
  lost: "finished, lost with its host's page",
  noscore: "finished, no score on the page",
  fill: "lost, entered as 0-0",
  later: "not yet played",
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export const esc = (t: string | number) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const day = (date: string, long = false) => {
  const [, m, d] = date.split("-").map(Number);
  return `${long ? MONTHS[m - 1] : MONTHS[m - 1].slice(0, 3)} ${d}`;
};
export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const listed = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
const number = (n: number) => WORDS[n] ?? String(n);

export function standings(data: BenchData, results: [number, number, number, number][]): TableRow[] {
  const t = data.schools.map((s, i) => ({ i, slug: s.slug, name: s.name, p: 0, gf: 0, ga: 0, pts: 0 }));
  const add = (i: number, gf: number, ga: number) => {
    const r = t[i];
    r.p += 1; r.gf += gf; r.ga += ga; r.pts += gf > ga ? 3 : gf === ga ? 1 : 0;
  };
  results.forEach(([h, a, hs, as]) => { add(h, hs, as); add(a, as, hs); });
  return t.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || x.slug.localeCompare(y.slug));
}

export const truthTable = (data: BenchData) =>
  standings(data, data.fixtures.filter((f) => f[5] && f[3] !== null).map((f) => [f[0], f[1], f[3]!, f[4]!]));

export function normalise(data: BenchData, st: BenchState): BenchState {
  const slugs = data.schools.map((s) => s.slug);
  return { down: slugs.filter((s) => st.down.includes(s)), rule: st.rule, design: st.design };
}

export function simulate(data: BenchData, st: BenchState): Outcome {
  const { schools, fixtures } = data;
  const up = schools.map((s) => !st.down.includes(s.slug));
  const cells = fixtures.map(([h, a, , hs, , fin]): Cell => {
    if (!fin) return "later";
    const seen = st.rule === "host" ? up[h] : up[h] || up[a];
    if (!seen) return st.design === "fill" ? "fill" : "lost";
    return hs === null ? "noscore" : "read";
  });
  const down = schools.map((_, i) => i).filter((i) => !up[i]);
  const stopped = st.design === "stop" && down.length > 0;
  const results: [number, number, number, number][] = [];
  fixtures.forEach((f, k) => {
    if (cells[k] === "read") results.push([f[0], f[1], f[3]!, f[4]!]);
    if (cells[k] === "fill") results.push([f[0], f[1], 0, 0]);
  });
  const count = (c: Cell) => cells.filter((x) => x === c).length;
  const truth = truthTable(data);
  const table = stopped ? [] : standings(data, results);
  const involving = (i: number, c: Cell) => fixtures.filter((f, k) => cells[k] === c && (f[0] === i || f[1] === i)).length;
  const checks = table.map((r, pos): RowCheck => {
    const place = truth.findIndex((x) => x.i === r.i);
    const t = truth[place];
    const short = t.p - involving(r.i, "read");
    const invented = involving(r.i, "fill");
    const wrong = place !== pos || t.p !== r.p || t.pts !== r.pts || t.gf !== r.gf || t.ga !== r.ga;
    const bits = [
      ...(place !== pos ? [`should be ${ordinal(place + 1)}`] : []),
      ...(short ? [`${short} short`] : []),
      ...(invented ? [`${invented} invented`] : []),
    ];
    if (wrong && !bits.length) bits.push("totals differ");
    return { place: place + 1, short, invented, wrong, words: bits.length ? bits.join(", ") : "agrees" };
  });

  const finished = fixtures.filter((f) => f[5]).length;
  const read = count("read");
  const unread = count("lost") + count("fill");
  const noscore = count("noscore");
  const inTable = stopped ? 0 : results.length;
  const names = down.map((i) => schools[i].name);
  let says: string;
  if (stopped) {
    says = `Error: ${names[0]} schedule did not answer. Run aborted.`;
  } else if (st.design === "record") {
    const blank = fixtures.filter((_, k) => cells[k] === "noscore").map((f) => `${schools[f[0]].name} v ${schools[f[1]].name}, ${day(f[2], true)}`);
    says = [
      `Done. ${schools.length - down.length} of ${schools.length} schedules complete.`,
      down.length ? `No answer: ${listed(names)}.` : "",
      `${read} of ${finished} finished matches have a score in the table.`,
      unread ? `${unread} never read.` : "",
      blank.length ? `${blank.length} final${blank.length > 1 ? "s" : ""} with no score: ${blank.join("; ")}.` : "",
      unread ? "I would not publish this." : read === finished ? "Ready to publish." : `I would publish this as ${read} of ${finished}, with the gap named.`,
    ].filter(Boolean).join(" ");
  } else {
    says = `Done. All ${number(schools.length)} school sites, ${results.length} conference matches, no errors. Ready to publish.`;
  }
  return {
    cells, down, stopped, table, checks, finished,
    scored: truth.reduce((n, r) => n + r.p, 0) / 2,
    read, unread, noscore, inTable,
    invented: stopped ? 0 : count("fill"),
    wrong: stopped ? null : checks.filter((c) => c.wrong).length,
    says,
  };
}

export function matrixRows(data: BenchData, out: Outcome): string {
  const { schools, fixtures } = data;
  const at = new Map(fixtures.map((f, k) => [`${f[0]}-${f[1]}`, k]));
  return schools.map((host, i) => {
    const isDown = out.down.includes(i);
    const head = `<th scope="row"${isDown ? ' class="bn-down"' : ""}>${esc(host.name)}${isDown ? '<span class="bn-tag">no answer</span>' : ""}</th>`;
    const row = schools.map((visitor, j) => {
      if (i === j) return '<td class="bn-self"><span class="bn-sr">No match</span></td>';
      const k = at.get(`${i}-${j}`);
      if (k === undefined) return '<td class="bn-self"><span class="bn-sr">Not scheduled</span></td>';
      const c = out.cells[k];
      const f = fixtures[k];
      const what = `${host.name} v ${visitor.name}, ${day(f[2])}${c === "read" ? `, ${f[3]}-${f[4]}` : ""}: ${MEANS[c]}`;
      return `<td class="bn-${c}"><span title="${esc(what)}"><span aria-hidden="true">${GLYPH[c]}</span><span class="bn-sr">${esc(what)}</span></span></td>`;
    }).join("");
    return `<tr>${head}${row}</tr>`;
  }).join("");
}

export function matrixKey(out: Outcome, withFill: boolean): string {
  const n = (c: Cell) => out.cells.filter((x) => x === c).length;
  const keys: Cell[] = ["read", "lost", "noscore", ...(withFill || n("fill") ? ["fill" as Cell] : []), "later"];
  return keys.map((c) => `<li><i class="bn-${c}" aria-hidden="true">${GLYPH[c]}</i>${MEANS[c].charAt(0).toUpperCase()}${MEANS[c].slice(1)}: ${n(c)}</li>`).join("");
}

export function countTiles(data: BenchData, out: Outcome): string {
  const tiles = [
    [`${data.schools.length - out.down.length} of ${data.schools.length}`, "schedule pages answered"],
    [`${out.stopped ? 0 : out.read} of ${out.finished}`, "finished matches counted"],
    [String(out.unread), out.invented ? "finished matches lost, entered as 0-0" : "finished matches lost"],
    [String(out.noscore), "finished, no score on any saved page"],
    [out.wrong === null ? "No table" : `${out.wrong} of ${data.schools.length}`, out.wrong === null ? "the run stopped" : "rows that differ from the reference table"],
  ];
  return tiles.map(([v, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join("");
}

export function reading(data: BenchData, st: BenchState, out: Outcome): string {
  const n = data.schools.length;
  const matches = (k: number) => `${number(k)} finished match${k === 1 ? "" : "es"}`;
  const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const blank = out.noscore ? ` ${capital(matches(out.noscore))} still ${out.noscore === 1 ? "has" : "have"} no score on any page that answered.` : "";
  if (!out.down.length) {
    return out.noscore
      ? `Every page answered, and ${matches(out.noscore)} still ${out.noscore === 1 ? "has" : "have"} no score. A page that answers can still hold a row with a blank in it.`
      : "Every page answered, and every finished match has a score.";
  }
  const one = out.down.length === 1;
  const who = listed(out.down.map((i) => data.schools[i].name));
  if (out.stopped) return `The run stopped at ${data.schools[out.down[0]].name}'s page. Nothing comes out, including the ${out.read} matches read from pages that did answer.`;
  if (!out.unread) return `${who} did not answer, yet every finished match ${one ? "it" : "they"} hosted was found on the visitor's page.${blank}`;
  const lost = st.rule === "host"
    ? `${who} did not answer, and ${matches(out.unread)} went with ${one ? "that page" : "those pages"}: every finished match ${one ? "that school" : "those schools"} hosted.`
    : `With both pages read, a match is lost only when neither school's page answered: ${matches(out.unread)}.`;
  if (st.design === "fill") return `${lost} Each is in the table as 0-0. ${out.wrong} of ${n} rows differ from the reference table, and nothing marks which scores were invented.${blank}`;
  const rows = `${out.wrong} of ${n} rows differ from the reference.`;
  return `${lost} ${rows}${st.design === "record" ? " The table is the same as when Kick skips the page. What changed is the summary: it names the gap." : ""}${blank}`;
}

export function tableRows(out: Outcome): string {
  return out.table.map((r, pos) => {
    const c = out.checks[pos];
    const gd = r.gf - r.ga;
    return `<tr${c.wrong ? ' class="bn-wrong"' : ""}><td>${pos + 1}</td><th scope="row">${esc(r.name)}</th><td>${r.p}</td><td>${gd > 0 ? "+" : ""}${gd}</td><td>${r.pts}</td><td class="bn-vs">${c.wrong ? '<span class="bn-mark" aria-hidden="true">✕</span>' : '<span class="bn-mark" aria-hidden="true">✓</span>'}${esc(c.words)}</td></tr>`;
  }).join("");
}
