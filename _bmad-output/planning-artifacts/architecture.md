
---

# 🏗️ Technical Architecture Specification: Amicale S2A

**Status:** Final (MVP)

**Author:** Alex (Solution Architect)

**Date:** March 2, 2026

**Version:** 1.0

---

## 1. System Overview

The Amicale S2A platform is designed as a **Mobile-First Web Application** using a **Monolithic Modular Architecture**. It prioritizes financial data integrity, historical accuracy (dating back to 2016), and a strict administrative audit trail.

## 2. Technology Stack

| Layer | Technology | Rationale |
| --- | --- | --- |
| **Frontend** | Next.js (App Router) | High performance for mobile web, SEO-friendly for public reports. |
| **Language** | TypeScript | Type-safety is mandatory for complex financial calculations. |
| **Backend** | Next.js Server Actions | Unified codebase, simplified API management. |
| **Database** | PostgreSQL (Supabase) | Relational integrity for member-to-payment mapping. |
| **Auth** | NextAuth.js | Robust RBAC (Role-Based Access Control) management. |
| **Storage** | Supabase Storage | Secure hosting for GA PDF reports and receipts. |
| **Styling** | Tailwind CSS | Rapid UI development for responsive mobile views. |

---

## 3. Detailed Data Schema (Entity Relationship)

### 3.1 `Members` Table

* `id`: UUID (Primary Key)
* `first_name`, `last_name`: String
* `email`, `phone`: String (Unique)
* `join_date`: Date (Critical for debt calculation start)
* `monthly_fee`: Decimal (The specific rate assigned at creation)
* `status`: Enum (`ACTIVE`, `INACTIVE`) — Association/cotisation status
* `account_status`: Enum (`PENDING_ACTIVATION`, `ACTIVE`) — User login state
* `role`: Enum (`MEMBER`, `PRESIDENT`, `SG`, `SG_ADJOINT`, `TREASURER`, `TRESORIER_ADJOINT`)
* `created_at_app`: Timestamp

### 3.2 `Contributions` Table

* `id`: UUID
* `member_id`: UUID (Foreign Key)
* `amount`: Decimal
* `month`, `year`: Integer
* `payment_channel`: Enum (`CASH`, `MOBILE_MONEY`, `BANK_TRANSFER`, `INTL_TRANSFER`)
* `reference_id`: String (Unique, Nullable for Cash)
* `status`: Enum (`PENDING`, `VALIDATED`, `REJECTED`)
* `validator_id`: UUID (Foreign Key to Member)
* `validated_at`: Timestamp

### 3.3 `BlackoutMonths` Table

* `id`: UUID
* `month`, `year`: Integer
* `reason`: String (e.g., "COVID-19 Suspension")
* `is_active`: Boolean (Default: false)

### 3.4 `ProjectInvestments` & `EBExpenses`

* `Investments`: `id`, `member_id`, `project_name`, `amount`, `date`.
* `Expenses`: `id`, `description`, `amount`, `category`, `date`, `receipt_url`.

### 3.5 `AuditLogs`

* `id`: UUID
* `actor_id`: UUID (The Board member performing the action)
* `action_type`: String (e.g., "VALIDATE_PAYMENT", "UPDATE_MEMBER")
* `metadata`: JSONB (Stores `old_value` and `new_value`)
* `timestamp`: Timestamp

---

## 4. Core Logic & Calculation Engines

### 4.1 The `getMemberBalance(memberId)` Algorithm

This server-side function is the heart of the application. It must be executed with atomic precision.

1. **Timeline Filtering**: Generate a sequence of months from `join_date` to `current_date`. Exclude any months found in `BlackoutMonths`.
2. **Theoretical Debt**:
* Iterate through each "Active Month".
* Lookup the `monthly_fee` applicable for that period (Member profile data).
* `Sum(monthly_fee)` = **Total_Debt**.


3. **Realized Income**:
* `Sum(amount)` for all member contributions where `status = VALIDATED`.


4. **10/12 Prorated Allocation**:
* For each validated contribution:
* `Operating_Fund_Part = amount * (2/12)`
* `Savings_Part = amount * (10/12)`


* Aggregate results to get **Total_Savings** and **Total_Operating_Contributed**.


5. **Status Check**:
* `Arrears = Total_Debt - Total_Validated`.
* `Unpaid_Months = Arrears / current_monthly_fee`.
* If `Unpaid_Months >= 24`, trigger `status = INACTIVE`.



### 4.2 Global Treasury Logic

* **Total Operating Cash** = `Sum(Total_Operating_Contributed) - Sum(EB_Expenses)`.
* **Member Available Balance** = `Total_Savings - Sum(Member_Investments)`.

---

## 5. Security & Access Control

* **RBAC (Role-Based Access Control)**:
* `MEMBER`: Read-only access to personal dashboard and published reports.
  * `SG` / `SG_ADJOINT`: Write access to `Members` and `GAs` + Settings.
  * `TREASURER` / `TRESORIER_ADJOINT`: Write access to `Contributions` (Validation) and `Expenses` + Settings.
  * `PRESIDENT`: Full access — inherits all SG and TREASURER rights (`PRESIDENT` = SG + TREASURER).


* **Audit Middleware**: Every `POST`, `PUT`, or `DELETE` request from an EB member must be intercepted by a logging service to populate the `AuditLogs` table.
* **Input Validation**: Strict Zod schema validation for all payment references and Excel imports to prevent SQL injection or data corruption.

## 6. Infrastructure & Deployment

* **Environment**: Vercel (Production) with GitHub Integration.
* **CI/CD**: Automated testing on every Pull Request (Unit tests for the calculation engine).
* **Database Backup**: Automated daily snapshots via Supabase to ensure no financial data loss.
* **Notifications**: Integration with an SMS/Email gateway for account activation and payment validation alerts.

---