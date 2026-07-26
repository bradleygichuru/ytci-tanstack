# Stitch Design System — Eco-Explorer Command

Sourced from the Stitch project **YTCI Explorer Command Centre** (`projects/17181829470439098105`). This is the canonical reference for any UI built on the YTCI admin dashboard. Token values live in `src/styles.css` under `:root` and are used throughout `src/components/prototype/`.

## Color tokens

| Token | Hex | Usage |
|---|---|---|
| `--forest` | `#154212` | Sidebar background, primary nav, headings, focus rings, "Approve" CTAs in this prototype |
| `--forest-deep` | `#002b02` | Text on light surface (high contrast headings) |
| `--forest-light` | `#7eaf73` | "On primary container" text — used inside filled green surfaces |
| `--forest-leaf` | `#244100` | Tertiary green container; secondary growth-metric accents |
| `--amber` | `#fdc002` | Active nav item, "Deploy AI Guardrails" CTA, "Request Changes" button |
| `--amber-deep` | `#6c5000` | Text on amber surfaces (high contrast) |
| `--amber-bg` | `rgba(253, 192, 2, 0.2)` | 20% opacity amber — pill badges, hover row backgrounds |
| `--leaf` | `#345a00` | Tertiary accent — success states, "Approve" buttons in content cards |
| `--leaf-bg` | `rgba(52, 90, 0, 0.2)` | 20% opacity leaf — success pill backgrounds |
| `--bg` | `#f8f9fa` | App background (Level 0 / recessed canvas) |
| `--surface-1` | `#ffffff` | Card background (Level 1) |
| `--surface-2` | `#f3f4f5` | Card sub-sections, selected row background |
| `--surface-3` | `#edeeef` | `surface-container` |
| `--surface-4` | `#e7e8e9` | Card borders, footer top border, table row dividers |
| `--surface-5` | `#e1e3e4` | `surface-container-highest`, `surface-variant` |
| `--surface-dim` | `#d9dadb` | Heatmap low end, skeleton bg |
| `--on-surface` | `#191c1d` | Primary body text |
| `--on-surface-variant` | `#42493e` | Secondary body text, labels |
| `--outline` | `#72796e` | Stronger borders (focus ring) |
| `--outline-muted` | `#c2c9bb` | Default input border, subtle dividers |
| `--error` | `#ba1a1a` | "Reject" CTAs, notification badge |

## Spacing tokens

| Token | Value | Usage |
|---|---|---|
| `--sidebar-expanded` | `260px` | Sidebar width when expanded |
| `--sidebar-collapsed` | `72px` | Sidebar width when collapsed |
| `--card-padding` | `20px` | Inner padding of every dashboard card |
| `--section-gap` | `32px` | Vertical gap between major functional sections |
| `--grid-gutter` | `24px` | Horizontal gap between dashboard cards |
| `--touch-target` | `44px` | Minimum tap target for interactive elements |

## Shape tokens

- `border-radius: 0.25rem` (4px) — inputs, small chips
- `border-radius: 0.5rem` (8px) — **cards & containers (primary)**
- `border-radius: 0.75rem` (12px) — popovers
- `border-radius: 1rem` (16px) — large surface containers
- `border-radius: 1.5rem` (24px) — special large surfaces
- `border-radius: 9999px` (full) — **status pills, buttons (primary)**

## Shadow tokens

- `--card-shadow`: `0px 2px 12px rgba(21, 66, 18, 0.06)` — Level 1 cards (soft green-tinted)
- `--card-shadow-hover`: `0px 4px 16px rgba(21, 66, 18, 0.10)` — card hover
- Level 2 (modals/popovers): `0px 8px 24px rgba(0, 0, 0, 0.12)` (not tokenized — apply directly)

## Typography

**Plus Jakarta Sans** is the only font in the system. No serif.

| Token | Size / Line / Weight | Usage |
|---|---|---|
| Display LG | 32 / 40 / 700 | Page titles (rare) |
| Headline LG | 24 / 32 / 700 | Modal titles, large card headers |
| Headline MD | 20 / 28 / 600 | Card section headers ("Moderation Queue", "System Logs") |
| Body LG | 16 / 24 / 400 | Default body copy |
| Body MD | 14 / 20 / 400 | Table cell text, default small body |
| Label LG | 14 / 20 / 600 | Button text, input labels |
| Label SM | 11 / 16 / 700 (0.05em tracking) | **Pill badges, table column headers, captions, handles** — uses uppercase tracking for status labels |

## Component patterns

### Sidebar
- Background: `--forest`
- Width: 260px expanded, 72px collapsed
- Brand wordmark: Plus Jakarta Sans Bold 2xl, white
- "Admin Portal" caption: Label SM, white at 60% opacity, uppercase tracking 0.25em
- Nav items: rounded-lg, 18px Phosphor duotone icons, 14px Plus Jakarta Semibold labels
- Inactive: white at 80% opacity
- Active: `--amber` background, `--forest-deep` text
- Pinned "Deploy AI Guardrails" CTA at bottom: `--amber` background, `--forest-deep` text, Pill shape (rounded-full), 14px Plus Jakarta Bold

### Top bar
- Background: white (`--surface-1`)
- Height: 64px (h-16)
- Page title: Plus Jakarta Sans Bold lg, `--on-surface`
- Tab navigation: 14px Plus Jakarta Semibold, active has bottom border `--forest`, inactive `--on-surface-variant`
- Search input: 9px height, 256px width, rounded-md, 1px `--outline-muted` border, focus transitions to `--forest` with 1px ring
- Right side: bell icon with red notification badge (`--error`), theme toggle, avatar

### Cards
- Border-radius: 0.5rem (8px) — `rounded-lg`
- Border: 1px `--surface-4`
- Box-shadow: `var(--card-shadow)`
- Inner padding: 20px (`--card-padding`)
- Hover: card-shadow-hover; for media cards, border transitions to `--forest` per the designMD

### Section headers
- Plus Jakarta Sans Bold, base size
- Pill badge in the corner: rounded-full, 11px Plus Jakarta Bold uppercase, tracking-widest
- Badge backgrounds: 20% opacity tinted (e.g. `--amber-bg` for "3 Pending")

### Status pills / badges
- Always rounded-full
- 11px Plus Jakarta Bold, uppercase, letter-spacing 0.05em
- Tinted background (20% opacity of the role color), full-strength text

### Buttons
- **Primary**: solid `--forest` (Forest Green), white text, Plus Jakarta Bold
- **Secondary**: outlined `--forest`, `--forest` text
- **Warning**: solid `--amber` (Sun Yellow), `--forest-deep` text — maximum legibility
- **Approve in content cards**: `--leaf` (success tertiary)
- **Reject**: `--error`
- All buttons: rounded-full, py-3 (12px), 14px font, transition-colors

## Layout

- 12-column grid for dashboard content
- Cards span 3, 4, 6, or 12 columns based on data complexity
- 8px base spacing unit
- 32px between major sections, 24px between cards
- Breakpoints:
  - Mobile (<768px): sidebar → bottom-bar/drawer, margins 16px
  - Tablet (768–1024px): sidebar collapses to icon-only
  - Desktop (>1024px): full expanded sidebar 260px
