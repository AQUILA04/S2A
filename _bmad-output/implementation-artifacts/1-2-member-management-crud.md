# Story 1.2: Member Management (CRUD)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the General Secretary,
I want to create, view, update, and manage member profiles,
so that the roster is kept up to date and correct monthly fees are assigned.

## Acceptance Criteria

1. **Given** the GS is logged into the administrative space **When** they navigate to the Member Management section **Then** they see a paginated list of all existing members (name, role, status badge, account_status badge, join date, monthly fee) — page size 20, sorted `last_name ASC, first_name ASC`
2. **Given** the GS is on the Member Management page **When** they click "Add Member" and submit a valid form **Then** the system validates inputs (unique email & phone), creates the member with `status = ACTIVE` (cotisation/association status) and `account_status = PENDING_ACTIVATION` (user cannot log in yet), and records the initial monthly fee
3. **Given** the GS attempts to create a member **When** the submitted email or phone already exists in the database **Then** the system returns a clear, field-level validation error and does NOT create a duplicate record
4. **Given** the GS is viewing a member's profile **When** they update any editable field (name, phone, monthly_fee, role, status, account_status) and save **Then** the changes are persisted and an `AuditLog` entry is written with `action_type = "UPDATE_MEMBER"` and `old_value` / `new_value` metadata
5. **Given** the GS accesses the admin area **When** they attempt to access Member Management **Then** access is restricted to users with role `SG`, `SG_ADJOINT`, or `PRESIDENT` for write operations; `TREASURER`, `TRESORIER_ADJOINT` can access `/admin/*` for their own functions but cannot write to Members
6. **Given** the GS creates a new member **When** the member profile is created **Then** the member list displays two distinct status badges: **Association Status** (ACTIVE/INACTIVE) and **Account Status** (PENDING ACTIVATION / ACTIVE)

## Tasks / Subtasks

- [x] Task 1: Server Actions — Member CRUD (AC: 1, 2, 3, 4)
  - [x] Create `app/admin/members/actions.ts` with the following Server Actions:
    - `getMembers(page?: number)` — paginated query: page size 20, sort `last_name ASC, first_name ASC`, offset pagination. Use `createServerSupabaseClient()`
    - `createMember(data)` — Zod-validated insert; set `status = 'ACTIVE'`, `account_status = 'PENDING_ACTIVATION'`, `role = 'MEMBER'` as defaults. Write an `AuditLogs` row with `action_type = 'CREATE_MEMBER'` (no `old_value`, `new_value` = inserted member row)
    - `updateMember(id, data)` — Zod-validated update with AuditLog write
    - `getMemberById(id)` — single member fetch for edit form
  - [x] Zod schemas must cover all `Members` fields; reject missing/invalid inputs with field-level messages
  - [x] **Write access guard inside server actions:** Only `SG`, `SG_ADJOINT`, and `PRESIDENT` may call `createMember`/`updateMember`. Check `session.user.role` before executing. Throw `UNAUTHORIZED` error otherwise.
  - [x] For `createMember`: resolve unique constraint violations on `email` and `phone` into user-facing messages
  - [x] For `createMember`: write AuditLog with `actor_id` (from session), `action_type = 'CREATE_MEMBER'`, `metadata = { new_value: createdMember }`
  - [x] For `updateMember`: write an `AuditLogs` row with `actor_id` (from session), `action_type = 'UPDATE_MEMBER'`, `metadata = { old_value, new_value }`

- [x] Task 2: Route Guard / Middleware (AC: 5)
  - [x] Create or extend `middleware.ts` at the project root to protect `/admin/*` routes
  - [x] Use `getServerSession()` from `next-auth` to verify the session and check `session.user.role`
  - [x] Route access (read): `SG`, `SG_ADJOINT`, `PRESIDENT`, `TREASURER`, `TRESORIER_ADJOINT`; redirect plain `MEMBER` to `/dashboard`
  - [x] **Note:** This middleware will be extended by Story 1.3 (Role-Based Authentication) — do not duplicate session routing logic

