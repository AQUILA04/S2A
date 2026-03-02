---
stepsCompleted: []
inputDocuments: ["_bmad-output/planning-artifacts/prd.md", "_bmad-output/planning-artifacts/architecture.md", "_bmad-output/planning-artifacts/front-end-spec.md"]
---

# S2A - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for S2A, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-FIN-01 (Blackout Months): The President can globally disable specific months. These months are excluded from the theoretical debt calculation.
FR-FIN-02 (10/12 Rule): For every 12 months of contributions paid (prorated by the monthly fee applicable for that specific year), 2 months are allocated to the EB Operating Fund and 10 months to the Member's Available Balance.
FR-FIN-03 (Automatic Inactive Status): If a member accumulates >= 24 months of arrears (active months only), their status automatically switches to INACTIVE.
FR-ADMIN-01 (Legacy Import): The Treasurer can upload Excel/CSV files to populate historical contributions since 2016.
FR-AUDIT-01 (Audit Trail): All EB actions are logged (Actor, Action, Timestamp, Metadata/Changes). Restricted to EB access only.

### NonFunctional Requirements

NFR-SEC-01 (Role Isolation): Inactive members can still log in to view their debt but are barred from making new investments until regularized.
NFR-PERF-01 (Server-Side Integrity): The balance calculation engine must run on the server to prevent client-side manipulation.

### Additional Requirements

