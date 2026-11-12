// Finance Portal Integrated Unit Test Suite
// Validates finance logic, maker-checker, CSV injection, EMI math, LOP, and ledger waterfall.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require: name => {
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
    Intl,
    Date,
    Math,
    parseFloat,
    isNaN,
  });
  return module.exports;
}

console.log('=== STARTING INTEGRATED FINANCE PORTAL UNIT TESTS ===\n');

// 1. Money & Amortization
const moneyModule = load('../lib/finance-portal/finance/money.ts');
const amortModule = load('../lib/finance-portal/finance/amortization.ts');

console.log('--- 1. Testing Money Conversion & Formatter ---');
assert.equal(moneyModule.toPaise(100.5), 10050);
assert.equal(moneyModule.toPaise('1,50,000.75'), 15000075);
assert.equal(moneyModule.toRupees(15000075), 150000.75);
assert.equal(moneyModule.formatINR(12500000), '₹1,25,000');
assert.equal(moneyModule.formatINRExact(12500050), '₹1,25,000.50');
console.log('✔ Integer paise conversion and en-IN INR formatting verified.');

console.log('--- 2. Testing EMI Flat vs Reducing Balance & Final Installment Adjustment ---');
// 60,000 INR = 6,000,000 paise over 10 months at 10%
const flatEmi = amortModule.installmentPaise(6000000, 10, 10, 'Flat interest');
assert.equal(flatEmi.totalInterestPaise, 500000); // 60,000 * 0.10 * (10/12) = 5,000 INR = 500,000 paise
assert.equal(flatEmi.totalPayablePaise, 6500000);

const reducingEmi = amortModule.installmentPaise(6000000, 10, 10, 'Reducing balance');
assert.ok(reducingEmi.monthlyPaise > 0);
assert.ok(reducingEmi.totalInterestPaise < flatEmi.totalInterestPaise, 'Reducing balance interest must be less than flat');

// Check schedule rounding & final penny balancing
const samplePlan = {
  kind: 'EMI',
  feePaise: 6000000,
  downPaymentPaise: 1000000,
  months: 10,
  interestRatePct: 10,
  interestType: 'Reducing balance',
  startDate: '2026-07-31',
  preferredMethod: 'NEFT',
};
const schedule = amortModule.generateFeeSchedule(samplePlan);
assert.equal(schedule.length, 11, '1 down payment + 10 installments');
assert.equal(schedule[0].amountPaise, 1000000, 'Down payment matches exactly');

const totalInstallmentsSum = schedule.slice(1).reduce((sum, c) => sum + c.amountPaise, 0);
const calcExpected = amortModule.installmentPaise(5000000, 10, 10, 'Reducing balance');
assert.equal(totalInstallmentsSum, calcExpected.totalPayablePaise, 'Schedule installments sum matches total payable paise exactly');

// Month clamping: Jan 31 + 1 month -> Feb 28
assert.equal(amortModule.addClampedMonths('2027-01-31', 1), '2027-02-28', 'Month end correctly clamped');
console.log('✔ EMI amortization, down payment, schedule balancing, and month clamping verified.');

console.log('--- 3. Testing Student Ledger Waterfall & Oldest-Charge-First Allocation ---');
const ledgerModule = load('../lib/finance-portal/finance/student-ledger.ts', {
  './amortization': amortModule,
});

const mockStudent = {
  id: 'PIC26001',
  rollNo: 'BCA/26/001',
  name: 'Aarav Sharma',
  programme: 'BCA',
  semester: 1,
  batch: '2026-29',
  plan: {
    kind: 'Semester',
    feePaise: 6000000,
    downPaymentPaise: 0,
    months: 2,
    interestRatePct: 0,
    interestType: 'Reducing balance',
    startDate: '2026-07-15',
    preferredMethod: 'NEFT',
  },
  adjustments: [],
  status: 'Active',
};

const payments = [
  {
    id: 'P1',
    studentId: 'PIC26001',
    amountPaise: 3000000, // 30,000 INR
    date: '2026-07-20',
    method: 'NEFT',
    reference: 'UTR1',
    receiptNo: 'R1',
    verified: true,
    status: 'Verified',
  },
];

const ledger1 = ledgerModule.computeStudentLedger(mockStudent, payments, '2026-08-01');
assert.equal(ledger1.paidPaise, 3000000);
assert.equal(ledger1.remainingPaise, 3000000);
assert.equal(ledger1.dueNowPaise, 0, 'First semester charge is paid in full');
assert.equal(ledger1.upcomingPaise, 3000000, 'Second semester charge is upcoming');
assert.equal(ledger1.paidPaise + ledger1.remainingPaise, ledger1.totalPaise, 'Paid + remaining must equal total');

// Unverified payment does NOT reduce debt
const unverifiedPayments = [
  ...payments,
  {
    id: 'P2-PENDING',
    studentId: 'PIC26001',
    amountPaise: 1000000,
    date: '2026-08-05',
    method: 'Cheque',
    reference: 'CHQ-999',
    receiptNo: 'R2',
    verified: false,
    status: 'Pending Verification',
  },
];
const ledger2 = ledgerModule.computeStudentLedger(mockStudent, unverifiedPayments, '2026-08-10');
assert.equal(ledger2.remainingPaise, 3000000, 'Unverified cheque cannot reduce outstanding debt');
assert.equal(ledger2.pendingVerificationPaise, 1000000);

