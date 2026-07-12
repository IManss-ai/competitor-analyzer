# Relaunch-Readiness E2E — 2026-07-13 (Mon)

Prod E2E run against **rivalscope.dev** on the live commit **`efc1e7f`** (unchanged since the
Jul 10 baseline). Throwaway account `qa.relaunch.0713…@rivalqa.dev` (user_id `21ae4247-b163-4b6b-a895-aadfab5fd16f`) — **needs cascade-delete cleanup**.
Timeline context: **internal demo Fri 2026-07-17**, **external demo Fri 2026-07-24**.

## Verdict: product core is SOLID; 2 demo-visible warts + 1 unverified money-path.

## Funnel — full walk (all PASS)
1. **Landing** — clean, premium dark theme, dynamic date (`MON 13 JUL 2026`), realistic dashboard mockup. Demo-ready.
2. **Auth** — unified login/signup ("account created on first sign-in"). The old "signup 404 / no signup option" notes were by-design, not bugs.
3. **Discovery (magic onboarding)** — read linear.app, built a specific AI profile ("…built-in support for AI agents"), found 4 real competitors (Jira/Asana/Monday/Notion). **DeepSeek is live** (specific, non-heuristic output).
4. **Tracking** — "Start tracking" → auto-runs initial baseline scan.
5. **Scan** — baselines captured for all 4; review scraping ran.
6. **Battle card (centerpiece)** — real AI 4-quadrant card: Exec Summary (contextualizes *your* biz vs competitor), Detected Changes, **User Complaints surface**, Strategic Signals, 5-play ranked Playbook w/ copy-to-clipboard. Excellent.
7. **Paywall / cost-guard** — free test consumed on 1st card; 2nd card correctly gated ("Your free test is used"); **earned report persists** on dashboard (HEAD-TO-HEAD You-vs-Asana). Cost guard intact.

## Review Intelligence — WORKS (Trustpilot), G2 blocked
- Asana ★1.4 / 19 reviews / **14 complaints** · Jira ★1.0 / 18 / **18** · Monday ★1.2 / 14 / **13** — with real complaint-cluster chips (bait-and-switch, billing/unauthorized charges, hidden paywalls, data lockout).
- **G2 = 0 reviews on ALL 4** (DataDome-blocked — known, needs paid API). Notion has no Trustpilot either.

## Findings (ranked)
1. 🔴 **Markdown `**` bug is LIVE and front-and-center** — every intelligence brief renders raw `**INTELLIGENCE BRIEF: Asana**` asterisks in the Intel Feed + Signal Board. NOT on the battle-card quadrants (those render clean). **Fix is ready & unmerged**: `feat/battlecard-frontend-demo-fixes` (de45007, 652 tests green).
2. 🟠 **Review averages misrepresent products** — "AVG REVIEW 1.2", "Jira ★1.0", "Asana ★1.4" are Trustpilot-negativity-skewed (TP collects complainers). Any demo viewer knows Jira isn't a 1-star product → reads as broken/dishonest data. Needs reframing (e.g. "complaint signal" not "rating", or blend/label the source).
3. ✅ **Money-path VERIFIED WORKING** (resolved) — the QA dead-end was purely the undeliverable `@rivalqa.dev` email (Polar 422). A fresh signup on a **deliverable** email (`manssjones+rsqa0713@gmail.com`) produced a **real live Polar checkout URL** (`polar.sh/checkout/polar_c_LNANiD…`, returns HTTP 200) with NO dead-end. Note: that fresh account was *also* `subscription_status:"trialing"` yet got a working checkout → **"trialing" does NOT suppress checkout** (it's a vestigial default label; `access_level` is the real gate). Money path is not a launch blocker.
   - ⚠️ Residual UX gap: for genuinely-undeliverable emails the panel shows a **no-retry dead-end**. Rare, but a real user with a typo'd email is stuck. Low priority.
4. 🟠 **`subscription_status:"trialing"` on a brand-new FREE account** (trial_ends_at tomorrow) — vestigial from the removed Polar trial; `access_level:"read_only"` still gates correctly, so cosmetic/confusing not broken.
5. 🟠 **Login splash markets "11 new G2 complaints"** — collides with the standing "don't market G2 until unblocked" rule; illustrative copy but on the money-page.
6. ⚪ **Stale free-test badge** — transient ("1 free test available" until a state change flips it to "Free test used"); self-resolves, low priority.

## Unshipped work ready to ship (off efc1e7f, verified Jul 10)
- `fix/reviews-surface-complaints` (c30cf22) — backend complaint-surfacing + 13 tests.
- `feat/battlecard-frontend-demo-fixes` (de45007) — inline `**` markdown render + stop-tracking on detail page.
- Uncommitted on main: `scraper-service/index.ts` Trustpilot cookie-wall fix (unverified; replaces a working path → regression risk).

## Cleanup
Both throwaway accounts cascade-deleted via `railway ssh` (FK-safe): users `21ae4247…` + `f8ce7b95…`, 73 rows total (4 competitors, 51 reviews, 7 review_snapshots, 4 change_events, 4 snapshots, 1 battlecard_cache, 2 users). Prod metrics un-skewed.
