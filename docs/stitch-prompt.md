# Google Stitch — Rivalscope Design Brief & Prompts

**North star:** make it look like **appkittie.com** — near-black background, ONE electric-lime
accent, huge Space Grotesk display type, casual-confident voice. Concrete tokens are baked into
PART A below so Stitch doesn't drift into generic SaaS.

How to use this file:
1. Stitch works best **one screen at a time**. Paste **PART A (Master Brief)** at the top of every prompt.
2. Then paste the **per-screen prompt** for the screen you're generating (PART C).
3. Attach a **screenshot of appkittie.com** to every prompt — it's the visual north star. Stitch
   pulls type scale, density, and color feel from attached references; that's intentional.
4. Generate, then iterate with the short follow-ups in PART D ("tighten spacing", "make the primary action louder").
5. Set Stitch to **Web / Desktop**, responsive down to mobile.

---

## PART A — MASTER BRIEF (paste on EVERY screen)

> **Product:** Rivalscope — a premium competitive-intelligence platform for startup founders and
> sales teams. It automatically tracks competitors' websites for pricing/feature/positioning changes,
> aggregates their customer complaints from G2 & Trustpilot, detects hiring and strategic signals,
> and drafts ready-to-send "battle cards" and sales plays to win deals.
>
> **The feeling I'm selling:** a primary-source intelligence terminal you'd trust with revenue
> decisions — but with the confident, modern edge of a product like appkittie.com, not a corporate
> dashboard. Calm and precise, dense-but-readable, with bold display type and one electric accent
> that makes it feel alive. Authority through restraint; energy through type and a single sharp color.
>
> **Who uses it & their job:** a busy founder/AE who opens it Monday morning and wants ONE answer:
> "what did my competitors change, and what do I do about it?" They scan, they don't read. Every
> screen must answer that without making them think.
>
> **EXACT VISUAL SYSTEM (use these values; do not substitute):**
> - **Mode:** dark-first. Set the canvas to dark.
> - **Background:** near-black, faintly cool — `#0A0C12`. Lifted surfaces / panels: `#14171F`.
>   Dividers: 1px hairlines at `rgba(255,255,255,0.08)`, NOT drop-shadowed cards.
> - **Accent (use sparingly):** electric lime `#C8FF00`. Text/icon ON the lime accent is near-black
>   `#0A0C12`. Use lime ONLY on the single primary action, the active nav item, focus rings, and one
>   or two key data points per screen. NEVER as a section background wash or on more than one button.
> - **Text:** primary `#FFFFFF`; secondary `#A4A9B4`; muted `#777C88` (keep body ≥ 4.5:1 contrast).
> - **Type:** **Space Grotesk** for everything UI + display; **IBM Plex Mono** for data, numbers,
>   URLs, timestamps, and tags. Display headings are LARGE and confident at medium weight (500),
>   not heavy-black — hero up to ~88–96px, section heads ~44–64px, tight tracking (-0.02em).
>   Casual, outcome-first voice (think "Grow your app on easy mode"), never corporate happy-talk.
> - **Shape:** sharp. Max corner radius 4px (pills only for small status dots/tags). Flat panels with
>   hairline borders. No glow, no gradients, no blur.
> - **Spacing:** 8pt scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). Vary it for rhythm — generous around
>   headers, tight within data rows.
>
> **NON-NEGOTIABLE usability rules (this is why the last version failed a pitch):**
> - Every screen passes the "dropped-in-blind" test: I can instantly tell what site this is, what
>   page I'm on, the major sections, and where I am. Persistent left nav + a clear page title.
> - Every modal, panel, and overlay has an obvious **close/exit** (X top-right + click-outside + Esc).
>   Every flow has a visible **back** path. Never trap the user.
> - One unmistakable **primary action** per screen (the lime one). Buttons say what they DO
>   ("Generate Battle Card", not "Submit"). Secondary actions are visibly quieter (ghost/outline).
> - Make clickable things obviously clickable without hovering. Real states: hover, focus ring (lime),
>   active, disabled, loading (skeletons), empty (with a helpful next action), and error (specific +
>   how to fix).
> - Touch targets ≥ 44px. Body text ≥ 16px. Contrast ≥ 4.5:1 (watch lime-on-dark for text — lime is
>   for fills and accents, not body copy).
> - Cut copy ruthlessly. No "Welcome to..." happy-talk, no paragraphs of instructions.
>
> **Do NOT produce these AI-generic patterns:** purple/indigo gradients; the symmetric 3-column
> icon-in-a-colored-circle feature grid; everything center-aligned; uniform bubbly border-radius;
> decorative blobs/wavy dividers; emoji as design elements; colored left-borders on cards; glassmorphism;
> generic hero copy. If a section feels empty, it needs better content, not decoration.