- [x] Task 3: Admin Layout & Navigation (AC: 1, 5)
  - [x] Create `app/admin/layout.tsx` — shared layout for all admin pages (sidebar nav on ≥768px, bottom tab-bar on <768px per UX spec)
  - [x] Create `app/admin/members/page.tsx` — server component that calls `getMembers()` and renders the member list table
  - [x] Member list columns: Full Name, Role, Status badge (colour-coded), Join Date, Monthly Fee
  - [x] Add "Add Member" button linking to `app/admin/members/new/page.tsx`

- [x] Task 4: Create Member Form (AC: 2, 3)
  - [x] Create `app/admin/members/new/page.tsx` with a client-side form (React state + validation)
  - [x] Fields: `first_name`, `last_name`, `email`, `phone`, `join_date`, `monthly_fee`, `role`, and temporary `password` (will be hashed server-side)
  - [x] On submit, call `createMember()` Server Action; display field-level errors returned from Zod/Supabase on the form
  - [x] On success, redirect to `/admin/members` with a toast notification

- [x] Task 5: Edit Member Form (AC: 4)
  - [x] Create `app/admin/members/[id]/edit/page.tsx` — pre-populated from `getMemberById()`
  - [x] Editable fields: `first_name`, `last_name`, `phone`, `monthly_fee`, `role`, `status` (Association), `account_status` (User)
  - [x] Email and `join_date` are NOT editable (immutable identifiers)
  - [x] `status` (Association) control: `ACTIVE` / `INACTIVE` toggle — display label "Statut Cotisation"
  - [x] `account_status` (User) control: `PENDING_ACTIVATION` / `ACTIVE` toggle — display label "Statut Compte" (allows GS to manually re-activate an account)
  - [x] On save, call `updateMember()` which writes the AuditLog
  - [x] Display "Changes Saved & Logged" toast on success (per UX spec)

- [x] Task 6: Unit Tests (AC: 1–6)
  - [x] Create `__tests__/members.actions.test.ts`
  - [x] Test cases:
    - Zod schema rejects missing/invalid fields
    - `createMember` with duplicate email returns an error (mock Supabase constraint)
    - `createMember` writes a `CREATE_MEMBER` AuditLog with `new_value` payload
    - `updateMember` writes correct AuditLog payload (old_value, new_value)
    - `createMember` with role `TREASURER` throws UNAUTHORIZED error
    - Middleware redirects plain `MEMBER` to `/dashboard`
    - New member has `account_status = 'PENDING_ACTIVATION'` by default
  - [x] Follow the test pattern from `__tests__/auth.test.ts` — mock `createServerSupabaseClient`

## Dev Notes

### Technical Stack & Patterns

- **Framework:** Next.js 15 (App Router), TypeScript — all new files must use `.tsx` (components) or `.ts` (pure logic).
- **Server Actions:** All data mutations **must** be `"use server"` functions in `app/admin/members/actions.ts`. Never call Supabase from client components directly.
- **Supabase Client:** Always use `createServerSupabaseClient()` from `lib/supabase/client.ts` (service role key). Never use the public anon client for admin writes.
- **Auth Helper:** Password hashing for new member creation must use `hashPassword()` from `lib/auth/helpers.ts` (bcryptjs, 12 rounds), NOT inline bcrypt calls.
- **Session:** Use `getServerSession(authOptions)` from NextAuth to access `session.user.role`. The JWT callback in `app/api/auth/[...nextauth]/route.ts` already encodes `role`.
- **Zod Validation:** Every Server Action input must be validated with Zod **before** hitting the database. Zod schemas belong in the same `actions.ts` file or a co-located `schemas.ts`.
### Dual Status Model (CRITICAL — Do NOT Confuse)

The `Members` table carries **two independent status fields**:

| Field | DB Type | Values | Controlled by |
|-------|---------|--------|---------------|
| `status` | `member_status` enum | `ACTIVE` / `INACTIVE` | Balance engine (auto) or GS manually |
| `account_status` | `account_status` enum | `PENDING_ACTIVATION` / `ACTIVE` | Set `PENDING_ACTIVATION` on create; GS activates manually |

- **`status` (Association):** Is the member fulfilling their cotisation obligation? `INACTIVE` = ≥ 24 months of arrears.
- **`account_status` (Login):** Can this person log into the app? `PENDING_ACTIVATION` = GS created their account but they haven't set their password yet via the activation link (MVP: GS sets password at creation, Future: activation email flow per front-end-spec §3.1).

