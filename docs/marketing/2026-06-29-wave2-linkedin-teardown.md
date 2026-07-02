# Wave 2 — LinkedIn Teardown (2026-06-29)

**Goal:** Ship the free-competitor-teardown offer that was designed on 06-26 but never actually ran, on the one channel with real reach. Convert the single warm inbound lead.

---

## Diagnosis (from real analytics, pulled 2026-06-29)

Wave 1 ("crickets") was misread as an offer failure. The data says otherwise:

- **X is reach-dead.** @Manss_dev has 34 followers. Both threads (06-23, 06-26) totaled ~130 views, zero external replies, empty DM inbox. No message lands at that impression count. **Stop investing copy effort on X.**
- **LinkedIn is the real asset.** Mansur Zhiger: 2,251 followers. The 06-27 post got **547 impressions, 31 reactions, 2 comments, 1 repost**, and the only genuine inbound in the whole dataset: Muntazar Al Sayeed DM'd asking smart product questions ("where is Rivalscope's ICP most active?").
- **The teardown engine was never actually shipped.** What posted were generic announcements ("Every company has competitors…", "paste your website, it finds your competitors"). There is **no Jira proof post anywhere**. The designed asset (real teardown screenshot + "drop your competitor, free" offer) never ran. The hook isn't disproven — it's untested.
- **Attribution is blind.** Server-side UTM/referrer capture is NOT wired (`app/models.py` has no source column for it). Vercel UTM breakdown is paywalled (Web Analytics Plus). 16 "referrers" were `vercel.com` (own dashboard previews); `/dashboard` + `/auth/login` traffic is the founder. Real prospect traffic was a trickle. Use LinkedIn-native signals as the scoreboard.

**Strategy:** Concentrate fire on LinkedIn. Ship the real teardown post. Convert the warm lead. Mirror to X for free. Hold Reddit/IH until LinkedIn is maxed (cold self-promo gets punished there and we have no standing yet).

---

## Step 0 — Capture real proof (GATES everything; do this first)

Browser-extension prompt:

```
In rivalscope.dev (I'm logged in):
1. Make sure Jira is in my tracked competitors. If not, add https://www.atlassian.com/software/jira and run a scan.
2. Open Jira's Battle Card.
3. Check the "User Complaints" section. It should have SPECIFIC real complaints, not generic filler. If it looks thin/generic, STOP and tell me — the AI credits may be dry.
4. If rich and specific: screenshot the User Complaints section.
5. Check my account's home company setting. If set to "Linear," the Playbook will read "Linear vs Jira" (confusing for a public post). Either clear/set it to my own company, or screenshot the Complaints section alone (strongest proof anyway).
Report back: is the card rich or thin, and what does the Complaints section literally say?
```

**⚠️ RECONCILE:** The copy below was drafted against the 06-26 validated run. The fresh card may surface different complaints or a different number of plays. **After capturing, edit the post copy so every specific claim matches exactly what the screenshot shows.** Capture → lock copy → post. Never post the drafted specifics next to a screenshot that says something else.

---

## 1. LinkedIn post (the hero)

> Most founders find out a competitor moved after they've already lost the deal.
>
> So I pointed Rivalscope at Jira this week, to see what it could dig up on a company everyone thinks they already understand.
>
> It read through their public reviews and surfaced the complaints that keep repeating: billing issues and unauthorized charges, difficulty canceling subscriptions or deleting accounts, and poor customer service and support. Pulled straight from their reviews, not me guessing.
>
> Then it wrote 5 plays you'd actually use if you were selling against them. Concrete angles, not "lean into their weaknesses."
>
> That's the tool. Point it at a competitor and it writes you a battle card: how they position, what their customers complain about, and how to win deals against them. Then it keeps watching their site and tells you when they move on pricing or messaging.
>
> I want it in front of people who'd use it for real before I build the next part. So: drop a competitor in the comments or my DMs and I'll run a free card on them and send it back. First 10 today.
>
> Or try it yourself: rivalscope.dev

Attach: the User Complaints screenshot.

---

## 2. X cross-post (zero-effort mirror; X is reach-dead, don't invest)

> I pointed Rivalscope at Jira to test it on a company everyone thinks they know.
>
> It pulled the complaints buried in their reviews (billing issues and unauthorized charges, cancellation problems, poor support) and turned them into 5 plays to win deals against them.
>
> Drop a competitor below and I'll run a free card on them. First 10.
>
> rivalscope.dev

---

## 3. Reply to Muntazar's DM (the only real inbound — convert it)

> Hey Muntazar, really appreciate this. The market-gap angle is exactly what got me building it.
>
> To your questions: honestly I'm still mapping where the ICP lives. Best signal so far is founders and early sales/marketing folks who are actively losing deals to one specific competitor, they feel the pain sharpest. LinkedIn and founder communities surface them better than X has for me. Curious what you're seeing.
>
> And yeah, it's just me on LinkedIn, writing everything myself. Self-taught too, mostly learning by posting and watching what lands.
>
> Want me to run Rivalscope on a competitor of yours? Name one company you're up against and I'll send back the battle card it generates, free. Half of why I'm asking is I'd love feedback from someone who actually thinks about this stuff.

