# Competitor Analyzer — Design System

**Direction:** Clean/Editorial — Trusted Analyst  
**Personality:** A premium intelligence report delivered by someone who also ships great software.

---

## Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Headings | Plus Jakarta Sans | 700 / 800 | Page titles, section headers |
| Body / UI | Inter | 400 / 500 / 600 | All UI text, labels, descriptions |
| Data / Mono | JetBrains Mono | 400 / 500 | URLs, change metrics, diffs |

Google Fonts import:
```
Plus Jakarta Sans: 400, 500, 600, 700, 800
Inter: 400, 500, 600
JetBrains Mono: 400, 500
```

---

## Color Palette

### Base
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Background | `#FAFAFA` | `bg-zinc-50` | Page background |
| Surface | `#FFFFFF` | `bg-white` | Cards, sidebar |
| Border | `#E4E4E7` | `border-zinc-200` | All borders |
| Text primary | `#18181B` | `text-zinc-900` | Headings, main text |
| Text muted | `#71717A` | `text-zinc-500` | Descriptions, labels |
| Text faint | `#A1A1AA` | `text-zinc-400` | Timestamps, hints |

### Interactive
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| CTA primary | `#09090B` | `bg-zinc-950` | Black buttons |
| Accent / links | `#2563EB` | `text-blue-600` | Links, focus rings |
| Hover bg | `#F4F4F5` | `bg-zinc-100` | Nav hover, soft hover |

### Change-Type Semantic Colors
| Change Type | Background | Text | Border |
|-------------|-----------|------|--------|
| `pricing_change` | `#FEF3C7` | `#92400E` | `#FDE68A` |
| `feature_add` | `#ECFDF5` | `#065F46` | `#A7F3D0` |
| `repositioning` | `#EFF6FF` | `#1E40AF` | `#BFDBFE` |
| `minor_copy` | `#F4F4F5` | `#52525B` | `#E4E4E7` |
| `no_change` | `#F4F4F5` | `#A1A1AA` | `#E4E4E7` |

---

## Layout

### Dashboard Layout (authenticated pages)
- **Left sidebar:** 240px fixed, white bg, `1px solid #E4E4E7` right border
- **Content area:** `margin-left: 240px`, max-width 1120px centered
- **Content padding:** `32px` horizontal, `32px` top

### Sidebar anatomy
1. Logo block: 56px tall, `1px solid #E4E4E7` bottom border
2. Navigation: stacked links with icon + label
3. Account footer: email + settings/logout links

### Login page
- Full-page centered layout (no sidebar)
- Max-width `400px` card, centered vertically

---

## Components

### Cards
```
bg-white
border: 1px solid #E4E4E7
border-radius: 12px
padding: 24px
box-shadow: 0 1px 2px rgba(0,0,0,0.04)
hover: box-shadow: 0 4px 12px rgba(0,0,0,0.06)
transition: 150ms ease-out
```

### Buttons
**Primary (black):**
```
bg: #09090B  text: white  font-weight: 500
padding: 10px 16px  border-radius: 8px
hover: opacity 90%  active: scale 98%
```

**Secondary:**
```
bg: white  border: 1px solid #E4E4E7
text: #18181B  font-weight: 500
padding: 10px 16px  border-radius: 8px
hover: bg #F4F4F5
```

**Destructive:**
```
bg: #FEF2F2  text: #DC2626  border: 1px solid #FECACA
font-weight: 500  padding: 10px 16px  border-radius: 8px
hover: bg #FEE2E2
```

### Badges / Change-type tags
```
font-size: 11px  font-weight: 600  letter-spacing: 0.04em
text-transform: uppercase  border-radius: 6px
padding: 3px 8px  border: 1px solid
Color: semantic per change type (see above)
```

### Form inputs
```
bg: #FAFAFA  border: 1px solid #E4E4E7  border-radius: 8px
padding: 10px 14px  font-size: 14px
focus: border-color #2563EB  ring: 2px blue-600/20
```

### Nav items (sidebar)
```
Active:   bg #F4F4F5  text #18181B  font-weight: 600
Inactive: text #71717A  hover bg #F4F4F5/50  hover text #18181B
padding: 8px 10px  border-radius: 8px  font-size: 14px
```

---

## Motion

- All transitions: `150ms ease-out`
- No bounce or spring animations
- HTMX swaps: simple opacity fade
- Hover state: immediate (0ms delay), 150ms out

---

## Creative Risks

1. **Left sidebar layout** — breaks from top-nav convention. Rationale: dashboard products need vertical space for long AI briefs; sidebar = Linear/Vercel energy.
2. **Amber/emerald semantic badges** — change type carries color meaning. Rationale: makes intelligence items feel like flagged signals, not generic tags.
3. **JetBrains Mono for competitor data** — URLs and diff metrics in monospace. Rationale: signals technical precision, differentiates from spreadsheet-style tools.
