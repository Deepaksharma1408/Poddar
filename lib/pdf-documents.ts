// Poddar ERP - Direct PDF Generation & Download Suite
// Provides dedicated generators for all 11 core ERP documents and reports.

import { SimplePDF, triggerPDFDownload, PDF_COLORS } from './pdf-generator';
import type { FeeStudent, FeePayment, Staff, Leave } from './school-finance';
import type { PayrollRecord } from './payroll';
import type { PerformanceReview } from './hr';
import type { CashEntry } from './accounting';

function fmtMoney(amount: number): string {
  return 'INR ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 1 & 2. Student Fee Receipt (Original and Duplicate)
export function downloadFeeReceiptPDF(opts: {
  campusName: string;
  student: FeeStudent;
  payment: FeePayment;
  isDuplicate?: boolean;
}): void {
  const { campusName, student, payment, isDuplicate = false } = opts;
  const pdf = new SimplePDF();

  const title = isDuplicate ? 'DUPLICATE FEE RECEIPT' : 'STUDENT FEE RECEIPT';
  let y = pdf.drawHeader(campusName, title, 'STUDENT FINANCIAL ACCOUNTS', isDuplicate);

  // Summary box
  pdf.drawRect(40, y - 55, pdf.pageWidth - 80, 50, {
    fill: PDF_COLORS.lightBg,
    stroke: PDF_COLORS.navy,
    lineWidth: 0.5,
  });

  pdf.drawText('RECEIPT DETAILS', 52, y - 10, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
  pdf.drawText(`RECEIPT NO: ${payment.reference}`, 52, y - 24, { font: 'Helvetica-Bold', size: 8 });
  pdf.drawText(`DATE: ${payment.date}`, 52, y - 36, { font: 'Helvetica', size: 8 });
  pdf.drawText(`PAYMENT METHOD: ${payment.method}`, 52, y - 48, { font: 'Helvetica', size: 8 });

  pdf.drawText('AMOUNT PAID', pdf.pageWidth - 180, y - 14, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.mutedText, align: 'right' });
  pdf.drawText(fmtMoney(payment.amount), pdf.pageWidth - 52, y - 14, { font: 'Helvetica-Bold', size: 14, color: PDF_COLORS.green, align: 'right' });
  pdf.drawText(`STATUS: ${payment.verified ? 'VERIFIED' : 'PENDING VERIFICATION'}`, pdf.pageWidth - 52, y - 34, {
    font: 'Helvetica-Bold',
    size: 8,
    color: payment.verified ? PDF_COLORS.navy : PDF_COLORS.gold,
    align: 'right',
  });

  y -= 75;

  // Student Info Grid
  y = pdf.drawKeyValueGrid(y, [
    { label: 'Student Name', value: student.name, boldValue: true },
    { label: 'Admission / Reg ID', value: student.id, boldValue: true },
    { label: 'Class / Programme', value: student.class },
    { label: 'Guardian Name', value: student.guardian },
    { label: 'Payment Plan', value: student.plan.kind },
    { label: 'Preferred Method', value: student.plan.preferred },
  ]);

  y -= 15;

  // Transaction Breakdown Table
  const headers = ['S.No.', 'Description / Account Head', 'Reference / UTR', 'Method', 'Paid Amount'];
  const rows = [
    ['01', `Tuition & Academic Fees - ${student.class}`, payment.reference, payment.method, fmtMoney(payment.amount)],
  ];

  y = pdf.drawTable(y, headers, rows, [45, 220, 110, 65, 75], ['center', 'left', 'left', 'center', 'right']);

  y -= 25;

  // Amount in words simulation & Verification notes
  pdf.drawRect(40, y - 40, pdf.pageWidth - 80, 36, {
    fill: PDF_COLORS.goldLight,
    stroke: PDF_COLORS.gold,
    lineWidth: 0.5,
  });
  pdf.drawText('TRANSACTION SUMMARY', 50, y - 8, { font: 'Helvetica-Bold', size: 7.5, color: PDF_COLORS.navy });
  pdf.drawText(
    `Received sum of ${fmtMoney(payment.amount)} from ${student.name} towards academic session 2026-27 fees.`,
    50,
    y - 20,
    { font: 'Helvetica', size: 8 }
  );
  pdf.drawText(
    isDuplicate
      ? 'Note: This is a verified duplicate receipt re-issued on request from student records.'
      : 'Note: Official digital receipt generated via Poddar Connect ERP portal.',
    50,
    y - 32,
    { font: 'Helvetica-Oblique', size: 7.5, color: PDF_COLORS.mutedText }
  );

  y -= 70;

  // Signatures
  pdf.drawText('Student / Parent Signature', 60, y, { font: 'Helvetica', size: 8 });
  pdf.drawLine(40, y + 14, 180, y + 14, { stroke: PDF_COLORS.mutedText });

  pdf.drawText('Accounts Officer / Cashier', pdf.pageWidth - 180, y, { font: 'Helvetica', size: 8, align: 'right' });
  pdf.drawText('PODDAR GROUP OF INSTITUTIONS', pdf.pageWidth - 180, y - 10, { font: 'Helvetica-Bold', size: 7.5, color: PDF_COLORS.navy, align: 'right' });
  pdf.drawLine(pdf.pageWidth - 200, y + 14, pdf.pageWidth - 40, y + 14, { stroke: PDF_COLORS.navy });

  pdf.drawFooter(isDuplicate ? 'Duplicate copy issued for student records. Valid without physical stamp.' : undefined);

  const filename = `${isDuplicate ? 'Duplicate-Receipt' : 'Fee-Receipt'}-${student.id}-${payment.reference}.pdf`;
  triggerPDFDownload(filename, pdf.output());
}

// 2. Duplicate Fee Receipt
export function downloadDuplicateFeeReceiptPDF(opts: {
  campusName: string;
  student: FeeStudent;
  payment: FeePayment;
}): void {
  downloadFeeReceiptPDF({ ...opts, isDuplicate: true });
}

// 3. Employee Monthly Payslip
export function downloadPayslipPDF(opts: {
  campusName: string;
  employee: Staff;
  record: PayrollRecord;
}): void {
  const { campusName, employee, record } = opts;
  const pdf = new SimplePDF();

  let y = pdf.drawHeader(campusName, `SALARY PAYSLIP - ${record.period}`, 'HUMAN RESOURCES & PAYROLL REGISTER');

  // Employee details grid
  y = pdf.drawKeyValueGrid(y, [
    { label: 'Employee Name', value: record.name, boldValue: true },
    { label: 'Employee ID', value: record.employeeId, boldValue: true },
    { label: 'Department / Faculty', value: record.department },
    { label: 'Designation', value: employee.designation ?? 'Faculty' },
    { label: 'Pay Period', value: record.period },
    { label: 'Payment Mode / UTR', value: `${record.mode ?? 'NEFT'}: ${record.reference ?? 'Settlement Pending'}` },
    { label: 'Working Days / Divisor', value: `${record.workingDays ?? 30} days / ${record.divisor ?? 30}` },
    { label: 'Present / Paid Leave', value: `${record.presentDays ?? 0}d / ${record.calculation.paidDays}d` },
  ]);

  y -= 15;

  // Earnings vs Deductions Table
  const headers = ['EARNINGS HEAD', 'AMOUNT (INR)', 'DEDUCTIONS HEAD', 'AMOUNT (INR)'];
  const basic = record.salaryTerms?.basic ?? record.gross;
  const allowances = record.salaryTerms?.allowances ?? 0;
  const bonus = record.salaryTerms?.bonus ?? 0;
  const encashment = record.salaryTerms?.encashment ?? 0;

  const unpaidDeduction = record.calculation.unpaidDeduction;
  const paidDeduction = record.calculation.paidDeduction;
  const otherDeductions = record.salaryTerms?.otherDeductions ?? 0;
  const loanRecovery = (record.loanRecoveries ?? []).reduce((acc, l) => acc + l.amount, 0);

  const rows = [
    ['Basic Salary', fmtMoney(basic), 'Unpaid Leave Deduction', fmtMoney(unpaidDeduction)],
    ['Special Allowances', fmtMoney(allowances), 'Partial Leave Deduction', fmtMoney(paidDeduction)],
    ['Performance Bonus', fmtMoney(bonus), 'Other Statutory Deductions', fmtMoney(otherDeductions)],
    ['Leave Encashment', fmtMoney(encashment), 'Loan / Advance Recovery', fmtMoney(loanRecovery)],
    ['Gross Earnings', fmtMoney(record.gross), 'Total Deductions', fmtMoney(record.calculation.deduction)],
  ];

  y = pdf.drawTable(y, headers, rows, [145, 110, 145, 115], ['left', 'right', 'left', 'right']);

  y -= 15;

  // Net Pay Highlight Box
  pdf.drawRect(40, y - 36, pdf.pageWidth - 80, 32, {
    fill: PDF_COLORS.goldLight,
    stroke: PDF_COLORS.navy,
    lineWidth: 1,
  });

  pdf.drawText('NET TAKE HOME SALARY', 55, y - 10, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
  pdf.drawText(`STATUS: ${record.status.toUpperCase()}`, 55, y - 24, { font: 'Helvetica', size: 7.5, color: PDF_COLORS.mutedText });
  pdf.drawText(fmtMoney(record.calculation.net), pdf.pageWidth - 55, y - 16, {
    font: 'Helvetica-Bold',
    size: 15,
    color: PDF_COLORS.navy,
    align: 'right',
  });

  y -= 50;

  // Bank Account & Remarks
  const bank = employee.profile?.bank ?? 'State Bank of India';
  const lastFour = employee.profile?.accountLastFour ?? '4102';
  const ifsc = employee.profile?.ifsc ?? 'SBIN0004123';

  pdf.drawText('DISBURSEMENT ACCOUNT DETAILS', 40, y, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.mutedText });
  y -= 12;
  pdf.drawText(`Bank Name: ${bank} | Account: ************${lastFour} | IFSC Code: ${ifsc}`, 40, y, {
    font: 'Helvetica',
    size: 8,
  });
  y -= 10;
  pdf.drawText(`Approval History: ${record.history.map(h => h.event).join(' -> ')}`, 40, y, {
    font: 'Helvetica-Oblique',
    size: 7,
    color: PDF_COLORS.mutedText,
  });

  y -= 50;

  // Signatures
  pdf.drawText('Employee Signature', 60, y, { font: 'Helvetica', size: 8 });
  pdf.drawLine(40, y + 14, 180, y + 14, { stroke: PDF_COLORS.mutedText });

  pdf.drawText('Authorized HR / Accounts Signatory', pdf.pageWidth - 180, y, { font: 'Helvetica', size: 8, align: 'right' });
  pdf.drawText(campusName, pdf.pageWidth - 180, y - 10, { font: 'Helvetica-Bold', size: 7.5, color: PDF_COLORS.navy, align: 'right' });
  pdf.drawLine(pdf.pageWidth - 220, y + 14, pdf.pageWidth - 40, y + 14, { stroke: PDF_COLORS.navy });

  pdf.drawFooter('Confidential document. Poddar Group of Institutions HRMS Portal.');

  triggerPDFDownload(`Payslip-${record.employeeId}-${record.period}.pdf`, pdf.output());
}

// 4. Employee Annual / Period Salary Statement
export function downloadSalaryStatementPDF(opts: {
  campusName: string;
  employee: Staff;
  records: PayrollRecord[];
  year?: string;
}): void {
  const { campusName, employee, records, year = '2026-27' } = opts;
  const pdf = new SimplePDF();

  let y = pdf.drawHeader(campusName, `ANNUAL SALARY STATEMENT (${year})`, 'EMPLOYEE COMPENSATION & TAX SUMMARY');

  y = pdf.drawKeyValueGrid(y, [
    { label: 'Employee Name', value: employee.name, boldValue: true },
    { label: 'Employee ID', value: employee.id, boldValue: true },
    { label: 'Department', value: employee.subject },
    { label: 'Designation', value: employee.designation ?? 'Faculty' },
    { label: 'Base CTC / Salary', value: fmtMoney(employee.salary) },
    { label: 'Statements Count', value: `${records.length} pay periods` },
  ]);

  y -= 15;

  const headers = ['Period', 'Gross Pay', 'Leave Ded.', 'Other Ded.', 'Loan Rec.', 'Net Paid', 'Status', 'UTR Ref.'];
  const rows = records.map(r => [
    r.period,
    fmtMoney(r.gross),
    fmtMoney(r.calculation.unpaidDeduction + r.calculation.paidDeduction),
    fmtMoney(r.salaryTerms?.otherDeductions ?? 0),
    fmtMoney((r.loanRecoveries ?? []).reduce((s, l) => s + l.amount, 0)),
    fmtMoney(r.calculation.net),
    r.status,
    r.reference ?? '—',
  ]);

  // Totals row
  const totalGross = records.reduce((s, r) => s + r.gross, 0);
  const totalNet = records.reduce((s, r) => s + r.calculation.net, 0);

  rows.push([
    'TOTAL',
    fmtMoney(totalGross),
    '—',
    '—',
    '—',
    fmtMoney(totalNet),
    '—',
    '—',
  ]);

  y = pdf.drawTable(y, headers, rows, [55, 75, 65, 65, 65, 75, 55, 60], [
    'center', 'right', 'right', 'right', 'right', 'right', 'center', 'left',
  ]);

  pdf.drawFooter();
  triggerPDFDownload(`Salary-Statement-${employee.id}-${year}.pdf`, pdf.output());
}

// 5. Student Complete Fee Statement
export function downloadFeeStatementPDF(opts: {
  campusName: string;
  student: FeeStudent;
  ledger: {
    schedule: { label: string; date: string; amount: number; paid: number; outstanding: number; status: string }[];
    total: number;
    paid: number;
    due: number;
    remaining: number;
    entries: FeePayment[];
  };
}): void {
  const { campusName, student, ledger } = opts;
  const pdf = new SimplePDF();

  let y = pdf.drawHeader(campusName, 'STUDENT FEE ACCOUNT STATEMENT', 'OFFICIAL FINANCIAL LEDGER');

  y = pdf.drawKeyValueGrid(y, [
    { label: 'Student Name', value: student.name, boldValue: true },
    { label: 'Admission ID', value: student.id, boldValue: true },
    { label: 'Class / Group', value: student.class },
    { label: 'Guardian', value: student.guardian },
    { label: 'Total Committed', value: fmtMoney(ledger.total), boldValue: true },
    { label: 'Verified Paid', value: fmtMoney(ledger.paid) },
    { label: 'Current Due', value: fmtMoney(ledger.due), highlight: ledger.due > 0 },
    { label: 'Remaining Balance', value: fmtMoney(ledger.remaining), boldValue: true },
  ]);

  y -= 15;

  pdf.drawText('INSTALLMENT COMMITMENT SCHEDULE', 40, y, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
  y -= 10;

  const schedHeaders = ['Installment', 'Due Date', 'Committed', 'Paid', 'Outstanding', 'Status'];
  const schedRows = ledger.schedule.map(c => [
    c.label,
    c.date,
    fmtMoney(c.amount),
    fmtMoney(c.paid),
    fmtMoney(c.outstanding),
    c.status,
  ]);

  y = pdf.drawTable(y, schedHeaders, schedRows, [140, 75, 80, 75, 80, 65], ['left', 'center', 'right', 'right', 'right', 'center']);

  y -= 20;

  pdf.drawText('TRANSACTIONS & RECEIPTS RECORDED', 40, y, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
  y -= 10;

  const txnHeaders = ['Date', 'Reference / UTR', 'Method', 'Amount Paid', 'Verification'];
  const txnRows = ledger.entries.map(p => [
    p.date,
    p.reference,
    p.method,
    fmtMoney(p.amount),
    p.inactiveStatus ?? (p.verified ? 'Verified' : 'Pending Verification'),
  ]);

  if (!txnRows.length) {
    txnRows.push(['—', 'No payments recorded', '—', 'INR 0.00', '—']);
  }

  y = pdf.drawTable(y, txnHeaders, txnRows, [80, 160, 95, 95, 85], ['center', 'left', 'center', 'right', 'center']);

  pdf.drawFooter();
  triggerPDFDownload(`Fee-Statement-${student.id}.pdf`, pdf.output());
}

// 6. Payment History Report
export function downloadPaymentHistoryPDF(opts: {
  campusName: string;
  title?: string;
  payments: FeePayment[];
  students: FeeStudent[];
}): void {
  const { campusName, title = 'PAYMENT HISTORY REPORT', payments, students } = opts;
  const pdf = new SimplePDF();
  const studentMap = new Map(students.map(s => [s.id, s]));

  let y = pdf.drawHeader(campusName, title, 'FINANCIAL TRANSACTIONS AUDIT');

  const headers = ['Date', 'Reference / UTR', 'Student Name', 'ID', 'Method', 'Amount', 'Status'];
  const rows = payments.map(p => {
    const s = studentMap.get(p.studentId);
    return [
      p.date,
      p.reference,
      s?.name ?? p.studentId,
      p.studentId,
      p.method,
      fmtMoney(p.amount),
      p.inactiveStatus ?? (p.refundFor ? 'Refund' : p.verified ? 'Verified' : 'Pending'),
    ];
  });

  const totalAmount = payments.filter(p => p.verified && !p.refundFor).reduce((acc, p) => acc + p.amount, 0);
  rows.push(['TOTAL', `${payments.length} transactions`, '—', '—', '—', fmtMoney(totalAmount), '—']);

  y = pdf.drawTable(y, headers, rows, [65, 110, 115, 65, 55, 70, 35], ['center', 'left', 'left', 'center', 'center', 'right', 'center']);

  pdf.drawFooter();
  triggerPDFDownload('Payment-History-Report.pdf', pdf.output());
}

// 7. Leave Report
export function downloadLeaveReportPDF(opts: {
  campusName: string;
  leaves: Leave[];
  staff: Staff[];
  period?: string;
}): void {
  const { campusName, leaves, staff, period } = opts;
  const pdf = new SimplePDF();
  const staffMap = new Map(staff.map(s => [s.id, s]));

  const title = period ? `LEAVE REPORT - ${period}` : 'LEAVE APPLICATIONS & ATTENDANCE REPORT';
  let y = pdf.drawHeader(campusName, title, 'HUMAN RESOURCES ATTENDANCE & LEAVE REGISTER');

  const headers = ['Employee', 'Department', 'Category', 'From Date', 'Days', 'Treatment', 'Status', 'Remarks'];
  const rows = leaves.map(l => {
    const s = staffMap.get(l.staffId);
    return [
      s?.name ?? l.staffId,
      s?.subject ?? '—',
      l.category,
      l.from,
      String(l.chargedDays ?? l.days),
      l.kind,
      l.status,
      l.approvalRemarks ?? l.reason.slice(0, 24),
    ];
  });

  y = pdf.drawTable(y, headers, rows, [85, 70, 75, 55, 35, 45, 55, 95], ['left', 'left', 'left', 'center', 'center', 'center', 'center', 'left']);

  pdf.drawFooter();
  triggerPDFDownload(`Leave-Report-${period ?? 'All'}.pdf`, pdf.output());
}

// 8. Attendance Report
export function downloadAttendanceReportPDF(opts: {
  campusName: string;
  title: string;
  date: string;
  records: { name: string; id: string; group: string; status: string }[];
}): void {
  const { campusName, title, date, records } = opts;
  const pdf = new SimplePDF();

  let y = pdf.drawHeader(campusName, `${title.toUpperCase()} (${date})`, 'DAILY ATTENDANCE REGISTER');

  const presentCount = records.filter(r => r.status === 'Present').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;

  y = pdf.drawKeyValueGrid(y, [
    { label: 'Register Date', value: date, boldValue: true },
    { label: 'Total Enrolled', value: `${records.length} records` },
    { label: 'Present Count', value: `${presentCount} (${((presentCount / (records.length || 1)) * 100).toFixed(1)}%)`, boldValue: true },
    { label: 'Absent Count', value: `${absentCount}`, highlight: absentCount > 0 },
  ]);

  y -= 15;

  const headers = ['S.No.', 'Name', 'Enrollment ID', 'Class / Department', 'Attendance Mark'];
  const rows = records.map((r, i) => [
    String(i + 1).padStart(2, '0'),
    r.name,
    r.id,
    r.group,
    r.status,
  ]);

  y = pdf.drawTable(y, headers, rows, [45, 175, 95, 115, 85], ['center', 'left', 'center', 'left', 'center']);

  pdf.drawFooter();
  triggerPDFDownload(`Attendance-Report-${date}.pdf`, pdf.output());
}

// 9. Payroll Register PDF
export function downloadPayrollRegisterPDF(opts: {
  campusName: string;
  period: string;
  records: PayrollRecord[];
}): void {
  const { campusName, period, records } = opts;
  const pdf = new SimplePDF();

  let y = pdf.drawHeader(campusName, `PAYROLL REGISTER - ${period}`, 'MONTHLY SALARY AUDIT & DISBURSEMENT');

  const headers = ['ID', 'Employee Name', 'Department', 'Gross', 'Leave Ded.', 'Other Ded.', 'Net Pay', 'Status', 'UTR Ref.'];
  const rows = records.map(r => [
    r.employeeId,
    r.name,
    r.department,
    fmtMoney(r.gross),
    fmtMoney(r.calculation.deduction - (r.salaryTerms?.otherDeductions ?? 0)),
    fmtMoney(r.salaryTerms?.otherDeductions ?? 0),
    fmtMoney(r.calculation.net),
    r.status,
    r.reference ?? '—',
  ]);

  const totalGross = records.reduce((s, r) => s + r.gross, 0);
  const totalNet = records.reduce((s, r) => s + r.calculation.net, 0);

  rows.push([
    'TOTAL',
    `${records.length} employees`,
    '—',
    fmtMoney(totalGross),
    '—',
    '—',
    fmtMoney(totalNet),
    '—',
    '—',
  ]);

  y = pdf.drawTable(y, headers, rows, [45, 95, 75, 65, 55, 55, 65, 45, 65], [
    'center', 'left', 'left', 'right', 'right', 'right', 'right', 'center', 'left',
  ]);

  pdf.drawFooter();
  triggerPDFDownload(`Payroll-Register-${period}.pdf`, pdf.output());
}

// 10. Financial Report PDF
export function downloadFinancialReportPDF(opts: {
  campusName: string;
  title: string;
  entries: CashEntry[];
  totals: { receipts: number; outflows: number; net: number };
}): void {
  const { campusName, title, entries, totals } = opts;
  const pdf = new SimplePDF();

  let y = pdf.drawHeader(campusName, title.toUpperCase(), 'TREASURY & INSTITUTIONAL ACCOUNTING');

  y = pdf.drawKeyValueGrid(y, [
    { label: 'Total Receipts (Inflows)', value: fmtMoney(totals.receipts), boldValue: true },
    { label: 'Total Disbursed (Outflows)', value: fmtMoney(totals.outflows), boldValue: true },
    { label: 'Net Cash Position', value: fmtMoney(totals.net), highlight: true, boldValue: true },
    { label: 'Transaction Count', value: `${entries.length} ledger lines` },
  ]);

  y -= 15;

  const headers = ['Date', 'Reference / Voucher', 'Transaction Type', 'Cost Center / Dept', 'Amount'];
  const rows = entries.map(e => [
    e.date,
    e.reference,
    e.type,
    e.department,
    (e.amount >= 0 ? '+' : '−') + fmtMoney(Math.abs(e.amount)),
  ]);

  y = pdf.drawTable(y, headers, rows, [75, 125, 120, 115, 80], ['center', 'left', 'left', 'left', 'right']);

  pdf.drawFooter();
  triggerPDFDownload('Financial-Report.pdf', pdf.output());
}

// 11. No-Dues Certificate PDF
export function downloadNoDuesCertificatePDF(opts: {
  campusName: string;
  student: FeeStudent;
  asOf: string;
}): void {
  const { campusName, student, asOf } = opts;
  const pdf = new SimplePDF();

  let y = pdf.drawHeader(campusName, 'NO-DUES CLEARANCE CERTIFICATE', 'INSTITUTIONAL CLEARANCE SYSTEM');

  y -= 15;

  // Formal Certificate Box
  pdf.drawRect(40, y - 280, pdf.pageWidth - 80, 280, {
    fill: PDF_COLORS.white,
    stroke: PDF_COLORS.navy,
    lineWidth: 1.5,
  });

  // Inner border
  pdf.drawRect(44, y - 276, pdf.pageWidth - 88, 272, {
    stroke: PDF_COLORS.gold,
    lineWidth: 0.75,
  });

  pdf.drawText('TO WHOMSOEVER IT MAY CONCERN', pdf.pageWidth / 2, y - 30, {
    font: 'Helvetica-Bold',
    size: 13,
    color: PDF_COLORS.navy,
    align: 'center',
  });

  const body1 = `This is to formally certify that ${student.name}, son/daughter of ${student.guardian},`;
  const body2 = `enrolled under Admission Number ${student.id} in ${student.class},`;
  const body3 = `has cleared all institutional financial commitments and fee dues for Academic Session 2026-27.`;
  const body4 = `The student fee ledger stands completely reconciled with zero outstanding balance as of ${asOf}.`;

  pdf.drawText(body1, pdf.pageWidth / 2, y - 65, { font: 'Helvetica', size: 10, align: 'center' });
  pdf.drawText(body2, pdf.pageWidth / 2, y - 82, { font: 'Helvetica-Bold', size: 10, align: 'center', color: PDF_COLORS.navy });
  pdf.drawText(body3, pdf.pageWidth / 2, y - 99, { font: 'Helvetica', size: 10, align: 'center' });
  pdf.drawText(body4, pdf.pageWidth / 2, y - 116, { font: 'Helvetica', size: 10, align: 'center' });

  // Clearance Departments Table inside certificate
  const clearanceData = [
    ['Accounts & Fee Section', 'Verified Zero Balance', 'CLEAR'],
    ['Library & Learning Center', 'All Books Returned', 'CLEAR'],
    ['Laboratory & Equipment', 'No Breakage / Dues', 'CLEAR'],
    ['Transport & Logistics', 'Dues Cleared', 'CLEAR'],
  ];

  let cy = y - 145;
  pdf.drawRect(60, cy - 80, pdf.pageWidth - 120, 80, { fill: PDF_COLORS.lightBg, stroke: PDF_COLORS.border, lineWidth: 0.5 });
  for (const [dept, remark, status] of clearanceData) {
    pdf.drawText(dept, 70, cy - 14, { font: 'Helvetica-Bold', size: 8 });
    pdf.drawText(remark, 240, cy - 14, { font: 'Helvetica', size: 8 });
    pdf.drawText(status, pdf.pageWidth - 80, cy - 14, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.green, align: 'right' });
    cy -= 18;
  }

  y -= 310;

  // Signatures
  pdf.drawText('Dean / Principal', 70, y, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.navy });
  pdf.drawText(campusName, 70, y - 10, { font: 'Helvetica', size: 7.5 });
  pdf.drawLine(50, y + 14, 190, y + 14, { stroke: PDF_COLORS.navy });

  pdf.drawText('Finance & Accounts Comptroller', pdf.pageWidth - 190, y, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.navy, align: 'right' });
  pdf.drawText('PODDAR GROUP OF INSTITUTIONS', pdf.pageWidth - 190, y - 10, { font: 'Helvetica', size: 7.5, align: 'right' });
  pdf.drawLine(pdf.pageWidth - 230, y + 14, pdf.pageWidth - 50, y + 14, { stroke: PDF_COLORS.navy });

  pdf.drawFooter('Valid official digital document. Poddar Connect ERP Clearance Section.');

  triggerPDFDownload(`No-Dues-Certificate-${student.id}.pdf`, pdf.output());
}

