# Relaunch prep — hunter DM, v2 definition, LinkedIn day-2, DM reframes (2026-07-10)

Context: PH first launch (Jul 7-8) finished ~#40, not Featured. Plan of record: do
NOT rush a Monday relaunch. Demo day is Fri Jul 17. Featured **v2 relaunch the week
of Jul 21** with a hunter. This doc holds tonight's copy: the v2 definition (anchors
everything), the hunter DM, the reframed LinkedIn day-2 post, and the reframed 9 DMs.

Voice rules: first person, short lines, specific numbers, honest, no em dashes, no
"please upvote," no corporate vocabulary.

---

## 1. Rivalscope v2 — target scope for the Jul-21 relaunch

CORRECTED 2026-07-10 after the real root-cause investigation (see memory
`reviews-complaints-rootcause-20260710`). The QA "classification bug" framing was wrong.
**Classification and surfacing already work** (479/662 prod reviews flagged as complaints;
Stripe/Jira/Braintree cards are fully populated). The gap is **review scraping getting
bot-blocked at the source**. That reframes v2:

1. **Reliable complaint coverage.** Fix the Trustpilot scraper in the sidecar (it was
   silently returning a cookie-consent wall instead of reviews for many competitors, so
   the card came back thin). Achievable before Jul 21. **G2 and Capterra are
   DataDome-class blocked and need a paid scraping API (ScraperAPI/Zyte) — a cost
   decision, and NOT fixed by the relaunch unless you buy it.** See the honesty note below.
2. **Live public competitor profiles.** The `/apps` directory shows real review data and
   tracked page changes instead of empty "No review data yet / 0 page changes" shells.
3. **Free-first onboarding.** New users get their first battle card free before any
   paywall. Kills the "Start free" -> immediate $49 checkout contradiction.

One-line version for the hunter / PH tagline: *"Complaint coverage now lands reliably,
plus live public profiles and a free-first first run."*

### HONESTY NOTE — do not market "G2 complaints" until G2 is unblocked
Every existing draft said "complaints buried in their **G2 and Trustpilot** reviews."
G2 currently returns a bot-challenge page = zero reviews. Marketing a capability a hunter
can test and find broken burns credibility. Until you pay for a scraping API, keep copy
source-agnostic ("the complaints buried in their reviews") or name only Trustpilot, and
demo/relaunch against Trustpilot-covered competitors (e.g. Stripe). **Decision for you:
buy a scraping API to make G2/Capterra real for the relaunch, or ship v2 as
"Trustpilot + review coverage" and expand sources later.** All copy below is already
softened to the honest version.

---

## 2. Hunter DM to @igorblink (Telegram — send from your phone/desktop)

Telegram web is not logged into the browser, so send this yourself. Hand-written,
personal, no pressure. One optional line about age flagged below.

> Hey Igor, I follow your launches and your PH playbook posts. I built Rivalscope solo:
> you paste a competitor's URL and get a battle card in about a minute: how they
> position, the real complaints buried in their reviews, and five plays to win the deal.
> Then it watches their site and pings you when pricing or messaging moves.
>
> I soft-launched last week without a hunter and landed around #40, not featured, which
> I now understand is the whole game. I am shipping a real v2 the week of the 21st: much
> more reliable complaint coverage, live public competitor profiles, and a free-first
> onboarding. A genuine major update, not a repackage.
>
> Would you be open to hunting it? Happy to send early access and the full changelog so
> you can judge if it is worth your name on it. No pressure either way.

Optional opener line if you want the underdog angle (add after "built Rivalscope solo"):
*"(17, from Kazakhstan, this is my first real product)"* — include only if you want to
lead with it; some hunters love the story, others judge the product cold. Your call.

---

## 3. LinkedIn day-2 post — REFRAMED (finalize now, POST IN THE MORNING)

Why hold: it is ~1am Almaty. Your own posting notes say morning is the only slot that
performs; a low-traffic slot torches your highest-leverage channel. Use LinkedIn's
native **Schedule** button to queue for ~8-9am, or paste first thing.

The old draft opened "yesterday / 24 hours in" — stale now (launch was last week). This
version fixes the timeline and points forward to the relaunch, which builds the arc.

---

I launched Rivalscope on Product Hunt last week. Here is the honest scoreboard.

I was not Featured. If you know Product Hunt, that is the section that actually gets you seen, and moderators decide it before you launch, not your upvote count. I did not line that up. So I started buried in the "all products" list where almost nobody looks.

What moved the needle was not the platform. It was people.

