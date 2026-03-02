---
name: s2a-components-build
description: >
  Build modern, composable, and accessible React UI components for the Amicale S2A project.
  This skill provides specific guidelines for implementing the S2A visual identity (color palette,
  typography, spacing), using the Vercel theme from tweakcn.com as a base and components from
  ui.tripled.work, adapted to the S2A brand. Use this skill whenever creating, reviewing, or
  refactoring any UI component in the S2A project.
license: MIT
metadata:
  author: Manus, adapted for Amicale S2A
  version: "1.0.0"
  project: Amicale S2A
  references:
    - https://tweakcn.com/editor/theme (Vercel theme preset)
    - https://ui.tripled.work/components
    - docs/front-end-spec.md
    - docs/wireframe/ (reference mockups)
---

# Amicale S2A — Component Build Specification

This skill is the **single source of truth** for building UI components in the Amicale S2A project.
It ensures every component aligns with the visual identity, the mockups in `docs/wireframe/`, and the
specifications in `docs/front-end-spec.md`.

---

## When to Apply

Reference these guidelines when:
- Creating any new React/Next.js component for the S2A project.
- Implementing a screen from the mockups in `docs/wireframe/`.
- Applying the S2A theme (colors, fonts, spacing, shadows).
- Ensuring components are responsive and follow a **Mobile-First** approach.
- Building forms, cards, buttons, navigation, and financial dashboard elements.
- Integrating or adapting components from `ui.tripled.work`.

---

## Rule Categories by Priority

| Priority | Category | Focus | Rule File |
|----------|----------|-------|-----------|
| 1 | Design Tokens | S2A Color Palette, Typography, Spacing, Shadows | `rules/design-tokens.md` |
| 2 | Styling | Tailwind CSS, `cn()` utility, CVA variants | `rules/styling.md` |
| 3 | Core Components | Specific S2A components: Card, Button, Input, KPI, Calendar | `rules/components.md` |
| 4 | Accessibility | Semantic HTML, Keyboard, ARIA, Focus management | `rules/accessibility.md` |

---

## Quick Reference

### 1. Design Tokens

