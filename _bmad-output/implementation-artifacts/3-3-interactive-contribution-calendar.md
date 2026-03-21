# Story 3.3: Interactive Contribution Calendar

Status: done

## Story

As a Member,
I want to see a month-by-month grid of my payment history since joining,
So that I easily identify any missing payments or months I owe.

## Acceptance Criteria

1. **Given** a member views the Contribution Calendar
   **When** the calendar grid loads displaying 10+ years of history
   **Then** paid months display with the semantic success color (e.g., `bg-success`), unpaid past months with the destructive color (e.g., `bg-destructive`), and Blackout months with a neutral disabled style (`bg-muted` / strikethrough) with an informational tooltip. ✅
2. **Given** the requirement for Mobile-First UX
   **When** viewing on a small screen (< 768px)
   **Then** the grid must be responsive, thumb-friendly, and ensure large touch targets (min 44x44px). ✅
3. **Given** the Dashboard state loading
   **When** the calendar is waiting for data from `getMemberBalance`
   **Then** the component must display a Shimmer/Skeleton loading state matching the final calendar shape. ✅
4. **Given** the need for End-to-End integration
   **When** the user logs in
   **Then** the calendar is immediately visible on the Dashboard below the counters or clearly linked via global navigation. ✅

## Tasks / Subtasks

- [x] Task 1: Extend Server API with Strict Schema (AC: 1)
  - [x] Add an exact `timeline` array explicitly typed via Zod to the `MemberBalanceConfig` interface in `balance.service.ts`: `timeline: z.array(z.object({ month: z.number(), year: z.number(), amount: z.number(), status: z.enum(['PAID', 'UNPAID', 'BLACKOUT']), note: z.string().optional() }))`.
  - [x] Safely populate this `timeline` array sequentially across the `join_date` to `current_date` iteration in `getMemberBalance` WITHOUT breaking the existing `availableBalance` calculation logic logic built in Story 3.2.
- [x] Task 2: Create `ContributionCalendar` Component (AC: 1, 2, 3)
  - [x] Accept a predictable prop contract: `interface ContributionCalendarProps { memberId?: string; data: MemberBalanceConfig['timeline']; isLoading: boolean; }`. The component should accept `memberId` to allow Treasurers to reuse the calendar on member detail pages.
  - [x] Implement a pure CSS Grid layout grouping months by year. DO NOT import heavy third-party calendar libraries (like `date-fns` or `react-day-picker`) - 120 grid squares do not require library bloat.
  - [x] Use semantic Tailwind classes mapped to S2A tokens: `bg-success` (Paid), `bg-destructive` (Unpaid), `bg-muted` with `line-through` (Blackout).
  - [x] Add a Shimmer/Skeleton placeholder shown when `isLoading` is true.
- [x] Task 3: Dashboard UI Integration (AC: 4)
  - [x] Integrate the component into `app/dashboard/components/dashboard-content.tsx`.
- [x] Task 4: Automated Testing
  - [x] Add React Testing Library tests for `ContributionCalendar` rendering its states (Loading, Paid, Unpaid, Blackout tooltip).
  - [x] Verify `balance.service.test.ts` still passes with the newly exposed timeline property.

## Dev Notes

- **Architecture Patterns**: Use Next.js App Router, pure Tailwind CSS Grid, and Server Actions.
- **Previous Story Intelligence (Story 3.2)**: 
  - `getMemberBalance` was strictly hardened in Story 3.2 with `Promise.all`, UTC-safe dates, Zod schemas, and RBAC to prevent IDOR.
  - You MUST use this existing hardened service as the source of truth for the timeline. Client-side evaluation of raw contributions is strictly prohibited.
- **Dependency Guardrails**: DO NOT install new massive third-party date/calendar modules. Build a native fast grid.

### Project Structure Notes

- `app/dashboard/components/contribution-calendar.tsx` (NEW)
- `app/dashboard/components/dashboard-content.tsx` (MODIFIED)
- `lib/services/balance.service.ts` (MODIFIED to include timeline Zod schema output)
- `__tests__/components/contribution-calendar.test.tsx` (NEW)

### References

- [Source: `_bmad-output/planning-artifacts/prd.md#4.2 Monthly Contribution Detail`]
- [Source: `_bmad-output/planning-artifacts/spec-ux.md#2.1.2 Dashboard Principal`]
- [Source: `_bmad-output/implementation-artifacts/3-2-balance-calculation-engine-integration.md`]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

N/A

### Completion Notes List

- Comprehensive context generated for Story 3.3.
- Highlighted reuse of hardened `getMemberBalance` from Story 3.2.
- Emphasized strict semantic color classes and CSS-Grid usage to prevent bloat.
- Detailed Zod API contract and Calendar Props added to guarantee Dev agent precision without regression risks.
- **[IMPLEMENTED]** Task 1: Extended `balance.service.ts` with `timelineEntrySchema` (Zod) and `timeline` array populated in `getMemberBalance`. Status set per month: PAID (if contribution with matching month/year exists), UNPAID, or BLACKOUT. Existing `availableBalance` and `theoreticalDebt` calculations fully preserved.
- **[IMPLEMENTED]** Task 2: Created `app/dashboard/components/contribution-calendar.tsx` — pure CSS Grid (responsive: 4 → 6 → 12 cols), semantic tokens (`bg-success/10`, `bg-destructive/10`, `bg-muted`), skeleton with `role="status"`, accessible aria-labels, tooltip via `title` attribute for BLACKOUT months, legend. Strictly no third-party calendar libs.
- **[IMPLEMENTED]** Task 3: Integrated `<ContributionCalendar>` into `dashboard-content.tsx` below the KPI row, passing `balance.timeline` from the server action.
- **[IMPLEMENTED]** Task 4: 11 RTL tests in `__tests__/components/contribution-calendar.test.tsx` (loading skeleton, empty state, PAID/UNPAID/BLACKOUT tiles, tooltip with note and default, year grouping, legend, memberId prop, touch targets). Updated `jest.config.ts` to support `.tsx` tests with jsdom environment. Installed `@testing-library/react` and `@testing-library/jest-dom`. **Full regression suite: 187/187 tests pass.**

### File List

- `_bmad-output/implementation-artifacts/3-3-interactive-contribution-calendar.md` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)
- `package.json` (MODIFIED)
- `package-lock.json` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)
- `lib/services/balance.service.ts` (MODIFIED — timeline Zod schema + population)
- `app/dashboard/components/contribution-calendar.tsx` (NEW)
- `app/dashboard/components/dashboard-content.tsx` (MODIFIED — ContributionCalendar integration)
- `__tests__/components/contribution-calendar.test.tsx` (NEW)
- `__tests__/balance.service.test.ts` (MODIFIED — 6 new Timeline tests)
- `jest.config.ts` (MODIFIED — jsdom project for .tsx tests)
- `__mocks__/fileMock.js` (NEW — file stub for jsdom jest project)

## Change Log

- 2026-03-21: Story 3.3 implemented by Antigravity (Gemini 2.5 Pro). All 4 tasks complete. 187/187 tests pass. Story moved to "review".
- 2026-03-21: Code Review complete. Exported `ContributionCalendarSkeleton` for app router suspension, mapped `memberId` to the DOM `data-member-id`, and added missing `package.json` changes to File List. Status: done.
