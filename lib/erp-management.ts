import { AS_OF, round, studentLedger, type SchoolFinance } from './school-finance';

export const roles = ['Super Admin', 'Principal', 'Management', 'HR Admin', 'Accounts Admin', 'Accountant', 'Cashier', 'HOD', 'Teacher', 'Non-teaching Staff', 'Student'] as const;
export type DemoRole = typeof roles[number];

const studentPages = ['Students', 'Student profiles', 'Attendance', 'Academics', 'Library', 'Transport'];
const peoplePages = ['Employees', 'Employee profiles', 'Employee attendance', 'Leave requests', 'HR policies', 'Leave calendar'];
const financePages = ['Fees & payments', 'Fee administration', 'Compensation', 'Bank reconciliation', 'Accounting'];
const rolePages: Record<DemoRole, string[]> = {
  'Super Admin': [], Principal: [...studentPages, ...peoplePages],
  Management: [...studentPages, ...peoplePages, ...financePages, 'Teachers', 'Payroll', 'Reports', 'Notifications'],
  'HR Admin': peoplePages, 'Accounts Admin': [...financePages, 'Payroll', 'Reports', 'Notifications'],
  Accountant: ['Fees & payments', 'Bank reconciliation', 'Accounting', 'Reports'],
  Cashier: ['Fees & payments'], HOD: ['Students', 'Attendance', 'Academics', 'Employee attendance', 'Leave requests', 'Leave calendar'],
  Teacher: [], 'Non-teaching Staff': [], Student: [],
};

export function canOpenPage(role: DemoRole, page: string) {
  return role === 'Super Admin' || rolePages[role].includes(page);
}

export type FeeAdjustment = {
  id: string;
  category: 'Charge' | 'Concession' | 'Scholarship' | 'Waiver' | 'Late fee';
  label: string;
  amount: number;
  date: string;
};

export type FeeTemplate = {
  id: string;
  name: string;
  cycle: 'Annual' | 'Semester';
  components: { label: string; amount: number }[];
};

export function assessLateFees(data: SchoolFinance, studentIds: string[], amount: number, graceDays: number): SchoolFinance {
  if (!Number.isFinite(amount) || round(amount) <= 0 || !Number.isInteger(graceDays) || graceDays < 0) return data;
  const cutoff = Date.parse(AS_OF) - graceDays * 86400000;
  return data.students.filter(student => studentIds.includes(student.id)).reduce((state, student) => {
    const overdue = studentLedger(student, state.payments).schedule.find(charge =>
      charge.outstanding > 0 && Date.parse(charge.date) < cutoff && !charge.label.startsWith('Late fee for '));
    if (!overdue) return state;
    return assignAdjustment(state, [student.id], {
      id: 'late-fee/' + overdue.date + '/' + overdue.label, category: 'Late fee',
      label: 'Late fee for ' + overdue.label, amount, date: AS_OF,
    });
  }, data);
}

export function assignAdjustment(data: SchoolFinance, studentIds: string[], adjustment: FeeAdjustment): SchoolFinance {
  if (!Number.isFinite(adjustment.amount) || adjustment.amount <= 0 || !adjustment.label.trim()) return data;
  const credit = ['Concession', 'Scholarship', 'Waiver'].includes(adjustment.category);
  const amount = round(adjustment.amount);
  if (amount <= 0) return data;
  const targets = data.students.filter(student => studentIds.includes(student.id));
  if (!targets.length || targets.some(student => student.adjustments?.some(item => item.id === adjustment.id) ||
    (credit && studentLedger(student, data.payments).remaining < amount))) return data;
  return {
    ...data,
    students: data.students.map(student => studentIds.includes(student.id) ? {
      ...student, adjustments: [...(student.adjustments ?? []), { ...adjustment, amount: credit ? -amount : amount }],
    } : student),
  };
}

export function refundFee(data: SchoolFinance, paymentId: string, amount: number, reference: string): SchoolFinance {
  const payment = data.payments.find(item => item.id === paymentId && item.verified && !item.refundFor);
  const normalized = reference.trim().toUpperCase();
  const refunded = -data.payments.filter(item => item.refundFor === paymentId).reduce((sum, item) => sum + item.amount, 0);
  if (!payment || !normalized || !Number.isFinite(amount) || round(amount) <= 0 || round(amount + refunded) > payment.amount ||
    data.payments.some(item => item.reference.trim().toUpperCase() === normalized) ||
    data.salaryPayments.some(item => item.reference.trim().toUpperCase() === normalized) ||
    data.payroll?.some(item => item.reference === normalized)) return data;
  return { ...data, payments: [...data.payments, {
    id: 'refund-' + normalized, studentId: payment.studentId, amount: -round(amount), date: AS_OF,
    method: payment.method, reference: normalized, verified: true, refundFor: paymentId,
  }] };
}

export function reconcileStatement(data: SchoolFinance, reference: string, amount: number): SchoolFinance {
  const normalized = reference.trim().toUpperCase();
  if (!normalized || !Number.isFinite(amount) || amount <= 0 ||
    data.reconciliations?.some(row => row.reference.trim().toUpperCase() === normalized)) return data;
  const matches = data.payments.filter(payment => !payment.verified && !payment.inactiveStatus &&
    payment.reference.trim().toUpperCase() === normalized && payment.amount === amount &&
    data.students.some(student => student.id === payment.studentId));
  const salary = data.payroll?.filter(row => row.status === 'Paid' &&
    row.reference === normalized && row.calculation.net === amount) ?? [];
  if (matches.length + salary.length !== 1) return data;
  return {
    ...data,
    payments: data.payments.map(payment => payment.id === matches[0]?.id ? { ...payment, verified: true } : payment),
    reconciliations: [...(data.reconciliations ?? []), { reference: normalized, amount, date: AS_OF }],
  };
}

