#!/usr/bin/env node
/*
  Builds data/election.json from:
    - shared tables: meta, districts (demo ZIPs, optional), races, issues
    - one file per candidate: data/candidates/<person-id>.json (see README for the format)
  races.kind is "office" (default) or "judicial" (judges: record first, stances optional).

  Sources (pick one):
    node scripts/build-data.mjs                     reads data/sheets/*.csv
    node scripts/build-data.mjs --sheet <SHEET_ID>  reads a Google Sheet shared as
                                                    "Anyone with the link: Viewer"
    Add --save-csv with --sheet to also refresh data/sheets/*.csv, so every data
    change shows up as a reviewable git diff. Candidate files are always read from disk.

  The build fails (exit 1) on any rule violation, so ungrounded data never ships:
  every stance needs a position, quote, source, http(s) source_url and impact;
  every record action needs a date, action, text, source and source_url.
  No dependencies; Node 18+.
*/
import fs from "node:fs";
import path from "node:path";
import { ROOT, CSV_DIR, TABS, OPTIONAL_TABS, parseCsv, readCandidates } from "./common/sheets.mjs";

const OUT = path.join(ROOT, "data", "election.json");

async function loadTabs(sheetId, saveCsv) {
  const tabs = {};
  for (const tab of TABS) {
    let text;
    if (sheetId) {
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
      const res = await fetch(url);
      if (!res.ok && tab in OPTIONAL_TABS) { tabs[tab] = []; continue; }
      if (!res.ok) throw new Error(`Could not read tab "${tab}" (HTTP ${res.status}). Is the sheet shared as "Anyone with the link"?`);
      text = await res.text();
      // Google returns the first tab when the named one doesn't exist, so check it's really this tab.
      if (tab in OPTIONAL_TABS && !text.split("\n")[0].toLowerCase().includes(OPTIONAL_TABS[tab])) { tabs[tab] = []; continue; }
      if (saveCsv) fs.writeFileSync(path.join(CSV_DIR, `${tab}.csv`), text.endsWith("\n") ? text : text + "\n");
    } else {
      const file = path.join(CSV_DIR, `${tab}.csv`);
      if (tab in OPTIONAL_TABS && !fs.existsSync(file)) { tabs[tab] = []; continue; }
      text = fs.readFileSync(file, "utf8");
    }
    tabs[tab] = parseCsv(text);
  }
  return { ...tabs, ...flattenCandidates() };
}

/* Turns each candidate file into the rows the checks below validate. Every row
   remembers where it came from, so errors point at the file and field. */
function flattenCandidates() {
  const t = { candidates: [], stances: [], record: [], endorsements: [], ratings: [], fileErrors: [] };
  const src = (s) => ({ source: s?.title?.trim() || "", source_url: s?.url?.trim() || "" });
  const arr = (v) => (Array.isArray(v) ? v : []);
  for (const { id, file, data: d, error } of readCandidates()) {
    if (error) { t.fileErrors.push(`${file}: ${error}`); continue; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) t.fileErrors.push(`${file}: file name must be lowercase-with-hyphens (e.g. jane-doe.json)`);
    t.candidates.push({ _where: file, candidate_id: id, race_id: d.race || "", name: d.name || "", running_mate: d.runningMate || "",
      party: arr(d.ballotLines).join(", "), occupation: d.occupation || "",
      record_office: d.priorOffice?.office || "", record_years: d.priorOffice?.years || "" });
    arr(d.positions).forEach((p, i) => t.stances.push({ _where: `${file} positions[${i}]`, issue_id: p.issue || "", candidate_id: id,
      supports: arr(p.supports).join("\n"), opposes: arr(p.opposes).join("\n"), quote: p.quote || "", ...src(p.source), real_world_impact: p.impact || "" }));
    arr(d.record).forEach((r, i) => t.record.push({ _where: `${file} record[${i}]`, candidate_id: id, date: r.date || "",
      action: r.action || "", text: r.text || "", outcome: r.outcome || "", ...src(r.source) }));
    arr(d.endorsements).forEach((e, i) => t.endorsements.push({ _where: `${file} endorsements[${i}]`, candidate_id: id,
      endorser: e.endorser || "", endorser_type: e.type || "", date: e.date || "", ...src(e.source) }));
    arr(d.ratings).forEach((r, i) => t.ratings.push({ _where: `${file} ratings[${i}]`, candidate_id: id,
      rater: r.rater || "", rating: r.rating || "", date: r.date || "", ...src(r.source) }));
  }
  return t;
}

