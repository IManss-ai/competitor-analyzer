# Competitor Analyzer Platform

## What This Is

A competitive intelligence platform for bootstrapped SaaS founders ($0–50K MRR) that monitors competitors weekly, synthesizes what changed, recommends specific actions, and hands the founder ready-made assets (retention emails, copy updates, social drafts) to execute those actions. The north star is autonomous execution — Phase C delivers responses automatically; Phase A builds the trust and context that makes that possible.

## Core Value

Every Monday, founders know exactly what their competitors did and have the ready-made response sitting in their approval queue.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] REQ-01: Monitor up to 7 competitor URLs weekly using Jina AI reader (r.jina.ai)
- [ ] REQ-02: Detect meaningful changes via character-level diff (>100 net char threshold on extracted text body)
- [ ] REQ-03: Classify changes as pricing_change / feature_add / repositioning / minor_copy / no_change using GPT-4o-mini
- [ ] REQ-04: Synthesize a 2-3 sentence brief per competitor per week using GPT-4o-mini
- [ ] REQ-05: Generate action drafts (retention email, copy suggestion, social response) for non-trivial changes using GPT-4o
- [ ] REQ-06: Web app with approval queue — founder reviews action cards, approves with one click
- [ ] REQ-07: First-run on-demand scan within 24h of signup (activation moment)
- [ ] REQ-08: $99/mo Stripe subscription, 14-day free trial, card required
- [ ] REQ-09: Mailgun email delivery of weekly brief (sent regardless of app login)
- [ ] REQ-10: Brand voice capture — store original draft + founder edits for Phase C context
- [ ] REQ-11: Scheduled cron job (Monday 8am) per customer

### Out of Scope (Phase A)

- Dashboard with historical trends — Phase B
- Stripe integration (founder's OWN Stripe for customer-level churn alerts) — Phase B
- Direct CMS integration for copy push (Webflow, Framer) — Phase B
- Changelog monitoring, G2 reviews, social mention monitoring — Phase B
- Autonomous execution (auto-send, auto-publish) — Phase C

## Context

**Market:** Enterprise CI tools (Klue $88.5M ARR, Crayon, Kompyte) serve >$20K/year customers only. 2M+ bootstrapped founders are completely unserved. Adjacent tools (Visualping, Brand24) give raw alerts with zero synthesis.

**Differentiation:** Not just monitoring — the full loop. Monitor → classify → synthesize → generate action asset → approval queue. Nobody does steps 3-5 for founders at $99/mo.

**Phase A→C arc:** Phase A generates actions and hands assets to founder. Phase B pushes drafts directly into founder's tools (Mailchimp, Webflow). Phase C executes autonomously. Phase A builds the brand voice and behavioral context (approved_actions table) that makes Phase C non-generic.

**Tech stack:** Python FastAPI + HTMX + Tailwind. Jina AI reader (free tier covers Phase A). GPT-4o-mini (classify + synthesize) + GPT-4o (action drafts). Postgres on Railway. Mailgun. Stripe.

**Target:** Solo/2-person SaaS founder, $0-50K MRR, 3-7 competitors, active on IH/X.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Postgres from day 1 (not SQLite) | SQLite not persistent across Railway deploys | — Pending |
| GPT-4o for action drafts (not mini) | Action drafts are the core value prop; quality matters | — Pending |
| No free tier | Non-serious signups dilute early feedback | — Pending |
| Email-only brief delivery + approval queue web app | Activation via email, management via web | — Pending |
| Character-level diff >100 chars on main content only | Suppress A/B test noise and nav changes | — Pending |

---
*Last updated: 2026-06-01 after office-hours design session*
