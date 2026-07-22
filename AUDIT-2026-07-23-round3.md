# Adversarial Audit — Round 3 (2026-07-23)

Round-3 sweep across three previously-thin areas: **frontend** (never deeply audited),
**scan pipeline** (what rounds 1–2 missed), and **API/routes** (what rounds 1–2 missed).
Each finding was verified by re-reading the code path end-to-end; speculative items discarded.

**Status: DOCUMENTED, NOT FIXED.** Nothing in this round was changed. Fixes were deferred
because (a) the session was running unsupervised overnight, and (b) the sharpest finding is a
paywall *business-logic* decision that is the founder's call, not a clear-cut bug. Triage in the
morning alongside the round-2 branch deploy.

---

## API / Routes

### HIGH — Campaign/planner/geo paid paths gate on the wrong access check
`app/routes/campaigns.py:114` (war-room GET), `:186` (`/regenerate`), and the geo call at `:122`.

Round-2 established (finding D) that `is_read_only` / `require_write_access` is the **wrong gate**
for unmetered paid generation: an *untested* free user has `free_test_used=False`, so
`access_level()` returns `"full"` and `is_read_only()` returns **False**. The battlecard detail
page was fixed to gate on `_is_paying_subscriber` (`api_v1.py:721`). The campaign/war-room/geo
surfaces were **not** — they still gate on `is_read_only`, so an untested free user passes and
triggers paid DeepSeek generations that never consume their one free test.

- `POST /campaigns/{id}/regenerate` calls `get_or_generate_plan(..., force=True)`, which skips the
  cache branch (`planner/engine.py:301`) and fires a paid call **on every request** → unbounded
  cost-drain loop for a non-paying user. (Matches Octarin obs 7084.)
- `GET /campaigns/{id}` (war room) fires paid plan generation **and** a paid GEO check on a GET for
  untested-free viewers.

