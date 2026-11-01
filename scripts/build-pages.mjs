#!/usr/bin/env node
/*
  Writes plain static HTML pages from data/election.json, so search engines can index
  each candidate and race on its own URL (index.html renders with JavaScript, which
  crawlers mostly skip):
    /candidates/<candidate-id>/index.html   one page per candidate
    /races/<race-id>/index.html             one page per race, candidates side by side
    /races/index.html                       a directory of every race and candidate
    /sitemap.xml                            every URL above, plus / and /privacy.html

  build-data.mjs runs this after writing election.json; run it alone with
    node scripts/build-pages.mjs
  /candidates/ and /races/ are generated: they are deleted and rewritten on every run,
  so withdrawn candidates and removed races disappear. Never edit them by hand.

  Same rules as index.html: the disclosure banner tops every page, a stance shows only
  with its quote and source, a record entry only with its source, and every candidate
  is styled the same way. Ad units come from index.html (AD_CLIENT, AD_SLOTS, fillAds),
  so they're configured in one place. No dependencies; Node 18+.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, readCandidates } from "./common/sheets.mjs";

const SITE = "https://compareyourballot.org";
const SITE_NAME = "Compare Your Ballot";

/* ---------- Helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lastName = (n) => n.split(" ").slice(-1)[0];
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : null);
const lower1 = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (d) => { const [y, m, day] = d.split("-").map(Number); return `${MONTHS[m - 1]} ${day}, ${y}`; };
const shortDate = (d) => { const [y, m, day] = d.split("-").map(Number); return `${MONTHS[m - 1].slice(0, 3)} ${day}, ${y}`; };
const raceName = (r) => `${r.office}: ${r.district}`;
const candUrl = (c) => `/candidates/${c.id}/`;
const raceUrl = (r) => `/races/${r.id}/`;

const STANCES = { supports: { label: "Supports", mark: "✓" }, opposes: { label: "Opposes", mark: "✕" } };
/* A stance is only shown when it is fully tied to evidence (same check as index.html). */
const isGrounded = (s) => s && Array.isArray(s.positions) && s.positions.length &&
  s.positions.every((p) => STANCES[p.stance] && p.text) && s.quote && s.source && safeUrl(s.sourceUrl) && s.realWorldImpact;
const recordActions = (c) => (c.record?.actions || []).filter((a) => a.date && a.action && a.text && a.source && safeUrl(a.sourceUrl))
  .sort((a, b) => b.date.localeCompare(a.date));
const sourced = (list) => (list || []).filter((x) => x.source && safeUrl(x.sourceUrl));
const srcLink = (x) => `<a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener nofollow">${esc(x.source)}</a>`;

/* Ad code is copied from index.html (section 2), so both places use the same units. */
function adScript() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const m = html.match(/const AD_CLIENT = [\s\S]*?\nfunction fillAds\(\) \{[\s\S]*?\n\}\n/);
  if (!m) throw new Error("Couldn't find AD_CLIENT … fillAds() in index.html section 2; update build-pages.mjs adScript().");
  return m[0];
}
const adSlot = (name, label) => `<!-- ================= ADSENSE SLOT: ${label} (START) ================= -->
<div class="ad" data-ad="${name}" aria-hidden="true"><span class="ad-label">Advertisement</span></div>
<!-- ================= ADSENSE SLOT: ${label} (END) ================= -->`;

