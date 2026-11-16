# Poddar International College — Finance & Accounts Enterprise Portal
## Complete System Feature Specification & Operational Working Document

**Document Version:** 2.4.0 (Production Enterprise Edition)  
**Institution:** Poddar International College, Sector 7, Mansarovar, Jaipur, Rajasthan  
**Target Audience:** Institutional Management, Governing Council, Financial Auditors, Accounts Division, HR Directorate  
**Architecture:** Next.js 16 (App Router), React 19, TypeScript, LocalStorage Offline-First Engine, Strict Integer-Paise Financial Kernel

---

## Executive Summary & Core Platform Architecture

The **Poddar International College Finance & Accounts Portal** is an institutional-grade Enterprise Resource Planning (ERP) suite engineered specifically for collegiate financial administration, statutory taxation, student revenue cycles, human resource compensation, expenditure auditing, and board-level governance.

### Architectural Hallmarks:
1. **Strict Integer-Paise Arithmetic Engine:**  
   To prevent binary floating-point rounding errors common in commercial software (e.g., `0.1 + 0.2 !== 0.3`), all ledger records, fee installments, statutory withholdings, and budgets are tracked internally as **exact integer paise** (`₹1.00 = 100 paise`). Currency values are converted to rupees only at the formatting layer using Indian numbering format (`en-IN`: `₹12,45,000`).
2. **Immutable Maker-Checker & Separation of Duties (RBAC):**  
   Financial records follow strict dual-custody governance. A user who creates a voucher, bill, or payroll entry cannot approve it. Designated approval tiers (HOD, HR Admin, Accounts Admin, Director, Governing Board) review and sign off requests with tamper-evident audit stamps.
3. **Standalone Offline-First Client Architecture:**  
   The system runs completely client-side with zero external database dependencies. State is reactively hydrated from structured local persistence (`localStorage`), offering instant responsiveness, automatic schema migrations, and full workspace data isolation.
4. **Direct PDF & CSV Generation Engine:**  
   Custom binary PDF generators build formal student fee receipts, salary slips, PO requisitions, and sanction letters directly in the browser—independent of third-party print servers or internet connectivity.

---

## Global Navigation & Topbar Control Center

Located at the top of every portal screen, the Topbar provides administrative control and situational awareness:

- **Institutional Identity & Campus Badge:** Displays *Poddar Group of Institutions (College Edition)* and official Mansarovar campus credentials.
- **Active Financial Year Indicator:** Locks operations to **FY 2026-27** (April 1 to March 31) with fiscal period closing protections.
- **System Date & Demo Date Override:** Shows current calendar date with quick simulation switches to test month-end payroll or overdue fee penalties.
- **Live Approval Notification Pill:** Displays real-time badge count of pending actions requiring the active persona's sign-off.
- **Active Persona / Role Switcher:** Dropdown menu allowing administrators to instantly switch between institutional personas to test workflows:
  - *Super Admin*
  - *Management / Governing Board*
  - *Director*
  - *Accounts Admin*
  - *Accountant*
  - *Cashier*
  - *HR Admin*
  - *Head of Department (HOD)*
- **Security Indicator & Audit Log Shortcut:** Quick-access link to institutional system logs.

---

## Detailed Sidebar Modules & Functional Breakdown

---

### Module 1: Dashboard (`/finance/dashboard`)
**Category:** OVERVIEW  
**Primary Purpose:** Executive financial cockpit providing real-time liquidity analysis, revenue velocity, pending exposure, and institutional burn rate.

#### What Happens Inside:
1. **Executive KPI Cards:**
   - **Total Annual Collections:** Cumulative revenue collected across tuition, examination, admission, and library heads.
   - **Fee Dues Outstanding:** Real-time unpaid dues segregated by tuition vs bus/hostel fees.
   - **Monthly Payroll Commitment:** Total gross salary and net take-home liability for the active period.
   - **Operating Expense Burn:** Disbursed OpEx bills and committed procurement purchase orders.
