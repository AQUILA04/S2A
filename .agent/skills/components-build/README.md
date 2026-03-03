# S2A Components Build Skill

An agent skill for building modern, composable, and accessible React UI components
for the **Amicale S2A** project, following the project's visual specifications and mockups.

## Overview

This skill provides comprehensive guidelines across 4 categories, ensuring every component
aligns with the S2A visual identity and the mockups in `docs/wireframe/`.

The theme is based on the **Vercel preset** from [tweakcn.com](https://tweakcn.com/editor/theme),
with S2A brand overrides (Royal Navy Blue primary, Metallic Gold for savings).
Components from [ui.tripled.work](https://ui.tripled.work/components) are recommended
and must be adapted to use S2A design tokens.

## Structure

```
skills/components-build/
├── SKILL.md              # Main skill definition (loaded by agents)
├── README.md             # This file
└── rules/                # Individual rule files
    ├── design-tokens.md  # CSS variables, color palette, typography
    ├── styling.md        # Tailwind CSS, cn(), CVA conventions
    ├── components.md     # Screen-by-screen component specifications
    └── accessibility.md  # ARIA, keyboard, focus management
```

## Rule Categories

| # | Category | Impact | Description |
|---|----------|--------|-------------|
| 1 | Design Tokens | CRITICAL | S2A color palette, typography, spacing |
| 2 | Styling | HIGH | Tailwind CSS, `cn()` utility, CVA variants |
| 3 | Core Components | CRITICAL | Screen-specific component implementations |
| 4 | Accessibility | CRITICAL | ARIA, keyboard, touch targets |

## Key Visual Identity

| Token | Value | Usage |
|---|---|---|
| Primary | `#002366` (Royal Navy Blue) | Navigation, CTAs, headings |
| Gold | `#D4AF37` (Metallic Gold) | Savings balance KPI |
| Success | `#28A745` (Green) | Paid months, validated payments |
| Destructive | `#DC3545` (Red) | Arrears, alerts, rejections |
| Blackout | `#E9ECEF` (Light Grey) | Suspended/blackout months |

## Usage

The agent MUST read `SKILL.md` before starting any UI development task.
For detailed guidance on a specific topic, read the corresponding rule file.

## References

- [tweakcn.com Vercel Theme](https://tweakcn.com/editor/theme)
- [ui.tripled.work Components](https://ui.tripled.work/components)
- [`docs/front-end-spec.md`](../../docs/front-end-spec.md)
- [`docs/wireframe/`](../../docs/wireframe/) — Reference mockups
