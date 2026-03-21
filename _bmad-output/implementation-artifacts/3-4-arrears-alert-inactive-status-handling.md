# Story 3.4: Arrears Alert & Inactive Status Handling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the System,
I want to warn members if they owe money and switch their status to 'INACTIVE' if they accumulate >= 24 months of arrears,
So that they are visually prompted to regularize their standing and are barred from making new investments until regularized.

## Acceptance Criteria

1. **Given** a member with an active `getMemberBalance` payload
   **When** their `Arrears > 0`
   **Then** a persistent red banner (e.g., `bg-destructive`) is displayed at the top of the dashboard showing: "Attention : Vous avez des arriérés de [Montant] CFA."
2. **Given** the system calculates member balances
   **When** a member accumulates >= 24 months of arrears (`Unpaid_Months >= 24`)
   **Then** their `status` is evaluated as `INACTIVE`.
3. **Given** an INACTIVE member views their dashboard
   **When** they log in
   **Then** the UI is forced into grayscale mode.
   **And** a prominent red box displays: "Action Requise : Votre compte est inactif. Veuillez régulariser vos arriérés." with a CTA button "Régulariser ma situation".
   **And** access to other features (like making new investments) is blocked.
4. **Given** a user is INACTIVE
   **When** they attempt to perform investment actions or access investment routes
   **Then** the system must block the action via server-side checks and client-side UI disabling (Role Isolation).

## Tasks / Subtasks

- [x] Task 1: Use Existing Status Logic & Prepare Server Guards (AC: 2, 4)
  - [x] Leverage the `status` property already returned by `getMemberBalance`. **Do NOT rewrite or alter the `getMemberBalance` calculation.** It already correctly computes the `INACTIVE` state based on `>= 24` unpaid months.
  - [x] Prepare an authorization guard mechanism so that future server actions (like investments) can strictly verify `status === 'ACTIVE'`. Since no investment actions exist yet, build a robust check pattern so future Epics can enforce this constraint.
- [x] Task 2: Implement UI Alerts & Banners (AC: 1, 3)
  - [x] Create an `ArrearsBanner` component that displays the simple arrears warning if `Arrears > 0` and `status === 'ACTIVE'`.
  - [x] Create an `InactiveAlertBox` component that displays the "Action Requise" message and CTA when `status === 'INACTIVE'`.
  - [x] Integrate these alerts into the main Dashboard layout (`app/dashboard/components/dashboard-content.tsx` or similar).
- [x] Task 3: Implement Grayscale Mode & UI Blocking (AC: 3, 4)
  - [x] Apply a visual CSS filter (e.g., `grayscale`) to the dashboard layout conditionally if `status === 'INACTIVE'`. 
  - [x] **Critical Layout Step:** Render the `InactiveAlertBox` **OUTSIDE** of the grayscaled wrapper div. If the red alert is nested inside a container with `.grayscale`, it will become gray, defeating its purpose.
  - [x] Disable interactive elements not related to payment. Note: The ability to declare a payment (e.g., Payment FAB) MUST remain active so the member can regularize their status.
- [x] Task 4: Automated Testing
  - [x] Add React Testing Library tests for the new UI components (`ArrearsBanner`, `InactiveAlertBox`) ensuring they render correctly under `ACTIVE` with arrears and `INACTIVE` states.
  - [x] Update `balance.service.test.ts` to verify the `INACTIVE` status matches exactly at 24 unpaid months.

## Dev Notes

- **Architecture Patterns**: Next.js App Router, Tailwind CSS for styling (`bg-destructive` for alerts, `grayscale` utility for the inactive mode), NextAuth / Server Actions for backend security.
- **Previous Story Intelligence**: 
  - `getMemberBalance` was strictly hardened in Story 3.2. Do not rewrite the core timeline/balance logic. Leverage the outputs (`theoreticalDebt`, `totalPaid`, `availableBalance`) to compute `Arrears` and `Unpaid_Months`.
- **Context Guardrails**: 
  - Every story defining new UI MUST explicitly require adherence to the UX Specs preventing design drift. Be sure the red banners use S2A's alert tokens (`#DC3545` / `bg-destructive`).
  - To prevent client manipulation, the Server-Side Integrity NFR mandates `status` evaluation remain exclusively deep in the server layer.

### Project Structure Notes

- `app/dashboard/components/arrears-banner.tsx` (NEW)
- `app/dashboard/components/inactive-alert-box.tsx` (NEW)
- `app/dashboard/components/dashboard-content.tsx` (MODIFIED)
- `lib/services/balance.service.ts` (MODIFIED)
- `__tests__/components/arrears-banner.test.tsx` (NEW)
- `__tests__/components/inactive-alert-box.test.tsx` (NEW)
- `__tests__/balance.service.test.ts` (VERIFIED - Implemented in 3.2)

### References

- [Source: `_bmad-output/planning-artifacts/prd.md#3.1 Core Logic`]
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.4: Arrears Alert & Inactive Status Handling`]
- [Source: `_bmad-output/planning-artifacts/spec-ux.md#2.1.2 Dashboard Principal`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#4.1 The getMemberBalance(memberId) Algorithm`]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

### Completion Notes List

- Task 1: Created `requireActiveMember` guard in `lib/auth/guards.ts` to enforce strictly `ACTIVE` member status based on `getMemberBalance`, raising an error for INACTIVE members. Wrote unit tests in `__tests__/auth.guard.test.ts` to ensure coverage.
- Task 2: Styled `ArrearsBanner` as a prominent component with `bg-destructive` and extracted `InactiveAlertBox` UI into its own component. Integrated both into `dashboard-content.tsx` properly. 
- Task 3: Managed state in `dashboard-content.tsx` by applying `grayscale opacity-50 pointer-events-none` wrapper only to the inner content when INACTIVE, rendering `<InactiveAlertBox />` outside so it's fully colored. Navigation bars are outside this file (in layout) which guarantees payment navigation is accessible.
- Task 4: Added UI tests for `ArrearsBanner` and `InactiveAlertBox`. Confirmed that 24 mos `INACTIVE` verification tests were already implemented successfully in `__tests__/balance.service.test.ts` previously. Tests all passed.

### AI Code Review Follow-up (Agentic Fixes)

- Removed false claim in Project Structure Notes: `__tests__/balance.service.test.ts` had no new git changes as the tests were already implemented in Story 3.2.
- Fixed invalid HTML markup in `inactive-alert-box.tsx` (nested `<button>` inside `<Link>`).
- Fixed redundant rendering of `ArrearsBanner` in `dashboard-content.tsx` when INACTIVE.
- Applied best practices for Tailwind class merging using `cn()` in `dashboard-content.tsx`.

### File List

- `lib/auth/guards.ts` (NEW)
- `__tests__/auth.guard.test.ts` (NEW)
- `components/s2a/arrears-banner.tsx` (MODIFIED)
- `app/dashboard/components/inactive-alert-box.tsx` (NEW)
- `app/dashboard/components/dashboard-content.tsx` (MODIFIED)
- `__tests__/components/inactive-alert-box.test.tsx` (NEW)
- `__tests__/components/arrears-banner.test.tsx` (NEW)
