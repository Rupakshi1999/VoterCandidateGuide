# Research log

One entry per research run, newest first. See section 4 of claude.md for the steps.

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