/* ---------- Normalizers (Sheets can turn "00101" into 101 or dates into 6/10/2025) ---------- */
const lines = (v) => v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const list = (v) => v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const zip5 = (v) => (/^\d{1,5}$/.test(v) ? v.padStart(5, "0") : v);
function isoDate(v) {
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : v;
}
const isUrl = (v) => /^https?:\/\/\S+$/i.test(v);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/* ---------- Build + validate ---------- */
function build(t) {
  const errors = [], warnings = [];
  // Candidate rows say which file/field they came from; CSV rows give the row number (+2 = header + 1-based).
  const err = (tab, i, msg) => errors.push(`${t[tab][i]?._where ?? `${tab} row ${i + 2}`}: ${msg}`);
  errors.push(...t.fileErrors);

  const meta = Object.fromEntries(t.meta.map((r) => [r.key, r.value]));
  meta.isSampleData = String(meta.isSampleData).toLowerCase() === "true";
  for (const k of ["jurisdiction", "electionDate", "lastUpdated"]) if (!meta[k]) errors.push(`meta: missing "${k}"`);
  meta.electionDate = isoDate(meta.electionDate || "");
  meta.lastUpdated = isoDate(meta.lastUpdated || "");

  const zipIndex = {};
  t.districts.forEach((r, i) => {
    const z = zip5(r.zip);
    if (!/^\d{5}$/.test(z)) return err("districts", i, `zip "${r.zip}" is not 5 digits`);
    if (!r.district_id) return err("districts", i, "missing district_id");
    (zipIndex[z] ||= []).push(r.district_id);
  });

  const races = new Map();
  t.races.forEach((r, i) => {
    if (!r.race_id || !r.office || !r.district_id) return err("races", i, "needs race_id, office and district_id");
    if (races.has(r.race_id)) return err("races", i, `duplicate race_id "${r.race_id}"`);
    const kind = (r.kind || "office").toLowerCase();
    if (!["office", "judicial"].includes(kind)) return err("races", i, `kind must be "office" or "judicial", not "${r.kind}"`);
    const seats = Number(r.seats || 1);
    if (!Number.isInteger(seats) || seats < 1) return err("races", i, `seats must be a whole number, not "${r.seats}"`);
    races.set(r.race_id, { id: r.race_id, kind, office: r.office, category: r.category, district: r.district,
      // A race can span several areas: "town:hempstead|town:long-beach" matches either.
      districtIds: r.district_id.split("|").map((k) => k.trim()).filter(Boolean), seats, candidates: [], issues: [] });
  });

  const candidates = new Map();
  t.candidates.forEach((r, i) => {
    const race = races.get(r.race_id);
    if (!race) return err("candidates", i, `unknown race_id "${r.race_id}"`);
    if (!r.candidate_id || !r.name) return err("candidates", i, "needs candidate_id and name");
    if (candidates.has(r.candidate_id)) return err("candidates", i, `duplicate candidate_id "${r.candidate_id}"`);
    const c = { id: r.candidate_id, name: r.name, party: r.party, occupation: r.occupation };
    if (r.running_mate) c.runningMate = r.running_mate;
    if (r.record_office) c.record = { office: r.record_office, years: r.record_years, actions: [] };
    candidates.set(c.id, { c, raceId: race.id });
    race.candidates.push(c);
  });

  // race_id "all" = a shared voter concern asked of every candidate in every non-judicial race.
  const issues = new Map(), shared = [];
  t.issues.forEach((r, i) => {
    const isShared = r.race_id.toLowerCase() === "all";
    const race = races.get(r.race_id);
    if (!race && !isShared) return err("issues", i, `unknown race_id "${r.race_id}" (use "all" for a shared issue)`);
    if (!r.issue_id || !r.name) return err("issues", i, "needs issue_id and name");
    if (issues.has(r.issue_id)) return err("issues", i, `duplicate issue_id "${r.issue_id}" (issue ids must be unique across races)`);
    const issue = { id: r.issue_id, name: r.name, tags: list(r.tags), description: r.description, stances: {} };
    issues.set(issue.id, { issue, raceId: isShared ? "all" : race.id });
    if (isShared) shared.push(issue); else race.issues.push(issue);
  });

  t.stances.forEach((r, i) => {
    const iss = issues.get(r.issue_id), cand = candidates.get(r.candidate_id);
    if (!iss) return err("stances", i, `unknown issue_id "${r.issue_id}"`);
    if (!cand) return err("stances", i, `unknown candidate_id "${r.candidate_id}"`);
    if (iss.raceId === "all" ? races.get(cand.raceId).kind === "judicial" : iss.raceId !== cand.raceId)
      return err("stances", i, iss.raceId === "all" ? `${r.candidate_id} is in a judicial race; shared issues don't apply` : `${r.candidate_id} is not running in ${iss.raceId}`);
    const positions = [
      ...lines(r.supports).map((text) => ({ stance: "supports", text })),
      ...lines(r.opposes).map((text) => ({ stance: "opposes", text }))
    ];
    const missing = [!positions.length && "supports/opposes", !r.quote && "quote", !r.source && "source",
      !isUrl(r.source_url) && "source_url (http/https)", !r.real_world_impact && "real_world_impact"].filter(Boolean);
    if (missing.length) return err("stances", i, `${r.issue_id}/${r.candidate_id} missing ${missing.join(", ")}`);
    if (iss.issue.stances[cand.c.id]) return err("stances", i, `duplicate stance ${r.issue_id}/${r.candidate_id}`);
    iss.issue.stances[cand.c.id] = { positions, quote: r.quote, source: r.source, sourceUrl: r.source_url, realWorldImpact: r.real_world_impact };
  });

  t.record.forEach((r, i) => {
    const cand = candidates.get(r.candidate_id);
    if (!cand) return err("record", i, `unknown candidate_id "${r.candidate_id}"`);
    if (!cand.c.record) return err("record", i, `${r.candidate_id} has no record_office in the candidates tab`);
    const date = isoDate(r.date);
    const missing = [!isDate(date) && "date (YYYY-MM-DD)", !r.action && "action", !r.text && "text",
      !r.source && "source", !isUrl(r.source_url) && "source_url (http/https)"].filter(Boolean);
    if (missing.length) return err("record", i, `${r.candidate_id} missing ${missing.join(", ")}`);
    cand.c.record.actions.push({ date, action: r.action, outcome: r.outcome, text: r.text, source: r.source, sourceUrl: r.source_url });
  });

  // Endorsements: listed for every candidate the same way; no endorser is singled out.
  t.endorsements.forEach((r, i) => {
    const cand = candidates.get(r.candidate_id);
    if (!cand) return err("endorsements", i, `unknown candidate_id "${r.candidate_id}"`);
    const date = isoDate(r.date || "");
    const missing = [!r.endorser && "endorser", (date && !isDate(date)) && "date (YYYY-MM-DD)", !r.source && "source",
      !isUrl(r.source_url) && "source_url (http/https)"].filter(Boolean);
    if (missing.length) return err("endorsements", i, `${r.candidate_id} missing ${missing.join(", ")}`);
    (cand.c.endorsements ||= []).push({ endorser: r.endorser, type: r.endorser_type, date, source: r.source, sourceUrl: r.source_url });
  });

  // Qualification ratings, mainly for judicial candidates (e.g. bar association panels).
  t.ratings.forEach((r, i) => {
    const cand = candidates.get(r.candidate_id);
    if (!cand) return err("ratings", i, `unknown candidate_id "${r.candidate_id}"`);
    const date = isoDate(r.date || "");
    const missing = [!r.rater && "rater", !r.rating && "rating", !isDate(date) && "date (YYYY-MM-DD)", !r.source && "source",
      !isUrl(r.source_url) && "source_url (http/https)"].filter(Boolean);
    if (missing.length) return err("ratings", i, `${r.candidate_id} missing ${missing.join(", ")}`);
    (cand.c.ratings ||= []).push({ rater: r.rater, rating: r.rating, date, source: r.source, sourceUrl: r.source_url });
  });

  // District keys the page's address lookup produces (see index.html section 8).
  const KEY = /^(state:ny|city:nyc|(cd|sd|ad|council|jd|nassau-leg):\d+|(county|borough|town|place|school):[a-z0-9-]+|civil:[a-z-]+-\d+)$/;
  const demoDistricts = new Set(Object.values(zipIndex).flat());
  for (const race of races.values())
    for (const key of race.districtIds) if (!KEY.test(key) && !demoDistricts.has(key))
      warnings.push(`race ${race.id}: district_id "${key}" isn't a lookup key (e.g. cd:4, sd:6, ad:19, council:4, county:nassau), so no address will match it`);

  for (const race of races.values()) {
    // Missing stances on race-specific issues are worth a warning; on shared concerns they're expected.
    const local = race.issues.slice();
    if (race.kind !== "judicial") race.issues.unshift(...shared.map((issue) => ({ ...issue, shared: true,
      stances: Object.fromEntries(race.candidates.filter((c) => issue.stances[c.id]).map((c) => [c.id, issue.stances[c.id]])) })));
    if (race.candidates.length < 1) warnings.push(`race ${race.id} has no candidates`);
    if (!race.issues.length && race.kind !== "judicial") warnings.push(`race ${race.id} has no issues`);
    for (const issue of local) for (const c of race.candidates)
      if (!issue.stances[c.id]) warnings.push(`no stance for ${c.name} on "${issue.name}" (page will say "No verified, sourced position")`);
  }
  for (const { c } of candidates.values())
    if (c.record && !c.record.actions.length) warnings.push(`${c.name} has record_office but no record rows`);

  return { db: { meta, zipIndex, races: [...races.values()] }, errors, warnings };
}

/* ---------- Main ---------- */
const args = process.argv.slice(2);
const sheetId = args.includes("--sheet") ? args[args.indexOf("--sheet") + 1] : process.env.SHEET_ID;
const tabs = await loadTabs(sheetId, args.includes("--save-csv"));
const { db, errors, warnings } = build(tabs);

warnings.forEach((w) => console.warn("warning:", w));
if (errors.length) {
  errors.forEach((e) => console.error("error:", e));
  console.error(`\n${errors.length} error(s). data/election.json was NOT updated.`);
  process.exit(1);
}
fs.writeFileSync(OUT, JSON.stringify(db, null, 2) + "\n");
const n = (k) => db.races.reduce((a, r) => a + r[k].length, 0);
const uniqueIssues = new Set(db.races.flatMap((r) => r.issues.map((i) => i.id))).size;
console.log(`Wrote data/election.json: ${db.races.length} races, ${n("candidates")} candidates, ${uniqueIssues} issues (source: ${sheetId ? "Google Sheet" : "data/sheets/*.csv"}).`);