2. **Institutional Cash & Bank Liquidity:** Live balance breakdowns across designated institutional bank accounts (SBI Current, HDFC Fee Collection, ICICI Operations) and petty cash imprest.
3. **Collections vs Expense Velocity Chart:** Interactive timeline comparing monthly fee inflow versus statutory payroll and vendor outflows.
4. **Urgent Operational Action Queue:** High-priority cards alerting admins to pending fee bounce disputes, un-reconciled NEFT receipts, and purchase orders awaiting Director sign-off.
5. **Fee Collection Head Composition:** Visual breakdown of tuition fees, lab fees, development funds, sports, and annual activities.

---

### Module 2: Approval Inbox (`/finance/approvals`)
**Category:** OVERVIEW  
**Primary Purpose:** Centralized multi-tier clearance hub for all institutional expense bills, payroll rolls, procurement purchase orders, and scholarship disbursements.

#### What Happens Inside:
1. **Unified Filter Tabs:**
   - `All Items` (Consolidated queue)
   - `Vendor OpEx Bills` (Utility, consumable, IT bills)
   - `Purchase Orders` (Equipment and procurement POs)
   - `Payroll & Salaries` (Monthly staff compensation batches)
   - `Scholarships` (Merit-cum-means waivers and concessions)
2. **Smart Role-Assigned Queue:** Only items matching the logged-in persona's clearance authority are surfaced (e.g., HOD sees departmental payroll; Director sees POs > ₹50,000).
3. **Maker-Checker Security Lock:** If the logged-in user created the record, the "Approve" button is disabled with an explanatory tooltip, barring self-approval.
4. **Single-Click Direct Sanction:** 
   - When an HOD reviews a salary slip, clicking **Approve** directly finalizes and sanctions the record as `Approved` without unnecessary escalation.
   - Director approval for POs instantly flags them ready for vendor issuance.
5. **Return / Reject with Remarks:** Reviewers can reject an item with mandatory written remarks, sending it back to the submitter's draft state.

---

### Module 3: Fees & Collections (`/finance/fees`)
**Category:** REVENUE & FEES  
**Primary Purpose:** Student fee management, installment tracking, counter fee collection, online UPI QR generation, and tamper-proof receipt generation.

#### What Happens Inside:
1. **Student Fee Roster Table:**
   - Student Scholar ID (e.g., `PIC26001`), Student Name, Course & Semester (BCA, BBA, B.Com, M.Sc).
   - Total Committed Course Fee, Amount Paid Till Date, and Due Remaining.
   - Ledger Status: `Fully Paid`, `Partially Paid`, `Overdue`, `Scholarship Adjusted`.
2. **"Record a Student Payment" Dialog:**
   - **Student Selector & Ledger Card:** Displays total outstanding and installment breakdown.
   - **Quick Fill Chips:** One-click `Fully Paid (₹46,250)` and `Due Now (₹7,250)` chips to eliminate manual typing.
   - **Dynamic Real-Time UPI QR Code:** Generates an NPCI-compliant UPI QR code on-the-fly (`upi://pay?pa=...&am=...`) encoding the exact payable amount and student Scholar ID. Parents/students can scan directly via Google Pay, PhonePe, Paytm, or BHIM.
   - **Payment Modes:** UPI QR, NetBanking/NEFT, Cheque/Demand Draft, Cash Counter.
   - **UTR / Bank Reference Validation:** Checks across historical records to strictly prevent duplicate UTR entries.
   - **Remaining Balance Live Preview:** Calculates balance remaining after payment.
3. **Instant Official Fee Receipt PDF:**
   - Emits a formal college receipt with college crest, receipt number, date, payment mode, UTR, breakdown of tuition, development, and caution funds, and digital accounts seal.

---

### Module 4: Defaulters & Dues (`/finance/dues`)
**Category:** REVENUE & FEES  
**Primary Purpose:** Tracking overdue student fee aging, managing penalty late-fee policies, logging communication attempts, and dispatching multi-channel reminders.

