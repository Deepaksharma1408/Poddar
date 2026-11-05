import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: name => { if (!(name in dependencies)) throw Error(`Unexpected import ${name}`); return dependencies[name]; }, Intl, Date });
  return module.exports;
}
const finance=load('../lib/finance.ts');
const {createFinance,createCollegeFinance,feeSchedule,studentLedger,salaryBreakdown,round}=load('../lib/school-finance.ts',{'./finance':finance});
const data=createFinance();
const student=data.students[0];
const opening=studentLedger(student,data.payments);
assert.equal(round(opening.paid+opening.remaining),opening.total,'paid + remaining must equal total');
assert.equal(round(opening.due+opening.upcoming),opening.remaining,'due is a subset of remaining');
assert.equal(round(opening.schedule.reduce((a,c)=>a+c.amount,0)),opening.total,'schedule reconciles exactly');
assert.ok(Math.abs(opening.total-62791.04)<0.02,'reducing-balance interest matches independent example');
const pending={id:'test',studentId:student.id,amount:1000,date:'2026-11-04',method:'NEFT',reference:'TEST',verified:false};
const waiting=studentLedger(student,[...data.payments,pending]);
assert.equal(waiting.remaining,opening.remaining,'pending payment cannot reduce debt');
assert.equal(waiting.pending,1000);
const verified=studentLedger(student,[...data.payments,{...pending,verified:true}]);
assert.equal(verified.remaining,round(opening.remaining-1000));
assert.equal(verified.due,round(opening.due-1000),'partial payment reduces oldest overdue installment');
assert.equal(round(verified.schedule.reduce((a,c)=>a+c.paid,0)),verified.paid,'allocated payments reconcile');
const complete=studentLedger(student,[{...pending,amount:opening.total,verified:true}]);
assert.equal(complete.remaining,0);assert.equal(complete.due,0);assert.equal(complete.status,'Paid in full');
const flat=feeSchedule({...student.plan,interest:'Flat interest'});
assert.equal(round(flat.reduce((a,c)=>a+c.amount,0)),65000);
const free=feeSchedule({...student.plan,rate:0});assert.equal(round(free.reduce((a,c)=>a+c.amount,0)),60000);
const full=feeSchedule({...student.plan,kind:'Full payment'});assert.equal(full.length,1);assert.equal(full[0].amount,60000);
const quarterly=feeSchedule({...student.plan,kind:'Quarterly',down:0});assert.equal(quarterly.length,4);assert.equal(quarterly[1].date,'2026-10-01');
const jan31=feeSchedule({...student.plan,start:'2027-01-31',months:2});assert.equal(jan31[2].date,'2027-02-28','month ends are clamped');
const priya=data.staff[0];const base=salaryBreakdown(priya,[],data.policy);
assert.equal(base.net,40600);assert.equal(base.paidDeduction,0);assert.equal(base.balance,3);
const paidLeave={...data.leaves[0],status:'Approved'};
const paid=salaryBreakdown(priya,[paidLeave],data.policy);
assert.equal(paid.net,base.net,'approved paid leave must preserve salary');assert.equal(paid.balance,1);
const rejected=salaryBreakdown(priya,[{...paidLeave,status:'Rejected'}],data.policy);assert.equal(rejected.net,base.net);assert.equal(rejected.balance,base.balance);
const halfPaid=salaryBreakdown(priya,[paidLeave],{divisor:30,paidCoverage:50});assert.equal(halfPaid.paidDeduction,2800);assert.equal(halfPaid.net,37800);
const amit=data.staff[3];const excess=salaryBreakdown(amit,[{...paidLeave,staffId:amit.id,days:3}],data.policy);
assert.equal(excess.paidDays,1);assert.equal(excess.excess,2);assert.equal(excess.unpaidDays,2);assert.equal(excess.net,33600);
const halfDay=salaryBreakdown(amit,[{...paidLeave,staffId:amit.id,kind:'Unpaid',days:0.5}],data.policy);assert.equal(halfDay.net,35400);
const cap=salaryBreakdown({...amit,unpaidDays:40},[],data.policy);assert.equal(cap.net,0,'deductions never create negative pay');
console.log('Passed: ledger totals, due/remaining split, pending NEFT, partial allocation, full settlement, interest methods, rounding, month ends, paid/unpaid leave, quota overflow, half days and deduction caps.');

