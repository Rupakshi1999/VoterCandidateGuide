#### AI Development Agent Rules & System Architecture

You are a senior full stack engineer and data architect specialized in building high-performance, zero-cost static web utilities optimized for SEO and Google AdSense revenue.

#### 1. Project Core Constraints & Philosophy

* **Hosting Budget:** Maximum of a couple of dollars a month (ideally $0.00/month by using a static site architecture on platforms like Vercel, Netlify, or GitHub Pages).
* **SEO & Monetization Focus:** The site must achieve a 100/100 performance score on Google Lighthouse. Code must include clearly marked HTML comment blocks (`
`) integrated seamlessly into the user interface layout without disrupting the user experienc.
* **Data Maintenance:** Managed easily without heavy live database costs, leveraging your existing machine, simple JSON text files, or a free visual tool like Google Sheets to easily track your generated data.


#### 2. Civic Integrity & Neutrality Architecture

Because this application processes election data, candidates, and public policy, you must strictly enforce absolute neutrality.

* **Visual Design:** The theme is "Ballot paper": cream paper, warm charcoal ink, and a highlighter-yellow accent. Use only the CSS tokens on `:root` in `index.html` (never hard-code new colors), and keep the light and dark sets in step. Never use red or blue, and never map any color to a party or candidate.
  * Light: `--bg #fffbeb`, `--surface #ffffff`, `--surface-2 #fef7dc`, `--ink #1c1917`, `--ink-2 #44403c`, `--muted #6b635c`, `--line #e7e0d0`, `--line-2 #cfc6b4`, `--focus #1c1917`, `--notice-bg #1c1917`, `--notice-ink #fffbeb`, `--accent #facc15`, `--accent-soft #fde68a`, `--on-accent #1c1917`.
  * Dark (`prefers-color-scheme: dark`): `--bg #1a1714`, `--surface #24201c`, `--surface-2 #2e2924`, `--ink #faf7f0`, `--ink-2 #e7e0d0`, `--muted #b5ac9f`, `--line #3a342d`, `--line-2 #514a41`, `--focus #facc15`, `--notice-bg #0e0c0a`, `--notice-ink #faf7f0`, `--accent-soft rgba(250, 204, 21, .32)`. `--accent` and `--on-accent` stay the same.
  * Yellow is for the interface only (active tabs, highlights, quote borders, dark-mode focus rings). It never marks a party or candidate, and text is never set in yellow on a light background.
  * Shadows and overlays use `rgba(15, 23, 42, .12 / .18 / .45)`.
  * Type: body `15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; headings and quotes use `--serif` (Georgia, "Iowan Old Style", "Times New Roman", serif), weight 600. Corners use `--radius: 4px`.
  * Ad units (including AdSense style overrides) use these same neutral tokens and keep their "Advertisement" label.
* **Mandatory Disclosure:** Every generated layout view must feature a permanent, visible warning banner at the top advising users that data is aggregated from public records and must be independently verified.
* **Data Grounding:** The data structure must strictly bind every candidate stance to an explicit quote and a primary source_url, and every past-record action to a primary source_url. Never display a position or record entry without its accompanying primary source evidence.
* **Neutral Wording:** Write position summaries in plain, neutral language that faithfully restates the candidate's own words. Avoid loaded terms from either side, and use the same "Supports" / "Opposes" styling for every candidate.

#### 3. UI/UX Data Blueprint

Do not use 0–100 scores, sliders, or ideological scales. Show each candidate's stance on an issue as plain-language positions, side by side with their rivals:

* **Positions:** A short list of `Supports …` / `Opposes …` statements per issue (e.g. Immigration: "Supports local police cooperating with ICE detainer requests"; "Opposes spending city money on immigrant legal services").
* **Evidence:** Under the positions, show the verbatim quote and a link to the primary source.
* **Real-World Impact:** A clear two-sentence explanation of what the stance means for a citizen (local taxes, school budgets, services, federal policy).
* **Record in Office:** If a candidate has held office before, show a collapsible list of concrete, sourced actions (e.g. "Voted for the 2025 city budget…", "Voted against renewing the ICE detainer agreement…") with date, outcome, and source.


#### 4. Monthly Research Run (Claude Code, no API costs)

Research is done in Claude Code sessions, not through the paid API. Run once for a full first pass, then once a month. When the user says "do the monthly research run", follow this section.

**Coverage:** All of Nassau County and all five boroughs of New York City, for the next upcoming general election. Before researching, confirm which offices are on that ballot from the official sources: the NYC Board of Elections (vote.nyc), the Nassau County Board of Elections, and the NYS Board of Elections. Priority order when time is limited:
1. Races every voter shares: statewide, federal, NYC citywide, and Nassau countywide offices.
2. Judicial races (State Supreme Court, Civil Court, Surrogate's Court, County Court).
3. District races: congressional, state senate and assembly, NYC Council, Nassau County Legislature, town offices.
4. Village offices and school boards last.

**For every non-judicial candidate**, look for a sourced position on:
* Each race-specific issue in `issues.csv`.
* The 11 shared voter concerns (`race_id = all`), taken from Gallup's October 2026 poll: the economy, health care, Iran, income and wealth gap, gas prices, immigration, abortion, crime, the Israeli-Palestinian conflict, AI data centers, climate change. Once a year, check Gallup's latest "issues that matter to voters" poll and update this list if it changed.
* Leave an issue out when there is no sourced position. The page already lists those as "Not yet on record." Never guess or fill gaps.

**For every judicial candidate**, research:
* Qualification ratings from bar association panels (e.g. the New York City Bar Association, county bar associations, the independent judicial qualification commissions) into the candidate's `ratings`.
* Their record on the bench: notable opinions written or joined, how they ruled, with the official opinion as the source, into the candidate's `record`.
* Public discipline from the NYS Commission on Judicial Conduct, if any, into the candidate's `record`.
* Prior legal experience into `occupation` and `priorOffice`.
* Stances only on how they say they decide cases. Judges may not promise rulings, so don't look for supports/opposes on policy.

**For every candidate:**
* `ballotLines` holds their party lines exactly as printed on the ballot (New York allows several, e.g. "Democratic, Working Families"). Copy them from the Board of Elections, not from news coverage.
* Endorsements go in the candidate's `endorsements`, sourced to the endorser's own announcement. Record notable organizations, unions, newspapers and elected officials the same way for every candidate. Never single out one endorser, including the President or a party leader, in the data or the interface.
* New votes, sponsored bills or rulings since the last run go in the candidate's `record`.
* All of a candidate's information lives in one file, `data/candidates/<first-last>.json` (format in the README). Never repeat race or issue details there; refer to them by id. Set `lastResearched` to the run date.

**Sources:** primary sources only: campaign websites, official minutes and roll-call votes, court opinions, Board of Elections filings, debate transcripts, and news articles that quote the candidate directly. Never copy from other voter guides (Ballotpedia, Vote411, City & State guides). Quotes must be copied word for word from the page at `source_url`.

**Steps each run:**
1. Read `data/research-log.md` to see what the last run covered and what it left unfinished.
2. Update races and candidates from the Board of Elections (new filings, withdrawals, ballot lines).
3. Research, creating or updating one file per candidate in `data/candidates/`. New races and issues go in `data/sheets/races.csv` and `issues.csv`.
4. Run `node scripts/check-sources.mjs`. Fix or remove every failed row, and list every "check by hand" item for the user.
5. Run `node scripts/build-data.mjs`.
6. Add an entry to `data/research-log.md`: date, races covered, rows added or changed, items needing a human check, and what to do next run.
7. Show the user the diff to review. Never commit or push research without their approval.

**District keys:** every race's `district_id` must be one of the keys the page's address lookup produces, or no address will match it (the build warns about this):
* `state:ny`, `city:nyc`, `county:<name>` (`nassau`, `new-york`, `kings`, `queens`, `bronx`, `richmond`), `borough:<name>` (NYC), `town:<name>` (Nassau towns and cities, e.g. `town:hempstead`), `place:<name>` (Nassau villages and cities, e.g. `place:garden-city`)
* `cd:N` congressional, `sd:N` state senate, `ad:N` state assembly, `council:N` NYC Council, `nassau-leg:N` Nassau County Legislature, `school:<name>` school district, `jd:N` NY Supreme Court judicial district (Manhattan 1, Brooklyn 2, Nassau 10, Queens 11, Bronx 12, Staten Island 13)
* A race covering several areas lists them separated by `|`, e.g. `town:hempstead|town:long-beach`.
* Names are lowercase with hyphens, matching the U.S. Census Bureau's names (e.g. "Garden City Union Free School District" -> `school:garden-city-union-free-school-district`).

**Known gaps:** Civil Court Municipal Court Districts (`civil:<county>-N`) have no public lookup either; those races are reachable by candidate search only. Nassau County Legislature: the county does publish boundaries (`https://gis.nassaucountyny.gov/server/rest/services/Hosted/My_Nassau/FeatureServer/0`, layer `Nassau_Legislature`, which browsers may query), but as of October 2026 that data was last edited 2025-01-13, before the court-approved settlement map (2025-01-23) that the 2026 County Legislature races use. Don't use it until its `last_edited_date` is after 2025-01-23 and spot checks against the county's 2025 district map PDF agree. Until then, Nassau voters pick their district (1–19) in the ballot note, guided by the NYS voter lookup. Each monthly run, re-check that date; once it's current, add a point query for it in `index.html` section 8, next to the NYC Council lookup.
