# Discovery Engine — Design Spec

**Date:** 2026-06-10
**Status:** Approved
**Sub-project 1 of 3** in the Rivalscope platform expansion (1. Discovery engine → 2. Figma UI/UX rebuild → 3. Verified revenue layer). This spec covers sub-project 1 only.

## Vision context

Rivalscope expands from "track competitors you add yourself" into a platform combining AppKittie-style intelligence and TrustMRR-style verified data, for web apps/SaaS: **search, track, monitor any web business.** Monitoring already exists (current product). This sub-project adds the discovery layer: a searchable, public database of web apps with signals we collect ourselves.

## Goals

1. A browsable/searchable database of 1,000–2,000+ web apps at launch, growing automatically.
2. Public per-app profile pages that double as SEO landing pages and funnel visitors into the paid product ("Track this app").
3. All of it additive: existing Rivalscope users and flows keep working at every step.
4. Near-zero marginal AI cost, enforced structurally (see Cost guardrails).

## Non-goals (deliberately out of scope)

- Traffic/revenue estimates from third-party data providers.
- The Figma redesign (sub-project 2 — discovery ships on the current v3 "Intelligence Desk" theme).
- Verified revenue, app claiming by founders, acquisition marketplace (sub-project 3; we only ship a "claim this app" stub link).
- User app submissions.
- Dedicated search infrastructure (Meilisearch/Typesense). Postgres FTS until it hurts.

## Architecture

One new core entity, **`App`** — a web app that exists in the world, independent of any user. `Competitor` becomes conceptually "a user's subscription to an App" via a nullable `app_id` FK. Monitoring (existing), discovery (this spec), and verified revenue (later) all hang off `App`.

```
                        ┌─ AppPricing (scraped tiers)
  App ──────────────────┼─ AppTech (detected stack)
   │  (public profile)  ├─ Review/hiring signals (existing pipeline, via linked competitors)
   │                    └─ Change velocity (existing differ, via linked competitors)
   │
   ├── Competitor (user_id + app_id) ← existing monitoring, unchanged behavior
   └── [phase 3] VerifiedRevenue
```

## Data model (all additive)

### New tables

**`apps`**
- `id` UUID PK
- `slug` String, unique, indexed — for `/apps/{slug}`
- `url` String, unique (normalized: scheme stripped, lowercase host, no trailing slash)
- `name`, `tagline`, `description` — extracted
- `category` String, `tags` Text (JSON array)
- `logo_url`, `screenshot_url`
- `source` String: `seed` | `user_tracked` | `submitted`
- `scan_tier` String: `cheap` | `full`
- `scan_status` String: `ok` | `scan_failed` | `pending`
- `first_scanned_at`, `last_scanned_at` DateTime
- `search_vector` tsvector (Postgres only; generated column or trigger), GIN-indexed

**`app_pricing`** — `id`, `app_id` FK, `tier_name`, `price` Float nullable, `currency`, `period` (`monthly`|`yearly`|`one_time`|`free`), `features` Text (JSON), `scraped_at`

**`app_tech`** — `id`, `app_id` FK, `technology` String (canonical key, e.g. `nextjs`, `stripe`, `intercom`), `tech_category` String (`framework`|`payments`|`analytics`|`support`|…), `detected_at`. Unique on (app_id, technology).

### Changed tables

**`competitors`** — add nullable `app_id` UUID FK → `apps.id`.

### Migrations

1. Create the three tables + `competitors.app_id`.
2. Backfill: for each distinct normalized competitor URL, create an App (`source='user_tracked'`, `scan_tier='full'`) and set `competitors.app_id`. Idempotent.

No re-keying of existing signal tables (snapshots, change_events, reviews, etc.) — they stay keyed by `competitor_id`. Public profiles read review/hiring/change data through any linked competitor rows.

## Population pipeline

### Seed importer
- CLI script (`scripts/seed_apps.py`), runs offline — never in the request path.
- Sources: Product Hunt API + curated SaaS list files checked into `data/seed/`.
- Idempotent by normalized URL. Creates `apps` rows with `source='seed'`, `scan_tier='cheap'`, `scan_status='pending'`.

### Cheap scan tier (seeded apps)
Per app: sidecar `POST /scrape-raw` (our container, free) → **one** `claude-haiku-4-5` call extracting `{name, tagline, description, category, tags, pricing_tiers}` as JSON → regex/heuristic tech detection from raw HTML (zero AI) → screenshot via sidecar. Refresh cadence: monthly batch job.
Estimated cost: ~$3–5 per full sweep of 2,000 apps.