#### What Happens Inside:
1. **Aging Bucket Analytics:**
   - 1–15 Days Overdue (Grace window)
   - 16–30 Days Overdue (Moderate notice)
   - 31–60 Days Overdue (Urgent notice)
   - 60+ Days Overdue (Examination hall ticket withholding warning)
2. **Configurable Late Fee Penalty Rules:**
   - Flat daily late fee (e.g., ₹50/day) or weekly percentage surcharge.
   - Automatic late fee exemption waivers for pre-authorized scholarship students.
3. **Multi-Channel Reminder Dispatcher:**
   - Triggers simulated SMS, Institutional Email, and WhatsApp payment link notifications.
   - Automatically stops reminders once full fee settlement occurs.
4. **Follow-Up Communication Log:**
   - Accounts officers log parent tele-calling notes (e.g., *"Parent promised payment via NEFT on 25th Nov"*).

---

### Module 5: Scholarships & Concessions (`/finance/scholarships`)
**Category:** REVENUE & FEES  
**Primary Purpose:** Management of government scholarship credits, merit concessions, sports quotas, and discretionary management fee waivers.

#### What Happens Inside:
1. **Scholarship Register:**
   - Schemes: *Merit-Cum-Means*, *Rajasthan Samaj Kalyan Vibhag (SC/ST/OBC Post-Matric)*, *Poddar Girl Child Concession*, *National Sports Quota*.
   - Sanction Letter Reference, Student ID, Sanctioned Amount, and Disbursement Status.
2. **Automated Ledger Adjustment:**
   - Once approved by Director / Management, the scholarship credit is automatically offset against the student's tuition fee ledger, reducing net dues.
3. **Sanction Letter Download:**
   - Generates an official Institutional Scholarship Sanction Document suitable for student submission to government welfare portals.

---

### Module 6: Other Institutional Income (`/finance/income`)
**Category:** REVENUE & FEES  
**Primary Purpose:** Non-tuition auxiliary institutional revenue auditing and cash register.

#### What Happens Inside:
1. **Income Heads:**
   - Campus Cafeteria / Canteen License Fees
   - Auditorium & Conference Hall Rental
   - Examination & Back-paper Re-evaluation Fees
   - Prospectus & Application Sale Counter
   - Bus & Student Transportation Subscriptions
2. **GST Applicability Toggle:** Categorizes income into exempt educational services versus GST-taxable commercial hall leases (18% GST calculation).
3. **Bank Credit Mapping:** Maps proceeds directly to institutional bank accounts with voucher numbers.

---

### Module 7: Payroll & Salaries (`/finance/payroll`)
**Category:** HUMAN RESOURCES  
**Primary Purpose:** Monthly faculty compensation, loss of pay (LOP) deductions, statutory EPF/ESI compliance, bank bulk NEFT batch generation, and PDF payslips.

#### What Happens Inside:
1. **Multi-Tier Approval Pipeline Tracker:**
   - Visual 7-stage pipeline: `Draft Computed` → `HOD Verified` → `HR Checked` → `Accounts Audited` → `Director Approved` → `Paid (Disbursed)`.
2. **"Compute Month Drafts" Engine:**
   - Batch-processes all active faculty and staff for the selected month using configured daily divisor rules (`30-Day Calendar`, `Calendar Month Days`, or `26 Working Days`).
3. **"Add Individual Payroll Entry" Modal:**
   - Allows manual generation or correction of a salary slip for any employee.
   - Pre-fills Basic, HRA, DA, Special Allowance, and Conveyance from employee master.
   - Working days, Present days, Paid leave, and Unpaid leave (LOP) inputs with instant auto-calculation of LOP deductions.
   - Statutory PF (Employee & Employer), ESI, TDS (Income tax), and Loan recovery fields.
   - Real-time **Net Take-Home Salary Card**.
4. **Direct HOD Approval:**
   - HOD can directly approve departmental salary slips on single click, marking them `Approved`.