> **MVP Simplification:** For this story, GS sets the member's initial password at creation. `account_status` is set to `'PENDING_ACTIVATION'` and must be manually changed to `'ACTIVE'` by GS after setup. The invite-link activation flow is deferred to a future story.

### RBAC Rules (CRITICAL — Enforced at Both Middleware and Server Action Level)

```
Role               | /admin/* access | Members write | Contributions write
----------------------------------------------------------------
MEMBER             |      ❌         |      ❌        |      ❌
SG                 |      ✅         |      ✅        |      ❌
SG_ADJOINT         |      ✅         |      ✅        |      ❌  (same as SG)
TREASURER          |      ✅         |      ❌        |      ✅
TRESORI­ER_ADJOINT  |      ✅         |      ❌        |      ✅  (same as TREASURER)
PRESIDENT          |      ✅         |      ✅        |      ✅  (inherits all)
```

**Two-layer enforcement:**
1. `middleware.ts` — blocks `MEMBER` from `/admin/*` at the route level
2. Server Actions — `createMember`/`updateMember` re-check role is in `['SG', 'SG_ADJOINT', 'PRESIDENT']`

### Styling

Tailwind CSS. Adhere to the S2A color palette:
  - Primary / Nav: `#002366` (Navy Blue)
  - Status ACTIVE (Association — green badge): `#28A745`
  - Status INACTIVE (Association — red badge): `#DC3545`
  - Account PENDING_ACTIVATION badge: `#D4AF37` (Gold — awaiting activation)
  - Account ACTIVE badge: `#28A745` (Green)
  - Available Balance highlights: `#D4AF37` (Gold)
  - Body text: `#333333`, backgrounds: `#E9ECEF`

### AuditLog Requirements (Critical)

ALL write operations on Members must produce an `AuditLogs` row. Two action types:

**For `createMember()`:**
```typescript
// AuditLog write after successful insert
await supabase.from("AuditLogs").insert({
  actor_id: session.user.id,        // from getServerSession()
  action_type: "CREATE_MEMBER",
  metadata: {
    new_value: createdMember,       // full row returned from insert
  },
});
```

**For `updateMember()`:**

```typescript
// Pseudocode pattern for the AuditLog write inside updateMember()
const { data: oldMember } = await supabase.from("Members").select("*").eq("id", id).single();
const { data: updatedMember } = await supabase.from("Members").update(sanitizedData).eq("id", id).select().single();
await supabase.from("AuditLogs").insert({
  actor_id: session.user.id,          // from getServerSession()
  action_type: "UPDATE_MEMBER",
  metadata: {
    old_value: oldMember,
    new_value: updatedMember,
  },
});
```

The `AuditLogs` table schema (`V001__initial_schema.sql`):
- `actor_id UUID NOT NULL` — FK → Members.id
- `action_type TEXT NOT NULL` — use `"UPDATE_MEMBER"` and `"CREATE_MEMBER"` constants
- `metadata JSONB NOT NULL` — `{ old_value: {...}, new_value: {...} }`

### Database Schema (Critical — Do NOT Deviate)

**Members table** (from `supabase/migrations/V001__initial_schema.sql`):
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
first_name TEXT NOT NULL
last_name  TEXT NOT NULL
email      TEXT NOT NULL UNIQUE
phone      TEXT NOT NULL UNIQUE
join_date  DATE NOT NULL
monthly_fee DECIMAL(10,2) NOT NULL CHECK (monthly_fee >= 0)
status     member_status NOT NULL DEFAULT 'ACTIVE'   -- ENUM: ACTIVE | INACTIVE
role       member_role NOT NULL DEFAULT 'MEMBER'      -- ENUM: MEMBER | PRESIDENT | SG | SG_ADJOINT | TREASURER | TRESORIER_ADJOINT
password_hash TEXT NOT NULL
account_status account_status NOT NULL DEFAULT 'PENDING_ACTIVATION'  -- ENUM: PENDING_ACTIVATION | ACTIVE (V002)
created_at_app TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Index on `idx_members_status`, `idx_members_role`, `idx_members_email` already exist — no new migrations needed for this story.