**Why this is DEFERRED, not fixed:** round-2 deliberately wrote
`tests/test_audit_warroom_readonly_cost_guard.py::test_full_user_still_generates` with
`free_test_used=False` **asserting** an untested-free user DOES generate a war-room plan. So the
`is_read_only` gate here may be a *chosen* contract (untested-free users get the war room as part of
their free experience), not an oversight. It IS inconsistent with the detail page, and the
`force=True` `/regenerate` loop IS a genuine unmetered drain — but **which contract is correct is a
founder decision.** Do not silently flip it.
Recommended resolution when decided: add `is_subscriber()` to `app/access.py` (single source of
truth — `_is_paying_subscriber`'s own docstring asks for this) and gate these paths on it, OR
consume the free test atomically; then update the round-2 test to match the chosen contract.

### LOW — Competitor-cap race, API path only
`app/routes/api_v1.py:567-590` counts active competitors then inserts with **no row lock**. The
legacy HTML twin `competitors.py:44-46` does the same insert under `with_for_update()` to serialize
against `MAX_COMPETITORS=7`. Concurrent `POST /competitors` on the API path can both pass the check
and exceed the cap. Own-data only (cap-evasion, not IDOR).

### LOW — Unvalidated pagination → 500 instead of 422
`app/routes/api_v1.py:353-359` (`/dashboard/feed`): `limit`/`offset` unbounded. Negative `offset`
→ negative SQL OFFSET → **Postgres (prod) raises 500**; SQLite (dev) silently ignores it, so dev
tests don't catch it. Own data; crash-instead-of-422. (`/apps/search` is safe — it clamps.)

### VERY LOW — Legacy billing error echoes exception text into template
`app/routes/billing.py:42-47`: `GET /billing/checkout` interpolates `str(e)` into the settings
template on failure. The JSON `api_v1` checkout was hardened to generic 503s; this HTML sibling
wasn't. Own-user, no stack trace — cosmetic info-leak.

### INFORMATIONAL — Password hashing is SHA-256 with a single static salt
`app/auth.py:159-169`. No per-user salt, fast hash. Documented as "dependency-free" by design and
pre-existing. Flagged for completeness, not as a round-3 target.

**Verified clean:** free-test consumption race (atomic conditional UPDATE + refund), one-row-per-
competitor `battlecard_cache` upsert (IntegrityError→update retry), public/share endpoint (never
paid, strips `head_to_head`), migrations 011/012 (dual-dialect + reversible), billing webhook
(signature-verified, metadata `user_id` never trusted for authz). No IDOR found.

---

## Scan Pipeline

### HIGH-1 — Classifier silently erases pricing changes the differ correctly flagged
`classifier.py`. Two independent paths downgrade a differ-confirmed change to a noise type, which
`scanner.py:144` skips and `scheduler.py:80` drops from the weekly email:
- **(a)** `classify_change` has **no `if not llm.ai_available()` short-circuit** (unlike every other
  call site). On a dummy key or any DeepSeek outage it falls to `_classify_heuristically`, which
  detects pricing only via `kw in after and kw not in before` (`:78`). A real `$19→$29` change on a
  page already containing `$`/`price`/`plan` in both versions → `minor_copy` → suppressed.
- **(b)** Each side truncated to `[:3000]` (`:35-36`) while the differ ran on full text. A change
  below char 3000 → `before_trunc == after_trunc` → `no_change`/`minor_copy`. **Fires even with AI
  fully available.**

Direct hit on the core promise (surface competitor pricing moves). Matches Octarin obs 9117.

### HIGH-2 — Differ price-swap gate only recognizes currency amounts
`differ.py:14-18` (`_PRICE`) matches only currency tokens. When `chars_changed ≤ 100`, the only
escape hatch is a change to the currency multiset. Misses:
- `"14-day free trial" → "7-day free trial"` (~7 chars, no currency token) — classifier never
  called, yet the classifier prompt lists "trial terms changed" as `pricing_change`.
- `"$49 per user per month" → "$49 per month"` (per-seat→flat, <100 chars, `$49` in both).

Incomplete implementation of the gate's stated goal, not a taste call.

### MEDIUM-1 — `review_scraper` persists the raw model rating, bypassing `_coerce_rating`
`review_scraper.py`: `_coerce_rating` (`:29-39`) is used for sentiment (`:242`) but the **persisted**
`Review.rating` bypasses it — insert `rating=rev.get("rating")` (`:250`) and update
`existing.rating = rev.get("rating", existing.rating)` (`:259`). `google_reviews_scraper.py:108`
coerces before persisting — clear asymmetry.
- Always-true: explicit `"rating": null` → key present → overwrites a good integer with `None`.
- Postgres escalation (hedged): non-int-coercible value on the INTEGER column → `DataError` at
  commit → outer handler rolls back the **entire run's reviews for that platform**. SQLite stores
  silently → dev tests miss it.

### MEDIUM-2 — Concurrent scans of the same competitor double-insert + double-spend
`scanner.scan_competitor` has no lock/advisory-lock/unique constraint over the
competitor→snapshot→ChangeEvent sequence. `POST /scan/now` (`scan.py:37`, BackgroundTask) overlapping
the weekly cron for the same competitor → both fetch (2× paid), both insert snapshots, both insert a
`ChangeEvent` and run classify+synth+action (doubled paid spend). Prod Postgres only; SQLite
serializes writes and hides it. `ChangeEvent` has no uniqueness beyond its PK.

### LOW-1 — Null-list crash cluster (missing `or []` guard)
Model can emit `"<list>": null`; `dict.get(key, [])` returns `None` when the key is present.
`google_reviews_scraper.py:81` and `job_tracker.py:206` guard with `... or []`; these don't:
- `social_tracker.py:99` (`posts`), `review_scraper.py:213` (`reviews`), `:223` (`complaint_reviews`).
Each is caught → that platform silently skipped (no cross-platform damage) → Low, but easy fix.

### LOW-2 — `ReviewSnapshot.avg_rating`/`total_reviews` written from unguarded model output
`review_scraper.py:214-215, 268-269`. Not a crash (nullable), but a successful extraction can persist
garbage/`null` averages that the dashboard then displays as ground truth.

**Verified clean:** all 20 `chat.completions.create` sites pass `extra_body=llm.THINKING_OFF`;
differ normalization is symmetric; AI-unavailable fallbacks present everywhere except classifier
(HIGH-1a); sidecar non-200/malformed-JSON handled (direct-HTTP fallback + serialization-flip guard).

---

## Frontend

### MEDIUM — Unguarded `change_type.replace()` crashes Intel Feed + Change-History timeline on null `change_type`
`dashboard-client.tsx:1358` and `competitor-detail-client.tsx:538` call
`event.change_type.replace(/_/g,' ')`. `ChangeEvent.change_type` is `nullable=True`
(`models.py:79`) and `scanner.py:138-139` writes the row (`change_type=NULL`) via `flush()` **before**
the awaited `classify_change()` on `:141` sets it — so an interruption in that window, or
historical/backfilled rows, leaves a persisted null → `null.replace(...)` → `TypeError` → the page
falls to its error boundary. `war-room-client.tsx:46,334` independently types this field
`string | null` and guards it — the two sites above are the outliers. Fix:
`(event.change_type ?? 'change').replace(/_/g,' ')`.

### LOW — Ungated `new Date().getFullYear()` in the login footer (hydration #418 hazard)
`(auth)/auth/login/page.tsx:299`. The same file gates its clock-derived `today` behind
`useMounted()` (`:106-109`) but renders the footer year raw during SSR. On New Year's Eve, UTC server
vs positive-offset browser can differ by a calendar year → server HTML ≠ first client render → #418.
Rare (a few hours/year). Fix: gate with the existing `mounted` flag or drop the dynamic year.

**Verified clean:** auth/token (all `Bearer ${apiToken ?? userId}`, no raw-UUID sites);
battle-card object-as-string coercion (every render surface); hydration (all `toLocale*` gated
except the Low above); paywall/read_only (route-aware gate, cache-only reads, 402→refresh/checkout,
sidebar free-test race resolved); public `/apps/{slug}` (backend guarantees array fields);
ReviewIntelligence index-pairing (order-preserving); theme (no hardcoded-hex violations).

36 of ~90 frontend files read in full (the full load-bearing set) + whole-tree greps for the
targeted bug classes.

---

## Morning triage order (suggested)
1. **Round-2 branch deploy** (`fix/audit-2026-07-21-findings`, HEAD 9c67752) — verified GO: 765
   tests green, prod at rev 010, migrations clean. Deploy awake.
2. **Decide the paywall contract** (API HIGH) — founder call; then fix war-room/regenerate/geo +
   the round-2 test together.
3. **Pipeline HIGH-1/HIGH-2** (pricing changes silently dropped) — highest product impact; safe to
   fix TDD.
4. **Frontend MEDIUM** (null `change_type` crash) — one-line guard ×2, safe.
5. **Pipeline MEDIUM-1** (rating overwrite), then the LOW cluster (`or []` guards).
