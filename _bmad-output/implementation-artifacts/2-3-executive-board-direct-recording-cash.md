# Story 2.3: Executive Board Direct Recording (Cash)

Status: done

<!-- Note: Validation verified and applied. -->

## Story

As an Executive Board member,
I want to directly record cash payments I received in person,
So that the member's balance is updated immediately without them needing to declare it.

## Acceptance Criteria

1. **Given** an EB member is recording a payment for a specific member from the member list
   **When** they select 'CASH' (or another channel), enter a total amount, select a target year, and choose **multiple months**
   **Then** the UI ensures the total amount entered is equal to the expected sum for the selected months (based on the member's monthly fee) OR the member can submit a bulk amount to cover arrears and future months automatically.
   **And** the payment is saved to the `Contributions` table. If multiple months are selected, the system must create **individual `Contributions` records for each selected month**, dividing the total amount appropriately.
   **And** the Reference ID is optional for CASH, mandatory for others.
   **And** the `validator_id` is set to the current EB member's ID with `validated_at` set to now.
   **And** the action is logged in the Audit Trail.
   **And** the `/admin/members` path is revalidated to immediately update the UI.

## Tasks / Subtasks

- [x] Task 1: Direct Recording UI (Dialog) with Multi-Month Selection
  - [x] In `app/admin/members/page.tsx` (or the underlying member list row component), add a "Record Payment" button or context menu item.
  - [x] Implement a Shadcn UI `Dialog` containing the payment recording form. Pass the target `member_id` as an implicit prop to the form--**DO NOT** use a member select dropdown to avoid loading all members.
  - [x] Create form inputs according to the mockup: Total Amount (CFA), Target Year (dropdown), **Months (Multi-select grid of 12 buttons)**, Payment Channel (Select using direct DB enums: `CASH`, `MOBILE_MONEY`, `BANK_TRANSFER`, `INTL_TRANSFER`), and Reference ID/Notes.
  - [x] Ensure the multi-month selector visually highlights selected months (e.g., Navy Blue background).
  - [x] Use `react-hook-form`'s `formState.isSubmitting` for the submit button loading state.
- [x] Task 2: Form State & Zod Validation for Multiple Months
  - [x] Use `react-hook-form` and `@hookform/resolvers/zod`.
  - [x] **Extend** the base contribution schema from `lib/validations/contribution.ts` to handle an array of `months` instead of a single `month` number.
  - [x] Ensure `reference_id` is optional if `payment_channel === 'CASH'` but required otherwise.
  - [x] Validate that `amount` is strictly > 0.
  - [x] Provide client-side validation or a warning if the `amount` entered doesn't match `selected_months.length * member_monthly_fee` (though the server will handle the final splitting).
- [x] Task 3: Server Action to Record Validated Contribution(s) & Handle Splitting
  - [x] Create `recordDirectPayment` server action in `app/admin/payments/actions.ts` (or relevant feature actions file).
  - [x] Extract EB `actor_id` using `auth()` from `auth.ts`.
  - [x] Verify `Contributions` table to prevent digital `reference_id` duplicate insertions.
  - [x] **Crucial Server Logic**: The server must take the total `amount` and the array of `selected_months`. It must divide the amount and insert **multiple** records into the `Contributions` table, one for each selected month.
    - Example: Amount=5000, Months=[Jan, Feb, Mar, Apr, Mai], Year=2024. The server inserts 5 records, each with `amount = 1000` for the respective month/year.
  - [x] Ensure all inserted records have:
    - `status = 'VALIDATED'`
    - `validator_id = actor_id`
    - `validated_at = new Date()`
- [x] Task 4: Audit Logging Integration
  - [x] Import `logAudit` from `lib/audit/logger.ts`.
  - [x] Call `logAudit(actor_id, 'RECORD_DIRECT_PAYMENT', { target_member_id: data.member_id, total_amount: data.amount, channel: data.payment_channel, months_covered: data.months, year: data.year })`.
- [x] Task 5: Success State & Cache Revalidation
  - [x] Call `revalidatePath('/admin/members')` in the server action upon success.
  - [x] In the client, render `toast({ title: "Success", description: "Payment Recorded & Validated" })` using `hooks/use-toast`.
  - [x] Close the `Dialog` upon success.
- [x] Task 6: Testing & Security
  - [x] Ensure non-EB roles cannot execute the server action (verify `role` claims in session).
  - [x] Write tests ensuring CASH allows empty reference, but digital channels require it.
  - [x] **Write tests for the bulk payment splitting logic**: Ensure submitting a 5000 payment for 5 months creates 5 individual 1000 records in the database.

## Dev Agent Guardrails & Technical Context

### Critical Directives
1. **NO DROPDOWNS FOR MEMBERS**: Do not query all members for a select list. Trigger the `Dialog` directly on the member row and pass the `member_id` directly to prevent performance degradation.
2. **USE DB ENUMS DIRECTLY**: Do not use the `usePaymentChannels` hook from Story 2.1 (it filters out CASH). Use the explicit DB enum types (`CASH`, `MOBILE_MONEY`, `BANK_TRANSFER`, `INTL_TRANSFER`).
3. **MANDATORY REVALIDATION**: Call `revalidatePath('/admin/members')` after saving to ensure `getMemberBalance` recalculation displays immediately on the UI.
4. **ZOD SCHEMA EXTENSION**: You will need to modify or create a specific Zod schema in `lib/validations/contribution.ts` that accepts an array of months, as the base schema from Story 2.2 likely only accepts a single month.
5. **DB RECORD SPLITTING IS MANDATORY**: The `Contributions` table schema requires one record per month/year. If the EB member selects 4 months for a single 4000 CFA payment, the server action MUST insert 4 records of 1000 CFA each. This is critical for the `getMemberBalance` calculation engine to work correctly.

### Standardized Implementations
- **Loading State:** Must use `isSubmitting` from `useForm()`.
- **Toast Notifications:** Must use `toast({ ... })` from `hooks/use-toast`.
- **Session Security:** Use `auth()` to fetch the ID. Client-provided `actor_id` or `validator_id` is a security risk.

### Project Structure Notes
- Actions: `app/admin/payments/actions.ts` (or adjacent to member actions)
- UI: Triggered within `app/admin/members/page.tsx` or its row component.

### References
- [Epic Breakdown](file:///c:/Users/kahonsu/Documents/GitHub/S2A/_bmad-output/planning-artifacts/epics.md)
- [Architecture](file:///c:/Users/kahonsu/Documents/GitHub/S2A/_bmad-output/planning-artifacts/architecture.md)
- [UX Specs](file:///c:/Users/kahonsu/Documents/GitHub/S2A/_bmad-output/planning-artifacts/front-end-spec.md)

## Dev Agent Record
### Agent Model Used
Antigravity
### File List
- `lib/validations/contribution.ts` (Modified)
- `app/admin/payments/actions.ts` (Created)
- `app/admin/members/components/record-payment-dialog.tsx` (Created)
- `app/admin/members/page.tsx` (Modified)
- `components/ui/dialog.tsx` (Created)
- `hooks/use-toast.ts` (Created)
- `__tests__/contribution.schema.test.ts` (Modified)
- `__tests__/payments.actions.test.ts` (Created)

### Completion Notes
- The `multiMonthContributionSchema` was added to handle an array of months.
- Added `Dialog` and `use-toast` components manually since Shadcn CLI had some initialization issues.
- `app/admin/payments/actions.ts` implements bulk payment splitting securely.
- Tests confirm splitting logic handles division and remainders correctly.

### Code Review Follow-up
- Fixed RBAC to restrict access to TREASURER, TRESORIER_ADJOINT, and PRESIDENT only.
- Added `RECORD_DIRECT_PAYMENT` to `AuditActionType` union.
- Fixed HTML invalid nesting by using absolute link overlay in member row instead of an anchor element wrapping the row.
