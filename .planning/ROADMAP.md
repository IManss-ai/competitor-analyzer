# Roadmap: Competitor Analyzer Platform

## Overview

Build a competitive intelligence platform for bootstrapped SaaS founders in three phases. Phase A (8 weeks) ships the core monitoring + action generation loop at $99/mo. Phase B (months 3-6) adds integrations (Stripe, Mailchimp, Webflow) and approval-to-execute one-click. Phase C (months 6-18) achieves autonomous execution — the platform acts for the founder without requiring approval. Phase A builds the trust and accumulated context that makes Phase C defensible.

## Milestones

- [x] **Milestone 1: Phase A** — Core monitoring + action platform, $1K MRR target

## Phases

- [x] **Phase 1: Core Platform** — Monitoring pipeline, action engine, web app, Stripe billing

## Phase Details

### Phase 1: Core Platform
**Goal**: Ship a working product where founders can sign up, enter competitor URLs, and receive a weekly brief + action queue with ready-made response assets.
**Depends on**: Nothing (first phase)
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-10, REQ-11
**Success Criteria** (what must be TRUE):
  1. A founder can sign up via Stripe, enter 3-7 competitor URLs, and receive a Monday brief via email
  2. The brief contains: per-competitor change summary, classification, and at least one action draft (email/copy/social) for non-trivial changes
  3. The web app approval queue shows action cards; founder can approve (one-click copy-to-clipboard) or edit
  4. On-demand scan works within 24h of signup
  5. Brand voice edits are stored in approved_actions table
  6. Gross margin > 99% (COGS < $1/customer/month at Phase A scale)
**Plans**: 6 plans

Plans:
- [x] 01-01: Monitoring pipeline — Jina fetch, snapshot storage, character-level diff
- [x] 01-02: Change classifier + brief synthesis — GPT-4o-mini classification and weekly brief text
- [x] 01-03: Action generation engine — GPT-4o retention email, copy suggestion, social draft
- [x] 01-04: Web app foundation — FastAPI + HTMX + Postgres + magic link auth
- [x] 01-05: Approval queue UI + settings + brand voice capture
- [x] 01-06: Stripe billing + Mailgun delivery + cron scheduler + on-demand scan

## Progress

| Phase | Plans | Status | Completed |
|-------|-------|--------|-----------|
| 1: Core Platform | 6 | Completed | 6 |
