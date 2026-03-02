
---

# 📂 Project Brief: Amicale S2A Management Platform

**Status:** Final (MVP)

**Author:** Mary (Business Analyst)

**Date:** March 2, 2026

**Version:** 1.0

---

## 1. Executive Summary

The **Amicale S2A** (Sagesse Ahonsou et Alliés) is a family association established in 2016. As the organization grows, managing monthly contributions, historical arrears, and project investments manually has become unsustainable. This project aims to deliver a **Mobile-First Web Application** to automate financial tracking, ensure transparency for all members, and provide a secure administrative suite for the Executive Board (EB).

## 2. Problem Statement

* **Historical Complexity:** Manually calculating arrears since 2016 while accounting for specific "Blackout Months" (e.g., COVID-19 suspension) is prone to human error.
* **Lack of Transparency:** Members cannot view their real-time financial status, available savings, or investment history without contacting the Treasurer.
* **Administrative Burden:** The Treasurer and President spend significant time validating payments across multiple channels (Mobile Money, Bank Transfers, Cash) and generating financial reports.
* **Document Fragmentation:** GA reports (Moral, Financial, Activity) are scattered across different media, making them hard for members to access.

## 3. Proposed Solution

A centralized digital platform where:

* **Members** can declare payments, view their specific "10/12" balance, and track their investments.
* **The Board** can manage the registry, configure the global contribution calendar, validate transactions with an audit trail, and publish official documents.
* **Automation** handles the calculation of arrears and switches delinquent members (24+ months of debt) to "Inactive" status automatically.

## 4. Target Audience

| Role | Primary Responsibility |
| --- | --- |
| **President** | Oversight, GA creation, moral reports, and high-level financial validation/investments. |
| **Secretary (SG)** | Member registry management, account activation, and activity reports. |
| **Treasurer** | Payment validation, legacy data import (Excel), and financial reporting. |
| **Members** | Monthly contributions, balance tracking, and project investment. |

## 5. Goals & Success Metrics

* **100% Financial Visibility:** Every member must be able to see their "Total Paid" vs. "Available Balance" at all times.
* **Auditability:** 100% of administrative actions (validations, registry changes) must be logged for internal review.
* **Operational Efficiency:** Reduce the time needed to reconcile monthly payments by at least 50% via the centralized Validation Console.
* **Data Integrity:** Successful migration of all contribution data from 2016 to the present via the Bulk Import tool.

## 6. MVP Scope (Features)

### 6.1 Must-Have (In-Scope)

* **Historical Contribution Engine:** Support for varying monthly fees and debt calculation since 2016.
* **The 10/12 Solidarity Logic:** Automated split: 2 months for operations / 10 months for member savings.
* **Dynamic Calendar:** Global toggle for "Blackout Months" where no debt is accrued.
* **Multi-Channel Payment Flow:** Manual declaration with Reference IDs for Bank, Flooz, Mixx, and International transfers.
* **Direct/Cash Entry:** Immediate recording of physical payments by the Board.
* **Automatic Status Management:** Inactive status trigger for members with 24+ months of arrears.
* **GA Document Center:** Digital archive for Moral, Financial, and Activity reports.
* **EB Audit Trail:** A secure log of "Who did what and when."

### 6.2 Nice-to-Have (Out-of-Scope for V1)

* Automated Bank/Mobile Money API integration (Instant validation).
* Push notifications (SMS/Email) for every transaction (V1 will use in-app status and manual link distribution).
* In-app voting system for EB elections.

## 7. Technical Considerations

* **Mobile-First Responsive Web:** Optimized for smartphone browsers.
* **Secure Onboarding:** Password configuration via secure unique links.
* **Reliable Core Logic:** Server-side calculation of balances to ensure "Single Source of Truth."
* **Role-Based Access (RBAC):** Strict separation between Member views and Board administrative tools.

## 8. Risks & Mitigations

* **Data Accuracy:** Importing data since 2016 from manual records may contain errors. *Mitigation:* The Treasurer will have a "Preview" mode during Excel imports to verify data before final commit.
* **Manual Validation Bottleneck:** If the Board is slow to validate, members may see "Pending" status for too long. *Mitigation:* System alerts for the EB to highlight pending validations.
* **Security:** Sensitive financial and personal data. *Mitigation:* Implementation of an internal Audit Trail visible to the Board to prevent internal fraud or errors.

---
