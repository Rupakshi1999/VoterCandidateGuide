# Research log

One entry per research run, newest first. See section 4 of claude.md for the steps.

## 2026-10-31: DiNapoli, Blakeman, Komatireddy, LiPetri gaps

- **DiNapoli (Comptroller):** first positions. Economy (waste and fraud audits) from his own answers in the PoliticsNY "Campaign Insiders" Q&A; climate change from his quote in an osc.ny.gov press release. Added `occupation`, `priorOffice` (Comptroller, 2007–present) and one record entry (April 2025 pension climate investment).
- **Blakeman (Governor):** added gas prices (Marcellus Shale gas drilling, NEWS10 debate recap), climate change (all-electric building mandates, NY1) and AI data centers (opposes the moratorium, NY1). Record: signed the county transgender athlete law (2024-07-15, CBS New York) and the mask law (2024-08-14, News 12).
- **Komatireddy (Attorney General):** added immigration (would defend New York's laws, including the 287(g) ban) and health care (Medicaid fraud prosecution), both from her NY1 interview of 2026-08-05.
- **LiPetri (CD 3):** added climate change (wind, solar and batteries alongside natural gas, quoted by E&E News from a 2024 forum). Filled `priorOffice` (NYS Assembly District 9, 2019–2020) and one record entry: co-sponsored A6295A, the 1,4-dioxane ban (Chapter 613 of 2019), sourced to nyassembly.gov.
- 24 entries verified for these four, 0 failed, 0 to check by hand.
- Fixed `scripts/common/verify.mjs`: record/endorsement checks searched for "jr" instead of the last name for candidates whose names end in Jr., Sr., II, III or IV.
- **Left out (paraphrase only, no direct quote):** DiNapoli backing the data center moratorium (City & State); Blakeman calling himself pro-choice (only an advocacy petition); LiPetri opposing a national abortion ban (Long Island Press, 2024 debate). Blakeman's health care remarks were in articles that block automated reading (nny360 returned 429, insurancenewsnet 403).
- **Endorsements:** none added. Needs endorsers' own announcements for all four.

**Next run:** endorsements for the statewide candidates; DiNapoli on AI data centers and health care from a debate transcript; Blakeman on abortion and health care; LiPetri on abortion and gas prices; then the 18 congressional candidates without positions, then State Senate and Assembly.

## 2026-10-31: Congress gaps filled (second pass)

- Found and verified campaign sites for 5 more candidates: Halpin (CD 2, halpinforcongress.com), LiPetri (CD 3, mikelipetriforcongress.com), Valdez (CD 7, clairevaldezforcongress.com), Lander (CD 10, bradlanderforcongress.com), Lasher (CD 12, micahlasher.com). 31 positions, all verified word for word.
- Left out: attack lines aimed at an opponent (Halpin on Garbarino), slogans too vague to state a position, and a general anti-Trump pledge filed under health care. Lander's immigration position is restated neutrally; his quote is shown as written.
- Corrected count: there are **37** congressional candidates (the previous entry said 39 and 25 missing; it was 23). Now 19 have positions; 18 don't.
- **Still no campaign site found (18):** CD 4 Tarnoff; CD 5 Marsh; CD 6 Chou; CD 7 Rivera, Ghaznavi; CD 8 Mizrahi; CD 9 Azumah; CD 10 Moore (two candidate trackers report she has no campaign website); CD 11 DeCillis; CD 12 Ortiz, Negron; CD 13 Williams; CD 14 Hysenaj; CD 15 Sapaskis, Duran, Vega, Easton; CD 16 Cinquemani. Mostly Republican challengers in safe NYC seats and minor-party candidates. Next try: their FEC filings (fec.gov lists a committee website when one is registered) and the borough Republican Party candidate pages.

**Next run:** the 18 above via FEC; DiNapoli; then State Senate and Assembly.

## 2026-10-31: Congress (CD 2–16) researched, first pass

- 53 positions for 14 of 39 candidates, all verified word for word against live pages.
  - From 2026 campaign sites (confirmed by "Paid for by" line): Suozzi (CD 3, 9 positions), Gillen and Driscoll (CD 4), Shinkle (CD 12), Avila Chevalier (CD 13).
  - From official house.gov sites (incumbents with no campaign site found; labeled as such in the source title): Garbarino (CD 2), Meeks (CD 5), Meng (CD 6), Jeffries (CD 8), Clarke (CD 9), Malliotakis (CD 11), Ocasio-Cortez (CD 14), Torres (CD 15), Latimer (CD 16).
- Passages that named a topic without stating a position were left out (e.g. Garbarino on health care, Clarke's list of focus areas, Jeffries's "know your rights" notice).
- **No campaign site found yet (25 candidates):** CD 2 Halpin; CD 3 LiPetri; CD 4 Tarnoff; CD 5 Marsh; CD 6 Chou; CD 7 Valdez, Rivera, Ghaznavi; CD 8 Mizrahi; CD 9 Azumah; CD 10 Lander, Moore; CD 11 DeCillis; CD 12 Lasher, Ortiz, Negron; CD 13 Williams; CD 14 Hysenaj; CD 15 Sapaskis, Duran, Vega, Easton; CD 16 Cinquemani. Several races now show one candidate's positions next to "No verified, sourced position" for the other. Highest priority to fix: LiPetri (CD 3), Halpin (CD 2), Lander and Moore (CD 10), Lasher (CD 12), Valdez (CD 7). Try each name with "for Congress", the FEC candidate page, or county party candidate pages for the official URL.
- Incumbents' `priorOffice` years are from their House service; record entries (votes) aren't researched yet.

**Next run:** fill the 25 candidates above, then DiNapoli, then State Senate and Assembly.

## 2026-10-31: Attorney General and Comptroller researched

- **Attorney General.** Letitia James: 5 positions (economy, health care, immigration, crime, income gap) from jamesforny.com/priorities (tishjames.com redirects there; "Paid for by James for NY 2026"). Saritha Komatireddy: 2 positions (crime: safe buffer zones around Jewish schools and synagogues; income gap: opposes a homeowner tax hike) from sarithafornewyork.com.
- **Comptroller.** Joseph Hernandez: 2 positions (economy: pension investing; income gap: state taxes and spending) from hernandezforny.com. Thomas DiNapoli: none. tomdinapoli.com redirects to a dead 2018 site and no 2026 campaign site was found. Next run: try statements he made as Comptroller on osc.ny.gov (official primary source) or a 2026 debate transcript.
- All 17 researched quotes (governor, AG, comptroller) verify word for word. One reader-reported quote for James was wrong ("Letitia is" vs. the page's "She is"); the checker caught it and it was corrected.
- Neither AG candidate's site addresses abortion, gas prices, climate, AI data centers, Iran or Israel-Palestine.

**Next run:** DiNapoli; then congressional races (CD 2–16); then State Senate and Assembly; then judicial ratings.

## 2026-10-31: Nassau ballot loaded

**Source:** Nassau County Board of Elections "Candidate List - 2026", marked subject to change (`data/sources/nassau-2026-candidates-list.pdf`, not committed).

- Added 49 Nassau races and 112 candidates: Congressional Districts 2 and 4, State Senate 5–9, Assembly 9–22, Town of Hempstead (Supervisor, Clerk), North Hempstead (Supervisor), Oyster Bay (Supervisor, Clerk), County Legislature 1–19, Supreme Court 10th Judicial District (8 seats), Family Court, District Court 2nd–4th Districts. Totals now 187 races, 367 candidates.
- Statewide races and Congressional District 3 appear on both the NYC and Nassau lists; candidates and ballot lines match exactly.
- Page 7 of the PDF (Family Court and District Court) had scrambled text and was entered by hand: every candidate there is listed on Democratic, Republican and Conservative. Confirmed against the PDF's page 7 text by the site owner: all 8 names, seat counts and ballot lines match.
- District Court areas come from the Uniform District Court Act § 2405: 2nd = Town of Hempstead and City of Long Beach, 3rd = Town of North Hempstead, 4th = Town of Oyster Bay and City of Glen Cove. Races can now list several district keys (`town:hempstead|town:long-beach`).
- The 10th Judicial District also covers Suffolk County; only Nassau's list was used, which should be the same district-wide.

**Next run:** research Attorney General (James, Komatireddy) and Comptroller (DiNapoli, Hernandez); then congressional races (CD 2–16); then State Senate and Assembly; then judicial ratings.

## 2026-10-31: NYC ballot loaded; governor race researched

**Source:** NYC Board of Elections "The Contest List", General Election 2026, printed 9/11/2026, marked tentative (`data/sources/general-contest-list-2026-09-11.pdf`, not committed). The full state certification couldn't be downloaded (the site blocks automated requests).

- Replaced all sample data with the real NYC ballot: 138 races, 255 candidates, ballot lines exactly as printed. Home addresses in the list were not copied. "Betsey Jean Jacques" and "Betsey Jean-Jacques" appear on two lines; merged as Betsey Jean-Jacques. Confirm the spelling.
- Researched: Governor (Hochul, Blakeman). 8 positions, all verified word for word against their campaign sites. Neither site has an issues page, so health care, Iran, gas prices, Israel-Palestine, AI data centers and climate show as "not yet on record."
- Not included: the five NYC charter proposals (ballot questions, not candidates).

**Gaps:**
- **Nassau County is missing.** Its races (Congressional District 4, Nassau parts of CD 3, State Senate and Assembly districts in Nassau, Nassau Supreme Court 10th Judicial District, county, town and village offices) need the Nassau County Board of Elections candidate list.
- Civil Court races by Municipal Court District (`civil:<county>-N`) can't be matched to an address yet; they're findable by candidate name.
- 253 candidates have no positions, record, endorsements or ratings yet.

**Next run:** get the Nassau list; research Attorney General (James, Komatireddy) and Comptroller (DiNapoli, Hernandez); then congressional races; then State Senate and Assembly; then judicial ratings (NYC Bar Association judicial ratings cover NYC Supreme and Civil Court candidates).

## 2026-10-31: data restructured; research blocked on official ballot list

- Moved all candidate data to one file per person in `data/candidates/` (positions, record, endorsements, ratings, ballot lines). Output verified identical to before.
- Tried to get the official race list from the NYS Board of Elections ballot certification for Nov 3, 2026 (`elections.ny.gov/system/files/documents/2026/09/accessible-2026-general-ballot-certification-9.17.2026.pdf`). The site refuses automated downloads (HTTP 403). Needs a person to download it and save it as `data/sources/2026-general-ballot-certification.pdf`.
- News sources (not yet confirmed against the certification) list the statewide tickets as: Governor/Lt. Governor Hochul/Adams (Democratic, Working Families) vs. Blakeman/Hood (Republican, Conservative, Vote Affordable); Attorney General James vs. Komatireddy; Comptroller DiNapoli vs. Hernandez. Confirm against the certification before adding.
- Next run: read the certification, add every race on Nassau and NYC ballots to `races.csv` with lookup keys, create a file per candidate with ballot lines, then research statewide races first.

## 2026-10-31: setup (no research yet)

- Data is still fictional sample data (`isSampleData: true`).
- Next run: confirm which offices are on the next general-election ballot in Nassau County and NYC, replace the sample races and candidates with real ones, and start with the races every voter shares (priority 1 in claude.md).