5. **Bank NEFT Bulk Transfer Export:**
   - Generates bank-compliant bulk CSV disbursement files formatted for SBI Corporate NetBanking, HDFC E-Net, and ICICI CMS.
6. **Download Official PDF Payslips:**
   - Generates comprehensive payslips with institutional header, PAN, UAN, PF number, attendance breakdown, gross earnings, statutory deductions, and digital authorized signature.

---

### Module 8: Guest Faculty (`/finance/guest-faculty`)
**Category:** HUMAN RESOURCES  
**Primary Purpose:** Tracking visiting professors, guest lecturers, hourly lecture remuneration, and Section 194J TDS compliance.

#### What Happens Inside:
1. **Lecture Remuneration Register:**
   - Faculty Name, Specialized Topic, Course Code, Lecture Date, and Duration in Hours.
   - Hourly Honorarium Rate (e.g., ₹1,500/hour) and Gross Remuneration.
2. **Section 194J Statutory TDS Withholding:**
   - Automatically computes 10% or 2% professional TDS deduction based on PAN presence.
3. **HOD Verification & Disbursement:**
   - HOD signs off lecture completion before payment voucher creation.

---

### Module 9: Employee Directory (`/finance/employees`)
**Category:** HUMAN RESOURCES  
**Primary Purpose:** Central staff master, designations, CTC cost-to-company structures, banking details, and sensitive PII masking.

#### What Happens Inside:
1. **Staff Master Roster:**
   - Faculty ID (e.g., `EMP001`), Full Name, Designation, Department, Category (*Teaching*, *Non-Teaching*, *Administration*, *Support*), Employment Type (*Permanent*, *Probationary*, *Contractual*).
2. **Sensitive PII Masking Security:**
   - Permanent Account Numbers (PAN), Bank Account Numbers, and Base CTC amounts are automatically masked (e.g., `•••• 4102`, `ABCDE••••F`) based on role permissions to preserve data privacy.
3. **"Enroll Staff Member" Modal:**
   - Validates 10-digit PAN checksum (`/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`) and 11-character bank IFSC code.
   - **Dynamic Department Dropdown:** Automatically reads and lists all active college departments with an inline `+ Manage Depts` shortcut.
   - Configures base salary, allowances, statutory EPF eligibility, and ESI coverage.

---

### Module 10: Operating Expenses (`/finance/expenses`)
**Category:** EXPENDITURE  
**Primary Purpose:** Operational expense (OpEx) bills, vendor invoice processing, TDS section selection (194C, 194J, 194I), and GST input tax credit (ITC).

#### What Happens Inside:
1. **Expense Invoices Table:**
   - Bill Number, Vendor Name, Department Scope, Invoice Date, Due Date, Base Amount, GST Rate, Total Amount, TDS Deduction, Net Payable, and Payment Status (`Submitted`, `Approved`, `Paid`, `On Hold`).
2. **Add Bill Dialog:**
   - Vendor auto-fill with pre-registered GSTIN and PAN.
   - Standard GST slabs: 0%, 5%, 12%, 18%, 28%.
   - TDS Sections: 194C (Contractors), 194J (Professional / IT), 194I (Rent & Property).
3. **Audit Validation Checks:**
   - Blocks payment if invoice due date is expired or if bill lacks dual-approval sign-off.

---

### Module 11: Purchase Orders (`/finance/purchase-orders`)
**Category:** EXPENDITURE  
**Primary Purpose:** Formal institutional procurement requisitions, equipment purchases, capital commitments, and purchase order tracking.

#### What Happens Inside:
1. **Purchase Orders (PO) Register:**
   - PO Number (e.g., `PO-2026-081`), Vendor Name, Item Category (*IT Hardware*, *Lab Consumables*, *Library Books*, *Furniture*), Total Commitment, Approver Tier, Delivery Terms, and PO Status.
2. **"Raise Purchase Order" Modal:**
   - Itemized line-item entry with unit prices, quantities, and GST rates.
   - Automatic calculation of subtotal, tax, and total PO liability.
