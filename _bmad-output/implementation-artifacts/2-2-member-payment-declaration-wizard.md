# Story 2.2: Member Payment Declaration Wizard

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Member,
I want to declare a payment I made by selecting a channel and entering the reference ID,
so that the Board is notified to validate my contribution.

## Acceptance Criteria

1. **Given** a member is on the Payment Entry screen
   **When** they select a digital channel (Flooz, Mixx, Bank) and submit
   **Then** the reference ID field is mandatory
   **And** the contribution is saved to the database with a 'PENDING' status

## Tasks / Subtasks

- [x] Task 1: Wizard UI Components & Navigation Integration (AC: 1)
  - [x] Integrate a "Declare Payment" entry point into the Member Dashboard navigation (e.g., bottom tab bar or sidebar depending on screen size).
  - [x] Implement the Step-by-Step Payment Wizard in a new route (e.g., `/member/payment` or similar depending on routing). Use conditional rendering to create a multi-step experience on mobile.
  - [x] Step 1: Fetch and display active payment channels using the existing `usePaymentChannels` hook from Story 2.1. Render them as a grid of selectable cards.
  - [x] Step 2: Display specific payment channel info (Name, Instructions, Number). Utilize the existing `CopyButton` component so the member can easily copy the number.
  - [x] Step 3: Implement the submission form with inputs for "Amount", "Month/Year" (for which the contribution applies), and "Transaction Reference". Include a loading state on the submit button using `useTransition` or `useFormStatus` to prevent multiple submissions.
- [x] Task 2: Form State & Zod Validation (AC: 1)
  - [x] Use `react-hook-form` and `@hookform/resolvers/zod` for client-side form state and validation.
  - [x] Create a Zod schema with the following constraints: `amount` must be strictly greater than 0, `month`/`year` cannot be in the future relative to the current date, and `reference_id` is mandatory when the channel is digital (Flooz, Mixx, Bank, Western Union).
  - [x] Ensure specific error messages (e.g., "Reference ID is required for digital payments", "Amount must be greater than 0").
- [x] Task 3: Server Action to Create Contribution (AC: 1)
  - [x] Implement a server action in `actions.ts` to handle the contribution submission.
  - [x] Extract the `member_id` securely from the authenticated member's NextAuth session. Do NOT trust client-provided member IDs.
  - [x] Process server-side Zod validation.
  - [x] Explicitly check the `Contributions` table to ensure the `reference_id` does not already exist to prevent duplicate/fraudulent submissions. Discard the submission and return a specific error ("This reference ID has already been submitted") if a duplicate is found.
  - [x] Insert a new record into the `Contributions` table with `status = 'PENDING'`. Ensure the `payment_channel` field is explicitly mapped from the selected `PaymentChannels` row's `channel_type` field. (Leave `validator_id` and `validated_at` null).
- [x] Task 4: Success State & UX Feedback
  - [x] Upon successful submission, use the project's existing toast notification system to display a visual confirmation showing "Payment Under Review".
  - [x] Allow the user to navigate back to their dashboard or contribution history.
- [x] Task 5: Testing & Validation
  - [x] Write unit tests for the server action ensuring that non-authenticated users cannot submit, and the 'PENDING' status is strictly enforced.
  - [x] Write unit/integration tests confirming Zod validation prevents empty `reference_id` for digital channels.

## Dev Notes

- **Architecture/Data Models**:
  - Target table: `Contributions`.
  - Required fields: `member_id`, `amount`, `month`, `year`, `payment_channel` (enum mapped to selected provider's type), `reference_id` (mandatory for digital), `status` ('PENDING').
- **Security & Access Control**:
  - `member_id` MUST be sourced from `auth()` session. Never trust client payload for `member_id`.
  - Audit logging (`logAudit`) is NOT required (FR-AUDIT-01 is for EB actions only).
  - Explicitly query DB to prevent duplicate `reference_id` insertions.
- **UX/Design**:
  - Implement mobile-first, thumb-friendly multi-step wizard UI.
  - Re-use `CopyButton` component on Step 2.
  - Use Navy Blue primary color.
  - Implement toast notifications for the "Payment Under Review" success state.
- **Dependencies**:
  - MUST use `hooks/use-payment-channels.ts` and `components/ui/copy-button.tsx` from Epic 2 Story 1.

### Project Structure Notes

- Add member-specific views within the appropriate member dashboard route grouping.
- Server actions should go into `actions.ts` relative to the feature directory.
- Zod schemas should be defined in a shared library file (e.g., `lib/validations/contribution.ts`) so they can be reused by both client and server.

### References

- [Epic Breakdown](file:///c:/Users/kahonsu/Documents/GitHub/S2A/_bmad-output/planning-artifacts/epics.md)
- [Architecture](file:///c:/Users/kahonsu/Documents/GitHub/S2A/_bmad-output/planning-artifacts/architecture.md)
- [UX Specs](file:///c:/Users/kahonsu/Documents/GitHub/S2A/_bmad-output/planning-artifacts/front-end-spec.md)

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

### File List
