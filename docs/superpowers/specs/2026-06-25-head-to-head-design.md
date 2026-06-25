# Head-to-Head ("You vs. {Competitor}") — Design Spec (2026-06-25)

## Goal
Turn the per-competitor analysis from a competitor-only read into an honest
**comparative verdict**: where the user *wins*, where they're *exposed*, and the
ranked plays — grounded in real scraped data, with inferred points clearly tagged.
Leverages the user's own `business_profile` (from magic onboarding) as the thing to
compare against.

## Decisions (locked with user)
- **Core wow:** "Where you win / where you're exposed" verdict per competitor.
- **Honesty model:** show the full read; tag low-confidence points with a quiet
  `inferred` marker (vs `observed` = backed by scraped evidence). Never fabricate;
  thin data → fewer points + an honest "enriching as we scan" note.
- **Surface:** a dedicated **Head-to-Head module** at the top of the competitor
  detail page (`/competitors/[id]`) AND shown as the onboarding climax (first
  competitor, after its scan).
- **Build path (low-risk):** reuse the existing battle-card generation + cache —
  NO new table, NO migration. Ship tonight only if it lands cleanly; else hold and
  keep the proven build frozen.

## Architecture

### Backend — reuse battle-card generation + cache
The battle-card generator (`app/routes/battlecard.py`, `_generate_saas_battlecard`
~:303, `get_or_generate_battlecard` ~:618, cached in `BattleCardCache.payload`)
already gathers the competitor's homepage snapshot, G2/Trustpilot complaints, and
hiring signals. Extend it:
1. Load the requesting user's `business_profile` (JSON on `User`). If absent → skip
   head-to-head, return today's battle card unchanged (graceful).
2. Pass the profile into the generation prompt and have DeepSeek ALSO emit a
   `head_to_head` block, stored in the SAME `BattleCardCache.payload` (one cached
   call produces both; cost-guard + freshness window unchanged).
3. `head_to_head` shape:
   ```json
   {
     "verdict": "one honest sentence",
     "you_win":    [{"point": "...", "basis": "what it's grounded in", "confidence": "observed|inferred"}],
     "you_exposed":[{"point": "...", "basis": "...", "confidence": "observed|inferred"}],
     "plays":      [{"rank": 1, "title": "...", "detail": "..."}]
   }
   ```
   Prompt rules: every point must cite its `basis`; mark `observed` only when backed
   by a complaint/snapshot/hiring fact, else `inferred`; if competitor data is thin,
   return fewer points (don't pad). Heuristic/empty `head_to_head` when AI
   unavailable (mirror the existing battle-card heuristic fallback).
- **Endpoint:** reuse the existing battle-card GET (it already returns the cached
  payload) — `head_to_head` rides along in the response. The public `/share` /
  `/public` endpoints must continue to NEVER trigger a paid call (unchanged).
- **Honesty invariant:** `head_to_head` is only populated when a real
  `business_profile` exists; the public/heuristic paths return it empty.

### Frontend — dedicated Head-to-Head module
- New `components/head-to-head.tsx`: verdict headline; two columns
  **Where you win** (emerald accent) / **Where you're exposed** (amber accent), each
  point rendering `point` + a muted `basis` line + a subtle `inferred` chip when
  `confidence === "inferred"`; then a ranked **Plays** list. shadcn tokens,
  sentence case, mono only for the rank numerals; theme-aware. Renders nothing when
  `head_to_head` is absent/empty (graceful).
- **Placement 1:** top of `/competitors/[id]` (competitor detail) — reads the
  battle card it already fetches and renders `head_to_head` above the existing
  quadrants.
- **Placement 2:** onboarding climax — the existing onboarding battlecard step
  shows the first competitor's `head_to_head` as the payoff.

## Data availability (honest by construction)
At the onboarding moment the competitor's review/hiring scrape may still be running,
so the first head-to-head may be positioning-level (profile vs homepage) with an
"enriching as we scan" note; it deepens automatically when the battle card
regenerates after the scan completes (new-intel freshness trigger already exists).

## Error handling
- No `business_profile` → no head-to-head, today's battle card unchanged.
- Thin competitor data → fewer points + honest note; never padded.
- AI failure → empty `head_to_head` (heuristic), UI hides the module.

## Testing
- Generator: given profile + competitor data (DeepSeek mocked) → correct shape,
  `observed`/`inferred` tagging, fewer points on thin data, empty on no-profile.
- Battle-card response still valid when `head_to_head` present/absent.
- Cost-guard: `/share` + `/public` never generate (regression intact).

## Out of scope (post-deadline)
Standalone `/head-to-head` destination page; dimension scorecard (pricing/features
matrix); local-business comparison; head-to-head history/diffing over time.