/* ---------- Styles: the "Ballot paper" tokens from index.html, and only the rules these pages use ---------- */
const CSS = `
  :root {
    --bg: #fffbeb; --surface: #ffffff; --surface-2: #fef7dc;
    --ink: #1c1917; --ink-2: #44403c; --muted: #6b635c;
    --line: #e7e0d0; --line-2: #cfc6b4;
    --focus: #1c1917;
    --notice-bg: #1c1917; --notice-ink: #fffbeb;
    --accent: #facc15; --accent-soft: #fde68a; --on-accent: #1c1917;
    --serif: Georgia, "Iowan Old Style", "Times New Roman", serif;
    --radius: 4px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1714; --surface: #24201c; --surface-2: #2e2924;
      --ink: #faf7f0; --ink-2: #e7e0d0; --muted: #b5ac9f;
      --line: #3a342d; --line-2: #514a41;
      --focus: #facc15;
      --notice-bg: #0e0c0a; --notice-ink: #faf7f0;
      --accent-soft: rgba(250, 204, 21, .32);
    }
  }
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
  h1, h2, h3 { font-family: var(--serif); font-weight: 600; }
  /* Mandatory disclosure: first thing on the page, never dismissible */
  .notice { background: var(--notice-bg); color: var(--notice-ink); font-size: 13px; line-height: 1.4; }
  .notice details { max-width: 1200px; margin: 0 auto; padding: 8px 16px; }
  .notice summary { cursor: pointer; list-style: none; display: flex; gap: 8px; align-items: flex-start; }
  .notice summary::-webkit-details-marker { display: none; }
  .notice .more { margin-left: auto; text-decoration: underline; white-space: nowrap; opacity: .85; }
  .notice details[open] .more::after { content: " less"; }
  .notice details:not([open]) .more::after { content: " more"; }
  .notice p { margin: 6px 0 2px 24px; opacity: .9; }
  @media (max-width: 599px) { .notice .wide-only { display: none; } .notice details { padding: 6px 16px; } }
  .site-header { background: var(--accent); color: var(--on-accent); padding: 14px 0; margin-bottom: 16px; }
  .site-header a { font: 600 22px/1.2 var(--serif); text-decoration: none; }
  .crumbs { font-size: 13px; color: var(--muted); margin: 0 0 8px; }
  .crumbs a { color: var(--ink-2); }
  h1 { font-size: clamp(24px, 4vw, 32px); line-height: 1.2; margin: 0 0 6px; }
  .sub { color: var(--ink-2); margin: 0 0 16px; }
  .eyebrow { font-size: 13px; font-weight: 600; color: var(--muted); }
  .race { background: var(--surface); border: 1.5px solid var(--ink); border-radius: var(--radius); margin-bottom: 24px; overflow: hidden; }
  .race-head { padding: 16px; border-bottom: 1px solid var(--line); }
  .race-head h2 { margin: 2px 0 10px; font-size: 21px; line-height: 1.25; }
  .roster { display: flex; flex-wrap: wrap; gap: 8px; }
  .person { border-left: 4px solid var(--accent); background: var(--bg); padding: 8px 12px; font-size: 13px; }
  .person strong { display: block; font-size: 14px; }
  .person span { display: block; color: var(--muted); }
  .person .mate { color: var(--ink-2); }
  .person.self { outline: 1.5px solid var(--ink); }
  .records { display: grid; gap: 8px; margin-top: 12px; }
  .judicial-note { margin: 12px 0 0; font-size: 13px; color: var(--ink-2); }
  .record { background: var(--bg); border: 1px solid var(--line-2); border-radius: var(--radius); }
  .record summary { padding: 10px 12px; cursor: pointer; font-weight: 600; font-size: 14px; }
  .record summary span { display: block; font-weight: 400; font-size: 12px; color: var(--muted); }
  .record ul { list-style: none; margin: 0; padding: 0 12px 12px; display: grid; gap: 10px; }
  .record li { border-top: 1px solid var(--line); padding-top: 10px; font-size: 14px; display: grid; gap: 2px; }
  .record .when { font-size: 12px; color: var(--muted); }
  .backing-grid { display: grid; gap: 12px; padding: 0 12px 12px; grid-template-columns: 1fr; }
  @media (min-width: 700px) { .backing-grid { grid-template-columns: repeat(var(--n), minmax(0, 1fr)); } }
  .backing-col { border-top: 1px solid var(--line); padding-top: 10px; font-size: 14px; }
  .backing-h { margin: 8px 0 4px; font-size: 13px; font-weight: 600; color: var(--muted); }
  .backing ul { padding: 0; gap: 8px; }
  .backing li { border: 0; padding: 0; }
  .backing .kind { font-size: 11px; color: var(--muted); }
  .issue { padding: 0 16px 16px; border-bottom: 1px dashed var(--line-2); }
  .issue:last-of-type { border-bottom: 0; }
  .issue .eyebrow { display: block; margin-top: 16px; }
  .issue h3 { display: inline-block; margin: 16px 0 2px -4px; padding: 0 4px; font-size: 18px;
    background-image: linear-gradient(transparent 55%, var(--accent-soft) 55%); }
  .issue .eyebrow + h3 { margin-top: 2px; }
  .issue .on-record { display: block; font-size: 12px; color: var(--muted); }
  .issue .desc { margin: 4px 0 12px; color: var(--ink-2); font-size: 14px; }
  .grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
  @media (min-width: 700px) { .grid { grid-template-columns: repeat(var(--n), minmax(0, 1fr)); } }
  .cell { border: 1px solid var(--line); border-radius: var(--radius); padding: 12px; background: var(--surface); display: flex; flex-direction: column; gap: 8px; }
  .cell-top strong { font-size: 14px; }
  /* Supports / opposes: same ink for both, told apart by word and symbol, never by color */
  .positions { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .positions li { display: grid; grid-template-columns: 18px 1fr; gap: 6px; font-size: 14px; }
  .positions .mark { font-weight: 700; color: var(--ink-2); text-align: center; }
  blockquote { margin: 0; padding: 0 0 0 10px; border-left: 3px solid var(--accent); font: italic 15px/1.55 var(--serif); color: var(--ink-2); }
  .src { font-size: 12px; color: var(--muted); }
  .src a { color: var(--ink-2); }
  .impact { margin: 0; font-size: 13px; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius); padding: 8px 10px; }
  .impact b { display: block; color: var(--ink-2); }
  .missing { color: var(--muted); font-size: 13px; font-style: italic; }
  .not-on-record, .report { margin: 0; padding: 12px 16px; border-top: 1px dashed var(--line); font-size: 13px; color: var(--muted); }
  .report a { color: var(--ink-2); }
  .others { list-style: none; margin: 0 0 24px; padding: 0; display: grid; gap: 8px; }
  .dir h2 { font-size: 22px; margin: 24px 0 8px; }
  .dir ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .dir li { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; }
  .dir li > a { font-weight: 600; }
  .dir .names { display: block; font-size: 13px; color: var(--ink-2); margin-top: 2px; }
  .ad { display: none; }
  .ad[data-filled] { display: block; margin: 20px 0; min-height: 100px; padding: 4px 0; text-align: center;
    border: 1px dashed var(--line-2); border-radius: var(--radius); color: var(--muted); }
  .ad[data-filled]:has(ins[data-ad-status="unfilled"]) { display: none; }
  .ad-label { display: block; font-size: 11px; }
  footer { padding: 24px 0 40px; color: var(--muted); font-size: 13px; }
  footer p { margin: 0 0 6px; }
  footer a { color: var(--ink-2); }
`.replace(/\n\s+/g, "\n").trim();

const ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23facc15'/%3E%3Cpath d='M9 16.5l4.5 4.5L23 11' fill='none' stroke='%231c1917' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E`;

function page({ url, title, description, body, jsonLd, ads }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Generated by scripts/build-pages.mjs from data/election.json. Don't edit by hand. -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#1c1917">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${url}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${ICON}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>\n` : ""}<!-- ================= ADSENSE: site script (START) ================= -->
<meta name="google-adsense-account" content="${ads.client}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>
<!-- ================= ADSENSE: site script (END) ================= -->
<style>
${CSS}
</style>
</head>
<body>

<!-- ================= MANDATORY DISCLOSURE (permanent, cannot be dismissed) ================= -->
<div class="notice" role="note" aria-label="Data disclosure">
  <details>
    <summary>
      <span aria-hidden="true">⚠</span>
      <span><strong>Verify before you vote.</strong> Data is aggregated from public records<span class="wide-only"> and may be incomplete or outdated</span>.</span>
      <span class="more" aria-hidden="true"></span>
    </summary>
    <p>This guide is non-partisan and compiled from debate transcripts, campaign platforms, and voting records. Every stance links to its primary source. Positions change over time. Confirm all information with official campaign materials and your local election office before casting your ballot.</p>
  </details>
</div>

<header class="site-header"><div class="wrap"><a href="/">${SITE_NAME}</a></div></header>

<main class="wrap">
${body}
${adSlot("footer", "footer-banner")}
</main>

<footer>
  <div class="wrap">
    <p>Non-partisan. Candidates are listed in alphabetical order by last name. No candidate, party or campaign funds this guide.</p>
    <p><a href="/">Compare your whole ballot</a> · <a href="/races/">All races and candidates</a> · <a href="/privacy.html">Privacy policy</a></p>
  </div>
</footer>
<script>
${ads.script}fillAds();
</script>
</body>
</html>
`;
}

/* ---------- Shared pieces ---------- */
function personCard(c, race, self) {
  const judicial = race.kind === "judicial";
  const name = self ? esc(c.name) : `<a href="${candUrl(c)}">${esc(c.name)}</a>`;
  return `<div class="person${self ? " self" : ""}"><strong>${name}</strong>${c.runningMate ? `<span class="mate">with ${esc(c.runningMate)} for Lt. Governor</span>` : ""}${
    [c.party, c.occupation].filter(Boolean).length ? `<span>${[c.party, c.occupation].filter(Boolean).map(esc).join(" · ")}</span>` : ""}${
    recordActions(c).length ? `<span><em>${judicial ? "Has served as a judge" : "Has held office"}</em></span>` : ""}</div>`;
}

function renderRecord(c, judicial, open) {
  const acts = recordActions(c);
  return `<details class="record"${open ? " open" : ""}>
  <summary>${esc(c.name)}'s record ${judicial ? "on the bench" : "in office"} <span>${esc(c.record.office)}${c.record.years ? `, ${esc(c.record.years)}` : ""} · ${plural(acts.length, "action")}</span></summary>
  <ul>${acts.map((a) => `<li>
    <div class="when">${shortDate(a.date)}${a.outcome ? ` · ${esc(a.outcome)}` : ""}</div>
    <div><b>${esc(a.action)}</b> ${esc(lower1(a.text))}</div>
    <div class="src">Source: ${srcLink(a)}</div>
  </li>`).join("")}</ul>
</details>`;
}

/* Ratings and endorsements, one column per candidate, the same way for every candidate. */
function renderBacking(cands, judicial, open) {
  if (!cands.some((c) => sourced(c.endorsements).length || sourced(c.ratings).length)) return "";
  const col = (c) => {
    const ratings = sourced(c.ratings), ends = sourced(c.endorsements);
    return `<div class="backing-col"><strong>${esc(c.name)}</strong>
    ${judicial ? `<div class="backing-h">Qualification ratings</div>${ratings.length
      ? `<ul>${ratings.map((r) => `<li><b>${esc(r.rating)}</b> from ${esc(r.rater)}<div class="src">Source: ${srcLink(r)}</div></li>`).join("")}</ul>`
      : `<p class="missing">None on record.</p>`}` : ""}
    <div class="backing-h">Endorsements</div>${ends.length
      ? `<ul>${ends.map((e) => `<li>${esc(e.endorser)}${e.type ? ` <span class="kind">${esc(e.type)}</span>` : ""}<div class="src">Source: ${srcLink(e)}</div></li>`).join("")}</ul>`
      : `<p class="missing">None on record.</p>`}
  </div>`;
  };
  return `<details class="record backing"${open ? " open" : ""}>
  <summary>${judicial ? "Ratings &amp; endorsements" : "Endorsements"} <span>Listed the same way for every candidate. No endorser is featured over another.</span></summary>
  <div class="backing-grid" style="--n:${cands.length}">${cands.map(col).join("")}</div>
</details>`;
}

function renderStance(c, s, showName) {
  if (!isGrounded(s)) return `<div class="cell">${showName ? `<div class="cell-top"><strong><a href="${candUrl(c)}">${esc(c.name)}</a></strong></div>` : ""}
    <p class="missing">No verified, sourced position on record.</p></div>`;
  return `<div class="cell">
    ${showName ? `<div class="cell-top"><strong><a href="${candUrl(c)}">${esc(c.name)}</a></strong></div>` : ""}
    <ul class="positions" aria-label="${esc(c.name)}'s positions">${s.positions.map((p) =>
      `<li><span class="mark" aria-hidden="true">${STANCES[p.stance].mark}</span><span><b>${STANCES[p.stance].label}</b> ${esc(lower1(p.text))}</span></li>`).join("")}</ul>
    <blockquote>“${esc(s.quote)}”</blockquote>
    <div class="src">Source: ${srcLink(s)}</div>
    <p class="impact"><b>What this means for you</b>${esc(s.realWorldImpact)}</p>
  </div>`;
}

function correctionUrl(race) {
  return `https://github.com/Rupakshi1999/VoterCandidateGuide/issues/new?${new URLSearchParams({ title: `Correction: ${race.office}, ${race.district}`,
    body: "What's wrong, and a link to the primary source that shows the correct information:\n\n" })}`;
}
const judicialNote = `<p class="judicial-note">Judges generally can't promise how they would rule, so this race focuses on each candidate's record and how they say they decide cases.</p>`;

/* ---------- Race page ---------- */
function racePage(race, meta, ads) {
  const judicial = race.kind === "judicial";
  const cands = race.candidates;
  const answered = race.issues.filter((i) => cands.some((c) => isGrounded(i.stances[c.id])));
  const unanswered = race.issues.filter((i) => !answered.includes(i));
  const records = cands.filter((c) => recordActions(c).length).map((c) => renderRecord(c, judicial, false)).join("") + renderBacking(cands, judicial, false);
  const names = cands.map((c) => c.name);
  const nameList = names.length > 2 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names.join(" and ");

  const issues = answered.map((issue, i) => `<section class="issue" aria-labelledby="h-${esc(issue.id)}">
    ${issue.shared ? `<span class="eyebrow">Top U.S. voter concern</span>` : ""}
    <h3 id="h-${esc(issue.id)}">${esc(issue.name)}</h3>
    <span class="on-record">${cands.filter((c) => isGrounded(issue.stances[c.id])).length} of ${plural(cands.length, "candidate")} on record</span>
    <p class="desc">${esc(issue.description)}</p>
    <div class="grid" style="--n:${cands.length}">${cands.map((c) => renderStance(c, issue.stances[c.id], true)).join("")}</div>
  </section>${i === 1 && answered.length > 2 ? "\n" + adSlot("infeed", "in-feed") : ""}`).join("\n");

  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/races/">All races</a> › ${esc(race.office)}</nav>
<h1>${esc(raceName(race))}</h1>
<p class="sub">${esc(race.category)} race on the ${longDate(meta.electionDate)} general election ballot in ${esc(meta.jurisdiction)}${race.seats > 1 ? `. Vote for up to ${race.seats}` : ""}. ${names.length ? `${plural(names.length, "candidate")}: ${esc(nameList)}.` : "No candidates listed yet."}</p>
${adSlot("top", "top-leaderboard")}
<article class="race">
  <div class="race-head">
    <div class="eyebrow">${esc(race.category)} · ${plural(cands.length, "candidate")}${race.seats > 1 ? ` · vote for up to ${race.seats}` : ""}</div>
    <h2>Who's running</h2>
    <div class="roster">${cands.map((c) => personCard(c, race, false)).join("")}</div>
    ${records ? `<div class="records">${records}</div>` : ""}
    ${judicial ? judicialNote : ""}
  </div>
  ${issues}
  ${unanswered.length ? `<p class="not-on-record">Not yet on record in this race: ${unanswered.map((i) => esc(i.name)).join(", ")}.</p>` : ""}
  ${!answered.length && !judicial ? `<p class="not-on-record">No candidate in this race has a verified, sourced position on file yet.</p>` : ""}
  <p class="report">Spot an error? <a href="${esc(correctionUrl(race))}" target="_blank" rel="noopener">Report a correction for this race</a></p>
</article>`;

  const description = `${raceName(race)}, ${longDate(meta.electionDate)}: ${names.length ? `compare ${nameList}` : "the candidates"} side by side${answered.length ? ` on ${plural(answered.length, "issue")}` : ""}, with every position tied to a quote and its primary source.`;
  return page({ url: raceUrl(race), title: `${raceName(race)} (${meta.electionDate.slice(0, 4)}) | ${SITE_NAME}`, description, body, ads });
}