### Full tier
Exactly today's Rivalscope weekly pipeline; applies only to apps with at least one paying tracker. An app is promoted `cheap → full` when a user tracks it.

### Cost guardrails (hard requirements, lesson of 2026-06-10 credit drain)
- `SEED_SCAN_DAILY_LIMIT` env var caps cheap-tier scans per day; batch job stops at the cap.
- **No Sonnet anywhere in the crawler.** Haiku only, one call per app per refresh.
- Every fallback/degraded extraction calls `note_degraded()` (existing observability convention).
- Public discovery endpoints must never trigger a paid model call (regression-tested, same class as `test_public_endpoint_never_calls_ai`).

## Search

- `GET /api/v1/apps/search` — params: `q`, `category`, `max_price`, `tech`, `min_review_score`, `actively_shipping` (bool: ≥3 change events in the last 90 days via linked competitors), `sort` (`relevance`|`newest`|`price`), `page`.
- Postgres: full-text over name/tagline/description/tags + SQL facet filters. SQLite (dev/tests): `LIKE` fallback behind the same function.
- Public, unauthenticated, but: page size capped, sorting/advanced filters require auth (upsell), simple per-IP rate limit.
- One search module (`app/discovery/search.py`) owns query building; the route stays thin.

## API surface (new router: `app/routes/discovery.py`)

- `GET /api/v1/apps/search` — as above, public.
- `GET /api/v1/apps/{slug}` — public profile payload: app fields, pricing, tech, review summary + hiring signal + change velocity (aggregated from linked competitors when present). Cached-data only; zero AI.
- `POST /api/v1/apps/{slug}/track` — auth required; creates a Competitor linked to the App (or links an existing one); promotes app to `full` tier.
- Sitemap data endpoint for the frontend (`GET /api/v1/apps/sitemap` → slugs + last_scanned_at).

## Frontend (current v3 theme, theme-aware tokens per DESIGN.md)

- **`/discover`** — search bar, facet sidebar (category, price, tech, signals), result cards (logo, name, tagline, category, price-from, signal chips). Public; locked facets show upsell for logged-out users.
- **`/apps/[slug]`** — public profile: header (logo/name/tagline/category/visit link), screenshot, pricing table, tech stack chips, review summary, change-velocity sparkline, **"Track this app"** CTA (auth → creates tracking; unauth → signup), "This is my app — claim it" stub (mailto/waitlist; phase 3 entry point).
- `sitemap.xml` includes all app profiles; per-app OG metadata.
- Dashboard: "Discover" nav item; "Add competitor" gets search-the-database autocomplete with raw-URL fallback.

## Error handling

- Scrape failure → `scan_status='scan_failed'`; profile renders partial data, never a broken page; importer/batch logs and continues.
- Malformed AI extraction JSON → normalizer salvages what parses, marks degraded, never throws into the page.
- Unknown slug → 404; inactive/removed apps → 410-style hidden from search but slug reserved.

## Testing

- Importer idempotency (rerun = no duplicates; URL normalization cases).
- Extraction normalizer: valid, partial, and garbage AI output.
- Tech detection heuristics against fixture HTML.
- Search: each facet filter, pagination, SQLite fallback path.
- Public profile API: full data, partial data, unknown slug.
- Track-this-app flow: creates/links Competitor, promotes scan tier, requires auth.
- **Cost regression: public search + profile endpoints make zero paid-model calls.**
- Backfill migration: existing competitors get linked Apps; existing tests stay green.

## Rollout order

1. Schema + backfill migration
2. Seed importer + cheap scanner + guardrails
3. Search module + API
4. Public profile pages
5. `/discover` UI + dashboard integration
6. Sitemap/OG/SEO pass

Each step is additive and deployable on its own (Vercel + Railway auto-deploy on push to `main`).

## Success criteria

- ≥1,000 apps with populated profiles at launch; seed sweep costs ≤$10 in AI spend.
- Search returns faceted results <500ms at 2k apps.
- Every profile page indexable (sitemap, OG, SSR).
- A logged-out visitor can search → open a profile → hit "Track this app" → land in signup.
- Zero regressions in the 185-test suite; zero paid-model calls from public surfaces.