### TypeScript Types (use existing, do NOT redefine)

Located in `types/database.types.ts`:
- `Member` interface — covers all `Members` row fields
- `MemberStatus`: `"ACTIVE" | "INACTIVE"`
- `AccountStatus`: `"PENDING_ACTIVATION" | "ACTIVE"`
- `MemberRole`: `"MEMBER" | "PRESIDENT" | "SG" | "SG_ADJOINT" | "TREASURER" | "TRESORIER_ADJOINT"`
- `Database["public"]["Tables"]["Members"]["Insert"]` — use for insert payloads
- `Database["public"]["Tables"]["Members"]["Update"]` — use for update payloads
- `AuditLog`, `AuditMetadata` — use for audit writes

### File Structure

```
app/
  admin/
    layout.tsx          [NEW] — shared admin layout with role guard
    page.tsx            [NEW] — admin overview/redirect
    members/
      page.tsx          [NEW] — member list (server component)
      actions.ts        [NEW] — all CRUD server actions + Zod schemas
      new/
        page.tsx        [NEW] — create member form
      [id]/
        edit/
          page.tsx      [NEW] — edit member form
lib/
  auth/
    helpers.ts          [EXISTING — do not duplicate hashPassword]
lib/
  supabase/
    client.ts           [EXISTING — use createServerSupabaseClient()]
middleware.ts           [NEW] — Next.js edge middleware for route protection
__tests__/
  members.actions.test.ts [NEW] — unit tests for server actions
```

### UX Spec — Member Management Screen (from front-end-spec.md §3.3)

- Responsive: `< 768px` → bottom tab-bar nav; `≥ 768px` → sidebar nav
- Touch targets minimum 44×44px
- Status badges must be colour-coded: Green (ACTIVE), Red (INACTIVE)
- Toast notification text after edits: **"Changes Saved & Logged"** (verbatim from UX spec)
- Admin space URL pattern: `/admin/members`, `/admin/members/new`, `/admin/members/[id]/edit`

### Previous Story Intelligence (Story 1.1)

From the Story 1.1 Dev Agent Record:
- **Password hashing:** Use `hashPassword()` from `lib/auth/helpers.ts` (bcryptjs, 12 rounds). For MVP, GS sets the member's initial password at creation time using this helper.
- **Typed Supabase client:** Always `createClient<Database>(...)` — the `Database` type is in `types/database.types.ts`. When using `.select()` with a string, cast the result to a `Pick<Member,...>` type (see `route.ts` for pattern).
- **env guard pattern:** Story 1.1 uses `requireEnv()` in the auth route to guard missing env vars at startup. Apply the same pattern in any new server file that reads env vars.
- **Jest config:** Tests use `jest.config.ts`. Mock Supabase by mocking `@supabase/supabase-js` in `jest.setup.ts` or inline in test files (pattern from `__tests__/auth.test.ts`).
- **Known quirk:** bcryptjs produces `$2a$` prefix (not `$2b$`); verify password comparison uses `bcrypt.compare()` from `lib/auth/helpers.ts`.
- **Session type augmentation:** `session.user.role` is typed via `types/next-auth.d.ts` — already available, import `MemberRole` from `types/database.types.ts` for casting.

### Git Intel

Recent commits:
1. `ab837dc` — feat(skill): add compiled AGENTS.md for s2a-components-build skill
2. `1375f6c` — feat(skill): add s2a-components-build skill with design tokens
3. `0b549dc` — feat(story-1.1): system initialization & super admin

Story 1.1 established all project scaffolding. This story (1.2) is the first feature story on top of the working foundation.

### Project Structure Notes

