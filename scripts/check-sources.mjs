#!/usr/bin/env node
/*
  Checks every stance quote and record entry in data/sheets/ against its live source page:
    - a stance's quote must appear word for word on its source_url
    - record, endorsement and rating source pages must load and mention the candidate's last name

    node scripts/check-sources.mjs                  check everything
    node scripts/check-sources.mjs --candidate c1   check one candidate (comma-separate several)

  PDFs, videos and pages that block automated requests are listed as "check by hand":
  open them and confirm the quote yourself. Exits 1 if any quote fails, so a bad row
  never reaches the build. Free, no dependencies, Node 18+.
*/
import { readTab } from "./common/sheets.mjs";
import { verifyQuote, verifyMention } from "./common/verify.mjs";

const args = process.argv.slice(2);
const only = args.includes("--candidate") ? args[args.indexOf("--candidate") + 1].split(",") : null;

const names = Object.fromEntries(readTab("candidates").rows.map((c) => [c.candidate_id, c.name]));
const meta = Object.fromEntries(readTab("meta").rows.map((r) => [r.key, r.value]));
const keep = (r) => !only || only.includes(r.candidate_id);
const stances = readTab("stances").rows.filter(keep);
const mentions = ["record", "endorsements", "ratings"].flatMap((tab) =>
  readTab(tab).rows.filter(keep).map((r) => ({ tab, r })));

const failed = [], manual = [];
let passed = 0;

for (const s of stances) {
  const label = `stances: ${s.issue_id}/${s.candidate_id} (${names[s.candidate_id] ?? "unknown"})`;
  const res = await verifyQuote(s.source_url, s.quote);
  if (res.ok) passed++;
  else (/can't be checked|PDF|HTTP 403|HTTP 429/.test(res.reason) ? manual : failed).push(`${label}: ${res.reason}\n    ${s.source_url}`);
}
for (const { tab, r } of mentions) {
  const what = tab === "record" ? `${r.date} ${r.action}` : tab === "ratings" ? `${r.rater}: ${r.rating}` : r.endorser;
  const label = `${tab}: ${r.candidate_id} ${what} (${names[r.candidate_id] ?? "unknown"})`;
  const res = await verifyMention(r.source_url, names[r.candidate_id] ?? "");
  if (res.ok) passed++;
  else (/can't be checked|PDF|HTTP 403|HTTP 429/.test(res.reason) ? manual : failed).push(`${label}: ${res.reason}\n    ${r.source_url}`);
}

console.log(`${passed} verified, ${manual.length} to check by hand, ${failed.length} failed.`);
if (manual.length) console.log(`\nCheck by hand (open the link and confirm):\n- ${manual.join("\n- ")}`);
if (failed.length) console.log(`\nFailed (fix or remove these rows):\n- ${failed.join("\n- ")}`);
if (String(meta.isSampleData).toLowerCase() === "true" && failed.length)
  console.log("\nNote: isSampleData is true. The sample rows use made-up example.org links, so they are expected to fail.");
process.exit(failed.length ? 1 : 0);
