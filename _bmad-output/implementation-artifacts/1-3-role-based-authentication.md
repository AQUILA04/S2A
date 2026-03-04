# Story 1.3: Role-Based Authentication

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Member (or Board member),
I want to log in,
so that I can access my personalized dashboard or administrative spaces depending on my role.

## Acceptance Criteria

1. **Given** a registered user **When** they authenticate with valid credentials **Then** they are routed to either `/dashboard` (MEMBER) or `/admin` (EB roles).
2. **And** prevented from accessing routes they do not have permissions for.
3. **Given** a user with `account_status` (Login) = `PENDING_ACTIVATION` **When** they attempt to authenticate **Then** they are blocked from logging in (Modifying the authentication flow to block users with PENDING_ACTIVATION status from logging in).
4. **Given** a user with `INACTIVE` association status **When** they authenticate **Then** they can still log in to view their debt but are barred from making new investments until regularized.
5. **And** role-hierarchy is enforced: `PRESIDENT` has full administrative rights, `SG_ADJOINT` inherits rights of `SG`, `TRESORIER_ADJOINT` inherits rights of `TREASURER`.

## Tasks / Subtasks

- [x] Task 1: Enforce Account Activation Status Guard (AC: 3, 4)
  - [x] Update NextAuth in `app/api/auth/[...nextauth]/route.ts` to block login if `account_status === 'PENDING_ACTIVATION'` and return a clear generic error.
  - [x] Update the `jwt` and `session` callbacks in `app/api/auth/[...nextauth]/route.ts` to pass the `status` (Association status) from the database user record to the JWT token and then to the session object.
  - [x] Ensure INACTIVE members can log in but their session flag clearly indicates `status === 'INACTIVE'` so that investment actions can be disabled on the frontend.
- [x] Task 2: Implement Role-Based Routing & Middleware (AC: 1, 2, 5)
  - [x] Enhance `middleware.ts` to route authenticated users appropriately (e.g., redirect `MEMBER` from `/admin/*` to `/dashboard`). Also protect `/dashboard/*` routes for unauthenticated users.
  - [x] Enforce role hierarchy in middleware/server actions. `PRESIDENT` inherits all write access, `SG`/`SG_ADJOINT` have write access to Members/GAs, `TREASURER`/`TRESORIER_ADJOINT` have write access to Contributions/Expenses.
  - [x] Create a shared authorization helper (e.g., `hasRequiredRole(userRole, allowedRoles)`) in `lib/auth/helpers.ts` to centralize the role hierarchy logic.
- [x] Task 3: UI/Navigation Integration
  - [x] Ensure the Login UI (`/login`) handles the new NextAuth errors correctly and displays friendly error messages (in French) for authentication failures, without leaking whether the account exists or not.
  - [x] Follow the S2A design system using the S2a-components-build skill standards.
- [x] Task 4: Unit Tests
  - [x] Provide tests in `__tests__/auth.test.ts` to verify `PENDING_ACTIVATION` accounts are rejected.
  - [x] Provide tests to verify role inheritance (e.g., `PRESIDENT` has access to Treasurer functions).
  - [x] Provide tests for `middleware.ts` redirection logic.

## Dev Notes

- **Technical Stack**: NextAuth.js, Next.js App Router middleware, PostgreSQL, Zod.
- **Story Context**: Story 1.1 established the NextAuth setup. Story 1.2 added the dual status model (`status` for association, `account_status` for login capability). This story (1.3) connects the two by enforcing access guardrails in NextAuth based on `account_status` and role hierarchy.
- **Account Block**: Modifying the authentication flow to block users with `PENDING_ACTIVATION` status from logging in.
- **Role Hierarchy**: Establishing a clear role hierarchy where `PRESIDENT` has full administrative rights, and introducing specific `SG_ADJOINT` and `TRESORIER_ADJOINT` roles...
- **TypeScript Augmentation**: CRITICAL requirement: You must augment the `next-auth.d.ts` types to explicitly include `status`, so that TypeScript doesn't throw errors when the frontend tries to access `session.user.status`.
- **Testing**: Follow the existing pattern in `__tests__/auth.test.ts`. Wait to update existing tests if their expectations change based on the new `PENDING_ACTIVATION` rule.

### Project Structure Notes

- Use the existing `app/api/auth/[...nextauth]/route.ts` - do not recreate the auth mechanism.
- Continue using `middleware.ts` at the root.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Role-Based Authentication]
- [Source: _bmad-output/planning-artifacts/architecture.md#5. Security & Access Control]
- [Source: user_global memory]
- [Source: _bmad-output/implementation-artifacts/1-1-system-initialization-and-super-admin.md]
- [Source: _bmad-output/implementation-artifacts/1-2-member-management-crud.md]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity BMAD Agent)

### Debug Log References

- All 44 unit tests pass (0 failures, 0 regressions). `Time: 3.13 s`.

### Completion Notes List

- ✅ Task 1: Fixed `route.ts` to block ONLY `PENDING_ACTIVATION` (removed incorrect `INACTIVE` block that violated AC4). `INACTIVE` members now pass the guard and their `status` is encoded into the JWT and exposed via `session.user.status`.
- ✅ Task 1: Augmented `next-auth.d.ts` with `status: MemberStatus` on `User`, `Session.user`, and `JWT` to prevent TypeScript errors on the frontend.
- ✅ Task 2: Added `hasRequiredRole(userRole, allowedRoles)` to `lib/auth/helpers.ts` implementing full role hierarchy (PRESIDENT → all, SG↔SG_ADJOINT, TREASURER↔TRESORIER_ADJOINT).
- ✅ Task 2: Enhanced `middleware.ts` to use `hasRequiredRole()`, protect `/dashboard/*` routes (redirect unauthenticated users to `/login`), and updated the matcher to cover both `/admin/:path*` and `/dashboard/:path*`.
- ✅ Task 3: Restyled `/login` page using S2A design tokens (CSS variables: `bg-card`, `text-primary`, `border-input`, etc.). Added `callbackUrl` support, French error messages, `aria-live="polite"` for screen reader accessibility, and `aria-required` on form inputs.
- ✅ Task 4: 44 tests total, 44 pass. New tests cover: AC3 (PENDING_ACTIVATION blocked), AC4 (INACTIVE allowed through + status in JWT/session), AC5 (PRESIDENT full rights + SG/SG_ADJOINT bi-directional inheritance + TREASURER/TRESORIER_ADJOINT bi-directional inheritance), AC1/AC2 (middleware redirection for all role scenarios).

### File List

- `app/api/auth/[...nextauth]/route.ts` — Modified: fixed AC4 INACTIVE guard, added status to JWT/session callbacks
- `types/next-auth.d.ts` — Modified: added `status: MemberStatus` to User, Session.user, JWT types
- `lib/auth/helpers.ts` — Modified: added `hasRequiredRole()` with full role hierarchy, fixed MemberStatus import
- `middleware.ts` — Modified: uses `hasRequiredRole()`, protects /dashboard routes, updated matcher
- `app/login/page.tsx` — Modified: S2A design system tokens, French errors, callbackUrl, accessibility attrs
- `__tests__/auth.test.ts` — Modified: comprehensive new tests for all ACs (44 tests, all passing)

### Change Log

- 2026-03-04: Implemented Story 1.3 Role-Based Authentication. Key changes: corrected AC4 (INACTIVE members can now log in), added `status` field throughout JWT/session/type chain, created `hasRequiredRole()` hierarchy helper, enhanced middleware with dashboard protection and hierarchy enforcement, restyled login page with S2A design tokens. 44 tests, all passing.
