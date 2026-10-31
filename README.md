# VoterCandidateGuide

A free, static, non-partisan voter guide: compare local candidates side by side, with every position tied to a quote and a primary source.

No backend. The site is `index.html` plus `data/election.json`, so it can be hosted for $0 on GitHub Pages, Netlify or Vercel.

## Run it locally

The page loads `data/election.json`, so open it through a local server (double-clicking `index.html` won't load the data):

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Editing candidate data

Data lives in a Google Sheet (or the CSV files in `data/sheets/`) and is turned into `data/election.json` by a build script that refuses to publish anything without a source.

### One-time Google Sheet setup

1. Create a Google Sheet with tabs named exactly: `meta`, `districts`, `races`, `candidates`, `issues`, `stances`, `record`, plus the optional `endorsements` and `ratings`.
2. Fill each tab by importing the matching file from `data/sheets/` (File → Import → Upload → "Replace current sheet").
3. Select the `zip` column in `districts` and the `date` column in `record`, then Format → Number → **Plain text**, so Sheets keeps leading zeros and dates as typed.
4. Share → General access → **Anyone with the link: Viewer**.
5. Copy the sheet ID from its URL: `docs.google.com/spreadsheets/d/<SHEET_ID>/edit`.

### After every edit

```bash
node scripts/build-data.mjs --sheet <SHEET_ID> --save-csv
```

This downloads the sheet, checks it, refreshes `data/sheets/*.csv` (so changes show in git diffs) and writes `data/election.json`. Commit and push both. If any row is missing a source, quote or position, the script lists the row numbers and leaves `election.json` unchanged.

Without a sheet, edit the CSV files directly and run `node scripts/build-data.mjs`.

## Address lookup and coverage requests

Visitors' addresses are matched to their districts in the browser, for free: Photon (OpenStreetMap) suggests addresses, the U.S. Census Geocoder returns county, town, village, school, congressional and state legislative districts, and NYC Open Data returns the NYC Council district. Races show when their `district_id` matches (keys are listed in `claude.md`, section 4). No address is stored or put in the page link.

When an address is outside Nassau County and NYC, or its races haven't been added yet, the page shows a short form asking for town, ZIP and an optional email. To receive those requests in a Google Sheet:

1. Create a Google Form with three short-answer questions: **Town or city**, **ZIP code**, **Email**. In Responses, link it to a Google Sheet.
2. Open the form's preview, then use ⋮ → **Get pre-filled link**, type `TOWN`, `ZIP` and `EMAIL` in the three answers, and copy the link. It contains `entry.<number>=TOWN` and so on.
3. In the `meta` tab, set:
   - `coverageFormAction`: the form URL with `/viewform…` replaced by `/formResponse`, e.g. `https://docs.google.com/forms/d/e/<id>/formResponse`
   - `coverageFormTownField`, `coverageFormZipField`, `coverageFormEmailField`: the matching `entry.<number>` names
4. Rebuild. Until these are set, the page says coverage requests aren't open yet.

## Researching candidates with Claude Code

New stances and records are drafted in Claude Code (included with Claude Pro, no API costs): ask it to research a race, and it searches primary sources and writes rows into `data/sheets/*.csv`. Then:

1. **Check every quote against its source:**

   ```bash
   node scripts/check-sources.mjs
   ```

   It opens each `source_url` and confirms the quote appears word for word (and that record entries mention the candidate). Failed rows must be fixed or removed. PDFs and videos are listed as "check by hand": open them and confirm yourself.
2. **Read the diff** (`git diff data/sheets`) and make sure each supports/opposes line fairly restates its quote.
3. **Build** with `node scripts/build-data.mjs`, then commit.

Primary sources only: campaign sites, official minutes and roll-call votes, court opinions, debate transcripts, and news articles that quote the candidate directly. Never copy from other voter guides.

### What goes in each tab

| Tab | Columns | Notes |
| --- | --- | --- |
| `meta` | key, value | `jurisdiction`, `electionDate`, `lastUpdated` (YYYY-MM-DD), `isSampleData` (true/false) |
| `districts` | zip, district_id | One row per ZIP + district on that ballot |
| `races` | race_id, office, category, district, district_id, kind | `kind` is `office` (default) or `judicial`. Judicial races lead with the candidate's record on the bench; stances are optional |
| `candidates` | candidate_id, race_id, name, party, occupation, record_office, record_years | `party` = ballot lines exactly as printed (e.g. `Democratic, Working Families`). Fill `record_office` only for people who held office before |
| `issues` | issue_id, race_id, name, description, tags | `issue_id` must be unique across all races; tags are comma-separated search words. `race_id` = `all` makes it a shared voter concern asked of every non-judicial candidate |
| `stances` | issue_id, candidate_id, supports, opposes, quote, source, source_url, real_world_impact | Several supports/opposes go on separate lines in one cell (Ctrl/Cmd+Enter) |
| `record` | candidate_id, date, action, text, outcome, source, source_url | e.g. action `Voted for`, outcome `Passed 6–3`. For judges: `Wrote the majority opinion in`, `Dissented in` |
| `endorsements` (optional) | candidate_id, endorser, endorser_type, date, source, source_url | Source = the endorser's own announcement. Recorded the same way for every candidate |
| `ratings` (optional) | candidate_id, rater, rating, date, source, source_url | Qualification ratings, mainly bar association ratings of judicial candidates |

Write `supports` / `opposes` lines in plain, neutral words that restate the candidate's own quote.