/* ---------- Candidate page ---------- */
function candidatePage(c, race, meta, ads) {
  const judicial = race.kind === "judicial";
  const answered = race.issues.filter((i) => isGrounded(i.stances[c.id]));
  const unanswered = race.issues.filter((i) => !answered.includes(i));
  const rivals = race.candidates.filter((r) => r.id !== c.id);
  const hasBacking = sourced(c.endorsements).length || sourced(c.ratings).length;
  const year = meta.electionDate.slice(0, 4);

  const issues = answered.map((issue, i) => `<section class="issue" aria-labelledby="h-${esc(issue.id)}">
    ${issue.shared ? `<span class="eyebrow">Top U.S. voter concern</span>` : ""}
    <h3 id="h-${esc(issue.id)}">${esc(issue.name)}</h3>
    <p class="desc">${esc(issue.description)}</p>
    ${renderStance(c, issue.stances[c.id], false)}
  </section>${i === 1 && answered.length > 2 ? "\n" + adSlot("infeed", "in-feed") : ""}`).join("\n");

  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="${raceUrl(race)}">${esc(raceName(race))}</a> › ${esc(c.name)}</nav>
<h1>${esc(c.name)}</h1>
<p class="sub">Candidate for ${esc(raceName(race))}${c.runningMate ? `, with ${esc(c.runningMate)} for Lieutenant Governor` : ""}, on the ${longDate(meta.electionDate)} general election ballot${c.party ? ` (ballot lines: ${esc(c.party)})` : ""}.</p>
${adSlot("top", "top-leaderboard")}
<article class="race">
  <div class="race-head">
    <div class="eyebrow">${esc(race.category)} · ${esc(race.office)}</div>
    <h2>${judicial ? "Record and ratings" : "Positions and record"}</h2>
    <div class="roster">${personCard(c, race, true)}</div>
    ${recordActions(c).length || hasBacking ? `<div class="records">${recordActions(c).length ? renderRecord(c, judicial, true) : ""}${renderBacking([c], judicial, true)}</div>` : ""}
    ${judicial ? judicialNote : ""}
  </div>
  ${issues}
  ${!answered.length && !judicial ? `<p class="not-on-record">No verified, sourced positions on file yet for ${esc(c.name)}.</p>` : ""}
  ${unanswered.length && answered.length ? `<p class="not-on-record">Not yet on record: ${unanswered.map((i) => esc(i.name)).join(", ")}.</p>` : ""}
  <p class="report">Spot an error? <a href="${esc(correctionUrl(race))}" target="_blank" rel="noopener">Report a correction for this race</a></p>
</article>
<h2>${rivals.length ? `Also running for ${esc(race.office)}` : "The race"}</h2>
<ul class="others">${rivals.map((r) => `<li>${personCard(r, race, false)}</li>`).join("")}</ul>
<p><a href="${raceUrl(race)}">Compare ${rivals.length ? `all ${plural(race.candidates.length, "candidate")}` : "this race"} side by side →</a></p>`;

  const description = answered.length
    ? `Where ${c.name}, candidate for ${raceName(race)}, stands on ${answered.slice(0, 3).map((i) => i.name.replace(/^The /, "").toLowerCase()).join(", ")}${answered.length > 3 ? " and more" : ""}, in their own words with primary sources.${rivals.length ? ` Compare with ${rivals.map((r) => r.name).join(", ")}.` : ""}`
    : `${c.name}${c.party ? ` (${c.party})` : ""} is a candidate for ${raceName(race)} on the ${longDate(meta.electionDate)} ballot.${rivals.length ? ` Also running: ${rivals.map((r) => r.name).join(", ")}.` : ""}`;
  const jsonLd = { "@context": "https://schema.org", "@type": "Person", name: c.name, url: `${SITE}${candUrl(c)}`,
    description: `Candidate for ${raceName(race)} in the ${longDate(meta.electionDate)} general election.` };
  if (c.occupation) jsonLd.jobTitle = c.occupation;
  return page({ url: candUrl(c), title: `${c.name}: ${judicial ? "Record" : "Positions"}, ${race.office} ${year} | ${SITE_NAME}`, description, body, jsonLd, ads });
}

/* ---------- Directory of every race (a plain-link entry point for crawlers) ---------- */
function directoryPage(db, ads) {
  const cats = [...new Set(db.races.map((r) => r.category))];
  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › All races</nav>
<h1>All races and candidates</h1>
<p class="sub">Every race this guide covers on the ${longDate(db.meta.electionDate)} general election ballot in ${esc(db.meta.jurisdiction)}. To see only the races on your ballot, <a href="/">enter your address</a>.</p>
${adSlot("top", "top-leaderboard")}
<div class="dir">${cats.map((cat) => `<h2>${esc(cat)}</h2>
<ul>${db.races.filter((r) => r.category === cat).map((r) => `<li><a href="${raceUrl(r)}">${esc(raceName(r))}</a><span class="names">${
    r.candidates.length ? r.candidates.map((c) => `<a href="${candUrl(c)}">${esc(c.name)}</a>`).join(" · ") : "No candidates listed yet"}</span></li>`).join("")}</ul>`).join("\n")}</div>`;
  return page({ url: "/races/", title: `All ${db.meta.electionDate.slice(0, 4)} Races in NYC and Nassau County | ${SITE_NAME}`,
    description: `Every race on the ${longDate(db.meta.electionDate)} ballot in ${db.meta.jurisdiction}, with links to each candidate's sourced positions and record.`, body, ads });
}