const college = createCollegeFinance();
assert.ok(college.students.every(student => student.id.startsWith('PIC') && student.department && student.batch));
assert.ok(college.payments.every(payment => college.students.some(student => student.id === payment.studentId)));
assert.ok(college.leaves.every(leave => college.staff.some(employee => employee.id === leave.staffId)));
assert.ok(college.students.every(student => studentLedger(student, data.payments).paid === 0));
assert.ok(college.staff.every(employee => salaryBreakdown(employee, college.leaves, college.policy).paidDeduction === 0));
console.log('Passed: college seed links, school payment isolation and college paid-leave coverage.');

const schoolFinanceModule = load('../lib/school-finance.ts', { './finance': finance });
const hrModule = load('../lib/hr.ts', { './school-finance': schoolFinanceModule });
const { createPayrollRecord, changePayroll } = load('../lib/payroll.ts', {
  './school-finance': schoolFinanceModule, './hr': hrModule,
});
const employee = college.staff[0];
const period = '2026-12';
const payrollData = {
  ...college,
  leaves: [
    { staffId: employee.id, from: '2026-12-03', status: 'Approved', kind: 'Paid', days: 5 },
    { staffId: employee.id, from: '2026-12-09', status: 'Approved', kind: 'Unpaid', days: 1 },
    { staffId: employee.id, from: '2026-12-10', status: 'Pending', kind: 'Unpaid', days: 1 },
  ],
  employeeAttendance: [
    { employeeId: employee.id, date: '2026-12-03', status: 'Absent' },
    { employeeId: employee.id, date: '2026-12-08', status: 'Half-day' },
  ],
};
const draft = createPayrollRecord(payrollData, employee, period);
assert.equal(draft.calculation.paidDays, 5);
assert.equal(draft.calculation.unpaidDays, 1.5);
assert.equal(draft.calculation.net, employee.salary * 0.95);
let run = { ...payrollData, payroll: [draft] };
assert.equal(createPayrollRecord(run, employee, period), undefined);
assert.equal(changePayroll(run, draft.id, 'pay', 'TEST-UTR'), run);
assert.equal(changePayroll(run, draft.id, 'approve'), run);
run = changePayroll({ ...run, finalizedAttendance: [period] }, draft.id, 'approve');
assert.equal(run.payroll[0].status, 'Approved');
assert.equal(run.salaryPayments.length, 0);
run = changePayroll(run, draft.id, 'queue', 'BATCH-1');
run = changePayroll(run, draft.id, 'fail');
assert.equal(run.payroll[0].status, 'Failed');
assert.equal(run.salaryPayments.length, 0);
run = changePayroll(run, draft.id, 'queue', 'BATCH-2');
assert.equal(changePayroll(run, draft.id, 'pay', college.payments[0].reference), run);
run = changePayroll(run, draft.id, 'pay', 'test-utr');
assert.equal(run.payroll[0].reference, 'TEST-UTR');
assert.equal(run.payroll[0].status, 'Paid');
assert.equal(changePayroll(run, draft.id, 'queue', 'BATCH-3'), run);
assert.equal(run.payroll[0].history.length, 6);
console.log('Passed: monthly payroll, protected paid leave, attendance precedence, approval, failed transfer, retry and settlement.');


