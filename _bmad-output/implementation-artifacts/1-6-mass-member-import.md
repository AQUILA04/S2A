# Story 1.6: Mass Member Import (CSV/Excel)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the GS, Deputy GS, or President,
I want to upload a CSV or Excel file containing member details,
so that I can bulk create members efficiently without manual data entry.

## Acceptance Criteria

1. **Given** the SG, Deputy SG, or President is logged into the administrative space
2. **When** they upload a member import file with headers `NOM`, `PRÉNOM`, `NOM ET PRÉNOMS COMPLETS`, `TÉLÉPHONE`, `ADRESSE`, `EMAIL`
3. **Then** the system prioritizes `NOM` and `PRÉNOM` for the member's name (safely ignoring `NOM ET PRÉNOMS COMPLETS` if the first two are populated; otherwise, extracting `first_name` and `last_name` by splitting `NOM ET PRÉNOMS COMPLETS` by space)
4. **And** the system strictly validates that `TÉLÉPHONE` and `EMAIL` do not already exist in the database, handling duplication errors gracefully
5. **And** successfully creates the valid new members with a "Pending Activation" (`PENDING_ACTIVATION`) status (consistent with Story 1.2).

## Tasks / Subtasks

- [x] Task 1: Create File Upload UI Component (AC: 1, 2)
  - [x] Subtask 1.1: Create a secure file input component accepting `.csv` and/or `.xlsx`.
  - [x] Subtask 1.2: Integrate the UI component into the `/admin/members` space (e.g., as a "Mass Import" button opening a modal).
  - [x] Subtask 1.3: Add client-side parsing using `xlsx` (SheetJS) or `exceljs` and validation to ensure headers match the required ones (`NOM`, `PRÉNOM`, `NOM ET PRÉNOMS COMPLETS`, `TÉLÉPHONE`, `ADRESSE`, `EMAIL`).
- [x] Task 2: Implement Client-Side Data Parsing & Mapping (AC: 2, 3)
  - [x] Subtask 2.1: Parse the uploaded file **client-side** to avoid hitting Vercel's 1MB/4MB Server Action payload limits with raw files.
  - [x] Subtask 2.2: Map rows to a strict Zod schema to validate the extracted JSON array before sending it to the server.
  - [x] Subtask 2.3: Implement logic to extract `first_name` and `last_name`: prioritize `NOM` and `PRÉNOM`; if both are empty, split `NOM ET PRÉNOMS COMPLETS` by space to extract them.
- [x] Task 3: Create Server Action for Bulk Import (AC: 4, 5)
  - [x] Subtask 3.1: Create a `bulkImportMembers(payload: ValidatedMemberJson[])` server action in `app/admin/members/actions.ts`.
  - [x] Subtask 3.2: Implement RBAC check ensuring the user is `SG`, `SG_ADJOINT`, or `PRESIDENT` via `requireWriteAccess()` from `lib/auth/helpers.ts`.
  - [x] Subtask 3.3: Implement duplicate checking for `phone` and `email` against the `Members` table. Return rich error reporting (e.g., failed rows vs. succeeded rows) so the UI can gracefully display overlaps.
  - [x] Subtask 3.4: Insert new valid members into Supabase using `insert()` with `account_status: 'PENDING_ACTIVATION'` and `status: 'ACTIVE'`.
- [x] Task 4: Audit Logging Integration
  - [x] Subtask 4.1: Ensure the `logAudit` utility (from `lib/audit/logger.ts`) is called to securely log the bulk import action, passing the actor ID, `action_type: 'MASS_IMPORT_MEMBERS'`, and metadata (e.g., success count, failure count).
- [x] Task 5: End-to-End UI Integration
  - [x] Subtask 5.1: Ensure the import UI is discoverable via the global navigation or a prominent action button in the Admin Members Dashboard.
  - [x] Subtask 5.2: Display clear user feedback via toast notifications ("Changes Saved & Logged") and error tables for skipped rows.
