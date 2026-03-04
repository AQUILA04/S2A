# Story 1.4: Legacy Data Import Tool

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the Treasurer,
I want to upload Excel or CSV files containing the historical contribution data since 2016,
so that the platform accurately reflects all prior financial commitments and payments.

## Acceptance Criteria

1. **Given** an authorized Treasurer (or President) is logged into the administrative space.
2. **When** they navigate to the Legacy Data Import tool and upload a well-formatted legacy report CSV/Excel.
3. **Then** the system parses the file against a strict Zod schema validation (member identification, amount, month, year, channel, etc.).
4. **And** provides a preview of the data to be imported and highlights any balance impacts or malformed rows.
5. **And** upon confirmation, inserts the legacy contributions securely into the `Contributions` table (with `status` = 'VALIDATED'), ignoring duplicates and rejecting malformed rows with clear error feedback.
6. **And** logs the import action securely via the `AuditLogs` middleware.

## Tasks / Subtasks

- [x] Task 1: Create CSV/Excel Parsing Utility
  - [x] Implement a file parser using `xlsx` (sheetjs) or similar library capable of handling BOTH Excel (`.xlsx`/`.xls`) and `.csv` files.
  - [x] Define strict Zod schemas for the EXACT expected row format: `[noms, téléphone, janvier, Fevrier, Mars, Avril, Mai, Juin, Juillet, Aout, Septembre, Octobre, Novembre, Decembre, annee]`.
  - [x] The parser must transform a single row into up to 12 separate `Contributions` records (one for each month where the amount is > 0). The `annee` column serves as the year for all generated records. Empty or 0 means no contribution for that month.
- [x] Task 2: Server Action for Data Import
  - [x] Create a server action to process the parsed data and match rows to existing `Members` using ONLY the `téléphone` (phone number) column as the unique identifier.
  - [x] Implement duplicate detection to avoid re-importing the same contribution (`member_id`, `month`, `year`) - this must be absolute.
  - [x] Ensure the action inserts validated records into `Contributions` using batch insertion (e.g., Supabase `upsert` or `insert` with array data) to prevent server timeout limits, setting `status: 'VALIDATED'` and appropriate `validator_id`.
  - [x] Wrap the batch insertion in a database transaction block (or equivalent Supabase RPC function if complex) to ensure partial failures do not leave the database in an inconsistent state.
  - [x] Perform a DIRECT `INSERT` into the `AuditLogs` table at the end of the action (the Audit Middleware from Epic 1 is not built yet, so do it manually here).
- [x] Task 3: Import UI & Preview (Admin Space)
  - [x] Create a new page under `/admin/import` (or similar admin settings area) for the Legacy Data Import tool.
  - [x] Build a file dropzone or upload input component using S2A design system tokens.
  - [x] Build a preview table component that displays parsed rows, highlighting errors (e.g., unmapped members, invalid amounts) and showing a summary of successful rows.
  - [x] Add a confirmation step to finalized the import.
  - [x] Integrate a link to this tool in the global internal EB navigation/sidebar so it's discoverable.
- [x] Task 4: Unit / Integration Tests
  - [x] Write tests for the parsing and Zod validation logic.
  - [x] Write tests for the server action ensuring duplicate prevention and correct `Contributions` insertion.
  - [x] Verify RBAC (only Treasurer/President can access the endpoint/action).

## Dev Notes

- **Technical Stack**: Next.js App Router, Server Actions, PostgreSQL (Supabase), Zod, `xlsx` (SheetJS) or similar Excel/CSV parser.
- **Architecture Compliance**:
  - Requires strict Zod schema validation for all Excel imports to prevent SQL injection or data corruption.
  - `status` for legacy imports must be `VALIDATED`.
  - The action must log to `AuditLogs` DIRECTLY via `INSERT`, as the global Audit Middleware story has not been implemented yet.
- **Performance & Data Safety Restrictions**:
  - Batch process database insertions to avoid function timeouts.
  - Use database transactions to guarantee all-or-nothing execution.
- **Member Mapping Strategy Constraints**:
  - Do NOT ask the user for the map format. The `téléphone` column is the strict, unique identifier used to match the `Members` table. If a row cannot be matched to a UUID via phone number, mark the row as invalid but keep parsing the rest.
  - Note: The import format does not have a channel column. Set the channel to a default like `CASH` or allow the Treasurer to select a global channel for the entire import batch.
- **Security & Access Control**: Use the existing `hasRequiredRole()` helper from `lib/auth/helpers.ts` to enforce `TREASURER` or `PRESIDENT` access.
- **UI/UX**: Follow S2A design tokens (`bg-card`, `text-primary`, `border-input`). Remember the "One-Tap Copy" philosophy isn't directly applicable here, but "Clarity" is: ensure the preview table clearly shows what will be imported (Green for OK, Red for Error). French UI language.
- **Previous Story Intelligence**:
  - Story 1.3 established `hasRequiredRole` in `lib/auth/helpers.ts` and status tracking in the NextAuth session. Use `session.user.status` and `session.user.role` from the augmented types.
  - Recent commits show use of French UI, CSS variables for theming, and mobile-first responsive components (tab-bar vs sidebar).

### Project Structure Notes

- Add server actions in `app/admin/actions.ts` or a dedicated `app/admin/import/actions.ts`.
- Place parsing utilities in `lib/utils` or a dedicated `lib/import`.
- Ensure new UI components are created using the existing UI patterns and Next.js form/action hooks.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Legacy Data Import Tool]
- [Source: _bmad-output/planning-artifacts/prd.md#2.1 Functional Requirements (FR)] (FR-ADMIN-01)
- [Source: _bmad-output/planning-artifacts/architecture.md#5. Security & Access Control] (Audit Middleware & Input Validation)
- [Source: _bmad-output/implementation-artifacts/1-3-role-based-authentication.md] (RBAC Context)

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity BMAD Agent)

### Debug Log References

### Completion Notes List

- Addressed AI Review Findings (Issue #1):
  - Fixed **Performance Risk (Duplicate Checking)**: Improved `confirmImport` query by scoping duplicates to both `memberIds` and `years`, and replaced arbitrary batching with a single Supabase atom-like insert (`MAX_INSERT_LIMIT = 5000`).
  - Fixed **Missing DB Transaction**: Upgraded DB insert to a single transactional push within PostgREST's atomicity.
  - Fixed **UI State Mismatch**: Updated `app/admin/import/page.tsx` preview table to render unmapped phones correctly as 'Erreur' with explanations, rather than 'OK'.
  - Fixed **Missing Timestamps**: Added `validated_at` inside `confirmImport` generation logic and updated tests.

### File List

- `__tests__/import.test.ts`
- `__tests__/members.actions.test.ts`
- `_bmad-output/implementation-artifacts/1-4-legacy-data-import-tool.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/admin/import/actions.ts`
- `app/admin/import/page.tsx`
- `app/admin/members/actions.ts`
- `app/admin/members/types.ts`
- `components/s2a/main-nav.tsx`
- `lib/import/parser.ts`