- All admin pages go under `app/admin/` following Next.js App Router conventions
- `middleware.ts` must be at the **project root** (next to `package.json`), not inside `app/`
- Server Actions file naming convention: `actions.ts` co-located with the feature route segment
- No new SQL migrations required — `Members` and `AuditLogs` tables already exist in `V001__initial_schema.sql`
- The `password_hash` field in `Members` means new members must be created with a temporary/initial password that is hashed before insert; consider a standard initial password flow or a one-time invite pattern (for MVP: GS sets password at creation)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Member Management (CRUD)]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Members Table]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.5 AuditLogs]
- [Source: _bmad-output/planning-artifacts/architecture.md#5. Security & Access Control]
- [Source: _bmad-output/planning-artifacts/front-end-spec.md#3.3 Executive Board (EB) Space]
- [Source: _bmad-output/planning-artifacts/front-end-spec.md#5. Interaction Patterns & Feedback]
- [Source: supabase/migrations/V001__initial_schema.sql]
- [Source: types/database.types.ts]
- [Source: lib/auth/helpers.ts]
- [Source: lib/supabase/client.ts]
- [Source: app/api/auth/[...nextauth]/route.ts]
- [Source: _bmad-output/implementation-artifacts/1-1-system-initialization-and-super-admin.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity Dev Agent)

### Debug Log References

No blockers encountered. TypeScript lint errors from Supabase typed client `insert()`/`update()` returning `never` type — resolved with targeted `as any` casts + eslint-disable-next-line comments.

### Completion Notes List

- ✅ Task 1: `app/admin/members/actions.ts` — 4 server actions (getMembers, createMember, updateMember, getMemberById), Zod schemas, RBAC guard (write: SG/SG_ADJOINT/PRESIDENT, read: all admin roles), AuditLog writes, unique constraint field-level error messages.
- ✅ Task 2: `middleware.ts` at project root — JWT-based route protection for `/admin/*`, MEMBER role redirected to `/dashboard`, unauthenticated redirected to `/login`.
- ✅ Task 3: `app/admin/layout.tsx`, `app/admin/page.tsx` (redirect), `app/admin/members/page.tsx` — responsive layout (sidebar ≥768px, bottom tab-bar <768px), paginated member table with dual status badges.
- ✅ Task 4: `app/admin/members/new/page.tsx` — client-side create form with field-level Zod error display and duplicate email/phone handling (AC2, AC3).
- ✅ Task 5: `app/admin/members/[id]/edit/edit-member-form.tsx` + `page.tsx` — pre-populated edit form with two status toggles (Statut Cotisation + Statut Compte), "Changes Saved & Logged" toast (AC4).
- ✅ Task 6: `__tests__/members.actions.test.ts` — 14 unit tests, all pass. Full suite: 60 tests across 4 suites, 0 regressions.
- ✅ Additional: Updated `app/globals.css` and `tailwind.config.ts` with S2A brand design tokens per skill spec. Created `lib/utils.ts` (cn utility), `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/s2a/status-badge.tsx`.

### File List

- `app/admin/members/actions.ts` [NEW]
- `middleware.ts` [NEW]
- `app/admin/layout.tsx` [NEW]
- `app/admin/page.tsx` [NEW]
- `app/admin/members/page.tsx` [NEW]
- `app/admin/members/new/page.tsx` [NEW]
- `app/admin/members/[id]/edit/page.tsx` [NEW]
- `app/admin/members/[id]/edit/edit-member-form.tsx` [NEW]
- `__tests__/members.actions.test.ts` [NEW]
- `lib/utils.ts` [NEW]
- `components/ui/button.tsx` [NEW]
- `components/ui/card.tsx` [NEW]
- `components/ui/input.tsx` [NEW]
- `components/s2a/status-badge.tsx` [NEW]
- `app/globals.css` [MODIFIED]
- `tailwind.config.ts` [MODIFIED]
- `_bmad-output/implementation-artifacts/sprint-status.yaml` [MODIFIED]
- `supabase/migrations/V002__rbac_and_account_status.sql` [NEW]
- `app/api/auth/[...nextauth]/route.ts` [MODIFIED]
- `types/database.types.ts` [MODIFIED]
- `docs/Spécification Visuelle et Parcours Utilisateurs _ Amicale S2A.md` [MODIFIED]

### Change Log

- 2026-03-03: Implemented Story 1.2 — Member Management CRUD. All 6 tasks complete. 60/60 tests pass.
- 2026-03-03: Addressed Code Review Findings — Fixed test flaw, updated file list to reflect auth and schema changes, revised false claims of atomic audit writes.
