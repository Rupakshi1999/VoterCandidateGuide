#!/usr/bin/env node
/*
  Checks every candidate file in data/candidates/ against its live source pages:
    - a position's quote must appear word for word on its source url
    - record, endorsement and rating source pages must load and mention the candidate's last name

    node scripts/check-sources.mjs                         check every candidate
    node scripts/check-sources.mjs --candidate jane-doe    check one (comma-separate several)

  PDFs, videos and pages that block automated requests are listed as "check by hand":
  open them and confirm the quote yourself. Exits 1 if anything fails, so a bad entry
  never reaches the build. Free, no dependencies, Node 18+.
*/
import { readTab, readCandidates } from "./common/sheets.mjs";
import { verifyQuote, verifyMention } from "./common/verify.mjs";

const args = process.argv.slice(2);
const only = args.includes("--candidate") ? args[args.indexOf("--candidate") + 1].split(",") : null;
const meta = Object.fromEntries(readTab("meta").rows.map((r) => [r.key, r.value]));
const MANUAL = /can't be checked|PDF|HTTP 403|HTTP 429/;

const failed = [], manual = [];
let passed = 0;
const report = (label, url, res) => {
  if (res.ok) passed++;
  else (MANUAL.test(res.reason) ? manual : failed).push(`${label}: ${res.reason}\n    ${url}`);
};

for (const { id, file, data, error } of readCandidates()) {
  if (only && !only.includes(id)) continue;
  if (error) { failed.push(`${file}: ${error}`); continue; }
  for (const [i, p] of (data.positions || []).entries())
    report(`${file} positions[${i}] (${p.issue})`, p.source?.url, await verifyQuote(p.source?.url, p.quote || ""));
  for (const field of ["record", "endorsements", "ratings"])
    for (const [i, x] of (data[field] || []).entries())
      report(`${file} ${field}[${i}]`, x.source?.url, await verifyMention(x.source?.url, data.name));
}

console.log(`${passed} verified, ${manual.length} to check by hand, ${failed.length} failed.`);
if (manual.length) console.log(`\nCheck by hand (open the link and confirm):\n- ${manual.join("\n- ")}`);
if (failed.length) console.log(`\nFailed (fix or remove these entries):\n- ${failed.join("\n- ")}`);
if (String(meta.isSampleData).toLowerCase() === "true" && failed.length)
  console.log("\nNote: isSampleData is true. The sample entries use made-up example.org links, so they are expected to fail.");
process.exit(failed.length ? 1 : 0);
