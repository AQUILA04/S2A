# Story 3.2: Balance Calculation Engine Integration

Status: done

## Story

As the System,
I want to execute the `getMemberBalance` logic server-side,
so that theoretical debt, real income, and arrears are calculated accurately without client-side manipulation.

## Acceptance Criteria

1. **Server-Side Execution**:
   - **Given** a request to load a member's financial data
   - **When** the server action/API is invoked
   - **Then** the logic must execute entirely on the server to prevent client-side manipulation (NFR-PERF-01).

2. **Accurate Timeline and Blackout Months**:
   - **Given** `getMemberBalance` is running
   - **Then** it accurately calculates the timeline from `join_date` to the current date, explicitly excluding any active `BlackoutMonths` (FR-FIN-01).

3. **Compute Arrears Securely**:
   - **Given** `getMemberBalance` is running
   - **Then** it computes arrears securely by comparing theoretical debt to real validated income, before returning the payload to the UI.

4. **10/12 Prorated Allocation**:
   - **Given** validated contributions
   - **Then** exactly 2/12 is allocated to Operating Fees and 10/12 to Available Balance (FR-FIN-02).

## Tasks / Subtasks

- [x] Task 1: Review and Optimize `balance.service.ts` (AC: 1, 2, 3, 4)
  - [x] Refactor the existing sequential queries in `getMemberBalance` using `Promise.all` to fetch independent data (`BlackoutMonths`, `Contributions`, `ProjectInvestments`) concurrently, maximizing server-side performance (NFR-PERF-01).
  - [x] Handle mathematical edge cases: prevent division by zero for missing `monthly_fee`, handle empty blackout months gracefully, and ensure timezone-safe `join_date` timeline iteration.
- [x] Task 2: Secure Integration & Server Actions (AC: 1)
  - [x] **Critical Security:** Implement strict RBAC in the Server Action to explicitly reject the request unless `currentUser.id === requestedMemberId` OR `currentUser.role` is in `['PRESIDENT', 'SG', 'TREASURER']` to prevent IDOR (Insecure Direct Object Reference) vulnerabilities.
  - [x] **API Contract:** Define and export a strict Zod schema matching the `MemberBalanceConfig` interface and parse the Server Action payload through it.
  - [x] Ensure that the frontend consumes this server-calculated payload naturally without performing any secondary deduplication or recalculations.
- [x] Task 3: Comprehensive Test Coverage
  - [x] Expand the existing `__tests__/balance.service.test.ts` to cover more extreme edge cases (e.g., leap years, multiple non-sequential blackout months, very old join dates).

## Dev Notes

- **Important Context**: The developer for Story 3.1 already created the draft of `balance.service.ts` and its basic unit tests. Your job is not to build it from scratch, but rather to harden it, review it against the architecture specifications, ensure completely secure integration into the server actions, and expand test coverage.
- **Architecture Patterns**: 
  - Next.js Server Actions are mandatory for this integration.
  - Strict typing using Zod for the returned payload is recommended.
- **Testing Standards**: Maintain high coverage in `__tests__/balance.service.test.ts` for the financial algorithm.

### Project Structure Notes

- `lib/services/balance.service.ts`
- `__tests__/balance.service.test.ts`
- Associated Server Actions in the `app/` directory (e.g., `app/dashboard/actions.ts` or directly within server components).

### References

- [Source: `_bmad-output/planning-artifacts/prd.md#3.1 Core Logic (getMemberBalance)`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#4.1 The getMemberBalance(memberId) Algorithm`]
- [Source: `_bmad-output/implementation-artifacts/3-1-member-dashboard-3-counters-layout.md`] (For context on what was already built)

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

N/A

### Completion Notes List

- Story context created utilizing existing PRD and Architecture files.
- Noted that `balance.service.ts` was already scaffolded in Epic 3.1, so tasks are correctly scoped towards hardening, edge-case testing, and secure Server Action integration.
- Automatically applied competitive validation improvements (IDOR prevention, concurrent Promise.all fetching, Zod schemas) for an airtight LLM developer guide.
- [IMPLEMENTATION - Task 1] Refactored `balance.service.ts`: replaced 3 sequential Supabase calls with a single `Promise.all()` for concurrent fetching of `BlackoutMonths`, `Contributions`, and `ProjectInvestments`. Applied UTC-safe date iteration to prevent timezone-related off-by-one month errors. Added division-by-zero guard for `monthly_fee = 0`. Added invalid `join_date` guard. Exported `memberBalanceConfigSchema` (Zod) for strict output typing.
- [IMPLEMENTATION - Task 2] Created `app/dashboard/actions.ts`: a `"use server"` Next.js Server Action with Zod input schema validation (`getMemberBalanceInputSchema`), RBAC enforcement (IDOR prevention: self-access or privileged role required), call to `getMemberBalance`, and Zod output validation of the result before returning to client.
- [IMPLEMENTATION - Task 3] Expanded `__tests__/balance.service.test.ts` with 9 new edge case tests: leap year join date (Feb 29 2024), multiple non-sequential blackout months, very old join date (10+ years), overpayment/zero arrears, division-by-zero protection (fee=0), cross-year blackout months, ACTIVE boundary (exactly 23 months), INACTIVE boundary (exactly 24 months), and empty blackout list graceful handling. All 13 tests pass.
- **[AI CODE REVIEW - FIXES]** Fixed silent DB failure risks in `balance.service.ts` Promise.all by adding explicit `.error` throws. Added `VALIDATED` status filter to `ProjectInvestments`. Extracted multiplier magic numbers to constants. Integrated the orphaned `getMemberBalanceAction` Server Action into `app/dashboard/components/dashboard-content.tsx` to enforce RBAC directly in the UI. Expanded `balance.service.test.ts` to verify DB failure exceptions. All 170 project tests passing.

### File List

- `_bmad-output/implementation-artifacts/3-2-balance-calculation-engine-integration.md`
- `lib/services/balance.service.ts`
- `__tests__/balance.service.test.ts`
- `app/dashboard/actions.ts`
- `app/dashboard/components/dashboard-content.tsx`
