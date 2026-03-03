---
title: S2A Design Tokens
impact: CRITICAL
tags: ["theme", "colors", "typography", "s2a", "vercel"]
---

# S2A Design Tokens

This document defines the complete design token system for the Amicale S2A project.
It is derived from the **Vercel preset** on [tweakcn.com](https://tweakcn.com/editor/theme),
overriding the primary color with the S2A Royal Navy Blue and adding project-specific
semantic tokens for financial data visualization.

## 1. Color Palette

### 1.1 Semantic Color Mapping

| Token | Light Mode | Dark Mode | Purpose |
|---|---|---|---|
| `--primary` | `#002366` (Royal Navy Blue) | `#6699CC` | Brand, navigation, CTAs |
| `--primary-foreground` | `#FFFFFF` | `#000000` | Text on primary backgrounds |
| `--destructive` | `#DC3545` | `#DC3545` | Arrears, alerts, rejections |
| `--success` | `#28A745` | `#28A745` | Paid months, validated payments |
| `--gold` | `#D4AF37` | `#D4AF37` | Savings balance, wealth indicators |
| `--blackout` | `#E9ECEF` | `#333333` | Blackout/suspended months |
| `--background` | `#FDFDFD` | `#000000` | Page background |
| `--card` | `#FFFFFF` | `#242424` | Card/panel backgrounds |
| `--muted` | `#F7F7F7` | `#3A3A3A` | Subtle backgrounds |
| `--muted-foreground` | `#6E6E6E` | `#B8B8B8` | Secondary text, placeholders |
| `--border` | `#EBEBEB` | `#424242` | Borders, dividers |

### 1.2 Why These Colors?

- **Royal Navy Blue (`#002366`):** Conveys trust, authority, and financial reliability. Used for all primary actions and navigation.
- **Metallic Gold (`#D4AF37`):** Represents wealth and savings. Used exclusively for the "Available Balance" KPI.
- **Green (`#28A745`):** Universal signal for success and payment validation.
- **Red (`#DC3545`):** Universal signal for alerts, debt, and rejection.
- **Light Grey (`#E9ECEF`):** Neutral state for blackout months — neither positive nor negative.

## 2. Typography

### 2.1 Font Stack

The project uses **Geist** as the primary font (consistent with the Vercel theme) with **Inter** and **Roboto** as fallbacks.

```
--font-sans: "Geist", "Inter", "Roboto", sans-serif;
--font-mono: "Geist Mono", "Roboto Mono", monospace;
```

The monospace font is **critical** for financial figures — it ensures digit alignment in KPI cards and tables.

### 2.2 Type Scale

| Role | Size | Weight | Color | Usage |
|---|---|---|---|---|
| Page Title | 24px | Bold (700) | `--primary` | Screen headings |
| Section Title | 20px | Semibold (600) | `--foreground` | Section headers |
| Body | 16px | Regular (400) | `--foreground` | General text |
| Caption | 14px | Regular (400) | `--muted-foreground` | Dates, labels |
| KPI Figure | 28px+ | Bold (700) | Varies | Financial counters |
| KPI Label | 11px | Semibold (600) | Varies | Counter labels (uppercase) |

## 3. Spacing & Sizing

### 3.1 Touch Targets

All interactive elements (buttons, links, form controls) MUST have a minimum size of **44×44px** to comply with mobile accessibility standards.

### 3.2 Border Radius

```
--radius: 0.5rem; /* 8px — used for cards, inputs, buttons */
```

Larger elements (modals, full-width cards) may use `rounded-2xl` (16px) for a more modern look.

### 3.3 Shadow System (Vercel-inspired)

```css
/* Subtle shadow for cards and panels */
box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.18);

/* Elevated shadow for modals and drawers */
box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.12);
```

## 4. Inactive State (Grayscale)

When a member's status is `INACTIVE`, the entire dashboard MUST be rendered in grayscale using the CSS `filter` property:

```tsx
<div className={cn("transition-all", isInactive && "grayscale opacity-75")}>
  {/* Dashboard content */}
</div>
```

A prominent red banner with a "Régulariser ma situation" CTA MUST be displayed above the grayscale content.
