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

1. Create a Google Sheet with seven tabs named exactly: `meta`, `districts`, `races`, `candidates`, `issues`, `stances`, `record`.
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

### What goes in each tab

| Tab | Columns | Notes |
| --- | --- | --- |
| `meta` | key, value | `jurisdiction`, `electionDate`, `lastUpdated` (YYYY-MM-DD), `isSampleData` (true/false) |
| `districts` | zip, district_id | One row per ZIP + district on that ballot |
| `races` | race_id, office, category, district, district_id | |
| `candidates` | candidate_id, race_id, name, party, occupation, record_office, record_years | Fill `record_office` only for people who held office before |
| `issues` | issue_id, race_id, name, description, tags | `issue_id` must be unique across all races; tags are comma-separated search words |
| `stances` | issue_id, candidate_id, supports, opposes, quote, source, source_url, real_world_impact | Several supports/opposes go on separate lines in one cell (Ctrl/Cmd+Enter) |
| `record` | candidate_id, date, action, text, outcome, source, source_url | e.g. action `Voted for`, outcome `Passed 6–3` |

Write `supports` / `opposes` lines in plain, neutral words that restate the candidate's own quote.