---

## PART B — INFORMATION ARCHITECTURE (gives the app its "logic")

Persistent left sidebar (240px), grouped, with the current item marked by a lime left-rule:

- **DESK** — Dashboard (the Monday-morning answer), Competitors, Discover (find new competitors)
- **SIGNAL** — Battle Cards, Trends, Action Queue (review/approve drafted plays)
- **Bottom** — Settings, plan badge, theme toggle, account menu

Global top bar: page title + mono "dateline" (e.g. `MON 16 JUN 2026 · 14 SOURCES · LIVE`), a
primary action on the right, and a search field. Breadcrumbs on any detail screen. The user can
always get Home, always get Back, always close any overlay.

---

## PART C — PER-SCREEN PROMPTS (paste Master Brief first, then one of these)

### C1 — Landing / marketing page (the pitch screen) — STRUCTURE VALIDATED, follow it
> Design the marketing landing page for Rivalscope (web, responsive, dark). This exact section order —
> each section does ONE job, one headline each:
> 1. **Hero (split layout).** Left: a confident, stable, outcome-first headline — "Never get blindsided
>    by a competitor again." (last word in lime) — one supporting sentence that names the audience and
>    payoff ("Rivalscope watches your competitors 24/7 and hands your sales team the exact play to win
>    the next deal."), ONE lime primary CTA ("Start free trial") and a quiet secondary ("See a live
>    demo"), plus three tiny trust items. Right: a realistic preview of the live "Intel Feed" — a dense,
>    scannable list of competitor changes with small monospace tags (PRICING, FEATURE, REPOSITIONING)
>    and timestamps. Huge Space Grotesk headline (~88px).
> 2. **Trust strip:** 4 mono stats in a hairline-divided row (Every 4h scan · 7 competitors · 5 min setup · Monday playbook).
> 3. **How it works:** 3 steps as a horizontal narrative (Add competitor URLs → AI scans everything →
>    Playbook every Monday), NOT a symmetric icon-circle grid.
> 4. **One product section, TWO tabs** (this is the key anti-repetition move — do not show the product
>    four different ways). Heading "One product. Two ways to win." with a two-tab switcher:
>    **Live Dashboard** (label: "Real-time monitoring") showing a product-window mockup of the dashboard,
>    and **Weekly Battle Card** (label: "The sales deliverable") showing the 4-quadrant card. Only one
>    visible at a time.
> 5. **Pricing:** 2 simple tiers, no surprises.
> 6. **Final CTA + footer.**
> Edge-to-edge, dark, big type, one lime accent. Make it look like a credible intelligence product with
> appkittie.com energy — not a SaaS template.

### C2 — Dashboard "Command Center" (the core screen)
> Design the main dashboard — the Monday-morning answer screen. Left sidebar nav (see IA), top bar with
> the page title "Command Center" + a mono dateline + a lime primary "Scan now" action + search. Main area,
> top: a single bordered row of 4 ledger-style stat tiles (Changes this week, Competitors tracked,
> Signals detected, Battle cards ready) — IBM Plex Mono numerals, small lime deltas, divided by hairlines,
> NOT separate cards. Below: the **Intel Feed** — a scannable list of competitor changes, each row =
> a change-type tag (mono) + competitor URL (mono) + one-line description + a "→ Open battle card" link +
> timestamp, rows divided by hairlines. Include a clear empty state ("No changes yet — add a competitor
> to start tracking") and skeleton loading rows. Dense but calm, near-black, one lime accent.

### C3 — Battle Card (the wow / value screen)
> Design the AI Battle Card detail view for a single competitor. Header: competitor name + URL (mono) + a
> lime "Regenerate" action + a back link. Body = a 4-quadrant intelligence layout, each a flat panel with a
> hairline border and a mono heading: (1) Executive Summary, (2) Detected Changes (change-type tags +
> descriptions), (3) User Complaints (pain points pulled from G2/Trustpilot, quoted), (4) Strategic Signals
> (hiring, patents, positioning). Below the quadrants: a "Playbook" — 5 ranked, concrete sales plays, each
> with a copy-to-clipboard button. Everything scannable, mono for data, lime only for the primary actions
> and the highest-priority signal. Calm authority with appkittie edge, not a busy dashboard mosaic.

### C4 — Onboarding (first-run, must feel effortless)
> Design a 2-step onboarding for a brand-new user, dark, big type. Step 1: "Add your first competitor" —
> a single big, obvious URL input with an example placeholder and one lime primary button ("Track this
> competitor"); a clear way to skip/exit. Step 2: a short "we're scanning now" state that sets the
> expectation (what they'll get, when) and routes straight into the Command Center. Minimal chrome, one
> action per step, a visible progress indicator and a back arrow. No walls of text.

### C5 — Competitors list + add
> Design the Competitors management screen. A scannable table/list of tracked competitors (name, URL in
> mono, last scan time, # of recent changes, status dot) with row hover and a lime primary "Add competitor"
> button that opens a panel with an obvious close (X + Esc + click-outside). Include empty, loading, and
> error states, and a per-row menu (view battle card, pause, remove with confirm). Dense ledger feel,
> hairline dividers.

### C6 — Action Queue (approve drafted plays)
> Design the Action Queue where the user reviews AI-drafted responses (emails, Slack alerts) before they
> go out. A list of pending items, each showing the trigger (which competitor change), a preview of the
> drafted copy, and clear Approve / Edit / Dismiss actions. Selecting one opens a detail/edit panel with an
> obvious close. Make the Approve action the loud lime one. Calm, trustworthy, reversible.

---

## PART D — Iteration follow-ups (short prompts after the first render)
- "Increase information density — this looks like a marketing page, I want a data terminal."
- "Make the single lime primary action much louder and quiet everything else to ghost/outline."
- "Replace any 3-column icon grid with a denser, more editorial layout."
- "Add the empty / loading (skeleton) / error states for this screen."
- "Tighten to an 8pt spacing scale and sharpen all corners to 4px max."
- "Bigger, more confident Space Grotesk headline; tighter tracking."
- "Pull the lime back — it's overused. Accent only on the primary action and one key number."
- "Show the mobile/responsive version of this screen."

---

## PART E — Porting Stitch output back into this codebase

When transferring a Stitch screen into the repo (`frontend/src/`):
- Map Stitch's literal colors onto our CSS-var tokens in `globals.css` — never paste raw hex into
  components. `#0A0C12`→`--surface-base`, `#14171F`→`--surface-raised`, `#C8FF00`→`--accent-primary`,
  white→`--text-primary`, etc. Adjust the token values once; components read the vars.
- Fonts already match: the repo runs **Space Grotesk** (`--font-archivo`) + **IBM Plex Mono**.
- The app ships **dual-theme** (paper + ink). Stitch designs the dark/ink theme; keep a paper-light
  equivalent for each token so the theme toggle keeps working. Use the existing token structure.
- Keep radius at the repo's `--radius-md` (4px); reuse existing component classes (`.rs-card`,
  `.rs-btn-primary`) instead of new one-off styles.

> **Brand decision to confirm before you commit:** appkittie's accent is acid-lime `#C8FF00`. Rivalscope
> currently ships **slate-blue** (`#345781`/`#5e9bf0`). Lime is bolder and more "appkittie" but reads
> less "trustworthy financial terminal." Pick one and keep it consistent — don't ship both.
