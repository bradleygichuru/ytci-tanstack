# Eco-Explorer Command Design System

Sourced from Stitch project **YTCI Explorer Command Centre** (`projects/17181829470439098105`). CSS variable tokens live in `src/styles.css`.

## Color tokens

| Token | Hex | Usage |
|---|---|---|
| `--forest` | `#154212` | Sidebar bg, primary nav, focus rings |
| `--amber` | `#fdc002` | Active nav, CTA buttons, warnings |
| `--leaf` | `#345a00` | Success states, approve actions |
| `--bg` | `#f8f9fa` | App background (Level 0 canvas) |
| `--on-surface` | `#191c1d` | Primary body text |
| `--on-surface-variant` | `#42493e` | Secondary text, labels |
| `--error` | `#ba1a1a` | Reject CTAs, error states |

Full palette: 30+ tokens defined at `src/styles.css` lines 10–32.

## Typography

**Plus Jakarta Sans** exclusively. Seven scale levels from `display-lg` (32/40/700) to `label-sm` (11/16/700 with 0.05em tracking).

## Shapes

- Cards: 0.5rem (8px) `rounded-lg`
- Status pills: rounded-full
- Inputs: 8px radius matching card language

## Spacing

- Sidebar expanded: 260px
- Sidebar collapsed: 72px
- Card padding: 20px
- Section gap: 32px
- Grid gutter: 24px
