---
title: S2A Accessibility Guidelines
impact: CRITICAL
tags: ["accessibility", "a11y", "aria", "keyboard", "s2a"]
---

# S2A Accessibility Guidelines

Accessibility is a core requirement for the Amicale S2A project. All components MUST be
operable by keyboard and screen readers. This is especially important for financial
applications where users must be able to perform critical actions with confidence.

## 1. Semantic HTML

Always use the correct HTML element for its intended purpose.

| Purpose | Correct Element | Incorrect Element |
|---|---|---|
| Clickable action | `<button>` | `<div onClick>` |
| Navigation link | `<a href>` | `<div onClick>` |
| Form field | `<input>`, `<select>`, `<textarea>` | `<div contenteditable>` |
| Page section | `<main>`, `<nav>`, `<section>` | `<div>` |
| Data table | `<table>`, `<th>`, `<td>` | Nested `<div>` |

## 2. Touch Target Size

All interactive elements MUST have a minimum touch target of **44×44px** on mobile.

**Incorrect:**
```tsx
<button className="h-8 w-8">
  <Icon />
</button>
```

**Correct:**
```tsx
<button className="flex h-11 w-11 items-center justify-center">
  <Icon className="h-5 w-5" />
</button>
```

## 3. Form Accessibility

Every input MUST have an associated `<label>`.

**Incorrect:**
```tsx
<input type="email" placeholder="Email" />
```

**Correct:**
```tsx
<label htmlFor="email" className="text-sm font-medium">
  Email ou Téléphone
</label>
<Input id="email" type="email" placeholder="nom@exemple.com" />
```

For validation errors, use `aria-invalid` and `aria-describedby`:

```tsx
<Input
  id="email"
  type="email"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
{errors.email && (
  <p id="email-error" role="alert" className="text-sm text-destructive">
    {errors.email.message}
  </p>
)}
```

## 4. ARIA for Complex Components

### Dialog / Bottom Drawer
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="drawer-title"
>
  <h2 id="drawer-title">Valider le paiement</h2>
  ...
</div>
```

### Navigation
```tsx
<nav aria-label="Navigation principale">
  <Link href="/dashboard" aria-current={isActive ? "page" : undefined}>
    Tableau
  </Link>
</nav>
```

### Loading State
```tsx
<div aria-busy="true" aria-label="Chargement des données financières...">
  <Skeleton className="h-8 w-32" />
</div>
```

## 5. Focus Management

- When a modal or drawer opens, focus MUST move to the first focusable element inside it.
- When a modal or drawer closes, focus MUST return to the element that triggered it.
- Use `tabindex="-1"` on the modal container to make it programmatically focusable.

```tsx
const drawerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isOpen) {
    drawerRef.current?.focus();
  }
}, [isOpen]);

<div ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true">
  ...
</div>
```

## 6. Color Contrast

- All text on `--primary` backgrounds MUST use `--primary-foreground` (white).
- All text on `--gold` backgrounds MUST use `--gold-foreground` (dark).
- Never rely on color alone to convey meaning. The contribution calendar tiles MUST have both a color AND an icon.

**Correct (Color + Icon):**
```tsx
{/* Paid month */}
<div className="border-success/40 bg-success/10">
  <span className="text-success text-xs font-semibold">JAN</span>
  <CheckCircle2 className="h-6 w-6 text-success" />
</div>
```

**Incorrect (Color only):**
```tsx
{/* Paid month — no icon */}
<div className="bg-success/10">
  <span>JAN</span>
</div>
```

## 7. Toast Notifications

Toasts MUST be announced to screen readers.

```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="..."
>
  Paiement de [Nom] validé et logué.
