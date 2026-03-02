
---

# 📄 Product Requirements Document (PRD): Amicale S2A

**Status:** Final (MVP)

**Author:** John (Product Manager)

**Date:** March 2, 2026

**Version:** 1.0

---

## 1. Goals & Background

### 1.1 Project Objectives

* **Centralization**: Unify the member registry and payment tracking since the association's start in 2016.
* **Financial Transparency**: Provide real-time visibility into arrears, advances, and available balances for every member.
* **Audit Reliability**: Maintain a strictly regulated log of all administrative actions (validations, modifications, investments) for the Executive Board (EB).
* **Community Investment**: Facilitate the conversion of member savings into project shares.

### 1.2 Background

Amicale S2A requires a system capable of handling a complex historical timeline. The platform must allow for global "Blackout Months" (e.g., COVID-19 suspension) and enforce a "10/12 solidarity rule," where a portion of contributions is reserved for the association's operating costs.

### 1.3 Revision History

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 02/03/2026 | 1.0 | Initial Complete PRD (BMAD Standard) | John (PM) |

---

## 2. Requirements

### 2.1 Functional Requirements (FR)

* **FR-FIN-01 (Blackout Months)**: The President can globally disable specific months. These months are excluded from the theoretical debt calculation.
* **FR-FIN-02 (10/12 Rule)**: For every 12 months of contributions paid (prorated by the monthly fee applicable for that specific year), 2 months are allocated to the EB Operating Fund and 10 months to the Member's Available Balance.
* **FR-FIN-03 (Automatic Inactive Status)**: If a member accumulates $\ge 24$ months of arrears (active months only), their status automatically switches to **INACTIVE**.
* **FR-ADMIN-01 (Legacy Import)**: The Treasurer can upload Excel/CSV files to populate historical contributions since 2016.
* **FR-AUDIT-01 (Audit Trail)**: All EB actions are logged (Actor, Action, Timestamp, Metadata/Changes). Restricted to EB access only.

### 2.2 Non-Functional Requirements (NFR)

* **NFR-SEC-01 (Role Isolation)**: Inactive members can still log in to view their debt but are barred from making new investments until regularized.
* **NFR-PERF-01 (Server-Side Integrity)**: The balance calculation engine must run on the server to prevent client-side manipulation.

---

## 3. Technical Assumptions & Calculation Engine

### 3.1 Core Logic (`getMemberBalance`)

The system calculates balances using the following server-side algorithm:

1. **Retrieve Active Timeline**: Identify all months from `join_date` to current date, excluding those in the `BlackoutMonths` table.
2. **Calculate Theoretical Debt**: Sum the `monthly_fee` applicable for each active month (handling historical fee changes).
3. **Calculate Real Income**: Sum all contributions with a `VALIDATED` status.
4. **Arrears & Status Check**:
* `Arrears = Theoretical_Debt - Total_Validated`.
* If `Arrears >= (24 * current_monthly_fee)`, set Status to **INACTIVE**.


5. **10/12 Allocation**:
* `Operating_Fund_Contribution = Total_Validated * (2/12)`.
* `Gross_Savings = Total_Validated * (10/12)`.


6. **Final Member KPIs**:
* `Available_Balance = Gross_Savings - Total_Investments`.



---

## 4. Epic List

### EPIC 1: FOUNDATION & REGISTRY

* **Story 1.1: Setup & Initial Admin Seed**
* *Description*: Technical initialization and creation of the primary GS "Seed" account via script.
* *Acceptance Criteria (AC)*: Monorepo ready, DB connected, GS account functional.


* **Story 1.2: Board Authentication**
* *Description*: Secure multi-role login (President, GS, Treasurer).


* **Story 1.3: Member Registry & Activation**
* *Description*: GS creates a member profile. The system sends a link for the member to set their password.
* *AC*: Status set to "Pending Activation," unique token-based link, audit log entry created.


* **Story 1.4: Member Login & Dashboard Access**
* *Description*: Members log in to access their specific personal view.



### EPIC 2: TIME & HISTORY (2016+)

* **Story 2.1: Blackout Months Config**
* *Description*: President toggles months on/off per year.
* *AC*: Immediate recalculation of all members' theoretical debt.


* **Story 2.2: Legacy Data Import**
* *Description*: Treasurer bulk loads historical data.
* *AC*: Data validation (type/format) before insertion, preview of balance impacts.


* **Story 2.3: Automatic Status Engine**
* *Description*: Switch status to INACTIVE if arrears $\ge 24$ months.
* *AC*: "Debt Recovery" banner visible to the member; investment features disabled.



### EPIC 3: DYNAMIC CONTRIBUTION FLOW

* **Story 3.1: Channel Configuration**
* *Description*: EB configures RIB/IBAN, Flooz/Mixx numbers, and Western Union details.


* **Story 3.2: Member Declaration**
* *Description*: Member selects a channel and enters their transaction reference.
* *AC*: Reference mandatory for digital; status set to "Pending."


* **Story 3.3: Direct Recording (Board)**
* *Description*: EB records a payment (Cash or direct).
* *AC*: Auto-validated. Reference mandatory for digital channels; optional for "Cash."


* **Story 3.4: Validation Console**
* *Description*: Treasurer/President verifies and validates pending member declarations.



### EPIC 4: DASHBOARDS & FINANCES

* **Story 4.1: Member Dashboard (The 3 Counters)**
* *AC*: Display: **Total Paid | Operating Fund (2/12) | Available Balance (10/12)**.


* **Story 4.2: Monthly Contribution Detail**
* *AC*: Calendar grid with color codes (Green: Paid, Red: Due, Grey: Blackout).


* **Story 4.3: Investment Management (President)**
* *Description*: President records a member's investment in a project.
* *AC*: Automated check ensuring `Investment <= Available Balance`.


* **Story 4.4: Operating Expenses**
* *Description*: EB records operational costs (hall rental, etc.).
* *AC*: Direct deduction from the global Operating Fund pool.



### EPIC 5: GOVERNANCE & AUDIT

* **Story 5.1: General Assemblies (GA)**
* *Description*: Creation of GA events and upload of Moral, Financial, and General reports.


* **Story 5.2: Audit Portal (EB Only)**
* *Description*: Searchable journal of logs.
* *AC*: Filterable by Actor, Date, and Action type. Restricted to EB.



---

## 5. UI Goals

* **Mobile-First**: Responsive navigation optimized for small screens.
* **One-Tap Copy**: "Copy" buttons for all bank and mobile money numbers.
* **Financial Urgency**: Visual alerts (red) for Inactive members or those with high arrears.