---

## Fulfillment SOP (per inbound competitor URL)

**⚠️ POV framing:** Home company is currently the generic default ("Your B2B SaaS Intel Headquarters"), NOT Linear (verified 2026-06-29) — so the old "Linear vs X" risk is gone, but cards still frame plays from that generic POV. Before sending ANY fulfilled card: **set the requester's company first** for sharpest plays, OR strip the head-to-head and reframe generically ("here's how you'd attack them").

**Reusable extension fulfillment prompt** (fill the two blanks, confirmation-gated before send):

```
Reusable Rivalscope fulfillment task. Fill in the two blanks, then run. Do NOT send anything until the confirmation gate.

REQUESTER: [their name + where they asked]
THEIR COMPETITOR: [competitor name + URL if known]

STEP 1 — Set POV: In rivalscope.dev (logged in), set my home company to the REQUESTER's own company if known, so plays are framed for them. If unknown, leave it and reframe plays generically in Step 4.
STEP 2 — Generate: Add THEIR COMPETITOR, run a scan, open its Battle Card. Confirm rich AI card (specific complaints/signals), not thin/heuristic. If thin, STOP (credits may be dry).
STEP 3 — Capture: Screenshot Summary/Positioning, User Complaints, Strategic Signals.
STEP 4 — Draft reply (plain voice, no hype/emoji/em-dash, nothing invented): "Ran [competitor] for you, here's the card." + real complaints + signals + plays (kept if company set, else "here's how you'd attack them") + close: "The real value is it keeps watching them and pings you when they change pricing or positioning. Want it running for you? rivalscope.dev"
STEP 5 — CONFIRMATION GATE: Show screenshot(s) + draft reply. Ask "Send to [requester]? (yes/edit/no)". WAIT for yes.
``` Send the POV-neutral sections (their positioning, real complaints, signals) + reframed plays + a soft "this auto-updates if you sign up" CTA. Respect the first-10 cap; after that point people to rivalscope.dev.

---

## Scoreboard (attribution is blind — track manually, screenshot EOD)

- LinkedIn post: impressions, reactions, **comments naming a competitor** (the real conversion signal), DMs received
- Free cards actually fulfilled
- Any signup mentioning LinkedIn / the post
- Establishes the baseline for Wave 3.

## Wave 2 — POSTED 2026-06-29 (~12:00–12:13 PM)

- **LinkedIn:** https://www.linkedin.com/feed/update/urn:li:share:7477253253752168448/ — posted **TEXT-ONLY** (image failed to attach, see gotcha). Reported "1,841 impressions at posting" — disregard; a new post starts near 0, this is a misread dashboard aggregate. Recapture real numbers EOD.
- **X (@Manss_dev):** https://x.com/Manss_dev/status/2071492238128070878 — posted **with** the battle-card image (summary tail + 3 complaints + signals + plays 01/02). 1 view (X is reach-dead, expected).
- **Muntazar DM:** sent + delivered 12:03 PM.

**⚠️ GOTCHA — browser extension can't attach images to LinkedIn posts.** LinkedIn's media editor needs the native OS file picker, which the extension can't trigger; the post went text-only. On the one channel that has reach, the proof image is the whole point. **Fix: founder manually edits the LinkedIn post and adds the screenshot.** Future waves: plan to attach LinkedIn media by hand, or post LinkedIn manually.

## Out of scope today

Reddit/IH (hold until LinkedIn maxed), paid amplification, wiring server-side attribution (worth doing before Wave 3 so we stop flying blind).

## Update 2026-07-03 — attribution is no longer blind

Server-side first-touch UTM capture shipped to production (main `818b838`):
signups now persist `utm_source` / `utm_medium` / `utm_campaign` /
`signup_referrer` on the users table. For Wave 3, tag every link:
`https://rivalscope.dev?utm_source=linkedin&utm_medium=social&utm_campaign=wave3`
and read results with:
`SELECT email, created_at, utm_source, utm_campaign, signup_referrer FROM users WHERE utm_source IS NOT NULL ORDER BY created_at DESC;`
(via `railway ssh`). External referrers are captured even without utm params.

## Muntazar follow-up draft (send ~2026-07-03 if no reply to the 06-29 DM)

> Hey Muntazar, following up on my last message. The free battle card offer
> still stands: name one competitor you're up against and I'll send back what
> Rivalscope digs up on them, no strings.
>
> Since we talked I also shipped a bunch of hardening on the product, so the
> cards are sharper now. If the timing is off, no worries at all. Just tell me
> what you're working on these days, I'm genuinely curious.

Plain voice, no em dashes, one concrete ask. If he already replied, ignore
this and continue that thread instead.