</div>
```
---
title: S2A Core Component Guidelines
impact: CRITICAL
tags: ["components", "ui", "s2a", "mockup"]
---

# S2A Core Component Guidelines

This document provides specific implementation guidance for each key screen and component
in the Amicale S2A project. The agent MUST cross-reference the mockups in `docs/wireframe/`
when implementing any screen.

## 1. Login Screen (`/login`)

**Mockup:** `docs/wireframe/login.png`

**Key Visual Elements:**
- Centered card layout (`max-w-sm`, `rounded-2xl`, `shadow-md`).
- Logo: Circular icon with `bg-muted` background, `text-primary` icon color.
- Title: "Amicale S2A" in `text-primary`, `font-bold`, `text-2xl`.
- Subtitle: `text-muted-foreground`.
- Hero image: Rounded corners (`rounded-xl`), full width.
- Form section heading: "Bienvenue" in `font-bold`, `text-xl`.
- Inputs: With left icon (user/lock), right icon for password toggle.
- "Mot de passe oublié ?" link: `text-primary`, `font-semibold`, right-aligned.
- CTA Button: Full-width, `h-14`, `bg-primary`, `rounded-xl`, `text-white`, `font-semibold`.
- Footer link: "Pas encore de compte ? **Rejoindre l'amicale**" — bold part in `text-primary`.

**Implementation Notes:**
- The password field MUST have a show/hide toggle button (eye icon).
- Inputs MUST validate on blur and show inline error messages.
- The CTA button MUST show a loading spinner while the form is submitting.

## 2. Password Setup Screen (`/auth/setup-password`)

**Mockup:** `docs/wireframe/setup-password.png`

**Key Visual Elements:**
- Top navigation bar: Back arrow + "Configuration du compte" title.
- Icon: Lock icon in a circular `bg-muted` container.
- Welcome message: "Bienvenue, [Prénom Nom] !" in `font-bold`, `text-2xl`.
- Description: `text-muted-foreground`, centered.
- Two password inputs with show/hide toggle.
- Password strength indicator:
  - Label: "Force du mot de passe" + colored percentage text.
  - Progress bar: Full width, colored by strength level.
  - Tip text: `text-muted-foreground`, `text-sm`.
- CTA: "Activer mon compte" with a chevron right icon, full-width, `bg-primary`.
- Footer: "Besoin d'aide ? **Contacter le support**" — bold part in `text-primary`.

**Password Strength Colors:**
- Weak (< 40%): `text-destructive` / `bg-destructive`
- Moderate (40–70%): `text-primary` / `bg-primary`
- Strong (> 70%): `text-success` / `bg-success`

## 3. Member Dashboard (`/dashboard`)

**Mockup:** `docs/wireframe/dashboard.png`

**Layout:**
1. Top header (sticky): Hamburger menu, "AMICALE S2A" title, notification bell, avatar.
2. Arrears banner (conditional): Only if `arrears > 0`.
3. "Ma Situation" section with 3 KPI cards.
4. Contribution calendar grid.
5. "Activités Récentes" list.
6. Floating Action Button (FAB).
7. Bottom navigation bar.

**KPI Cards Layout:**
```
┌─────────────────────────────────┐
│  TOTAL VERSÉ (primary, full row)│
│  1,250,000 CFA                  │
└─────────────────────────────────┘
┌──────────────┐ ┌────────────────┐
│ FONDS FONCT. │ │ SOLDE ÉPARGNE  │
│ (secondary)  │ │ (gold)         │
│ 208,333 CFA  │ │ 1,041,667 CFA  │
└──────────────┘ └────────────────┘
```

Use CSS Grid: `grid grid-cols-2 gap-3`. The first card spans 2 columns: `col-span-2`.

**Recent Activity List Item:**
```tsx
<div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
    <CreditCard className="h-5 w-5" />
  </div>
  <div className="flex-1">
    <p className="font-semibold text-sm">Versement Mai 2024</p>
    <p className="text-xs text-muted-foreground">12 MAI 2024</p>
  </div>
  <span className="font-mono font-semibold text-success">+25k</span>
</div>
```

## 4. Payment Wizard — Step 1: Channel Selection

**Mockup:** `docs/wireframe/payment-wizard-step1.png`

**Key Visual Elements:**
- Top navigation: Back arrow + "Déclarer un paiement" title.
- Progress indicator: "AMICALE S2A / Progression de la déclaration" + "1 sur 4" badge + progress bar.
- Heading: "Choisissez votre mode de paiement" (`font-bold`, `text-2xl`, centered).
- Sub-heading: `text-muted-foreground`, centered.
- Channel list: Vertical stack of `PaymentChannelItem` components.
- CTA: "Suivant" button, full-width, `bg-primary`, `h-14`.

**Progress Bar:**
```tsx
<div className="h-1.5 w-full rounded-full bg-muted">
  <div
    className="h-full rounded-full bg-primary transition-all"
    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
  />
</div>
```

**Payment Channels:**
| Label | Description | Icon |
|---|---|---|
| Flooz | Paiement mobile Moov | `Smartphone` |
| T-Money | Paiement mobile Togocom | `Wifi` |
| Virement | Virement bancaire direct | `Building2` |
| Western Union | Transfert international | `Globe` |
| Espèces | Remise en main propre | `Banknote` |

## 5. EB Validation Console (`/eb/validation`)

**Key Visual Elements:**
- List of pending payment declarations.
- Each item: Member name, amount, channel, reference, date.
- On tap: A bottom drawer (sheet) slides up with:
  - Large reference number + copy button.
  - "Approuver" button (`bg-success`).
  - "Rejeter" button (`bg-destructive`).
  - Conditional "Motif du rejet" dropdown (appears only when "Rejeter" is clicked).

**Copy Button Pattern:**
```tsx
const [copied, setCopied] = useState(false);

