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