/* ---------- Main ---------- */
export function buildPages(db) {
  const ads = { script: adScript() };
  ads.client = ads.script.match(/AD_CLIENT = "([^"]+)"/)[1];
  const meta = db.meta;
  db.races.forEach((r) => r.candidates.sort((a, b) => lastName(a.name).localeCompare(lastName(b.name))));

  // lastmod for the sitemap: the newest lastResearched among the people on the page, else the data date.
  const researched = new Map(readCandidates().map(({ id, data }) => [id, /^\d{4}-\d{2}-\d{2}$/.test(data?.lastResearched || "") ? data.lastResearched : ""]));
  const newest = (cands) => cands.map((c) => researched.get(c.id)).filter(Boolean).sort().at(-1) || meta.lastUpdated;

  const write = (url, html) => {
    const dir = path.join(ROOT, url);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html);
  };
  for (const dir of ["candidates", "races"]) fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });

  const urls = [{ loc: "/", lastmod: meta.lastUpdated }];
  const privacy = fs.readFileSync(path.join(ROOT, "privacy.html"), "utf8").match(/Last updated (\w+) (\d+), (\d{4})/);
  urls.push({ loc: "/privacy.html", lastmod: privacy
    ? `${privacy[3]}-${String(MONTHS.indexOf(privacy[1]) + 1).padStart(2, "0")}-${privacy[2].padStart(2, "0")}` : meta.lastUpdated });

  write("/races/", directoryPage(db, ads));
  urls.push({ loc: "/races/", lastmod: newest(db.races.flatMap((r) => r.candidates)) });
  let nCand = 0;
  for (const race of db.races) {
    write(raceUrl(race), racePage(race, meta, ads));
    urls.push({ loc: raceUrl(race), lastmod: newest(race.candidates) });
    for (const c of race.candidates) {
      write(candUrl(c), candidatePage(c, race, meta, ads));
      urls.push({ loc: candUrl(c), lastmod: newest([c]) });
      nCand++;
    }
  }

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/build-pages.mjs. Don't edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`);
  console.log(`Wrote ${db.races.length} race pages, ${nCand} candidate pages, /races/ and sitemap.xml (${urls.length} URLs).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildPages(JSON.parse(fs.readFileSync(path.join(ROOT, "data", "election.json"), "utf8")));
}