// 12. Performance Review PDF
export function downloadPerformanceReviewPDF(opts: {
  campusName: string;
  employee: Staff;
  review: PerformanceReview;
}): void {
  const { campusName, employee, review } = opts;
  const pdf = new SimplePDF();

  let y = pdf.drawHeader(campusName, `STAFF PERFORMANCE REVIEW - ${review.period}`, 'TEACHER & FACULTY EVALUATION SYSTEM');

  y = pdf.drawKeyValueGrid(y, [
    { label: 'Employee Name', value: employee.name, boldValue: true },
    { label: 'Employee ID', value: employee.id, boldValue: true },
    { label: 'Department', value: review.department || employee.subject },
    { label: 'Review Period', value: review.period },
    { label: 'Review Date', value: review.reviewDate },
    { label: 'Reviewer / Supervisor', value: review.reviewer, boldValue: true },
    { label: 'Evaluation Status', value: review.status },
    { label: 'Overall Rating', value: `${review.ratings.overall} / 5.0 STARS`, highlight: true, boldValue: true },
  ]);

  y -= 15;

  // Evaluation criteria ratings table
  const ratingHeaders = ['Evaluation Criteria', 'Weighted Rating', 'Score Scale', 'Performance Remark'];
  const ratingRows = [
    ['Teaching & Curriculum Delivery', `${review.ratings.teaching} / 5`, 'Excellent Pedagogy', review.teachingPerformance.slice(0, 40)],
    ['Attendance & Punctuality', `${review.ratings.punctuality} / 5`, 'High Regularity', review.attendancePerformance.slice(0, 40)],
    ['Student Engagement & Mentorship', `${review.ratings.studentFeedback} / 5`, 'Positive Feedback', review.responsibilities.slice(0, 40)],
    ['Departmental & Administrative Support', `${review.ratings.administrativeSupport} / 5`, 'Reliable Execution', review.achievements.slice(0, 40)],
    ['Overall Performance Rating', `${review.ratings.overall} / 5`, 'Configured Criteria', review.remarks.slice(0, 40)],
  ];

  y = pdf.drawTable(y, ratingHeaders, ratingRows, [160, 80, 100, 175], ['left', 'center', 'left', 'left']);

  y -= 15;

  // Detailed Comments Section
  const sections = [
    { title: 'TEACHING PERFORMANCE & PEDAGOGY', text: review.teachingPerformance },
    { title: 'ATTENDANCE & PUNCTUALITY', text: review.attendancePerformance },
    { title: 'DUTIES & INSTITUTIONAL RESPONSIBILITIES', text: review.responsibilities },
    { title: 'KEY ACHIEVEMENTS & CONTRIBUTIONS', text: review.achievements },
    { title: 'RECOMMENDED AREAS FOR IMPROVEMENT', text: review.areasForImprovement },
    { title: 'REVIEWER SUMMARY & REMARKS', text: review.remarks },
  ];

  for (const s of sections) {
    if (y < 80) {
      pdf.addPage();
      y = pdf.pageHeight - 50;
    }
    pdf.drawText(s.title, 40, y, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.navy });
    y -= 12;
    pdf.drawText(s.text || '—', 50, y, { font: 'Helvetica', size: 8, color: PDF_COLORS.darkSlate });
    y -= 16;
  }

  y -= 30;

  // Signatures
  pdf.drawText('Employee Signature & Acknowledgment', 60, y, { font: 'Helvetica', size: 8 });
  pdf.drawLine(40, y + 14, 210, y + 14, { stroke: PDF_COLORS.mutedText });

  pdf.drawText('Reviewer / HOD / Principal Signature', pdf.pageWidth - 210, y, { font: 'Helvetica', size: 8, align: 'right' });
  pdf.drawLine(pdf.pageWidth - 230, y + 14, pdf.pageWidth - 40, y + 14, { stroke: PDF_COLORS.navy });

  pdf.drawFooter();
  triggerPDFDownload(`Performance-Review-${employee.id}-${review.period}.pdf`, pdf.output());
}
