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