The S2A theme is derived from the **Vercel preset** on [tweakcn.com](https://tweakcn.com/editor/theme),
overriding the `primary` color with the S2A Royal Navy Blue (`#002366`) and adding project-specific
semantic tokens for financial data.

**The agent MUST configure `app/globals.css` with the following CSS variables:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* === BASE (Vercel-inspired) === */
    --background: 0 0% 99%;
    --foreground: 0 0% 0%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 0%;
    --popover: 0 0% 99%;
    --popover-foreground: 0 0% 0%;
    --secondary: 0 0% 94%;
    --secondary-foreground: 0 0% 0%;
    --muted: 0 0% 97%;
    --muted-foreground: 0 0% 44%;
    --accent: 0 0% 94%;
    --accent-foreground: 0 0% 0%;
    --border: 0 0% 92%;
    --input: 0 0% 94%;
    --ring: 0 0% 0%;

    /* === S2A BRAND OVERRIDES === */
    /* Primary: Royal Navy Blue */
    --primary: 221 100% 20%;          /* #002366 */
    --primary-foreground: 0 0% 100%;

    /* Destructive / Alert: Red */
    --destructive: 354 70% 54%;       /* #DC3545 */
    --destructive-foreground: 0 0% 100%;

    /* Success: Green */
    --success: 134 61% 41%;           /* #28A745 */
    --success-foreground: 0 0% 100%;

    /* Warning / Wealth: Metallic Gold */
    --gold: 43 63% 52%;               /* #D4AF37 */
    --gold-foreground: 0 0% 10%;

    /* Neutral / Blackout */
    --blackout: 210 17% 95%;          /* #E9ECEF */
    --blackout-foreground: 0 0% 44%;

    /* === TYPOGRAPHY === */
    --font-sans: "Geist", "Inter", "Roboto", sans-serif;
    --font-mono: "Geist Mono", "Roboto Mono", monospace;

    /* === RADIUS === */
    --radius: 0.5rem;

    /* === SHADOWS (Vercel-style) === */
    --shadow-color: 0 0% 0%;
    --shadow-opacity: 0.18;
    --shadow-blur: 2px;
    --shadow-spread: 0px;
    --shadow-offset-x: 0px;
    --shadow-offset-y: 1px;
  }

  .dark {
    --background: 0 0% 0%;
    --foreground: 0 0% 100%;
    --card: 0 0% 14%;
    --card-foreground: 0 0% 100%;
    --popover: 0 0% 18%;
    --popover-foreground: 0 0% 100%;
    --primary: 221 80% 65%;
    --primary-foreground: 0 0% 0%;
    --secondary: 0 0% 25%;
    --secondary-foreground: 0 0% 100%;
    --muted: 0 0% 23%;
    --muted-foreground: 0 0% 72%;
    --accent: 0 0% 32%;
    --accent-foreground: 0 0% 100%;
    --destructive: 354 70% 54%;
    --destructive-foreground: 0 0% 100%;
    --success: 134 61% 41%;
    --success-foreground: 0 0% 100%;
    --gold: 43 63% 52%;
    --gold-foreground: 0 0% 10%;
    --blackout: 0 0% 20%;
    --blackout-foreground: 0 0% 60%;
    --border: 0 0% 26%;
    --input: 0 0% 32%;
    --ring: 0 0% 72%;
  }
}
```

**The agent MUST configure `tailwind.config.ts` to expose these tokens:**

```typescript
import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        blackout: {
          DEFAULT: "hsl(var(--blackout))",
          foreground: "hsl(var(--blackout-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### 2. Styling Conventions

**Always use the `cn()` utility** for merging Tailwind classes. Create it at `/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Install required packages:
```bash
npm install clsx tailwind-merge class-variance-authority
```

**Class application order:** Base → Variants (CVA) → Conditionals → User `className` override.

---

### 3. Core S2A Components

All shared components MUST live in `components/ui/`. The agent MUST create these components before building any screen.

#### 3.1 Button

```tsx
// components/ui/button.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        success:     "bg-success text-success-foreground hover:bg-success/90",
        outline:     "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:       "hover:bg-accent hover:text-accent-foreground",
        link:        "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-2",     /* 48px height — mobile-friendly touch target */
        sm:      "h-9 rounded-md px-3",
        lg:      "h-14 rounded-lg px-8",
        icon:    "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

#### 3.2 Card

```tsx
// components/ui/card.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
```

#### 3.3 Input (with icon support)

```tsx
// components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-muted-foreground">{icon}</span>
        )}
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-lg border border-input bg-background py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            icon ? "pl-10 pr-4" : "px-4",
            rightIcon ? "pr-10" : "",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-muted-foreground">{rightIcon}</span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
```

#### 3.4 Financial KPI Card

Used in the member dashboard to display the 3 financial counters.

```tsx
// components/s2a/kpi-card.tsx
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  currency?: string;
  variant: "primary" | "secondary" | "gold";
  className?: string;
}

const variantMap = {
  primary:   "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  gold:      "bg-gold text-gold-foreground",
};

export function KpiCard({ label, value, currency = "CFA", variant, className }: KpiCardProps) {
  return (
    <div className={cn("rounded-lg p-4", variantMap[variant], className)}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold">
        {value} <span className="text-sm font-normal">{currency}</span>
      </p>
    </div>
  );
}
```

**Usage (Dashboard):**
```tsx
<KpiCard label="Total Versé" value="1,250,000" variant="primary" className="col-span-2" />
<KpiCard label="Fonds Fonct. (2/12)" value="208,333" variant="secondary" />
<KpiCard label="Solde Épargne (10/12)" value="1,041,667" variant="gold" />
```

#### 3.5 Arrears Alert Banner

Displayed at the top of the dashboard when `arrears > 0`.

```tsx
// components/s2a/arrears-banner.tsx
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ArrearsBannerProps {
  amount: number;
  currency?: string;
  onAction: () => void;
  className?: string;
}

export function ArrearsBanner({ amount, currency = "CFA", onAction, className }: ArrearsBannerProps) {
  return (
    <div className={cn("rounded-lg border border-destructive/30 bg-destructive/10 p-4", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Attention : Retard de paiement</p>
          <p className="text-sm text-destructive/80">
            Vous avez des arriérés de{" "}
            <span className="font-bold">
              {amount.toLocaleString("fr-FR")} {currency}
            </span>
            . Veuillez régulariser votre situation.
          </p>
        </div>
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="mt-3 w-full"
        onClick={onAction}
      >
        RÉGULARISER MAINTENANT
      </Button>
    </div>
  );
}
```

#### 3.6 Contribution Calendar Grid

```tsx
// components/s2a/contribution-calendar.tsx
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Lock } from "lucide-react";

type MonthStatus = "paid" | "due" | "blackout" | "future";

interface MonthTile {
  month: string; // e.g., "JAN"
  status: MonthStatus;
}

interface ContributionCalendarProps {
  year: number;
  months: MonthTile[];
}

const statusConfig: Record<MonthStatus, { bg: string; icon: React.ReactNode; text: string }> = {
  paid:    { bg: "border-success/40 bg-success/10", icon: <CheckCircle2 className="h-6 w-6 text-success" />, text: "text-success" },
  due:     { bg: "border-destructive/40 bg-destructive/10", icon: <AlertCircle className="h-6 w-6 text-destructive" />, text: "text-destructive" },
  blackout:{ bg: "border-blackout bg-blackout", icon: <Lock className="h-5 w-5 text-blackout-foreground" />, text: "text-blackout-foreground line-through" },
  future:  { bg: "border-border bg-muted", icon: <Lock className="h-5 w-5 text-muted-foreground" />, text: "text-muted-foreground" },
};

export function ContributionCalendar({ year, months }: ContributionCalendarProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendrier {year}</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Ok</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Retard</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {months.map(({ month, status }) => {
          const config = statusConfig[status];
          return (
            <div
              key={month}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border p-3 gap-1",
                config.bg
              )}
            >
              <span className={cn("text-xs font-semibold uppercase", config.text)}>{month}</span>
              {config.icon}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### 3.7 Payment Channel Selector (Wizard Step 1)

```tsx
// components/s2a/payment-channel-item.tsx
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentChannelItemProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected?: boolean;
  onClick: () => void;
}

