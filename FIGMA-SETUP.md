# Figma → Rivalscope frontend kit

Set these up **once** in Figma so everything you design already speaks your
codebase's language (tokens, type, spacing). Then translating a frame to code is
near-mechanical instead of a rebuild. Values come straight from
`frontend/src/app/globals.css` + `DESIGN.md`.

## 1. Colors → Figma Variables with two modes

Figma **Variables support modes**, which map 1:1 onto your dual theme. Create a
collection named **`Theme`** with two modes: **`Paper`** (default) and **`Ink`**.
Add each variable below with its Paper / Ink value. Designing for both themes is
then a single mode toggle.

| Variable | Paper | Ink |
|----------|-------|-----|
| `surface/base` | `#f5f2ec` | `#16140f` |
| `surface/raised` | `#ffffff` | `#1f1c16` |
| `surface/overlay` | `#ffffff` | `#211e17` |
| `surface/subtle` | `#fbf9f5` | `#26221a` |
| `text/primary` | `#1a1714` | `#eae6dd` |
| `text/secondary` | `#6b6258` | `#a8a094` |
| `text/muted` | `#726b5e` | `#6f685c` |
| `accent/primary` | `#345781` | `#4f7cb0` |
| `accent/hover` | `#2c4868` | `#6a96c8` |
| `accent/subtle` | `#345781` @ 10% | `#4f7cb0` @ 12% |
| `accent/border` | `#345781` @ 30% | `#4f7cb0` @ 30% |
| `border/default` | `#1a1714` @ 12% | `#eae6dd` @ 14% |
| `border/subtle` | `#1a1714` @ 7% | `#eae6dd` @ 7% |
| `border/strong` | `#1a1714` @ 22% | `#eae6dd` @ 24% |
| `fill/subtle` | `#1a1714` @ 3% | `#eae6dd` @ 3% |

**Golden rule:** style every shape/text with these variables — never free-pick a
color. A raw hex that isn't a token is the #1 thing that breaks the theme in code.

Accent = slate-blue. Keep it for interactive/emphasis only; **never** as a
decorative background fill.

## 2. Typography (Figma text styles)

Fonts: **Archivo** (sans, headings + UI) and **IBM Plex Mono** (labels, numbers,
timestamps). Install both from Google Fonts in Figma.

| Style | Font | Size | Tracking | Line height | Use |
|-------|------|------|----------|-------------|-----|
| `Heading/XL` | Archivo Semibold | 24 | -0.02em | 1.15 | page titles |
| `Heading/LG` | Archivo Semibold | 18 | -0.015em | 1.3 | section titles |
| `Heading/MD` | Archivo Semibold | 14 | -0.01em | 1.4 | card titles |
| `Body` | Archivo Regular | 13 | 0 | 1.5 | default text |
| `Small` | Archivo Medium | 12 | +0.01em | 1.4 | secondary text |
| `Label` | IBM Plex Mono | 11 | +0.10em | 1 | UPPERCASE labels |
| `Badge` | IBM Plex Mono | 10 | +0.08em | 1 | UPPERCASE badges |

## 3. Radius

Sharp, flat. `sm 2px · md 4px (default) · lg 6px · xl 8px · pill 9999px`.
Do **not** use 12px+ radii (that was the old v2 look).

## 4. Spacing — 8pt scale

Use only: **`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`** for padding, gaps, margins.
Sidebar width = **240px**. Set these as Figma number variables if you like.

## 5. Style rules baked into the system (so Figma matches code)

- Flat cards, **no glow/shadow stacks**, 1px borders using `border/*`.
- Theme-aware always: if a color isn't one of the variables above, it's wrong.
- `text/*` for text, `surface/*` for backgrounds, `border/*` for strokes.
- White text only on accent/colored fills, never on paper surfaces.

## 6. Workflow once Figma is connected (`/mcp` → claude.ai Figma)

1. Design a screen/component in Figma using the variables + styles above.
2. Tell Claude which frame (paste the Figma frame link or select it).
3. Claude reads the frame via the Figma MCP and generates Next.js + Tailwind
   code mapped to your CSS tokens (not raw hex), theme-aware by construction.
4. Review in **both** paper and ink, wire data, ship.

The closer your Figma frame sticks to these variables/styles, the closer the
generated code is to drop-in.
