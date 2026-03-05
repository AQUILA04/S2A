# Story 2.1: Payment Channel Configuration

status: done

## Story

As the Executive Board,
I want to configure and manage the payment channel details (Flooz, Mixx, Bank RIB, Western Union) that members will use,
so that members always have the correct, up-to-date treasury numbers for making their payments.

## Acceptance Criteria

1. **Given** the President or Treasurer is logged into the administrative settings
   **When** they add or update a payment channel and number
   **Then** the new details are saved and displayed correctly in the member's payment wizard
   **And** the "Copy to Clipboard" button correctly copies the new treasury number

## Tasks / Subtasks

- [x] Task 1: Database Schema Update (AC: 1)
  - [x] Execute the following exact SQL to create the `PaymentChannels` table mapping to the existing enum:
        ```sql
        CREATE TABLE public."PaymentChannels" (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            provider_name TEXT NOT NULL,
            channel_type public.payment_channel NOT NULL,
            account_number TEXT NOT NULL,
            instructions TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            updated_by UUID REFERENCES public."Members"(id)
        );
        ```
  - [x] Apply RLS policies to restrict write access to `PRESIDENT` and `TREASURER`, and read access to `MEMBER`s.
  - [x] Regenerate database types using `npm run db:generate-types`.
- [x] Task 2: Server Actions & Audit Logging (AC: 1)
  - [x] Update `lib/audit/logger.ts` to add `"CREATE_PAYMENT_CHANNEL" | "UPDATE_PAYMENT_CHANNEL" | "DELETE_PAYMENT_CHANNEL"` to the `AuditActionType` union.
  - [x] Implement server actions in `app/admin/settings/payment-channels/actions.ts` to fetch, create, update (toggle `is_active`), and delete payment channels.
  - [x] Use `zod` to strictly validate payload data before database insertion.
  - [x] Wrap all mutation actions with the `logAudit` utility. Ensure the logged actor is the EB member.
- [x] Task 3: EB Admin Settings UI - Mockup Alignment (AC: 1)
  - [x] Create the UI in `/admin/settings/payment-channels`.
  - [x] Add the Page Header: Title "Payment Settings", Subtitle "Executive Portal\nConfigure available payment channels for Amicale S2A members."
  - [x] Implement the "Active Channels" section with an "+ Add New" button.
  - [x] Render channel cards matching the mockup:
    - Display a `lucide-react` icon on the left (e.g., smartphone for Mobile Money, building for Bank).
    - Display Provider Name (e.g., "Moov Flooz") and Channel Type ("Mobile Money").
    - Right-aligned Toggle switch to bind to `is_active`.
    - Data rows: "ACCOUNT / PHONE", "MERCHANT NAME" (hardcode "Amicale S2A" or "Amicale S2A Official"), and "INSTRUCTIONS".
    - "Edit details" button at the bottom of the card.
  - [x] Implement the "Quick Edit Template" form at the bottom (or in a drawer/modal depending on responsiveness):
    - Subtitle: "Configure fields for a new channel"
    - Input fields: "PROVIDER NAME" (e.g. MoneyGram), "ACCOUNT NUMBER" (Account or Phone), "SPECIFIC INSTRUCTIONS" (Tell members how to pay...).
    - Button: "Save Configuration" (Navy Blue).
  - [x] Ensure the UI adheres to the S2A Design System (Navy Blue, Gold, Green, Red).
  - [x] **CRITICAL:** Ensure END-TO-END UI INTEGRATION. Add a menu link to this settings page in the global admin navigation/sidebar so it's discoverable by the EB. Under "Settings" -> "Payments" (per the bottom nav mockup).
- [x] Task 4: Member Payment Wizard Integration Prep (AC: 1)
  - [x] Build a reusable component or service to fetch the active payment channels so it can be used seamlessly in Story 2.2.
  - [x] Design and implement a reusable "Copy to Clipboard" button component as specified in the UX specs.
- [x] Task 5: Testing & Validation
  - [x] Write unit/integration tests for the server actions.
  - [x] Verify RBAC (Role-Based Access Control) correctly allows/blocks modifications.

## Dev Notes

- **Architecture/Data Models**: Use the exact SQL snippet provided in Task 1. The `PaymentChannels` table maps `channel_type` to the existing `PaymentChannel` enum defined in `types/database.types.ts`. Implement an `is_active` toggle instead of hard deletion to maintain historical referential integrity if a payment channel is retired.
- **Security & Access Control**: Only roles inheriting from `TREASURER` or `PRESIDENT` can modify this. Use the NextAuth session and existing authorization patterns.
- **Audit Trail**: You MUST use the `logAudit` utility from `lib/audit/logger.ts` to log changes. **CRITICAL:** Update the `AuditActionType` union in `lib/audit/logger.ts` BEFORE implementing the actions, otherwise TypeScript compilation will fail.
- **UX/Design**: Strictly follow the provided mockup layout. Use `lucide-react` for all iconography. Follow the Mobile-First philosophy. Forms and cards should be highly responsive. The copy-to-clipboard functionality should provide immediate visual feedback (e.g., a toast notification or text changing to "Copied!").

