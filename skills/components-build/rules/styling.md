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