// Late Fee Idempotency
const lateFee = ledgerModule.assessLateFee(
  {
    ...mockStudent,
    plan: { ...mockStudent.plan, startDate: '2026-05-01' }, // Overdue
  },
  [],
  50000, // 500 INR
  0,
  '2026-08-01',
  'Cashier'
);
assert.ok(lateFee);
assert.equal(lateFee.amountPaise, 50000);

// Assess again -> should be null (idempotent)
const studentWithLateFee = {
  ...mockStudent,
  plan: { ...mockStudent.plan, startDate: '2026-05-01' },
  adjustments: [lateFee],
};
const secondLateFee = ledgerModule.assessLateFee(studentWithLateFee, [], 50000, 0, '2026-08-01', 'Cashier');
assert.equal(secondLateFee, null, 'Late fee assessment must be idempotent');

// Refunds validation: capped at verified amount
const refundResultValid = ledgerModule.validateAndRefundFee(payments[0], 1000000, 'Course change concession');
assert.equal(refundResultValid.valid, true);

const refundResultExcess = ledgerModule.validateAndRefundFee(payments[0], 4000000, 'Excess refund attempt');
assert.equal(refundResultExcess.valid, false, 'Refund cannot exceed verified paid amount');
console.log('✔ Student ledger waterfall, unverified isolation, late-fee idempotency, and refund caps verified.');

console.log('--- 4. Testing HR & Loss of Pay (LOP) Divisor Modes & Statutory Engine ---');
const payrollModule = load('../lib/finance-portal/hr/payroll-engine.ts', {
  '../finance/money': moneyModule,
});

// Divisor Fixed 30
const lop30 = payrollModule.calculateLop(6000000, 2, '2026-11', 'Fixed 30');
assert.equal(lop30.dailyRatePaise, 200000);
assert.equal(lop30.lopDeductionPaise, 400000);

// Divisor Calendar Days in Feb 2027 (28 days)
const lopFeb = payrollModule.calculateLop(5600000, 1, '2027-02', 'Calendar Days');
assert.equal(lopFeb.dailyRatePaise, 200000);
assert.equal(lopFeb.lopDeductionPaise, 200000);

// Deduction cap at Gross
const lopExcess = payrollModule.calculateLop(5000000, 45, '2026-11', 'Fixed 30');
assert.equal(lopExcess.lopDeductionPaise, 5000000, 'Deductions must be capped at gross salary');

// Payroll State Machine & Disbursement Locks
const draftRecord = {
  id: 'PR-1',
  period: '2026-11',
  employeeId: 'EMP001',
  status: 'Draft',
};
const checkDraftPayout = payrollModule.validatePayrollTransition(draftRecord, 'Paid', 'Accounts Admin');
assert.equal(checkDraftPayout.valid, false, 'Draft payroll record cannot be directly paid');

const holdRecord = { ...draftRecord, status: 'On Hold' };
const checkHoldPayout = payrollModule.validatePayrollTransition(holdRecord, 'Processing', 'Accounts Admin');
assert.equal(checkHoldPayout.valid, false, 'On Hold payroll record cannot be queued for processing');
console.log('✔ LOP calculation, divisor modes, deduction caps, and payroll safety locks verified.');

console.log('--- 5. Testing RBAC Segregation & Maker-Checker Rule ---');
const rbacModule = load('../lib/finance-portal/security/rbac.ts');

// Maker-checker: Creator cannot approve their own record
const makerCheckerCheck = rbacModule.canApproveRecord('Accounts Admin', 'Accounts Admin', 'BILL');
assert.equal(makerCheckerCheck.allowed, false, 'Maker cannot check/approve their own record');

const validCheckerCheck = rbacModule.canApproveRecord('Accounts Admin', 'Accountant', 'BILL');
assert.equal(validCheckerCheck.allowed, true, 'Different authorized checker can approve bill');

// Field masking
assert.equal(rbacModule.maskSalary('₹75,000', 'Cashier'), '₹••••••', 'Cashier cannot view staff salary');
assert.equal(rbacModule.maskSalary('₹75,000', 'HR Admin'), '₹75,000', 'HR Admin can view staff salary');
assert.equal(rbacModule.maskBankAccount('4102', 'HOD'), '•••• •••• ••••', 'HOD cannot see bank account digits');
assert.equal(rbacModule.maskBankAccount('4102', 'Accounts Admin'), '•••• •••• 4102');
console.log('✔ Maker-checker rule enforcement and sensitive PII masking verified.');

console.log('--- 6. Testing CSV Formula Injection Sanitizer ---');
const csvModule = load('../lib/finance-portal/security/csv-sanitizer.ts');

assert.equal(csvModule.sanitizeCSVCell('=1+2'), `"'=1+2"`, 'Prefix with single quote for formula =');
assert.equal(csvModule.sanitizeCSVCell('+cmd|...'), `"'+cmd|..."`, 'Prefix with single quote for formula +');
assert.equal(csvModule.sanitizeCSVCell('@SUM(A1:A10)'), `"'@SUM(A1:A10)"`, 'Prefix with single quote for formula @');
assert.equal(csvModule.sanitizeCSVCell('Normal Text'), `"Normal Text"`);
console.log('✔ CSV formula injection neutralization verified.');

console.log('\n=== ALL INTEGRATED FINANCE PORTAL UNIT TESTS PASSED! ===');