export function PaymentChannelItem({
  icon, label, description, selected, onClick,
}: PaymentChannelItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}
```

#### 3.8 Bottom Navigation Bar (Mobile)

```tsx
// components/s2a/bottom-nav.tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CreditCard, Handshake, User } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Tableau", icon: LayoutDashboard },
  { href: "/cotisations", label: "Cotisations", icon: CreditCard },
  { href: "/prets", label: "Prêts", icon: Handshake },
  { href: "/compte", label: "Compte", icon: User },
];

interface BottomNavProps {
  currentPath: string;
}

export function BottomNav({ currentPath }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = currentPath === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium uppercase tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

#### 3.9 Floating Action Button (FAB)

```tsx
// components/s2a/fab.tsx
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabProps {
  onClick: () => void;
  className?: string;
}

export function Fab({ onClick, className }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Déclarer un paiement"
      className={cn(
        "fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:bottom-6",
        className
      )}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
```

---

### 4. Layout Patterns

#### 4.1 Mobile-First Page Layout

All pages MUST follow this layout pattern:

```tsx
// app/(member)/layout.tsx
import { BottomNav } from "@/components/s2a/bottom-nav";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="text-sm font-bold uppercase tracking-widest text-primary">
            Amicale S2A
          </span>
          {/* Notification bell + avatar */}
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 md:pb-6">
        <div className="mx-auto max-w-lg px-4 py-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (mobile only) */}
      <BottomNav currentPath="..." />
    </div>
  );
}
```

#### 4.2 Responsive Breakpoints

| Breakpoint | Width | Navigation | Layout |
|---|---|---|---|
| Mobile | `< 768px` | Bottom tab bar | Single column |
| Tablet/Desktop | `>= 768px` | Sidebar (`md:block`) | Multi-column |

#### 4.3 Auth / Onboarding Layout

Login and setup screens use a centered card layout:

```tsx
<div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
  <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-md">
    {/* Logo + Title */}
    {/* Form content */}
  </div>
</div>
```

---

### 5. Adapting Components from ui.tripled.work

When using components from [ui.tripled.work](https://ui.tripled.work/components), the agent MUST:

1.  **Override the color variables** to use S2A tokens (`--primary`, `--destructive`, `--success`, `--gold`).
2.  **Replace any hardcoded hex colors** with `hsl(var(--token-name))`.
3.  **Adjust border radius** to match `var(--radius)` (0.5rem).
4.  **Ensure font** is `var(--font-sans)` (Geist/Inter).

**Recommended components from ui.tripled.work for S2A:**

| Component | Use Case in S2A |
|---|---|
| `Morphing Button` (native-morphing-button) | FAB on dashboard |
| `Notification Bell` (native-notification-bell) | Header notification icon |
| `Counter Up` (native-counter-up) | Animated KPI figures |
| `Bottom Modal` (bottom-modal) | Validation action drawer |
| `Liquid Button` (native-liquid-button) | "Activer mon compte" CTA |
| `Nested List` (native-nested-list) | GA Archives list |
| `Stocks Dashboard` (stocks-dashboard) | EB financial overview |

---

### 6. Accessibility Requirements

- All interactive elements MUST have a minimum touch target of **44×44px**.
- All form inputs MUST have an associated `<label>`.
- Use `aria-invalid="true"` and `aria-describedby` for form validation errors.
- Dialogs and drawers MUST trap focus and return focus to the trigger on close.
- Use `role="status"` or `aria-live="polite"` for toast notifications.
- Color MUST NOT be the only means of conveying information (e.g., calendar tiles must have icons in addition to color).

---

### 7. Financial Data Display Rules

- **Monetary values** MUST use `font-mono` class for consistent digit alignment.
- **Positive values** (income, balance) use `text-success` or `text-primary`.
- **Negative values** (arrears, debt) use `text-destructive`.
- **Gold/Savings values** use `text-gold`.
- **Large numbers** MUST be formatted with `toLocaleString("fr-FR")` for French number formatting (e.g., `1 250 000`).

---

### 8. Wireframe Reference

All mockups are stored in `docs/wireframe/`. The agent MUST consult these files before implementing any screen.

| File | Screen |
|---|---|
| `login.png` | Login screen (`/login`) |
| `setup-password.png` | Password setup (`/auth/setup-password`) |
| `dashboard.png` | Member dashboard (`/dashboard`) |
| `payment-wizard-step1.png` | Payment channel selection |

---

## Key Principles

1.  **Wireframe Fidelity:** The implementation MUST match the mockups in `docs/wireframe/`.
2.  **Mobile-First:** Design for `< 768px` first, then adapt for larger screens.
3.  **S2A Brand Tokens:** Never use hardcoded hex colors. Always use CSS variables.
4.  **Composition:** Break complex screens into small, reusable components in `components/ui/` and `components/s2a/`.
5.  **Accessibility:** Minimum 44×44px touch targets, semantic HTML, ARIA attributes.
6.  **Financial Clarity:** KPI figures in `font-mono`, color-coded by status.
