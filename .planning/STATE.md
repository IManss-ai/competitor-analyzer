# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-01)

**Core value:** Every Monday, founders know what competitors did and have the ready-made response in their approval queue.
**Current focus:** Phase 2 — Integrations & Historical Trends

## Current Position

Phase: 2 (Integrations + Dashboard)
Plan: 1 of 4 started (in progress)
Status: Phase 1 complete; Phase 2 Feature 1 (Historical Trend Dashboard) shipped
Last activity: 2026-06-02 — Shipped /trends page: weekly activity chart, activity heatmap, per-competitor change-type breakdown

Progress Phase 1: [▓▓▓▓▓▓▓▓▓▓] 100%
Progress Phase 2: [▓▒▒▒▒▒▒▒▒▒] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 6 (Phase 1) + 1 (Phase 2 trends)
- Tests: 52 passing (was 42)

## Accumulated Context

### Decisions

- 2026-06-01: Postgres from day 1 (not SQLite) — Railway doesn't persist SQLite across deploys
- 2026-06-01: GPT-4o for action drafts (not mini) — action quality is core value
- 2026-06-01: No free tier — card required at signup
- 2026-06-01: Character-level diff >100 chars net on main content body only
- 2026-06-02: Chart.js (CDN) for /trends charts — zero build step, consistent with existing CDN stack

### Phase 2 Feature Completion Order

- [x] Feature 1: Historical Trend Dashboard (/trends) — weekly chart, heatmap, per-competitor breakdown
- [ ] Feature 2: Mailchimp integration — push approved retention emails as draft campaigns
- [ ] Feature 3: Webflow integration — push approved copy suggestions to Webflow CMS
- [ ] Feature 4: G2/Trustpilot review monitoring

### Pending Todos

None yet.

### Blockers/Concerns

- Jina free tier covers ~1K req/month (~308/month at 11 customers, safe for Phase A)
- Upgrade to $20/mo Jina paid tier before 40+ customers

## Session Continuity

Last session: 2026-06-02
Stopped at: Phase 2 Feature 1 (Historical Trend Dashboard) complete. 52/52 tests passing.
Next: Feature 2 — Mailchimp integration
