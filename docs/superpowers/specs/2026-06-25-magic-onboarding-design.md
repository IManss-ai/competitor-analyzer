# Magic Onboarding — Design Spec (2026-06-25)

## Goal
Turn a cold, empty dashboard into an instant "wow": a new user enters **their own
business URL**, we scrape & profile their business honestly, show it on the
dashboard, then **auto-discover their top real SaaS/online competitors** and kick
off a first analysis. Manual add-by-URL stays as a secondary path.

Deadline: incubator mentor review (2026-06-26). Scope is cut to land the magic
moment flawlessly.

## Decisions (locked with user)
- **SaaS/online auto-discovery only.** Local businesses (cafe/barbershop) get the
  URL-profiling + manual add-by-URL; no geo competitor search (no Google Places in
  stack; not reliable by deadline).
- **Discovery = AI knowledge + URL validation** (no new external search API). The
  backend is **DeepSeek-only, text-only** (`app/llm.py`, `deepseek-v4-flash`); it
  has no live web access, so it suggests competitors from training knowledge and we
  **validate every suggested URL by actually scraping it** before persisting. A
  search API (Serper/Tavily) is the post-demo quality upgrade.
- Reuse the existing add-competitor → background scan → battlecard pipeline for the
  first analysis. No new analysis engine.

## Honesty invariants (load-bearing — matches repo's no-fabrication ethos)
- Profiling + URL validation use the sidecar **`POST /scrape-raw`** (Playwright →
  Readability → Turndown): deterministic, **no OpenAI dependency** (the sidecar's
  OpenAI key may be dry; `/scrape` is not trusted here).
- A discovered competitor is **never persisted unvalidated**. Validation = URL
  fetches successfully AND its scraped content plausibly matches the user's
  category (lightweight check).
- If **< 2** competitors validate, show what we found and nudge manual add — never
  pad with fakes.
- The AI-generated business profile is shown as **editable** ("we read this from
  your site — fix anything wrong"). Never present guesses as confirmed fact.
- Day-one competitor analysis is a **baseline** (no prior snapshot to diff). UI says
  "now tracking — no changes yet"; immediate value comes from the review/complaint +
  hiring scrape that already runs on competitor add (`_run_onboarding_scan`).

## Architecture

### Backend
- **Model** (`app/models.py`): add to `User`:
  - `business_url: str | None`
  - `business_name: str | None`
  - `business_profile: JSON | None`  (structured profile dict)
  - `onboarded_at: datetime | None`  (marks magic-onboarding complete)
  - Alembic migration `00X_add_business_profile.py`.
- **`app/onboarding/profiler.py`** — `profile_business(url) -> BusinessProfile`:
  1. `POST {SCRAPER_URL}/scrape-raw` → markdown/text of the user's site (reuse
     fetcher patterns; fall back to direct HTTP on sidecar failure).
  2. DeepSeek (`app/llm.py`) distills to JSON: `name`, `one_liner`, `category`
     (short industry tag), `target_customer`, `positioning`, `key_features[]`,
     `socials[]` (best-effort from page links), `is_saas` (bool).
  3. Return dict; caller persists onto `User`.
- **`app/onboarding/discovery.py`**:
  - `suggest_competitors(profile) -> [Candidate]` — DeepSeek prompt: given the
    profile, name up to 6 real, well-known competitors with `name`, `url`, `why`.
    Strict JSON. Only for `is_saas`.
  - `validate_candidate(url, profile) -> Validated | None` — `/scrape-raw` the URL;
    drop on fetch failure; keep `name/url/why` + scraped one-liner if reachable.
  - `discover_competitors(profile, limit=4) -> [Validated]` — suggest → validate in
    parallel → return top validated.
- **Routes** (`app/routes/onboarding.py`):
  - `POST /api/v1/onboarding/profile` `{url}` → profiles, stores on user, returns
    `{profile, is_saas}`. Auth required.
  - `POST /api/v1/onboarding/discover` → uses stored profile → returns
    `{competitors: [...]}` (validated). Auth required. SaaS only (else empty +
    `reason: "local"`).
  - Keep existing `POST /business-type`.
- **Tests** (`tests/test_onboarding_magic.py`): profiler parses scraped text to
  profile (DeepSeek mocked); discovery drops unvalidated URLs; non-SaaS returns
  empty; endpoints require auth and persist profile. Mock DeepSeek + the scraper
  HTTP so tests are deterministic.

### Frontend
- **API client** (`frontend/src/lib/api.ts`): `profileBusiness(url)`,
  `discoverCompetitors()`.
- **Onboarding modal** (extend `dashboard-client.tsx` flow): new first step
  **"Add your website"** (URL input) → animated loading ("Reading your site… building
  your profile… finding competitors…") → **review screen**: the business profile
  (editable name/one-liner) + discovered competitors as a checklist (pre-checked) →
  **confirm** → selected competitors run through the existing add→scan→battlecard
  flow. Manual add-by-URL remains accessible.
- **Dashboard** "Your business" card: shows the stored profile (name, one-liner,
  category, positioning) at the top of the dashboard. Non-blocking; renders only
  when `business_profile` exists.

## Data flow
signup → `/onboarding/profile {url}` → store profile → dashboard "Your business"
card + `/onboarding/discover` → validated competitors → user confirms → existing
`POST /competitors` per pick → `_run_onboarding_scan` → `/scan/status` poll → first
battlecards.

## Error handling
- Sidecar/scrape failure on the user's URL → return a minimal profile from direct
  HTTP + let the user edit; never hard-fail onboarding.
- DeepSeek failure/empty → profile falls back to scraped headline; discovery returns
  empty with a friendly "add your first competitor" nudge.
- Discovery validation network errors → skip that candidate, continue.

## Out of scope (post-deadline)
Local/geo competitor discovery; a real web-search API; multi-language sites;
re-profiling cadence; editing the full profile beyond name/one-liner.
