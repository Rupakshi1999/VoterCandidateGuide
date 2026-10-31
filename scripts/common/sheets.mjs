/*
  Shared data reading. No dependencies.
  - data/sheets/*.csv: shared tables (meta, districts, races, issues), editable as a Google Sheet.
  - data/candidates/<person-id>.json: everything about one candidate, in one file.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CSV_DIR = path.join(ROOT, "data", "sheets");
export const CANDIDATE_DIR = path.join(ROOT, "data", "candidates");
export const TABS = ["meta", "districts", "races", "issues"];
// Tabs a sheet or folder may leave out. Value = a column that proves it's the right tab.
export const OPTIONAL_TABS = { districts: "zip" };

/* Parses CSV text into objects keyed by the (lowercased) header row. Handles quoted commas and newlines. */
export function parseCsv(text) {
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

export function readTab(tab) {
  const file = path.join(CSV_DIR, `${tab}.csv`);
  if (tab in OPTIONAL_TABS && !fs.existsSync(file)) return { header: [], rows: [] };
  const text = fs.readFileSync(file, "utf8");
  // Header names are plain words (no quotes or commas), so a simple split is enough.
  const header = text.split(/\r?\n/)[0].split(",").map((h) => h.trim().toLowerCase());
  return { header, rows: parseCsv(text) };
}

/* Reads data/candidates/*.json. The file name (without .json) is the candidate's id. */
export function readCandidates() {
  if (!fs.existsSync(CANDIDATE_DIR)) return [];
  return fs.readdirSync(CANDIDATE_DIR).filter((f) => f.endsWith(".json")).sort().map((f) => {
    const file = `data/candidates/${f}`;
    try {
      return { id: f.slice(0, -5), file, data: JSON.parse(fs.readFileSync(path.join(CANDIDATE_DIR, f), "utf8")) };
    } catch (err) {
      return { id: f.slice(0, -5), file, error: `not valid JSON (${err.message})` };
    }
  });
}