const handleCopy = async (text: string) => {
  await navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

<button onClick={() => handleCopy(reference)}>
  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
  <span>{copied ? "Copié !" : "Copier"}</span>
</button>
```

## 6. Member Registry (`/eb/members`)

**Key Visual Elements:**
- Data table with columns: Nom, Prénom, Email, Téléphone, Date d'adhésion, Statut.
- Status badge: `ACTIVE` → `bg-success/15 text-success` | `INACTIVE` → `bg-destructive/15 text-destructive`.
- "Ajouter un membre" button (top-right).
- Search bar and filter by status.

## 7. Common Patterns

### Section Header with Icon

```tsx
<div className="flex items-center gap-2 mb-4">
  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
    <Wallet className="h-4 w-4" />
  </div>
  <h2 className="text-lg font-semibold">Ma Situation</h2>
</div>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
    <InboxIcon className="h-8 w-8 text-muted-foreground" />
  </div>
  <p className="font-semibold">Aucune activité récente</p>
  <p className="mt-1 text-sm text-muted-foreground">Vos paiements apparaîtront ici.</p>
</div>
```
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
---
title: S2A Component Styling
impact: HIGH
tags: ["styling", "tailwind", "cva", "cn", "s2a"]
---

# S2A Component Styling

This guide defines the styling conventions for the Amicale S2A project.
Following these rules ensures a consistent, maintainable, and visually coherent codebase.

## 1. The `cn()` Utility (Mandatory)

The `cn()` utility MUST be used for all dynamic class merging. It prevents Tailwind CSS class conflicts.

**Setup (`/lib/utils.ts`):**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Incorrect (String concatenation — causes class conflicts):**
```tsx
<div className={`p-4 bg-card ${isActive ? "border-primary" : ""} ${className}`}>
```

**Correct (Using `cn()`):**
```tsx
<div className={cn("p-4 bg-card", isActive && "border-primary", className)}>
```

## 2. Component Variants with CVA

For components with multiple visual states, use `class-variance-authority` (CVA).
This keeps variant logic organized and type-safe.

**Pattern:**
```typescript
import { cva, type VariantProps } from "class-variance-authority";

const componentVariants = cva(
  "base-classes-always-applied",
  {
    variants: {
      variant: {
        default: "...",
        destructive: "...",
      },
      size: {
        default: "...",
        sm: "...",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## 3. Class Application Order

When composing classes, always apply in this order to ensure correct specificity:

1.  **Base styles:** Layout, display, position.
2.  **CVA variant styles:** Applied via `componentVariants({ variant, size })`.
3.  **Conditional styles:** Based on component state (e.g., `isActive && "border-primary"`).
4.  **User `className` override:** Always last, so consumers can override defaults.

## 4. Mobile-First Responsive Styling

Always write mobile styles first, then add responsive prefixes for larger screens.

**Incorrect (Desktop-first):**
```tsx
<div className="flex-row md:flex-col">
```

**Correct (Mobile-first):**
```tsx
<div className="flex-col md:flex-row">
```

**S2A Breakpoints:**
- `md:` (768px+) — Tablet and desktop: sidebar navigation, multi-column layouts.
- `lg:` (1024px+) — Large desktop: wider content areas.

## 5. Financial Data Styling Rules

Financial figures MUST use the monospace font and semantic colors.

**Correct:**
```tsx
{/* Positive balance */}
<span className="font-mono font-bold text-success">+25,000 CFA</span>

{/* Arrears */}
<span className="font-mono font-bold text-destructive">-45,000 CFA</span>

{/* Savings (gold) */}
<span className="font-mono font-bold text-gold">1,041,667 CFA</span>
```

## 6. Loading States (Skeleton)

While financial data is loading (e.g., `getMemberBalance` is computing), display skeleton placeholders.

```tsx
import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

// Usage in KPI card:
{isLoading ? (
  <Skeleton className="h-8 w-32" />
) : (
  <p className="font-mono text-2xl font-bold">{value}</p>
)}
```

## 7. Toast Notifications

Use a toast system for feedback after EB actions (e.g., "Paiement validé").

- **Success toast:** Green border/icon, `bg-success/10`.
- **Error toast:** Red border/icon, `bg-destructive/10`.
- **Info toast:** Blue border/icon, `bg-primary/10`.

The toast MUST include `role="status"` and `aria-live="polite"` for screen reader support.

## 8. Inactive Member Grayscale

When a member's account status is `INACTIVE`, apply a grayscale filter to the dashboard content:

```tsx
<main className={cn(
  "transition-all duration-300",
  isInactive && "grayscale opacity-60 pointer-events-none"
)}>
  {children}
</main>
```

The arrears banner and the "Régulariser" CTA MUST be excluded from the grayscale filter and remain fully colored and interactive.
