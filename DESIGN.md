# Rival Scope — Design System v2

**Direction:** Premium Dark Intelligence Platform  
**Personality:** Sharp, data-forward, authoritative. Feels like a Bloomberg terminal with taste.

---

## Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Headings / UI | Geist Sans | 500 / 600 | Page titles, section headers, body labels |
| Data / Mono | Geist Mono | 400 / 500 | URLs, metrics, diffs, timestamps, labels |

Loaded via `next/font` (GeistSans + GeistMono variables).

---

## Color Palette

### Surfaces
| Token | Value | Usage |
|-------|-------|-------|
| `--surface-base` | `#070b14` | Page background |
| `--surface-raised` | `#0c1120` | Cards, panels |
| `--surface-overlay` | `#111827` | Modals, popovers |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border-default` | `rgba(255,255,255,0.07)` | Standard borders |
| `--border-subtle` | `rgba(255,255,255,0.04)` | Dividers |
| `--border-strong` | `rgba(255,255,255,0.12)` | Hover/active states |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#e8eaf0` | Headings, main content |
| `--text-secondary` | `#8892a4` | Body, descriptions |
| `--text-muted` | `#4e5a6e` | Labels, timestamps |

### Accent — Sky Blue
| Token | Value | Usage |
|-------|-------|-------|
| `--accent-primary` | `#0ea5e9` | Buttons, active state, CTA |
| `--accent-hover` | `#0284c7` | Button hover |
| `--accent-subtle` | `rgba(14,165,233,0.10)` | Icon backgrounds, nav active |
| `--accent-border` | `rgba(14,165,233,0.25)` | Accent borders |
| `--accent-glow` | `rgba(14,165,233,0.15)` | Focus ring, button glow |

### Change-Type Semantic Colors
| Change Type | Text | Background | Border |
|-------------|------|------------|--------|
| `pricing_change` | `#f59e0b` | `rgba(245,158,11,0.10)` | `rgba(245,158,11,0.20)` |
| `feature_add` | `#10b981` | `rgba(16,185,129,0.10)` | `rgba(16,185,129,0.20)` |
| `repositioning` | `#a78bfa` | `rgba(124,58,237,0.12)` | `rgba(124,58,237,0.24)` |
| `review_trend` | `#38bdf8` | `rgba(14,165,233,0.10)` | `rgba(14,165,233,0.20)` |
| `minor_copy` | `#64748b` | `rgba(148,163,184,0.08)` | `rgba(148,163,184,0.15)` |

---

## Radius Scale — ONE system, consistent everywhere
| Context | Value |
|---------|-------|
| Buttons | `8px` (`--radius-md`) |
| Inputs | `8px` (`--radius-md`) |
| Cards | `12px` (`--radius-lg`) |
| Modals | `12px` (`--radius-lg`) |
| Badges | `6px` (`--radius-sm`) |
| Avatars / Pills | `9999px` (`--radius-pill`) |

---

## Layout

### Dashboard (authenticated pages)
- **Sidebar:** `240px` fixed left, `var(--surface-base)` background
- **Content area:** `margin-left: 240px`, max-width `1140px`
- **Content padding:** `32px` horizontal, `32px` top

### Sidebar anatomy
1. Brand block: logo + wordmark + user email pill (with plan badge)
2. Navigation: icon + label, violet active rail indicator (3px left)
3. Bottom: Scan All button, trial banner, sign out

---

## Components

### Cards (`.rs-card`)
```
background: var(--surface-raised)
border: 1px solid var(--border-default)
border-radius: 12px
box-shadow: var(--shadow-card)
hover: box-shadow var(--shadow-card-hover), border var(--border-strong)
transition: 180ms cubic-bezier(0.16,1,0.3,1)
```

### Buttons
**Primary (`.rs-btn-primary`):**
```
background: var(--accent-primary) = #0ea5e9
color: white  font-weight: 600  font-size: 13px
padding: 9px 16px  border-radius: 8px
hover: background var(--accent-hover) + box-shadow glow
active: translateY(1px) scale(0.99)
```

**Ghost (`.rs-btn-ghost`):**
```
background: transparent  color: var(--text-secondary)
border: 1px solid var(--border-default)  border-radius: 8px
padding: 8px 14px  font-size: 13px
hover: bg rgba(255,255,255,0.04), color var(--text-primary), border-strong
```

### Inputs (`.rs-input`)
```
background: rgba(255,255,255,0.03)
border: 1px solid var(--border-default)
border-radius: 8px  padding: 9px 13px  font-size: 13px
focus: border var(--accent-primary) + box-shadow 0 0 0 3px var(--accent-glow)
```

### Badges (`.badge + .badge-{type}`)
```
font-size: 10px  font-weight: 700  letter-spacing: 0.06em
text-transform: uppercase  border-radius: 6px
padding: 2px 8px  border: 1px solid  font-family: mono
```

### Labels (`.rs-label`)
```
font-size: 11px  font-weight: 500  letter-spacing: 0.04em
text-transform: uppercase  color: var(--text-muted)  font-family: mono
```

---

## Motion

- Entry transitions: `duration: 0.2–0.6s, ease: [0.16, 1, 0.3, 1]`
- Hover lifts: `whileHover: { y: -2 }` — subtle, not aggressive
- Active presses: `translateY(1px) scale(0.99)` — tactile feedback
- Animated indicators: Spring physics `stiffness: 480, damping: 38`
- `prefers-reduced-motion`: all animations collapse to instant/static

---

## Spacing Rhythm (8pt scale)
```
4px  8px  12px  16px  24px  32px  40px  48px  64px
```
Gaps, padding, and margin MUST use this scale. No arbitrary values.

---

## Creative Decisions

1. **Sky Blue accent** — `#0ea5e9` instead of electric violet. Intentional, clean, data-focused.
2. **Left nav rail indicator** — 3px glowing sky blue bar with spring animation. Stolen from Linear. Earns it.
3. **Accent top-border on stat cards** — colored 2px accent stripe at top of each card communicates data type at a glance without cluttering the card body.
4. **All-dark theme locked** — no section-level light mode inversions. One theme, everywhere.
5. **Geist mono for all data** — URLs, metrics, timestamps, labels. Signals precision.
