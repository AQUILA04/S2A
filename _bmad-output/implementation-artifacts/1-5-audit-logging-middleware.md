# Story 1.5: Audit Logging Middleware

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the President/EB,
I want all write actions performed by the Executive Board to be logged,
so that there is a strict, immutable financial and administrative audit trail.

## Acceptance Criteria

1. **Given** an Executive Board member performs an action (e.g., Validate Payment, Update Member, Import Legacy)
2. **When** the `POST/PUT/DELETE` request is received (via Server Action)
3. **Then** the server action calls a standardized `logAudit` utility function.
4. **And** the utility records the action in the `AuditLogs` table along with actor ID, timestamp, and precisely typed before/after metadata changes (`old_value`, `new_value`).

## Tasks / Subtasks

- [x] Task 1: Create `logAudit` Utility Function
  - [x] Implement `export async function logAudit(payload: AuditLogPayload)` in `lib/audit/logger.ts`.
  - [x] `AuditLogPayload` must require: `actor_id` (string), `action_type` (strict Union/Enum e.g., `'CREATE_MEMBER' | 'UPDATE_MEMBER' | 'IMPORT_LEGACY'`), and `metadata` (Record<string, unknown> containing optional `old_value` and `new_value`).
  - [x] The utility must execute the insertion into the `AuditLogs` table using `createServerSupabaseClient()` from `@/lib/supabase/client`.
  - [x] If the insertion fails, the utility must `console.warn` the error but MUST NOT throw or roll back the primary action (non-fatal error pattern).
- [x] Task 2: Refactor Existing Server Actions
  - [x] Refactor `app/admin/members/actions.ts` (`createMember`, `updateMember`) to replace their manual `supabase.from("AuditLogs").insert(...)` blocks with the new `logAudit` utility.
  - [x] Refactor `app/admin/import/actions.ts` (Story 1.4) to replace its manual raw `INSERT` with the new `logAudit` utility.
- [x] Task 3: Security & Role Validation
  - [x] Ensure all Server Actions invoking `logAudit` first securely extract the `actor_id` by calling either `requireWriteAccess()` or `requireReadAccess()` from `lib/auth/helpers.ts` or `getServerSession(authOptions)`.
  - [x] Do NOT re-fetch the session inside `logAudit` to prevent redundant database/session calls. The `actor_id` must be passed in.
- [x] Task 4: Unit & Integration Tests
  - [x] Write unit tests for `logAudit` verifying it inserts the correct schema.
  - [x] Verify that refactored server actions still perform their primary function correctly and return standard S2A responses.

## Dev Notes

- **Technical Stack**: Next.js App Router, Server Actions, PostgreSQL (Supabase), NextAuth.js.
- **Architecture Compliance**:
  - `AuditLogs` table schema constraint: `id` (UUID), `actor_id` (UUID), `action_type` (String), `metadata` (JSONB), `timestamp` (Timestamp).
  - The architectural "Middleware" concept from the PRD is implemented as a direct utility call (`logAudit`) *inside* the Server Actions, rather than a generic HOF wrapper. This is CRITICAL because the wrapper cannot reliably fetch `old_value` without tightly coupling to the action's internal DB state.
- **Security**: The `actor_id` mapped to `AuditLogs` must strictly come from the authenticated NextAuth session (`session.user.id`).
- **Error Handling**: A failure in `logAudit` should log a warning but NOT fail the parent request.
- **Previous Story Intelligence**:
  - `app/admin/members/actions.ts` and `app/admin/import/actions.ts` currently contain manual inserts (e.g., `(supabase.from("AuditLogs") as any).insert(...)`). Replace these.
  - Strongly type the `AuditLogs` insertion using the generated `database.types.ts`. Avoid `as any`.

### Project Structure Notes

- Define the audit logic in `lib/audit/logger.ts` or `lib/utils/audit.ts`.
- Ensure changes to existing `actions.ts` files maintain the frontend interfaces and return types expected by `useFormState` or standard React components.
- The `AuditLogs` schema types should be added to the project's shared type definitions if not already present.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Audit Logging Middleware]
- [Source: _bmad-output/planning-artifacts/prd.md#2.1 Functional Requirements (FR)] (FR-AUDIT-01)
- [Source: _bmad-output/planning-artifacts/architecture.md#5. Security & Access Control] (Audit Middleware)
- [Source: _bmad-output/implementation-artifacts/1-4-legacy-data-import-tool.md]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity BMAD Agent)

### Debug Log References
- Extracted logic representing manual Supabase AuditLog inserts across `createMember`, `updateMember`, and `confirmImport` actions.

### Completion Notes List
- Implemented `logAudit` utility function mimicking the current AuditLogs configuration and returning `void`, logging errors directly to the console so parent transactions can complete if there's an AuditLogs insert failure.
- Refactored server actions and mocked these utilities successfully within test suites without causing testing assertions to fail.

### File List
- `lib/audit/logger.ts`
- `app/admin/members/actions.ts`
- `app/admin/import/actions.ts`
- `__tests__/audit.logger.test.ts`
- `__tests__/members.actions.test.ts`
- `__tests__/import.test.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/1-5-audit-logging-middleware.md`

## Change Log

- **2026-03-05**: Initial implementation — created `logAudit` utility, refactored `createMember`, `updateMember`, and `confirmImport` server actions.
- **2026-03-05**: Code review fixes — strict `AuditActionType` union, removed `as any` (replaced with `satisfies` + targeted cast), added `actor_id` validation guard, fixed `@/` import alias, added guard test.

## Senior Developer Review (AI)

**Date:** 2026-03-05
**Outcome:** Changes Requested → Auto-Fixed

### Action Items
- [x] [HIGH] `action_type` typed as `string` instead of strict union — fixed with `AuditActionType` union type [`lib/audit/logger.ts:4-10`]
- [x] [HIGH] `as any` cast on Supabase insert despite explicit story requirement to avoid it — replaced with `satisfies AuditLogInsert` + targeted cast [`lib/audit/logger.ts:35-43`]
- [x] [MEDIUM] No validation for empty `actor_id` — added guard returning early with `console.warn` [`lib/audit/logger.ts:27-30`]
- [x] [MEDIUM] Relative import path `"../supabase/client"` — changed to `"@/lib/supabase/client"` [`lib/audit/logger.ts:1`]
- [ ] [MEDIUM] `logAudit` fires on failed import (debatable — current behavior logs failure metadata, intentional)
- [ ] [LOW] `previewImport` discards actor with `void actor` (pre-existing, out of scope)