3. **Official Purchase Order PDF Generation:**
   - Generates a branded, printable purchase order document with delivery address, GSTIN, payment terms, and Director authorization box.

---

### Module 12: Fixed Asset Register (`/finance/assets`)
**Category:** EXPENDITURE  
**Primary Purpose:** Institutional capital asset tracking, asset tagging, location tagging, and annual depreciation scheduling.

#### What Happens Inside:
1. **Asset Register Table:**
   - Asset Tag (e.g., `AST-LAB-014`), Description (e.g., *HP Computer Systems - Lab 3*), Department, Purchase Date, Original Capital Cost, Accumulated Depreciation, and Net Book Value (NBV).
2. **Depreciation Computation Engine:**
   - Supports **Straight Line Method (SLM)** and **Written Down Value (WDV)** in compliance with Income Tax Act rules.
3. **Annual Asset Audit & Disposal:**
   - Flags asset condition (*Operational*, *Under Repair*, *Scrapped / Written Off*).

---

### Module 13: Vendor Directory (`/finance/vendors`)
**Category:** EXPENDITURE  
**Primary Purpose:** Authorized supplier and contractor master, compliance tracking, and credit terms.

#### What Happens Inside:
1. **Vendor Master Table:**
   - Vendor ID, Firm Name, Contact Person, Phone, Email, Business Category (*IT & Hardware*, *Stationery*, *Security*, *Lab Equipment*), 15-digit GSTIN, 10-digit PAN, IFSC code, and Credit Period (Days).