- [x] Task 6: Unit & Integration Tests
  - [x] Subtask 6.1: Write unit tests for the name extraction fallback logic (`NOM` vs `NOM ET PRÉNOMS COMPLETS`).
  - [x] Subtask 6.2: Write integration tests mocking Supabase to assert that the `bulkImportMembers` action correctly deduplicates existing emails/phones and accurately reports success vs failure counts.

## Dev Notes

- **Technical Stack**: Next.js App Router, Server Actions, PostgreSQL (Supabase), NextAuth.js.
- **Architecture Compliance**:
  - `Members` table schema: `first_name` (from `PRÉNOM`), `last_name` (from `NOM`), `email`, `phone`, `account_status` (`PENDING_ACTIVATION`), `status` (`ACTIVE`).
  - Strict RBAC using the existing session configuration. Write actions by EB need the Audit Middleware (`logAudit`).
  - *User Global Rule Note*: "Pour les nouveaux enregistrements créés localement (ex: clients), un UUID (chaîne de caractères) sera utilisé comme clé primaire temporaire...". Ensure that when constructing the mapped JSON payloads locally before sending to the server action, you assign a temporary standard generated UUIDv4 to each record, which will be safely inserted into Supabase.
  - *User Global Rule Note*: "When adding logs, always use both `this.log.log()` and `console.log()` for the same message." - note that this is a Node.js server action context, so standard `console.log()` + Supabase `logAudit` will be used instead of Angular-styled `this.log.log()`, but ensure any client-side logs follow styling guidelines if applicable.
- **Error Handling**: Allow partial success. If 5 out of 100 people already exist, save the 95 and return the 5 failed ones so the UI can report them.
- **Previous Story Intelligence**:
  - Follow the patterns implemented in `app/admin/import/actions.ts` (Story 1.4, legacy data import).
  - Use `logAudit` properly without `as any`, and strictly type using `satisfies AuditLogInsert`.

### Project Structure Notes

- Client-side parser components should be in `components/admin/import` or similar.
- Shared Zod schemas should be defined in `lib/validations/member.ts`.
- S2A visual identity: Use Vercel theme from tweakcn.com as a base and components from ui.tripled.work as outlined in `s2a-components-build` skill.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6: Mass Member Import (CSV/Excel)]
- [Source: _bmad-output/planning-artifacts/architecture.md#5. Security & Access Control]
- [Source: _bmad-output/implementation-artifacts/1-5-audit-logging-middleware.md] (Audit logger usage)
- [Source: _bmad-output/implementation-artifacts/1-4-legacy-data-import-tool.md] (Existing CSV parsing patterns)

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity BMAD Agent)

### Debug Log References

### Completion Notes List

- Implemented `MassImportDialog` component with SheetJS (`xlsx`) for client-side parsing.
- Created `massImportMemberSchema` using Zod for robust data validation before server submission.
- Extracted and unit-tested `parseFullName` logic for falling back from NOM/PRÉNOM to NOM ET PRÉNOMS COMPLETS.
- Implemented `bulkImportMembers` server action with duplicate detection for emails and phones.
- Successfully logged actions using `MASS_IMPORT_MEMBERS` in `AuditLogs`.
- Integration and unit tests passed successfully.
- [AI-Review-Fix] Fixed missing ADRESSE parsing in UI component.
- [AI-Review-Fix] Chunked client-side JSON parsed payload and duplicate query batches to prevent payload and API limits.
- [AI-Review-Fix] Secured dummy password generation to create unique passwords per user dynamically instead of per batch.

### File List

- `app/admin/members/components/mass-import-dialog.tsx` (NEW)
- `lib/utils/name-parser.ts` (NEW)
- `__tests__/utils/name-parser.test.ts` (NEW)
- `__tests__/actions/bulk-import-members.test.ts` (NEW)
- `app/admin/members/types.ts` (MODIFIED)
- `app/admin/members/actions.ts` (MODIFIED)
- `lib/audit/logger.ts` (MODIFIED)
- `app/admin/members/page.tsx` (MODIFIED)