const { assignAdjustment, refundFee, reconcileStatement, assessLateFees, canOpenPage } = load('../lib/erp-management.ts', { './school-finance': schoolFinanceModule });
const account = college.students[0];
const beforeAdjustment = studentLedger(account, college.payments);
const feeEntry = { id: 'test-lab-fee', label: 'Laboratory', amount: 1200, category: 'Charge', date: '2026-11-04' };
const withCharge = assignAdjustment(college, [account.id], feeEntry);
assert.equal(studentLedger(withCharge.students[0], withCharge.payments).total, round(beforeAdjustment.total + 1200));
assert.equal(assignAdjustment(withCharge, [account.id], feeEntry), withCharge);
const withCredit = assignAdjustment(withCharge, [account.id], { ...feeEntry, id: 'scholarship-1', category: 'Scholarship', amount: 500 });
assert.equal(studentLedger(withCredit.students[0], withCredit.payments).total, round(beforeAdjustment.total + 700));
const refunded = refundFee(withCredit, college.payments[0].id, 500, 'REFUND-QA');
assert.equal(studentLedger(refunded.students[0], refunded.payments).remaining, round(beforeAdjustment.remaining + 1200));
assert.equal(refundFee(refunded, college.payments[0].id, college.payments[0].amount, 'OVER-REFUND'), refunded);
assert.equal(refundFee(refunded, college.payments[0].id, 10, 'refund-qa'), refunded);
const pendingBank = { ...college, payments: [...college.payments, { id: 'pending-qa', studentId: account.id, reference: 'BANK-QA', amount: 123, verified: false }] };
assert.equal(reconcileStatement(pendingBank, 'BANK-QA', 122), pendingBank);
const matched = reconcileStatement(pendingBank, 'bank-qa', 123);
assert.equal(matched.payments.at(-1).verified, true);
assert.equal(reconcileStatement(matched, 'BANK-QA', 123), matched);
const late = assessLateFees(college, [account.id], 100, 0);
assert.equal(late.students[0].adjustments.at(-1).amount, 100);
assert.equal(assessLateFees(late, [account.id], 100, 0), late);
assert.equal(canOpenPage('Cashier', 'Fee administration'), false);
assert.equal(canOpenPage('HR Admin', 'Payroll'), false);
assert.equal(canOpenPage('Accounts Admin', 'Payroll'), true);
const withLoan = {
  ...college,
  salaryRevisions: [{ employeeId: employee.id, period, approved: true, basic: 30000, allowances: 10000, bonus: 1000, otherDeductions: 500 }],
  employeeLoans: [{ id: 'loan-qa', employeeId: employee.id, amount: 1800, installment: 1000, firstPeriod: period, status: 'Disbursed' }],
};
const loanDraft = createPayrollRecord(withLoan, employee, period);
assert.equal(loanDraft.calculation.net, 39500);
let loanRun = { ...withLoan, payroll: [loanDraft] };
loanRun = changePayroll(loanRun, loanDraft.id, 'approve');
const laterDraft = createPayrollRecord(loanRun, employee, '2027-01');
assert.equal(laterDraft.loanRecoveries[0].amount, 800);
assert.equal(laterDraft.gross, 40000);
loanRun = changePayroll(loanRun, loanDraft.id, 'queue', 'LOAN-BATCH', 'RTGS');
loanRun = changePayroll(loanRun, loanDraft.id, 'pay', 'LOAN-UTR');
assert.equal(hrModule.loanOutstanding(loanRun, withLoan.employeeLoans[0]), 800);
assert.equal(loanRun.payroll[0].mode, 'RTGS');
const charge = hrModule.chargedLeave({ ...college, holidays: [{ date: '2026-11-09', title: 'Demo holiday' }] }, '2026-11-06', 4, { excludeNonWorking: true });
assert.equal(charge.chargedDays, 1);
assert.equal(charge.coveredDates.join(','), '2026-11-06');
console.log('Passed: fee adjustments, refunds, late-fee idempotency, reconciliation, demo role restrictions, salary revisions, loan reservations and holiday rules.');

const halfDayPayroll = createPayrollRecord({
  ...college,
  leaves: [{ staffId: employee.id, from: '2026-12-08', status: 'Approved', kind: 'Paid', days: 0.5 }],
  employeeAttendance: [{ employeeId: employee.id, date: '2026-12-08', status: 'Absent' }],
}, employee, period);
assert.equal(halfDayPayroll.calculation.paidDays, 0.5);
assert.equal(halfDayPayroll.calculation.unpaidDays, 0.5);
console.log('Passed: attendance finalization and half-day paid leave coverage.');
