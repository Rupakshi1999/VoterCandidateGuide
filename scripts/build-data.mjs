#!/usr/bin/env node
/*
  Builds data/election.json from seven spreadsheet tabs:
    meta, districts, races, candidates, issues, stances, record

  Sources (pick one):
    node scripts/build-data.mjs                     reads data/sheets/*.csv
    node scripts/build-data.mjs --sheet <SHEET_ID>  reads a Google Sheet shared as
                                                    "Anyone with the link: Viewer"
    Add --save-csv with --sheet to also refresh data/sheets/*.csv, so every data
    change shows up as a reviewable git diff.

  The build fails (exit 1) on any rule violation, so ungrounded data never ships:
  every stance needs a position, quote, source, http(s) source_url and impact;
  every record action needs a date, action, text, source and source_url.
  No dependencies; Node 18+.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV_DIR = path.join(ROOT, "data", "sheets");
const OUT = path.join(ROOT, "data", "election.json");
const TABS = ["meta", "districts", "races", "candidates", "issues", "stances", "record"];

/* ---------- CSV ---------- */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header = [], ...body] = rows.filter((r) => r.some((v) => v.trim()));
  const keys = header.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

async function loadTabs(sheetId, saveCsv) {
  const tabs = {};
  for (const tab of TABS) {
    let text;
    if (sheetId) {
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not read tab "${tab}" (HTTP ${res.status}). Is the sheet shared as "Anyone with the link"?`);
      text = await res.text();
      if (saveCsv) fs.writeFileSync(path.join(CSV_DIR, `${tab}.csv`), text.endsWith("\n") ? text : text + "\n");
    } else {
      text = fs.readFileSync(path.join(CSV_DIR, `${tab}.csv`), "utf8");
    }
    tabs[tab] = parseCsv(text);
  }
  return tabs;
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
  const err = (tab, i, msg) => errors.push(`${tab} row ${i + 2}: ${msg}`); // +2 = header + 1-based

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
    races.set(r.race_id, { id: r.race_id, office: r.office, category: r.category, district: r.district,
      districtId: r.district_id, candidates: [], issues: [] });
  });

  const candidates = new Map();
  t.candidates.forEach((r, i) => {
    const race = races.get(r.race_id);
    if (!race) return err("candidates", i, `unknown race_id "${r.race_id}"`);
    if (!r.candidate_id || !r.name) return err("candidates", i, "needs candidate_id and name");
    if (candidates.has(r.candidate_id)) return err("candidates", i, `duplicate candidate_id "${r.candidate_id}"`);
    const c = { id: r.candidate_id, name: r.name, party: r.party, occupation: r.occupation };
    if (r.record_office) c.record = { office: r.record_office, years: r.record_years, actions: [] };
    candidates.set(c.id, { c, raceId: race.id });
    race.candidates.push(c);
  });

  const issues = new Map();
  t.issues.forEach((r, i) => {
    const race = races.get(r.race_id);
    if (!race) return err("issues", i, `unknown race_id "${r.race_id}"`);
    if (!r.issue_id || !r.name) return err("issues", i, "needs issue_id and name");
    if (issues.has(r.issue_id)) return err("issues", i, `duplicate issue_id "${r.issue_id}" (issue ids must be unique across races)`);
    const issue = { id: r.issue_id, name: r.name, tags: list(r.tags), description: r.description, stances: {} };
    issues.set(issue.id, { issue, raceId: race.id });
    race.issues.push(issue);
  });

  t.stances.forEach((r, i) => {
    const iss = issues.get(r.issue_id), cand = candidates.get(r.candidate_id);
    if (!iss) return err("stances", i, `unknown issue_id "${r.issue_id}"`);
    if (!cand) return err("stances", i, `unknown candidate_id "${r.candidate_id}"`);
    if (iss.raceId !== cand.raceId) return err("stances", i, `${r.candidate_id} is not running in ${iss.raceId}`);
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

  for (const race of races.values()) {
    if (race.candidates.length < 1) warnings.push(`race ${race.id} has no candidates`);
    for (const issue of race.issues) for (const c of race.candidates)
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
console.log(`Wrote data/election.json: ${db.races.length} races, ${n("candidates")} candidates, ${n("issues")} issues (source: ${sheetId ? "Google Sheet" : "data/sheets/*.csv"}).`);
