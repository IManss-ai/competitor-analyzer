# Rivalscope — Whole-App Redesign Brief (for v0 / Lovable / Figma / Framer)

**Status:** post-pitch redesign. Mentors called the current UI "AI slop." It is not ugly — it is *generic*: default shadcn zinc + one blue accent + Geist + rounded bordered cards, the exact look every AI tool ships. The job is a **distinctive, premium identity with a point of view.**

**Division of labor:** *You* drive the look in the design tool. *This brief* owns the product, the screens, the real data, and the anti-slop guardrails. When you have a screen you love, send me the v0 link / screenshot / exported code and I port it to the real app (live data + Polar billing), pixel-faithful, both themes — I add zero taste.

**Recommended tool: v0 (Vercel).** Our stack is Next.js 14 App Router + Tailwind + shadcn/Radix, which is exactly what v0 outputs — so the port is near 1:1 and almost nothing of mine gets injected. Use Figma if you'd rather design visually (I port via the Figma pipeline); use Framer if you want an art-directed landing. The brief works for all of them.

**Workflow:** paste PART 1 (Master Brief) once → paste one screen from PART 3 → iterate the look until you love it → send it to me → I port it → next screen.

---

## PART 1 — MASTER BRIEF  (paste this at the top of EVERY screen prompt)

> **Product:** Rivalscope is a premium competitive-intelligence SaaS for startup founders and B2B sales teams. It auto-tracks competitor homepage/pricing changes, aggregates customer complaints from G2 & Trustpilot, detects hiring/strategic signals, and drafts ranked sales "plays" to win deals. The hero feature is an AI **Battle Card / Head-to-Head**: "here's where you beat each competitor, here's where you're exposed, and the exact plays to win."
>
> **Who it's for:** time-poor founders and AEs who need an at-a-glance edge. It must feel like an expensive, trustworthy intelligence tool — Bloomberg-terminal credibility with modern startup polish.
>
> **The mandate — make it distinctive, not generic. AVOID the "AI slop" signature:**
> - ❌ Zinc/neutral-gray everything with a single blue accent as the only color
> - ❌ Geist (or Inter) as the only typeface; no display face
> - ❌ Uniform `rounded-xl` cards with thin 1px borders floating on flat dark
> - ❌ Symmetric even grids with no focal point or hierarchy
> - ❌ No depth, no texture, no imagery, no motion personality, generic lucide icons as the only visual interest
>
> **Instead, REQUIRE a real design system with opinion:**
> - ✅ A distinctive **type pairing**: a characterful display face for headlines + a clean workhorse for text/UI; deliberate type scale with big contrast
> - ✅ An intentional **palette**: a signature brand color + supporting tones + meaningful semantic colors (positive/win, exposure/risk, signal) — not gray+blue
> - ✅ **Material & depth**: considered shadows, layering, tasteful gradient/mesh or subtle grain where it earns it; surfaces that feel crafted
> - ✅ **Editorial layout**: asymmetry, scale contrast, one clear focal point per screen, generous spacing
> - ✅ **Motion with personality** but never bouncy/springy: purposeful transitions, count-ups on numbers, reveal-on-scroll, live "signal" pulses
> - ✅ **Data-viz that looks designed**, not default chart-library output
>
> **Hard technical constraints (so it ports cleanly):**
> - Target **Next.js 14 App Router + Tailwind CSS + shadcn/Radix primitives**. Components, not one-off markup.
> - **Both dark and light themes** must be designed (dark is the current default). Drive everything from CSS-variable tokens (color, space, radius, shadow, font).
> - **Real content only** — use the real copy and realistic data below, never lorem ipsum and never invented metrics. Honesty is a brand value: when intel is AI-inferred vs verified, the UI must show it (e.g. an "inferred" tag with evidence).
> - Responsive (desktop-first, but mobile must work). Accessible contrast on every surface.
>
> **Global shell (all app screens share it):**
> - Left **sidebar** nav, grouped: *Desk* → Dashboard, Competitors, Campaigns, Discover · *Signal* → Intel Feed, Battle Cards, Trends, Action Queue · then Settings. Account chip (email + TRIAL/PRO badge + "N days left"), a "Scan all now" button, an "Upgrade to Pro" CTA, Sign out.
> - **Topbar**: page title + date, theme toggle (light/dark).

---

## PART 2 — INFORMATION ARCHITECTURE

**Public:** `/` landing · `/auth/login` · `/auth/verify` · `/share/[id]` public battle card (SEO, unauth) · `/privacy` · `/terms`
**App (auth):** `/dashboard` · `/competitors` · `/competitors/[id]` (head-to-head) · `/battlecards` · `/campaigns` (+`/[id]`) · `/discover` · `/queue` (Action Queue) · `/trends` · `/settings` · `/billing/checkout` · `/billing/success`

**Primary journey (the pitch):** land → "Start free" → instant signup → onboarding modal (type your URL → AI reads your business → auto-discovers your real competitors) → dashboard → open a competitor → **head-to-head** (wins / exposures / plays with evidence) → upgrade.
**Recurring loop:** weekly the system scans competitors, classifies changes, drafts plays into the Action Queue for one-click approval.

---

## PART 3 — PER-SCREEN SPECS  (Master Brief first, then ONE of these)

