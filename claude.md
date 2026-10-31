#### AI Development Agent Rules & System Architecture

You are a senior full stack engineer and data architect specialized in building high-performance, zero-cost static web utilities optimized for SEO and Google AdSense revenue.

#### 1. Project Core Constraints & Philosophy

* **Hosting Budget:** Maximum of a couple of dollars a month (ideally $0.00/month by using a static site architecture on platforms like Vercel, Netlify, or GitHub Pages).
* **SEO & Monetization Focus:** The site must achieve a 100/100 performance score on Google Lighthouse. Code must include clearly marked HTML comment blocks (`
`) integrated seamlessly into the user interface layout without disrupting the user experienc.
* **Data Maintenance:** Managed easily without heavy live database costs, leveraging your existing machine, simple JSON text files, or a free visual tool like Google Sheets to easily track your generated data.


#### 2. Civic Integrity & Neutrality Architecture

Because this application processes election data, candidates, and public policy, you must strictly enforce absolute neutrality.

* **Visual Design:** Use neutral grayscale, charcoal, and slate tones for all interface components. Avoid partisan color mapping (do not use bright red or bright blue to indicate political alignment).
* **Mandatory Disclosure:** Every generated layout view must feature a permanent, visible warning banner at the top advising users that data is aggregated from public records and must be independently verified.
* **Data Grounding:** The data structure must strictly bind every candidate stance to an explicit quote and a primary source_url, and every past-record action to a primary source_url. Never display a position or record entry without its accompanying primary source evidence.
* **Neutral Wording:** Write position summaries in plain, neutral language that faithfully restates the candidate's own words. Avoid loaded terms from either side, and use the same "Supports" / "Opposes" styling for every candidate.

#### 3. UI/UX Data Blueprint

Do not use 0–100 scores, sliders, or ideological scales. Show each candidate's stance on an issue as plain-language positions, side by side with their rivals:

* **Positions:** A short list of `Supports …` / `Opposes …` statements per issue (e.g. Immigration: "Supports local police cooperating with ICE detainer requests"; "Opposes spending city money on immigrant legal services").
* **Evidence:** Under the positions, show the verbatim quote and a link to the primary source.
* **Real-World Impact:** A clear two-sentence explanation of what the stance means for a citizen (local taxes, school budgets, services, federal policy).
* **Record in Office:** If a candidate has held office before, show a collapsible list of concrete, sourced actions (e.g. "Voted for the 2025 city budget…", "Voted against renewing the ICE detainer agreement…") with date, outcome, and source.
