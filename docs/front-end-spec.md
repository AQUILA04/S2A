
---

# 🎨 Frontend UI/UX Specification: Amicale S2A

**Status:** Final (MVP)

**Author:** Lila (UX/UI Designer)

**Date:** March 2, 2026

**Version:** 1.0

---

## 1. Design Philosophy

The Amicale S2A interface is built on the **Mobile-First** principle. Since members primarily interact via smartphones, the design prioritizes thumb-friendly navigation, high readability, and immediate visual feedback on financial health.

* **Clarity:** Financial figures (Arrears, Balances) are the most prominent elements.
* **Trust:** Professional color palette and explicit confirmation states for all money-related actions.
* **Accessibility:** Large touch targets (min 44x44px) and high-contrast text.

---

## 2. Style Guide & Visual Identity

### 2.1 Color Palette

| Purpose | Hex Code | Visual Representation |
| --- | --- | --- |
| **Primary (Trust)** | `#002366` | Royal Navy Blue (Brand & Navigation) |
| **Secondary (Wealth)** | `#D4AF37` | Metallic Gold (Available Balances & Investments) |
| **Success** | `#28A745` | Green (Paid months, Validated status) |
| **Alert/Arrears** | `#DC3545` | Red (Debt, Inactive status, Rejected payments) |
| **Neutral/Blackout** | `#E9ECEF` | Light Grey (Disabled months/Blackout periods) |

### 2.2 Typography

* **Primary Font:** `Inter` or `Roboto` (Sans-serif).
* **Heading:** Bold, Navy Blue, 20px-24px.
* **Body:** Regular, Dark Grey (`#333333`), 16px.
* **KPI Figures:** Monospace or Semibold, 28px+ for visibility.

---

## 3. Information Architecture (Sitemap)

### 3.1 Public/Auth Flow

* **Login Screen:** Email/Phone + Password.
* **Password Setup:** Onboarding screen for new members via unique link.

### 3.2 Member Space (Mobile Primary)

* **Dashboard:** Financial Overview (The 3 Counters).
* **Contribution History:** List of payments and monthly status grid.
* **Payment Entry:** Step-by-step wizard to declare a payment.
* **GA Archives:** List of General Assemblies and downloadable reports.

### 3.3 Executive Board (EB) Space

* **EB Overview:** Summary of total treasury and pending validations.
* **Validation Console:** Queue of member payment declarations.
* **Member Management:** CRUD operations on members + Status toggles.
* **Admin Settings:** Global calendar (Blackout months) and Payment channels setup.

---

## 4. Screen Specifications (Detailed)

### 4.1 Member Dashboard (The 3 Circular Counters)

The main screen features a "Wealth Header" with three distinct circular progress or card-based counters:

1. **Total Paid:** Aggregated sum of all validated payments (Navy Blue).
2. **Operating Fees (2/12):** The portion allocated to the association (Dark Grey).
3. **Available Balance (10/12):** The net amount minus investments (Gold Highlight).

* **Arrears Banner:** A persistent red/orange bar at the top if `Arrears > 0`.
* **Inactive Alert:** If status is `INACTIVE`, the entire dashboard turns grayscale with a prominent "Action Required: Pay Arrears" button.

### 4.2 Contribution Payment Wizard (Step-by-Step)

1. **Select Channel:** Grid of icons (Flooz, Bank, Western Union, Cash).
2. **Payment Info:** Displays the specific account/number.
* *UX Pattern:* **"Copy to Clipboard"** floating button next to every number.


3. **Confirmation:** Text field for "Transaction Reference".
4. **Pending State:** Visual feedback showing "Payment Under Review" with a summary of the reference entered.

### 4.3 Interactive Contribution Calendar

A month-by-month grid view since `join_date`:

* **Green Tile:** Paid & Validated.
* **Red Tile:** Unpaid/Arrears (Active month).
* **Grey Strikethrough:** **Blackout Month** (e.g., COVID period). Tapping shows an info tooltip: *"Activities suspended by Board decision."*

### 4.4 Validation Console (EB View)

* **List Item:** Member Name | Amount | Channel | Reference ID.
* **Action Drawer:** Tapping an item slides up a panel.
* *Left:* Reference ID (Large, copyable).
* *Center:* "Approve" (Green) / "Reject" (Red).
* *Rejection Logic:* If "Reject" is clicked, a mandatory "Reason" dropdown appears.



---

## 5. Interaction Patterns & Feedback

* **Pull-to-Refresh:** Standard on all financial lists to update balance status.
* **Loading States:** Shimmer/Skeleton effects for counters while `getMemberBalance` is computing.
* **Audit Feedback:** When an EB member changes a setting, a "Changes Saved & Logged" toast notification appears.
* **Responsive Breakpoints:**
* `< 768px`: Tab-bar navigation at the bottom.
* `> 768px`: Sidebar navigation for Board management.



---