I messaged my nFactorial network one by one. Not a broadcast, just honest notes to people I actually share a room with. About 1 in 5 replied. A few upvoted. One told me my positioning was off and exactly how to fix it, which was worth more than any upvote. One person clocked that part of my outreach was automated and called me on it. Fair. That one is on me.

We climbed from rank 67 to around 40 on that. Not a rocket. Real people, one message at a time.

Here is what I actually took from it: the launch is not the day the world discovers you. It is the day you find out who is in your corner, and how good the product has to be to earn the next conversation.

So I went back to the product. The core promise of Rivalscope is that it pulls the complaints buried in a competitor's reviews and hands them to you. On too many cards that section was coming back thin. That is what I am rebuilding right now, and it is why I am relaunching later this month instead of pretending the first one was enough.

Rivalscope writes you a battle card on any competitor: how they position, the real complaints in their reviews, and five plays to win the deal. Then it watches their site and tells you when they move.

If you have ever lost a deal because a competitor changed something and you found out too late, try it and tell me what is broken.

rivalscope.dev

---

Posting notes:
- Personal profile (Mansur Zhiger), not a company page. Your reach lives there.
- No link in the first line. rivalscope.dev stays at the very end. Plain text, no PH
  preview card (kills reach).
- Reply to your first 2-3 commenters within the hour. Biggest reach multiplier.
- OPTIONAL cut: the "caught automating outreach" line is honest but publicly admits it.
  It was in your approved draft, so kept. Cut it if you would rather not resurface that.

---

## 4. The 9 first-touch DMs — REFRAMED off the dead-launch upvote-ask

These 9 never got a message (aborted before send), so this is genuine first contact,
not a re-ping. But the launch ranking day is over, so the old "please look at my PH
launch" ask is dead. Reframed as an honest feedback request, links to rivalscope.dev
(not the PH launch URL). Recommend sending in the morning too; DMs read better then.

Template (swap the first name):

> Hey [Name], we're both in the nFactorial network so wanted to reach out directly. I
> launched Rivalscope last week, built solo: you paste a competitor's URL and get a
> battle card in about a minute: how they position, the real complaints buried in their
> reviews, and five plays to win the deal. I'm not chasing upvotes, I'm chasing honest
> feedback: if you have a minute to try it and tell me what feels off, that would
> genuinely help. rivalscope.dev

The 9 contacts (profiles in `docs/marketing/2026-07-08-linkedin-retry-9.md`):
Saltanat, Dulat, Talim, Bakhauddin, Kenzhe, Sultan, Maxim, Altynbek, Maksat.

---

## 5. Peerlist — move launch to Week 30 (founder-manual, ~30 sec)

Verified live this session: the Rivalscope launch is scheduled for **Week 29 (Jul 13-19)**.
Decision (yours): **move it to Week 30 (Jul 20-26)** to ride the v2 relaunch wave with PH.

There is no reschedule button — only Cancel + re-schedule. The Cancel control sits in a
hover-card that does not automate cleanly, and I can't 100% rule out a cooldown on a
one-shot launch, so this is a hand-off (or I drive it live with you watching). Steps:

1. Go to `peerlist.io/mansur/project/rivalscope`.
2. Hover/click the **"Launch Scheduled"** button → **"Cancel Launch"**. Confirm.
3. Re-launch the project and pick **Week 30**. (Weeks 30-35 are open.)
4. Paste the corrected description below (the current one is stale + overclaims G2).

**Corrected Week-30 launch description (finalize when v2 actually ships):**

> Rivalscope writes you a battle card on any competitor: their positioning, the
> complaints that keep showing up in their reviews, and concrete plays to beat them.
> Then it keeps watching their site and pings you when pricing or positioning changes.
>
> I tested it on Stripe. It pulled the real billing and support complaints from their
> 1-star reviews and turned them into five plays to win those users.
>
> One full competitor test is free. Built solo. This is the v2: much more reliable
> complaint coverage, live public competitor profiles, and a free first run. Feedback
> very welcome.

Notes: (a) example swapped from Jira to **Stripe** because Jira's Trustpilot now hits the
cookie-wall (thin card if a visitor tests it) while Stripe is confirmed scrapable; use a
re-verified Trustpilot-covered competitor. (b) removed "launched today / hit PH tomorrow"
and the concluded PH link. (c) removed the "G2" claim (G2 is bot-blocked).

**Company profile:** still unclaimed (`Claim Company Profile` -> `peerlist.io/company/create`).
Founder-manual, needs domain verification (work email @rivalscope.dev or DNS). ~2 min.

## 6. X (@Manss_dev)

34 followers, near-zero return. A reframed day-2 tweet is optional and not worth
prioritizing tonight. If you want one, say so and I'll draft it off the LinkedIn arc.