**S1 — Landing `/`** · *Job: in 5 seconds, "this watches my competitors and tells my team how to win."*
Sections: hero (one-line value + "Start free" + a live, interactive **multi-competitor battle card** demo), social proof, How it works (3 steps), Product (the head-to-head, real screenshot-grade), Pricing ($49/mo SaaS, $19/mo Local), footer. The hero must be art-directed and memorable, not a centered headline + two buttons.

**S2 — Login `/auth/login`** · *Job: frictionless instant start.* Email + password, one "Sign in" (instant signup on first use), plan carried from pricing. Make a normally-boring auth screen feel crafted (split layout, brand world, a quiet live-signal motif).

**S3 — Onboarding modal** (first run on dashboard) · *Job: the magic moment.* Step 1 "Add your website" → big URL input → "Analyze my business" (runs ~20-40s, needs a beautiful loading state). Step 2 review: left = your business profile the AI read; right = your **auto-discovered real competitors** (logos/names). "Start tracking." This sells the product — make it feel effortless and alive.

**S4 — Dashboard `/dashboard`** · *Job: at-a-glance command center.* Top stat cards with count-ups (competitors tracked, changes this week, signals, queued plays). A "competitor health" grid: per competitor → name, domain, last-scanned, total changes, a 4-point trend **sparkline**, status. Recent intel feed. "Scan all now."

**S5 — Competitors `/competitors`** · list/manage tracked competitors + add (URL). Per-competitor row: name, url, last scanned, change count, quick actions. Empty state matters.

**S6 — Competitor detail / Head-to-Head `/competitors/[id]`** · *THE wow screen.* A **verdict** sentence ("Rivalscope is more agile for SMBs; Klue is more enterprise"), then three columns: **Wins** (where you beat them), **Exposures** (where you're weak), **Plays** (concrete moves). Every AI-inferred point carries an **"inferred" tag that reveals its evidence on hover/expand** — the honesty is the whole point. Below: detected changes timeline, complaints (G2/Trustpilot), strategic signals (hiring, patents).

**S7 — Battle Card `/battlecards`** · the 4-quadrant AI card: *Executive Summary · Detected Changes (typed badges: pricing/feature/repositioning) · User Complaints · Strategic Signals*, plus a **Playbook of 5 ranked plays**, each copy-to-clipboard. Make quadrants feel like a designed dossier, not 4 equal boxes.

**S8 — Action Queue `/queue`** · drafted plays/emails awaiting approval. Each: trigger ("what intel caused this"), the drafted copy, Approve / Edit / Dismiss. Card-stack or inbox feel.

**S9 — Trends `/trends`** · designed data-viz: change-type breakdown, an activity **heatmap**, review-sentiment over time. Charts must look bespoke (custom palette, labels, motion), not default Recharts.

**S10 — Campaigns `/campaigns` (+ `/[id]`)** · grouped action plans that regenerate as new intel arrives. List + detail with plan items.

**S11 — Discover `/discover`** · find/suggest new competitors to track (search + AI suggestions).

**S12 — Settings `/settings`** · tabs: Profile · Scan Schedule · Notifications · Competitors · **Billing & Plan** (Rivalscope Pro $49/mo, trial badge + ends-date, feature list, "Upgrade to Pro" → Polar checkout). Tabs are deep-linkable (`?tab=billing`).

**S13 — Public share card `/share/[id]`** · a single battle card, unauthenticated, crawlable, with a "Generate your own" CTA. Must look premium for cold visitors.

**S14 — Billing success `/billing/success`** · post-checkout confirmation → into the app.

---

## PART 4 — SIGNATURE COMPONENTS (make these unforgettable)

1. **Head-to-Head verdict** — Wins / Exposures / Plays with evidence-revealing "inferred" tags. This is the product; spend the most design here.
2. **Battle Card** quadrants + 5 ranked copy-to-clipboard plays.
3. **Stat cards** — count-up numbers, trend sparklines, typed **change badges** (pricing = $, feature = +, repositioning = ↻).
4. **Trends** — heatmap + type breakdown + review sentiment, custom-styled.
5. **Provenance / data-sources panel** — shows real-vs-AI-inferred sources (the honesty signal).
6. **Live "signal" motif** — a pulsing dot / ticker that makes the app feel alive and watching.

---

## PART 5 — ANTI-SLOP CHECKLIST (hold each generated screen to this before accepting)

1. Could I tell this apart from a default v0/shadcn template at a glance? (must be YES)
2. Is there a real display typeface doing work in the headlines?
3. Is there a signature color beyond gray + blue?
4. Is there a clear focal point and hierarchy, not an even grid?
5. Is there intentional depth/material (not flat cards on flat bg)?
6. Does the data-viz look designed, not default?
7. Does motion add life without bouncing?
8. Does it look premium/trustworthy enough to charge $49/mo?
9. Does it work in BOTH dark and light?
10. Would an investor call it beautiful, not "clean"?

---

## PART 6 — PORTING (what I do with your output, so the loop closes)

Per screen you approve: I extract the design tokens (color, type, spacing, radius, shadow, motion) into `frontend/src/app/globals.css`, rebuild the components in `components/ui/` + feature components, wire them to the **real API data + Polar billing**, and verify both themes in a real browser before moving on. Pixel-faithful to your design. No taste added by me. I also fold the locked system into `DESIGN.md` so it stays consistent.
