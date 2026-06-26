# Rivalscope Launch-Day Outreach Campaign — Design Spec

**Date:** 2026-06-26
**Status:** Approved design, pre-implementation
**Owner:** Founder (@Manss_dev) + Claude (copy + orchestration)
**Goal:** Drive signups/trials via a free-competitor-teardown offer across X, LinkedIn, Reddit, and founder communities.

---

## 1. Objective & honest target framing

**Primary outcome:** signups/trials, today.

**On the "1,000 signups" target:** 1,000 is the *flywheel* goal, not a day-one number. A brand-new product's launch-day organic outreach realistically lands tens of signups (low hundreds only if a Reddit post or tweet pops). The path to 1,000 is: validate that the teardown hook converts → reuse every teardown as evergreen proof → repeat weekly → layer paid amplification on whichever channel converts best. **Today's job: build and validate the engine, and instrument it so we know what works.** No vanity metrics, no fabricated traction.

---

## 2. Validated design — one campaign, three pressure points

Single hook (**free competitor teardown**), three layers:

- **Inbound (A) — the engine.** Every post leads with a *real* teardown screenshot as proof, then opens the offer: "drop your competitor's URL 👇, free, first 20." Each request is fulfilled with the authenticated, AI-generated Battle Card + a soft "this auto-updates weekly if you sign up" CTA.
- **Self-serve (B) — the escape hatch.** Every post/DM also carries a direct instant-report link (per-channel UTM) so anyone who won't wait converts on the spot.
- **Outbound (C) — proactive reach.** Founder DMs ~10–15 targeted founders on X + LinkedIn, one-to-one, offering a teardown.

**Channels:** X (@Manss_dev), LinkedIn, Reddit, founder communities (Indie Hackers + owned Slack/Discord).

---

## 3. Prerequisites — gates before any post goes live

1. **GATE 1 — Offer-quality smoke test.** Run one real teardown on the live product end-to-end and confirm it returns the rich AI card, *not* the heuristic baseline. Tells: card depth/specificity, `ai_generated: true`, no `is_baseline` degrade, no `note_degraded` event. **If it's heuristic, the offer is dead until the AI provider is funded — stop and top up first.**
2. **GATE 2 — Capacity cap.** "Free for the first 20" — creates urgency and bounds per-teardown AI cost. Adjustable.
3. **GATE 3 — Provider funding confirmed.** Authenticated cards call the paid model; these have gone dry before (silent fallback to heuristic). Confirm funded before promising quality.

**Verified 2026-06-26:** live backend healthy (commit `75a7755`); provenance signals (`ai_generated`, `note_degraded`, `is_baseline`) confirmed present; AI-credit balance NOT remotely verifiable → Gate 1 must be done on the live app.

---

## 4. Seed assets — the proof

Pick **2–3 well-known SaaS rivalries the audience cares about**, run them through Rivalscope for real, screenshot the actual cards.

- **Candidate pairs:** Notion vs Coda, Linear vs Jira, Vercel vs Netlify, Stripe vs Lemon Squeezy. (Founder confirms / swaps for ICP-closer rivalries.)
- **Hard rule:** screenshots are real product output only. No fabricated findings, stats, customers, or quotes.

---

## 5. Per-channel content (Claude drafts all of it)

- **X (@Manss_dev):** follow-up post in the existing launch thread's voice — teardown screenshot + offer. Plus reply-engagement on relevant threads + the outbound DMs (C).
- **LinkedIn:** founder-voice post + proof screenshot + offer; outbound DMs to network (C). May lean on the authentic founder-build narrative (17-yo-founder angle optional, founder's call).
- **Reddit:** value-first post in r/SaaS / r/Entrepreneur — the teardown *is* the post (genuinely useful), tool mentioned softly, free teardowns offered. Respect each sub's self-promo rules; zero link-spam.
- **Communities:** Indie Hackers + owned Slack/Discord show channels — teardown + offer.

---

## 6. Voice guardrails (reused from the live launch posts)

Hook → story → offer. Plain human voice. No hype, no emoji-spam, no em-dashes, no invented stats/customers/quotes. Humanizer-checked. Real screenshots only. Posting is done by the founder's Claude browser extension, verbatim.

---

## 7. Fulfillment SOP (per inbound URL)

Add competitor → scan → generate authenticated Battle Card → screenshot → reply/DM with the card + their UTM'd trial link. Respect the first-20 cap; after that, point new requests to the self-serve link.

---

## 8. Success tracking

- Per-channel UTM tags on the self-serve link (`?utm_source=<channel>&utm_medium=outreach&utm_campaign=teardown-2026-06-26`).
- Definition of done for the *engine* (today): offer validated live, 3 seed teardowns published, all 4 channels posted, outbound DM batch sent, UTMs live so channel→signup attribution is visible.
- The 1,000 target is tracked over the flywheel, not this session.

---

## 9. Out of scope (today)

Paid ads, landing-page redesign, a dedicated teardown landing page, email sequences, and any automation of fulfillment. These are flywheel-phase, not launch-day.
