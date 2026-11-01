/*
  Checks AI-drafted evidence against the live source page, so nothing unverified ships:
  - a stance's quote must appear word for word on its source_url
  - a record action's source_url must load and mention the candidate's last name
  Pages that can't be read as text (PDFs, videos, blocked sites) are reported for a
  human to check instead of being accepted.
*/

const UNREADABLE_HOSTS = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|facebook\.com|instagram\.com|tiktok\.com|x\.com|twitter\.com)$/i;

const pageCache = new Map();

/* Lowercase, straighten quotes and dashes, drop accents and punctuation, collapse spaces. */
export function normalize(text) {
  return text
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", mdash: "—", ndash: "–", hellip: "…" };

export function htmlToText(html) {
  return html
    .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/* Returns { text } for a readable page, or { problem } explaining why it needs a human check. */
export async function fetchPageText(url) {
  if (pageCache.has(url)) return pageCache.get(url);
  let result;
  try {
    const host = new URL(url).hostname;
    if (UNREADABLE_HOSTS.test(host)) {
      result = { problem: "video or social media page; can't be checked automatically" };
    } else {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
        headers: { "user-agent": "VoterCandidateGuide-source-check/1.0", accept: "text/html,text/plain;q=0.9,*/*;q=0.5" }
      });
      const type = res.headers.get("content-type") || "";
      if (!res.ok) result = { problem: `source page returned HTTP ${res.status}` };
      else if (/pdf/i.test(type) || /\.pdf($|\?)/i.test(url)) result = { problem: "PDF; can't be checked automatically" };
      else if (!/html|text|xml|json/i.test(type)) result = { problem: `unsupported page type (${type || "unknown"})` };
      else result = { text: normalize(htmlToText(await res.text())) };
    }
  } catch (err) {
    result = { problem: `couldn't load source page (${err.name === "TimeoutError" ? "timed out" : err.message})` };
  }
  pageCache.set(url, result);
  return result;
}

export async function verifyQuote(url, quote) {
  const page = await fetchPageText(url);
  if (page.problem) return { ok: false, reason: page.problem };
  // Quotes may legitimately skip words with "..." - every fragment must appear, in order.
  const parts = quote.split(/\.\.\.|…/).map(normalize).filter((p) => p.split(" ").length >= 3 || p.length > 12);
  if (!parts.length) return { ok: false, reason: "quote too short to verify" };
  let from = 0;
  for (const part of parts) {
    const at = page.text.indexOf(part, from);
    if (at < 0) return { ok: false, reason: "quote not found word for word on the source page" };
    from = at + part.length;
  }
  return { ok: true };
}

export async function verifyMention(url, name) {
  const page = await fetchPageText(url);
  if (page.problem) return { ok: false, reason: page.problem };
  const last = normalize(name).split(" ").filter((w) => !/^(jr|sr|ii|iii|iv)$/.test(w)).pop(); // "LiPetri Jr." -> "lipetri"
  return page.text.includes(last) ? { ok: true } : { ok: false, reason: `source page doesn't mention "${name}"` };
}