2. **GSTIN & PAN Verification:**
   - Validates Indian GSTIN format (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`) to guarantee GST compliance.
3. **Vendor Payment Ledger:**
   - Tracks total billed invoices versus cumulative disbursements and outstanding liabilities.

---

### Module 14: Petty Cash / Imprest (`/finance/petty-cash`)
**Category:** EXPENDITURE  
**Primary Purpose:** Day-to-day minor campus operational expenses, petty cash custodian balance, and reimbursement claims.

#### What Happens Inside:
1. **Imprest Account Monitoring:**
   - Tracks fixed floating limit (e.g., ₹25,000 ceiling held with Cashier/Estate Officer).
2. **Petty Cash Vouchers:**
   - Logs small-ticket payments: postage, local dispatch, emergency stationery, guest refreshments, driver toll slips.
3. **Replenishment Cycle:**
   - Once available cash drops below safety threshold, system prompts Accounts Admin to approve a replenishment cheque, restoring the full imprest pool.

---

### Module 15: Department Budgets (`/finance/budgets`)
**Category:** EXPENDITURE  
**Primary Purpose:** Academic and administrative budget allocations, burn rate monitoring, and variance alerts.

#### What Happens Inside:
1. **Annual Budget Matrix:**
   - Department, Fiscal Allocation, Utilized to Date, Committed in Active POs, and Remaining Unspent Balance.
2. **Budget Utilization Bar:**
   - Color-coded progress meters (Green < 70%, Gold 70–90%, Red > 90%).
3. **Ceiling Overrun Lock:**
   - Alerts Accounts Admin when an expense requisition exceeds a department's unspent budget envelope.

---

### Module 16: Campus Events (`/finance/events`)
**Category:** OPERATIONS & CASH  
**Primary Purpose:** Budgeting and revenue tracking for college festivals, academic seminars, sports tournaments, and conferences.

#### What Happens Inside:
1. **Events Financial Ledger:**
   - Event Name (e.g., *Manthan Inter-College Fest 2026*, *National Pharmacy Symposium*), Sanctioned Budget, Corporate Sponsorship Inflow, Delegate Registration Fees, and Disbursed Event Costs.
2. **Net Event Surplus / Deficit Analysis:**
   - Automatically computes net institutional financial outcome per event.

---

### Module 17: Cash & Bank Book (`/finance/cashbook`)
**Category:** OPERATIONS & CASH  
**Primary Purpose:** Real-time ledger of institutional bank accounts, cash counter collections, and contra bank deposits.

#### What Happens Inside:
1. **Bank Accounts Overview:**
   - *SBI Main Operations Account*
   - *HDFC Student Fee Collection Pool*
   - *ICICI Scholarship & Grant Account*
   - *Campus Cash Safe / Counter Vault*
2. **Transaction Ledger:**
   - Chronological register of all credits (fee inflows, sponsorships) and debits (payroll, bills, vendor transfers).
3. **Contra Entries:**
   - Logs physical cash collected at counter and deposited into bank accounts with bank challan numbers.

---

### Module 18: Accounting & General Ledgers (`/finance/accounting`)
**Category:** OPERATIONS & CASH  
**Primary Purpose:** Institutional double-entry bookkeeping, Chart of Accounts (COA), and Journal Vouchers.

#### What Happens Inside:
1. **Chart of Accounts (COA) Hierarchy:**
   - Standard 4-digit Account Heads organized into **Assets**, **Liabilities**, **Equity/Reserves**, **Revenue**, and **Expenses**.
2. **Double-Entry Journal Voucher (JV) Creation:**
   - Enforces strict mathematical balance: **Total Debits MUST equal Total Credits** (`Σ Dr === Σ Cr`) before saving is permitted.
3. **General Ledger Drill-Down:**
   - Allows accountants to view running balances and narration remarks for any specific account head.

---

### Module 19: Financial Reports (`/finance/reports`)
**Category:** OPERATIONS & CASH  
**Primary Purpose:** Institutional financial statements, audit schedules, statutory tax summaries, and aging analysis.

#### What Happens Inside:
1. **Institutional Balance Sheet:**
   - Assets (Cash, Bank balances, Fixed Assets net of depreciation, Uncollected fee dues) versus Liabilities & Reserve Funds.
2. **Income & Expenditure Statement:**
   - Compares total academic and auxiliary revenue against operational, statutory, and administrative costs to show operating surplus/deficit.
3. **Trial Balance:**
   - Comprehensive multi-column trial balance showing opening, debit movements, credit movements, and closing balances for all account heads.
4. **Statutory Tax Schedules:**
   - TDS Withholding Returns schedule (Sections 192, 194C, 194J, 194I) with deductee PAN numbers.
5. **CSV & PDF Report Export:**
   - One-click sanitized CSV exports (protected against CSV formula injection attacks) and printable audit reports.

---

### Module 20: Audit Trail (`/finance/audit`)
**Category:** GOVERNANCE  
**Primary Purpose:** Immutable regulatory compliance event log recording every single administrative action taken in the portal.

#### What Happens Inside:
1. **Tamper-Evident Event Log:**
   - Every transaction creation, status transition, fee waiver, payment bounce, role switch, and record deletion generates an audit log entry.
2. **Logged Parameters:**
   - ISO 8601 Timestamp, Actor Persona / Role, Action Type (`CREATE`, `UPDATE`, `APPROVE`, `VOID`, `ROLE_SWITCH`), Entity ID, and Detailed Narration Remarks.
3. **Search & Audit Filter:**
   - Auditors can search by entity ID (e.g., `PIC26001`, `EMP004`) to inspect the entire history of any student or employee file.

---

### Module 21: Department Master (`/finance/departments`)
**Category:** GOVERNANCE  
**Primary Purpose:** Comprehensive institutional department register, Head of Department (HOD) assignments, student enrollment capacity, staff allocation, and annual budget ceilings.

#### What Happens Inside:
1. **Department KPI Summary Cards:**
   - Total Active Departments
   - Total Faculty & Staff Strength
   - Total Students Enrolled
   - Cumulative Institutional Operating Budget Ceiling
2. **Search & Category Filtering:**
   - Instant live search by department name, code, or HOD name.
   - Filter by categories: *Teaching / Academic*, *Administrative*, *Campus Operations*, *Student Support*.
3. **Responsive Horizontal Scrolling Table:**
   - Engineered with a dedicated horizontal scroll container (`overflowX: 'auto'`, `minWidth: '1080px'`, `nowrap`) ensuring complete visibility of all 9 columns on all desktop, laptop, and tablet displays:
     - `Code` (e.g., `CSIT`, `HR`, `MGMT`, `LAW`)
     - `Department Name`
     - `Category` badge
     - `Head of Dept (HOD)` and Institutional Email
     - `Staff Count`
     - `Student Strength`
     - `Annual Operating Budget (₹ INR)`
     - `Operating Status` (`Active` / `Inactive`)
     - `Actions` (Edit / Delete)
4. **"Add Department" Modal Dialog:**
   - Form fields: Department Code, Department Name, Category, HOD Name, HOD Institutional Email, Staff Strength, Student Strength, Annual Budget in INR, and Status.
   - Validates code uniqueness and immediately synchronizes new departments across the portal (including the Employee registration modal).
5. **Pre-Seeded Institutional Wings:**
   - Includes official academic faculties (*Computer Science & IT*, *Management*, *Commerce*, *Sciences*, *Pharmacy*, *Arts & Humanities*) along with executive governance wings:
     - **Human Resources & Personnel Admin (`HR`)** — HOD: Dr. Neha Agarwal
     - **Institutional Management & Governing Board (`MGMT`)** — HOD: Dr. Anand Poddar (Chairman)
     - **Office of Deans & HOD Academic Council (`HOD`)** — HOD: Prof. M.L. Meena

---

### Module 22: System Settings (`/finance/settings`)
**Category:** GOVERNANCE  
**Primary Purpose:** Statutory contribution rate management, daily divisor policies, data backup, and system reset controls.

#### What Happens Inside:
1. **Statutory Contribution Rates:**
   - Employee Provident Fund (EPF) Employee Rate (12%) & Employer Rate (12%).
   - Employees' State Insurance (ESI) Employee Rate (0.75%), Employer Rate (3.25%), and Gross Ceiling (₹21,000/month).
2. **Daily Divisor Policy Selector:**
   - Configure how Loss of Pay (LOP) is calculated:
     - *Fixed 30 Days* (Standard corporate)
     - *Actual Calendar Days in Month* (28, 29, 30, or 31 days)
     - *26 Working Days* (Factory/labor model)
3. **Data Backup & Restore:**
   - One-click JSON backup export of all portal state (students, fee payments, payroll, bills, POs, departments, audit logs).
   - JSON file restore with schema validation to restore institutional state across different devices.
4. **Reset Demo Data:**
   - Restores the portal to pristine seed data for institutional demonstration purposes.

---

## Security, Compliance & Role-Based Access Matrix (RBAC)

The portal implements an enterprise RBAC + ABAC authorization engine enforcing separation of duties:

| Institutional Role | Fees & Collections | OpEx Bills | PO Creation | PO Approval | Payroll Calculation | Payroll Approval | Department Master | System Settings |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin** | Full | Full | Full | Yes | Full | Full | Full | Full |
| **Management** | Read | View | Read | Yes | Read | Yes | Full | Full |
| **Director** | Read | View | Read | Yes (>₹50k) | Read | Yes | Read | Read |
| **Accounts Admin** | Full | Full | Create | Yes (<₹50k) | Full | Yes | Full | Full |
| **Accountant** | Full | Create | Create | No | Compute | No | Read | Read |
| **Cashier** | Collect Only | View | No | No | View | No | Read | No |
| **HR Admin** | Read | No | No | No | Full | Verify | Read | Read |
| **HOD** | Read Dept | Dept Only | Dept Req | No | View Dept | **Direct Approve** | Read | No |

---

## Summary for Institutional Client Presentation

The Poddar International College Finance & Accounts Portal provides complete financial transparency, airtight statutory compliance, and operational efficiency across all college activities. Every sidebar option is fully functional, styled with institutional luxury aesthetics, backed by exact mathematical precision, and ready for immediate deployment.