- **Architecture/Tech Stack**: Next.js (App Router), TypeScript, Server Actions, PostgreSQL (Supabase), NextAuth.js, Supabase Storage, Tailwind CSS.
- **Architecture/Data Models**: Members, Contributions, BlackoutMonths, ProjectInvestments, EBExpenses, AuditLogs tables with strict typing/enums.
- **Architecture/Core Logic**: Server-side getMemberBalance(memberId) must handle timeline filtering, theoretical debt, realized income, prorated allocation (10/12), and status checks atomically.
- **Architecture/Treasury Logic**: Total Operating Cash = Sum(Total_Operating_Contributed) - Sum(EB_Expenses). Member Available Balance = Total_Savings - Sum(Member_Investments).
- **Architecture/Security & Access Control**: RBAC (MEMBER, TREASURER/PRESIDENT, SG). Write actions by EB need Audit Middleware. Strict Zod schema validation.
- **Architecture/Infrastructure**: Vercel (Production), automated testing on CI/CD, daily DB snapshots via Supabase, SMS/Email notifications.
- **UX/Design Philosophy**: Mobile-First, thumb-friendly navigation, large touch targets (min 44x44px), high-contrast text. Prominent financial figures.
- **UX/Color Palette**: Primary (Navy Blue #002366), Secondary (Gold #D4AF37), Success (Green #28A745), Alert/Arrears (Red #DC3545), Neutral/Blackout (Light Grey #E9ECEF).
- **UX/Typography**: Inter or Roboto. Heading (Bold, Navy Blue, 20px-24px), Body (Regular, Dark Grey #333333, 16px), KPI Figures (Monospace or Semibold, 28px+).
- **UX/Member Space**: Financial Overview Dashboard (3 Counters), Contribution History (monthly grid), Payment Entry wizard, GA Archives.
- **UX/EB Space**: EB Overview, Validation Console (queue), Member Management, Admin Settings (Blackout months, payment channels).
- **UX/Dashboard UI**: "Wealth Header" with 3 circular/card counters (Total Paid, Operating Fees, Available Balance). Red/orange arrears banner. Grayscale dashboard if INACTIVE.
- **UX/Payment Wizard**: "Copy to Clipboard" button next to all numbers.
- **UX/Calendar**: Green (Paid), Red (Unpaid/Arrears), Grey Strikethrough (Blackout Month) with info tooltip.
- **UX/Validation Console**: Action drawer with copyable Reference ID, Approve (Green), Reject (Red) with mandatory reason.
- **UX/Interaction Patterns**: Pull-to-refresh on financial lists. Shimmer/Skeleton loading states for counters. "Changes Saved & Logged" toast notifications for EB changes.
- **UX/Responsive Breakpoints**: < 768px (Tab-bar bottom nav), > 768px (Sidebar nav).

### FR Coverage Map

FR-FIN-01 (Blackout Months): Epic 2 - Admins can suspend payments
FR-FIN-02 (10/12 Rule): Epic 3 - Members can see accurate balance calculation
FR-FIN-03 (Automatic Inactive Status): Epic 3 - Members can see accurate balance calculation 
FR-ADMIN-01 (Legacy Import): Epic 1 - EB can bootstrap the system
FR-AUDIT-01 (Audit Trail): Epic 1 - EB can bootstrap the system

## Epic List

### Epic 1: Board Authentication & Registry (Bootstrap)
The Executive Board can securely log in, set up member accounts, and import historical data to initialize the system.
**FRs covered:** FR-ADMIN-01, FR-AUDIT-01

### Epic 2: Treasury & Contribution Management
Members can declare payments via multiple channels, and the Board can validate these payments and configure blackout months.
**FRs covered:** FR-FIN-01

### Epic 3: Financial Dashboards & Member Portal
Members can log in to view their calculated balances, payment history, and investment status based on the complex 10/12 allocation rule.
**FRs covered:** FR-FIN-02, FR-FIN-03

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic 1: Board Authentication & Registry (Bootstrap)

The Executive Board can securely log in, set up member accounts, and import historical data to initialize the system.

### Story 1.1: System Initialization & Super Admin

As a Developer,
I want a script to set up the database schema and initialize the primary General Secretary (GS) account,
So that the system can be deployed and initially accessed by the administration.

**Acceptance Criteria:**

**Given** the application is deployed
**When** the initialization script is run
**Then** the `Members` table is created along with all other required schema variations
**And** a GS user is inserted with secure credentials that can be logged into

### Story 1.2: Member Management (CRUD)

As the General Secretary,
I want to create, view, update, and manage member profiles,
So that the roster is kept up to date and correct monthly fees are assigned.

**Acceptance Criteria:**

**Given** the GS is logged into the administrative space
**When** they create a new member profile
**Then** the system validates data inputs (unique email/phone)
**And** creates the member with "Pending Activation" status and records the initial monthly fee

### Story 1.3: Role-Based Authentication

As a Member (or Board member),
I want to log in,
So that I can access my personalized dashboard or administrative spaces depending on my role.

**Acceptance Criteria:**

**Given** a registered user
**When** they authenticate with valid credentials
**Then** they are routed to either `/dashboard` (MEMBER) or `/admin` (EB roles)
**And** prevented from accessing routes they do not have permissions for

### Story 1.4: Legacy Data Import Tool

As the Treasurer,
I want to upload Excel or CSV files containing the historical contribution data since 2016,
So that the platform accurately reflects all prior financial commitments and payments.

**Acceptance Criteria:**

**Given** an authorized Treasurer is logged in
**When** they upload a well-formatted legacy report CSV
**Then** the system parses the file against a strict schema validation
**And** inserts the legacy contributions, ignoring duplicates or rejecting malformed rows with clear error feedback

### Story 1.5: Audit Logging Middleware

As the President/EB,
I want all write actions performed by the Executive Board to be logged,
So that there is a strict, immutable financial and administrative audit trail.

**Acceptance Criteria:**

**Given** an Executive Board member performs an action (e.g., Validate Payment, Update Member, Import Legacy)
**When** the `POST/PUT/DELETE` request is received
**Then** a middleware intercepts the action to securely log it
**And** records it in the `AuditLogs` table along with actor ID, timestamp, and before/after metadata changes

## Epic 2: Treasury & Contribution Management

Members can declare payments via multiple channels, and the Board can validate these payments and configure blackout months.

### Story 2.1: Payment Channel Configuration

As the Executive Board,
I want to configure and manage the payment channel details (Flooz, Mixx, Bank RIB, Western Union) that members will use,
So that members always have the correct, up-to-date treasury numbers for making their payments.

**Acceptance Criteria:**

**Given** the President or Treasurer is logged into the administrative settings
**When** they add or update a payment channel and number
**Then** the new details are saved and displayed correctly in the member's payment wizard
**And** the "Copy to Clipboard" button correctly copies the new treasury number

### Story 2.2: Member Payment Declaration Wizard

As a Member,
I want to declare a payment I made by selecting a channel and entering the reference ID,
So that the Board is notified to validate my contribution.

**Acceptance Criteria:**

**Given** a member is on the Payment Entry screen
**When** they select a digital channel (Flooz, Mixx, Bank) and submit
**Then** the reference ID field is mandatory
**And** the contribution is saved to the database with a 'PENDING' status

### Story 2.3: Executive Board Direct Recording (Cash)

As an Executive Board member,
I want to directly record cash payments I received in person,
So that the member's balance is updated immediately without them needing to declare it.

**Acceptance Criteria:**

**Given** an EB member is recording a payment for a specific member
**When** they select 'CASH' as the channel and submit
**Then** the payment is automatically saved as 'VALIDATED'
**And** the Reference ID is optional, unlike digital channels

### Story 2.4: Validation Console

As a Treasurer or President,
I want to review, approve, or reject pending payment declarations from members,
So that only verified funds are added to the association's treasury.

**Acceptance Criteria:**

**Given** there are 'PENDING' declarations in the Validation Console
**When** the Treasurer reviews an item in the action drawer
**Then** clicking 'Approve' sets the status to 'VALIDATED'
**And** clicking 'Reject' requires a mandatory reason and updates the status to 'REJECTED'

### Story 2.5: Blackout Months Configuration

As the President,
I want to toggle specific months as "Blackout" periods (e.g., COVID suspension),
So that members are not expected to pay their monthly fee during excused times.

**Acceptance Criteria:**

**Given** the President is in the Admin Settings
**When** they toggle `is_active` to true for a specific month and year and provide a reason
**Then** the month is added to the `BlackoutMonths` table
**And** the system excludes this month from all future member debt calculations

## Epic 3: Financial Dashboards & Member Portal

Members can log in to view their calculated balances, payment history, and investment status based on the complex 10/12 allocation rule.

### Story 3.1: Member Dashboard (3 Counters Layout)

As a Member,
I want to see my financial standing immediately upon logging in,
So that I understand my contributions, operating fees, and available investment balance.

**Acceptance Criteria:**

**Given** a member logs into their dashboard
**When** the dashboard renders
**Then** it displays three circular or card counters mapping to Navy, Gold, and Dark Grey styles
**And** it clearly shows Total Paid, Operating Fees (2/12), and Available Balance (10/12)

### Story 3.2: Balance Calculation Engine Integration

As the System,
I want to execute the `getMemberBalance` logic server-side,
So that theoretical debt, real income, and arrears are calculated accurately without client-side manipulation.

**Acceptance Criteria:**

**Given** a request to load a member's financial data
**When** the server action is invoked
**Then** it accurately calculates the timeline from `join_date` (minus Blackout months)
**And** computes arrears securely before returning the payload to the UI

### Story 3.3: Interactive Contribution Calendar

As a Member,
I want to see a month-by-month grid of my payment history since joining,
So that I easily identify any missing payments or months I owe.

**Acceptance Criteria:**

**Given** a member views their personal history
**When** the calendar grid loads
**Then** paid months show as Green tiles and unpaid past months show as Red tiles
**And** Blackout months display with a Grey Strikethrough and an informational tooltip

### Story 3.4: Arrears Alert & Inactive Status Handling

As the System,
I want to warn members if they owe money and switch their status to 'INACTIVE' if they accumulate $\ge 24$ months of arrears,
So that they are visually prompted to regularize their standing.

**Acceptance Criteria:**

**Given** a member with an active `getMemberBalance` payload
**When** their `Unpaid_Months >= 24`
**Then** the UI is forced into grayscale mode
**And** a prominent red "Action Required: Pay Arrears" banner is displayed locking out further investment actions
