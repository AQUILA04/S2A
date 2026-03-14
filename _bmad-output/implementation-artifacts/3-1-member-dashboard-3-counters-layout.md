# Story 3.1: Member Dashboard (3 Counters Layout)

Status: done

## Story

As a Member,
I want to see my financial standing immediately upon logging in,
so that I understand my contributions, operating fees, and available investment balance.

## Acceptance Criteria

1. **Dashboard Counters:**
   - **Given** a member logs into their dashboard
   - **When** the dashboard renders
   - **Then** it displays three circular or card counters mapping to Navy, Gold, and Dark Grey styles
   - **And** it clearly shows Total Paid, Operating Fees (2/12), and Available Balance (Total Savings - Investments).

2. **Arrears Banner:**
   - **Given** a member logs into their dashboard
   - **When** `Arrears > 0`
   - **Then** a persistent red/orange bar at the top is displayed.

3. **Inactive Status Handing:**
   - **Given** a member logs into their dashboard
   - **When** status is `INACTIVE`
   - **Then** the entire dashboard turns grayscale
   - **And** a prominent "Action Required: Pay Arrears" button is displayed to the user.

## Tasks / Subtasks

- [x] Task 1: Create Dashboard UI Shell (AC: 1, 2, 3)
  - [x] Set up a responsive grid layout for the 3 distinct counters.
  - [x] Implement `loading.tsx` using React `<Suspense>` boundaries to display Shimmer/Skeleton loading states for the counters while `getMemberBalance` is executing server-side.
- [x] Task 2: Implement Component: `CounterCard` (AC: 1)
  - [x] Build a highly reusable `<CounterCard />` component in `/components/ui/` or `/app/components/` to handle the display of all three metrics, maximizing DRY principles.
  - [x] Implement Total Paid variant (Navy Blue `#002366`).
  - [x] Implement Operating Fees variant (Dark Grey `#333333`) representing 2/12 of total validated amount.
  - [x] Implement Available Balance variant (Gold `#D4AF37`).
  - [x] Ensure KPI Figures are extremely prominent (Monospace or Semibold, 28px+) across all variants.
- [x] Task 3: Implement Conditional State: Arrears Banner (AC: 2)
  - [x] Render a red/orange (`#DC3545`) banner at the top of the view if the member's `Arrears > 0`.
- [x] Task 4: Implement Conditional State: Inactive Status (AC: 3)
  - [x] Adjust the dashboard's visual theme to grayscale if the member's status is `INACTIVE`.
  - [x] Display a prominent "Action Required: Pay Arrears" call-to-action button, locking further investment actions.
- [x] Task 5: Global UX Interactions & UI Integration
  - [x] Implement Pull-to-refresh interaction pattern. Use established web patterns suitable for Next.js App Router (e.g., leveraging URL state updates or a library like `react-spring` or generic implementations, rather than complex custom client-side touch event listeners).
  - [x] Ensure the new dashboard UI is correctly integrated into the authenticated member space routing structure.

## Dev Notes

- **Architecture Patterns:**
  - Next.js App Router (`/app/dashboard/` or equivalent structure for members) and Server Actions.
  - Data must rely exclusively on the server-side `getMemberBalance(memberId)` algorithm to securely fetch timeline, theoretical debt, and calculated 10/12 prorated allocation. Avoid client-side balance calculation.
  - CRITICAL: Available Balance calculation must be exactly `Total_Savings - Sum(Member_Investments)` per the architecture document.
  - Required DB dependencies for calculation: `Members`, `Contributions` (status: VALIDATED), `BlackoutMonths`, and `ProjectInvestments`.
- **Mobile-First UX:**
  - Emphasize thumb-friendly navigation. Ensure large touch targets (minimum 44x44px).
  - The UI must be fully responsive, seamlessly adapting between `< 768px` (Tab-bar bottom nav) and `> 768px` (Sidebar nav). (Global layout might handle the nav, but ensure dashboard content respects margins/padding).
- **Component Development Skill:** 
  - ALWAYS use the `s2a-components-build` skill when creating or applying UI components. Adhere strictly to the S2A specific guidelines built on top of the Vercel theme from tweakcn.com.

### Project Structure Notes

- Components should belong to the `/app/dashboard` context or a shared UI library if they are reusable cards/counters. 

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.1: Member Dashboard (3 Counters Layout)`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#4.1 The getMemberBalance(memberId) Algorithm`]
- [Source: `_bmad-output/planning-artifacts/architecture.md#4.2 Global Treasury Logic`]
- [Source: `_bmad-output/planning-artifacts/front-end-spec.md#4.1 Member Dashboard (The 3 Circular Counters)`]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

N/A

### Completion Notes List

- Implemented standard BMAD template structure. 
- Incorporated UX specs details regarding counters and mobile-first design.
- Included specific references to `getMemberBalance(memberId)`.
- Applied validation context updates for optimal dev agent understanding.
- [IMPLEMENTATION] Created the `balance.service.ts` calculation engine logic natively with `getMemberBalance`.
- [IMPLEMENTATION] Wrote comprehensive unit tests for the timeline parsing, theoretical debt, validated totals, investments deductions, and 10/12/2/12 prorated allocation.
- [IMPLEMENTATION] Added high quality generic `KpiCard` respecting the S2A Design Skills.
- [IMPLEMENTATION] Assembled `DashboardContent` referencing `pull-to-refresh` logic and inactive state UI conditional locks.
- [IMPLEMENTATION] Wrapped the `DashboardContent` in suspense bound `loading.tsx` in `page.tsx`.

### File List

- `_bmad-output/implementation-artifacts/3-1-member-dashboard-3-counters-layout.md`
- `lib/services/balance.service.ts`
- `__tests__/balance.service.test.ts`
- `components/s2a/kpi-card.tsx`
- `components/s2a/arrears-banner.tsx`
- `app/dashboard/components/dashboard-content.tsx`
- `app/dashboard/loading.tsx`
- `app/dashboard/page.tsx`
- `components/s2a/pull-to-refresh.tsx`
