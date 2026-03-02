
---

# 🚀 Project Roadmap: Amicale S2A Management App

**Status:** Final (MVP)

**Author:** Winston (Orchestrator)

**Date:** March 2, 2026

**Total Duration:** 10 Weeks

---

## Phase 1: Foundation & Member Registry (Weeks 1-2)

**Goal:** Establish the technical core and administrative backbone for the association.

* **Task 1.1: Technical Infrastructure Setup**
* Monorepo initialization (Next.js, TypeScript).
* Database schema deployment (Supabase/PostgreSQL).
* Authentication provider setup (NextAuth.js).


* **Task 1.2: Administrative Seeding & Board Login**
* Script-based creation of the initial GS (Secretary) "Seed" account.
* Role-Based Access Control (RBAC) implementation for President, SG, and Treasurer.


* **Task 1.3: Member Onboarding System**
* Secretary interface for member profile creation (Join date, monthly fee).
* Invitation system via secure unique links for password configuration.



## Phase 2: Temporal Logic & Historical Data (Weeks 3-4)

**Goal:** Configure the timeline since 2016 and migrate existing financial records.

* **Task 2.1: Global Blackout Months Configuration**
* Presidential interface to toggle months on/off (e.g., COVID-19 suspension).
* Implementation of the "Theoretical Debt" engine based on active months.


* **Task 2.2: Bulk Legacy Data Import Tool**
* Treasurer interface for Excel/CSV uploads.
* Data mapping and validation engine (preview mode before database commit).


* **Task 2.3: Automatic Inactivity Status Engine**
* Background job to track arrears.
* Auto-switch to `INACTIVE` status for members with 24+ months of debt.



## Phase 3: Financial Infrastructure & Payment Flow (Weeks 5-6)

**Goal:** Digitalize the contribution process from declaration to validation.

* **Task 3.1: Payment Channel Management**
* Board interface to configure bank details, Flooz, Mixx, and Western Union info.


* **Task 3.2: Member Payment Declaration**
* User interface to pick a channel, view instructions, and submit a Reference ID.


* **Task 3.3: Direct & Cash Recording**
* Board interface for manual recording (Cash/Phone) with auto-validation logic.


* **Task 3.4: Board Validation Console**
* Real-time queue for the Treasurer to verify Reference IDs and credit accounts.



## Phase 4: Advanced Dashboards & Wealth Tracking (Weeks 7-8)

**Goal:** Implement the "10/12" logic and investment modules.

* **Task 4.1: Member Wealth Dashboard (The 3 Counters)**
* Development of the visual KPIs: Total Paid | Operating Fund (2/12) | Available Balance (10/12).


* **Task 4.2: Project Investment Module**
* Presidential interface to record investments into specific projects.
* Automated balance check and deduction logic.


* **Task 4.3: EB Operating Expense Tracking**
* Treasurer interface to record association costs, deducted from the global 2/12 fund.



## Phase 5: Governance, Audit & Quality Assurance (Weeks 9-10)

**Goal:** Finalize official documentation and ensure total transparency.

* **Task 5.1: GA Document Center**
* Upload and storage system for Moral, Financial, and General Reports.
* Member view for archived GA historical records.


* **Task 5.2: Executive Board Audit Portal**
* Detailed search/filter interface for the `AuditLogs` table (Full history of actions).


* **Task 5.3: UAT & Deployment**
* End-to-End testing of the calculation engine.
* Final production deployment on Vercel.



---

**Milestone Summary:**

* **End of Week 2:** Board can register members.
* **End of Week 4:** All data since 2016 is imported and arrears are calculated.
* **End of Week 6:** Members can start declaring payments via the app.
* **End of Week 10:** Full association governance is digitalized and live.