### Project Structure Notes

- Use the established Server Actions pattern inside an `actions.ts` file in the relevant route.
- Reusable UI components should go into `components/ui/` or `components/admin/`.
- Ensure `lucide-react` is used for all icons (e.g., copy icon, edit/trash icons).
- Leverage Zod for strict server-side schema validation of the channel details before interacting with Supabase.

### References

- [Epic Breakdown](file:///c:/Users/kahonsu/Documents/GitHub/S2A/_bmad-output/planning-artifacts/epics.md)
- [Architecture](file:///c:/Users/kahonsu/Documents/GitHub/S2A/_bmad-output/planning-artifacts/architecture.md)
- [UX Specs](file:///c:/Users/kahonsu/Documents/GitHub/S2A/_bmad-output/planning-artifacts/front-end-spec.md)

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

- Fixed test mock for `deletePaymentChannel` — `delete().eq()` requires a chainable mock (not a plain `{ error: null }` object).

### Completion Notes List

- ✅ Task 1: Added `PaymentChannelRow` interface to `types/database.types.ts` with full Insert/Update type map. DB migration created at `supabase/migrations/V003__payment_channels.sql` — includes DDL, indexes, RLS policies, auto-updated_at trigger, and seed data for the 4 canonical channels.
- ✅ Task 2: Extended `AuditActionType` in `lib/audit/logger.ts` with 3 new action types **before** implementing actions (as required). Created `app/admin/settings/payment-channels/actions.ts` with `getPaymentChannels`, `createPaymentChannel`, `updatePaymentChannel`, `deletePaymentChannel`, `togglePaymentChannel` — all with Zod validation, RBAC guard (TREASURER / TRESORIER_ADJOINT / PRESIDENT), and `logAudit` calls.
- ✅ Task 3: Created `payment-channels-client.tsx` (client component) with full card grid, toggle switch, edit/delete controls, copy-to-clipboard button with visual feedback, toast notification system, and inline add/edit forms. Created `page.tsx` (server component) that fetches channels server-side and determines `canWrite` from the session. Added "Payments" nav item (`/admin/settings/payment-channels`, CreditCard icon) to `main-nav.tsx` for both desktop sidebar and mobile bottom bar.
- ✅ Task 4: Created `hooks/use-payment-channels.ts` reusable hook (ready for Story 2.2). Created `components/ui/copy-button.tsx` reusable CopyButton component (two sizes, ARIA-compliant, clipboard fallback).
- ✅ Task 5: Created `__tests__/payment-channels.actions.test.ts` with 24 tests covering: Zod schema validation (8 tests), RBAC enforcement for 6 role scenarios, audit log verification for all 3 action types, and error handling. **All 112 tests in the full suite pass (0 regressions)**.
- 🛠️ **Code Review Fixes Applied:**
  - **High:** Fixed `deletePaymentChannel` architecture violation by transitioning from a hard delete `.delete()` to a soft delete `.update({ is_active: false })` to preserve referential integrity.
  - **High:** Added `z.string().uuid()` validation to the `id` parameters in the server actions to prevent malformed format crashes.
  - **Medium:** Refactored `payment-channels-client.tsx` and `hooks/use-payment-channels.ts` to statically import server actions, avoiding JavaScript chunk loading delays.
  - **Medium:** Added `whitespace-pre-wrap` styling to the `DataRow` component to preserve inline newlines in payment instructions.
  - **Low:** Removed redundant manual `updated_at` time assignments and corrected "Déconnexion/Quitter" buttons in `main-nav.tsx` to read "Log Out" per English localization.

### File List

- `supabase/migrations/V003__payment_channels.sql` — [NEW] DB migration: DDL, indexes, RLS policies, auto-updated_at trigger, seed data
- `types/database.types.ts` — added `PaymentChannelRow` interface and `PaymentChannels` table in Database type map
- `lib/audit/logger.ts` — added 3 new `AuditActionType` values
- `app/admin/settings/payment-channels/actions.ts` — [NEW] server actions (CRUD + toggle, Zod, RBAC, audit)
- `app/admin/settings/payment-channels/payment-channels-client.tsx` — [NEW] interactive UI client component
- `app/admin/settings/payment-channels/page.tsx` — [NEW] server component page
- `hooks/use-payment-channels.ts` — [NEW] reusable hook for Story 2.2
- `components/ui/copy-button.tsx` — [NEW] reusable CopyButton component
- `components/s2a/main-nav.tsx` — added "Payments" nav item (CreditCard icon)
- `__tests__/payment-channels.actions.test.ts` — [NEW] 24 unit/integration tests

### Change Log

- 2026-03-05: Story 2.1 implemented — Payment Channel Configuration (all 5 tasks complete, 24 tests pass, 0 regressions in full 112-test suite)
