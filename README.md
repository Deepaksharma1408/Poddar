# Poddar Connect — Next.js school management prototype

Run `npm install`, then `npm run dev`. Open http://localhost:3000. Production validation: `npm run build`; run with `npm start`.

## Android / iPhone responsive layouts

The interface adapts to narrow phones, larger phones, tablets and landscape layouts. Mobile fee, student, leave and payroll tables become labeled cards. Detailed installment schedules and other wide school records stay in contained, keyboard-focusable swipe regions. The mobile menu locks background scrolling, isolates background controls, traps keyboard focus and restores focus when dismissed. Menu and dialog close controls stay available while their panels scroll.

Forms use stacked layouts, at least 16px input text to avoid iOS focus zoom, and larger touch controls. Layouts account for safe-area insets, dynamic viewport height, shorter keyboard-sized viewports, reduced motion and device rotation. Pinch zoom remains enabled.

Verification: all 12 screens checked for page-level overflow at requested widths of 320, 390, 768 and 1024px. Dashboard additionally checked at 360, 375, 412, 430, 820, 844 and 1440px. Payment dialogs checked at 320×568, 390×844, 430×932, 844×390 and 360×400; teacher leave and EMI forms also inspected on mobile. Results are in `responsive-qa.json`; `public/mobile-preview.png` contains a phone viewport screenshot. These are Chromium viewport simulations, not physical Android/iPhone or native Safari tests. Modern Safari/Chrome are the intended mobile browsers.

## Included workflows

- Premium navy-and-gold campus dashboard, editorial typography and a live financial collection view.
- Searchable student directory, admissions and direct links to individual student fee accounts.
- Per-student annual fee commitments, verified paid totals, due-now amounts, future dues and total remaining balances.
- Student-specific EMI, quarterly and full-payment plans; preferred payment method configured independently.
- Flat and reducing-balance interest, down payments, zero interest, paise-level schedule calculations and final-installment rounding adjustment.
- Payment timeline with method, reference, date, pending bank receipts, partial-payment allocation, receipt CSV and full statement CSV.
- Paid/unpaid teacher leave requests, approval/rejection, annual entitlements, consumed and remaining balances, and automatic conversion of excess paid leave to unpaid days.
- Salary breakdown with daily rate, paid/unpaid leave deductions, salary protected by paid leave and net salary payable.
- Configurable 30/26-day divisor and 100%/50%/0% paid-leave salary coverage simulations. Full salary protection is the default.
- Salary payment references and distribution recording; recorded salaries block further approvals and policy changes to preserve calculations.
- Daily attendance, reports and browser persistence; dialogs support Escape, focus trapping and focus restoration.
- Sample academic timetable, library, transport records, reports and school settings.

## Prototype boundaries

All student, teacher, fee, attendance, notice and payroll records are illustrative, not official school records. Data persists in localStorage in the current browser; Settings provides a reset. No authentication, database, actual bank transfers, bank verification API or payment gateway is connected. Verification and NEFT salary distribution buttons record demo actions only. Do not enter real sensitive personal or banking information.

Source branding: https://www.poddarinstitute.org/poddar-international-school — original group logo and banner saved in `public/`; website stylesheet colors #085293 and #ad211d. Contact details reflect the linked institutional page, not an independently verified school office. Public source HTML is retained as `source-reference.html` for traceability. The website uses a group logo; no separate school-specific logo was supplied.

Tuition is modeled as GST exempt and employee salary outside GST for this demo. Other charges and interest require school-specific tax/policy review before production. No blanket GST or NEFT surcharge is added. Financial account screens show paise where needed; overview summaries round to whole rupees. Fee receipts allocate to oldest scheduled charges first. Due now is a subset of remaining balance, not an additional charge. NEFT, bank transfer and cheque receipts require manual demo verification; other methods record as verified. An actual bank integration is not present.

All calculations use a fixed demonstration date of 4 November 2026. School financial records persist under `poddar-finance-v2`; attendance under `poddar-attendance-v2`. The new finance store is independent of the earlier prototype data. Leave requests support November 2026 and consecutive calendar-day durations, including half days; a production calendar should account for working days, holidays and leave rules. Partial-pay options are explicit simulations, not a determination of lawful employment terms. Full paid leave has no deduction by default. Payroll is a monthly preview, not a complete statutory payroll engine. Recorded salary payments lock further leave approvals for that teacher and policy changes; a production correction workflow is still required.

Run `npm run test:finance` for ledger reconciliation, due/remaining semantics, pending/verified payments, partial allocation, full settlement, interest methods, schedule rounding, month-end dates, paid/unpaid leave, quota overflow, half days and deduction caps. Run `npm run typecheck` and `npm run build` for application validation.

Before production: implement role-based authentication, server-side validation, a transactional database and ledger, audit history, payroll locking, secure payment integrations, tax configuration, backups, accessibility review and applicable policy validation.
