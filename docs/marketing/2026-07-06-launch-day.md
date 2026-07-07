# Launch Day: Product Hunt + Peerlist + LinkedIn + X (2026-07-06)

> **STATUS UPDATE 2026-07-06 evening:** PH no longer offers "launch now", only
> midnight-PT scheduled launches. Rivalscope is SCHEDULED for **July 7, 2026,
> 12:01 AM PDT** (= 12:01 PM Jul 7 GMT+5). Launch page:
> https://www.producthunt.com/products/rivalscope-2?launch=rivalscope-2
> Maker comment queued, posts automatically at launch. All fields verified
> (tagline A, UTM link intact, 4 gallery shots + R-mark thumbnail, maker set,
> paid-with-free-trial, bootstrapped). Founder decision: Peerlist + LinkedIn +
> X are HELD and go out tomorrow when PH is live, as one wave, with the PH URL.
> Posting is done by Claude via the GStack headed browser (logins saved), NOT
> the extension. Sections 2-4 below are the copy to use.

Single source of truth for today's launch. Voice: plain, builder-showing-a-real-thing.
Rules: no hype, no emoji, no em dashes, no invented findings or metrics.
Substantiated proof point: the Jira card (real Trustpilot complaints: unauthorized billing, can't-cancel accounts, poor support, turned into 5 plays).
Framing rule: first scan = instant battle card (baseline). Change detection = the payoff over time. Never claim we "caught" a change we didn't track.

## UTM links (one per channel)

- Product Hunt: `https://rivalscope.dev/?utm_source=producthunt&utm_medium=launch&utm_campaign=launch-20260706`
- Peerlist: `https://rivalscope.dev/?utm_source=peerlist&utm_medium=launch&utm_campaign=launch-20260706`
- LinkedIn: `https://rivalscope.dev/?utm_source=linkedin&utm_medium=launch&utm_campaign=launch-20260706`
- X: `https://rivalscope.dev/?utm_source=twitter&utm_medium=launch&utm_campaign=launch-20260706`

---

## 1. Product Hunt

**Name:** Rivalscope
**Website:** the PH UTM link above

### Tagline (max 60 chars) — pick one

- A (recommended): `AI battle cards on your competitors, updated as they move` (58)
- B: `Know the moment a competitor changes pricing or positioning` (59)
- C: `Turn competitor weaknesses into sales plays that win deals` (58)

### Description (max 260 chars)

> Drop in a competitor URL. Rivalscope writes a battle card: how they position, what their customers complain about on G2 and Trustpilot, and plays to win deals against them. Then it keeps watching their site and pings you when pricing or positioning moves.

(253 chars)

### Topics

Artificial Intelligence, Sales, SaaS, Marketing

### Maker's first comment

> Hey Product Hunt,
>
> I'm Zhiger, a 17 year old solo founder from Kazakhstan.
>
> I built Rivalscope because founders usually find out a competitor moved the slow way: a prospect brings up the new pricing on a call, or you land on their redesigned homepage a month late.
>
> Give it a competitor URL and about a minute later you get a battle card: how they position themselves, the complaints that keep coming up in their 1-star G2 and Trustpilot reviews, strategic signals like hiring, and five concrete plays to win deals against them. Then it keeps watching their site and pings you when pricing or positioning changes, so you hear it from the tool instead of from a lost deal.
>
> My favorite test: I ran it on Jira. It pulled the recurring complaints from their Trustpilot reviews, unauthorized billing charges and accounts people could not cancel, and turned them into five plays to win those exact users.
>
> You get one full competitor test free, no card required. If you want, drop one of your competitors in the comments and I will run a card on them today.
>
> Two honest notes: the first scan is a baseline, so Detected Changes starts empty and fills in as it watches. And this is early, I read everything, so tell me what is missing.

### Gallery (in order)

1. `frontend/public/og-image.png` (1200x630) as thumbnail or slide 1
2. Fresh screenshot: landing hero, dark theme
3. Fresh screenshot: battle card (Jira complaints + playbook sections)
4. Fresh screenshot: dashboard / command center
5. Optional video: `launch-video/shot1_1080p.mp4` (June 27, current design; upload to YouTube first if PH requires a link)

Do NOT use `frontend/public/demo/*` videos (June 16, old pre-redesign theme).

---

## 2. Peerlist (concise, direct CTA)

**Tagline:** Battle cards on any competitor, plus alerts when they move

**Post / description:**

> Rivalscope writes you a battle card on any competitor: their positioning, the complaints that keep showing up in their G2 and Trustpilot reviews, and concrete plays to beat them. Then it keeps watching their site and pings you when pricing or positioning changes.
>
> I tested it on Jira. It pulled the unauthorized billing and cancellation complaints from their 1-star Trustpilot reviews and turned them into five plays to win those users.
>
> One full competitor test is free. Built solo, launched today, feedback very welcome.
>
> https://rivalscope.dev/?utm_source=peerlist&utm_medium=launch&utm_campaign=launch-20260706

---

## 3. LinkedIn (launch-day narrative)

> Rivalscope is live on Product Hunt today.
>
> I have been building it for the past few months: a tool that writes you a battle card on any competitor. Give it a URL and a minute later you get how they position, what their customers actually complain about in 1-star G2 and Trustpilot reviews, strategic signals like hiring, and five concrete plays to win deals against them. Then it keeps watching their site and pings you when pricing or positioning changes.
>
> When I ran it on Jira, it pulled the complaints buried in their Trustpilot reviews, billing charges people did not authorize and accounts they could not cancel, and turned them into five specific plays to win those customers.
>
> Today it goes up in front of the Product Hunt crowd. If you have two minutes, I would genuinely appreciate you taking a look, and honest feedback helps more than anything: [PH launch URL]
>
> Or try it directly, the first competitor test is free: https://rivalscope.dev/?utm_source=linkedin&utm_medium=launch&utm_campaign=launch-20260706

Optional first line (your call): `I'm 17, and today I'm launching the thing I built instead of sleeping.`

Attach: battle card screenshot (complaints + playbook sections). Extension is text-only for media, attach manually.

---

## 4. X / @Manss_dev

> Rivalscope is live on Product Hunt.
>
> Drop in a competitor URL, get a battle card: their positioning, the complaints in their 1-star reviews, and 5 plays to beat them. Then it watches their site and pings you when pricing changes.
>
> First test is free: [PH launch URL]

---

## 5. Fulfillment SOP (when someone drops a competitor URL)

POV note: your home company on the demo account is Linear, so raw cards read "Linear vs X". Never send that to a stranger. Share the POV-neutral sections (their positioning, complaints, signals) and reword plays as "here is how you would attack them", or set their company first.

Reply template:
> On it, running [competitor] now. (send positioning + complaints + signals) That is your battle card. The real value is that it keeps watching them: sign up and it pings you the moment they change pricing or positioning. (channel UTM link)

After capacity:
> That is my batch for now, but you can run it yourself here: (UTM link). It has a card ready in under a minute.

---

## 6. Launch-day monitoring

- Railway logs: watch for 5xx, unexpected 402s on the free-test flow, scraper sidecar failures.
- Signups: query users table via `railway ssh` (utm_source column tells us which channel converts).
- Checkout attempts: Polar dashboard.
- PH comments: respond fast, fulfill teardown requests same day.

---

## 7. Telegram outreach (send from YOUR account, tonight)

Rule: never write "upvote us" in a group blast. PH's fraud detection discounts
vote bursts from fresh/low-history accounts and can bury the launch for it.
Ask for a LOOK and an HONEST COMMENT; votes follow naturally, spread through
the day, which is exactly the pattern PH rewards.

### EN version (personalize the first line per group/person)

> Hey! In a couple hours I'm launching Rivalscope on Product Hunt (live at
> 12:01 PM Almaty / noon). It writes you an AI battle card on any competitor:
> how they position, what their customers complain about in reviews, and
> concrete plays to win deals against them.
>
> The launch page is already up. Hit "Notify me" to catch it the moment it
> goes live: https://www.producthunt.com/products/rivalscope-2
>
> If you take a look today and drop an honest comment or feedback, that
> helps me more than anything. And if you want to try it, the first
> competitor card is free: https://rivalscope.dev

### RU version

> Привет! Через пару часов запускаю Rivalscope на Product Hunt (live в 12:01
> дня по Алматы). Это инструмент, который делает AI battle card на любого
> конкурента: как они позиционируются, на что жалуются их клиенты в отзывах,
> и конкретные ходы, чтобы выигрывать сделки против них.
>
> Страница запуска уже открыта, нажми "Notify me", чтобы поймать момент,
> когда мы будем live: https://www.producthunt.com/products/rivalscope-2
>
> Если сегодня зайдёшь, посмотришь и оставишь честный комментарий или фидбек,
> это поможет больше всего. Попробовать бесплатно: https://rivalscope.dev
