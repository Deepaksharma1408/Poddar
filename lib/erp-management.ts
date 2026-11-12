import { AS_OF, round, studentLedger, type SchoolFinance } from './school-finance';

export const roles = ['Super Admin', 'Principal', 'Management', 'HR Admin', 'Accounts Admin', 'Accountant', 'Cashier', 'HOD', 'Teacher', 'Non-teaching Staff', 'Student', 'Parent'] as const;
export type DemoRole = typeof roles[number];

const studentPages = ['Students', 'Student profiles', 'Attendance', 'Student Attendance', 'Lecture Attendance', 'Parents & Guardians', 'Academics', 'Classes & Sections', 'Courses & Batches', 'Timetable', 'Lecture Timetable', 'Examinations & Results', 'Library', 'Central Library', 'Transport', 'Transport Fleet'];
const peoplePages = ['Employees', 'Teachers', 'Teachers & Staff', 'Faculty & Staff', 'Employee profiles', 'Employee attendance', 'Staff Attendance', 'Leave requests', 'Leave Management', 'Faculty Leave Management', 'HR policies', 'Leave calendar'];
const financePages = ['Fees & payments', 'Fees & Payments', 'Fee administration', 'Fee Structures & Adjustments', 'Compensation', 'Bank reconciliation', 'Accounting', 'Accounting & Ledgers'];
const rolePages: Record<DemoRole, string[]> = {
  'Super Admin': [], Principal: [...studentPages, ...peoplePages],
  Management: [...studentPages, ...peoplePages, ...financePages, 'Teachers', 'Teachers & Staff', 'Payroll', 'Payroll & Salary', 'Reports', 'Student Reports', 'Financial Reports', 'Payroll Reports', 'Notifications', 'Notification Center', 'Announcements & Notices'],
  'HR Admin': peoplePages, 'Accounts Admin': [...financePages, 'Payroll', 'Payroll & Salary', 'Reports', 'Student Reports', 'Financial Reports', 'Payroll Reports', 'Notifications', 'Notification Center'],
  Accountant: ['Fees & payments', 'Fees & Payments', 'Bank reconciliation', 'Accounting', 'Accounting & Ledgers', 'Reports', 'Financial Reports'],
  Cashier: ['Fees & payments', 'Fees & Payments'], HOD: ['Students', 'Attendance', 'Student Attendance', 'Academics', 'Classes & Sections', 'Timetable', 'Examinations & Results', 'Employee attendance', 'Leave requests', 'Leave Management', 'Leave calendar'],
  Teacher: [], 'Non-teaching Staff': [], Student: [], Parent: [],
};

const pageAliases: Record<string, string> = {
  'Dashboard': 'Overview',
  'Overview': 'Dashboard',
  'Fees & Payments': 'Fees & payments',
  'Fees & payments': 'Fees & Payments',
  'Payroll & Salary': 'Payroll',
  'Payroll': 'Payroll & Salary',
  'Fee Structures & Adjustments': 'Fee administration',
  'Fee administration': 'Fee Structures & Adjustments',
  'Student Attendance': 'Attendance',
  'Attendance': 'Student Attendance',
  'Leave Management': 'Leave requests',
  'Leave requests': 'Leave Management',
  'Faculty Leave Management': 'Leave Management',
  'Teachers & Staff': 'Teachers',
  'Faculty & Staff': 'Teachers & Staff',
  'Teachers': 'Teachers & Staff',
  'Accounting & Ledgers': 'Accounting',
  'Accounting': 'Accounting & Ledgers',
  'College Settings': 'Settings',
  'Campus Settings': 'Settings',
  'Settings': 'Campus Settings',
  'Role & Permission Management': 'Permissions',
  'Permissions': 'Role & Permission Management',
  'Notification Center': 'Notifications',
  'Notifications': 'Notification Center',
  'Announcements & Notices': 'Notifications',
  'Student Reports': 'Reports',
  'Financial Reports': 'Reports',
  'Payroll Reports': 'Reports',
  'Reports': 'Student Reports',
  'Audit Trail / System Logs': 'Permissions',
  'Classes & Sections': 'Academics',
  'Courses & Batches': 'Classes & Sections',
  'Academics': 'Classes & Sections',
  'Timetable': 'Academics',
  'Lecture Timetable': 'Timetable',
  'Lecture Attendance': 'Attendance',
  'Staff Attendance': 'Employee Attendance',
  'Central Library': 'Library',
  'Transport Fleet': 'Transport',
  'Examinations & Results': 'Academics',
  'Parents & Guardians': 'Students',
};

export function canOpenPage(role: DemoRole, page: string) {
  if (role === 'Super Admin') return true;
  const legacy = pageAliases[page] ?? page;
  const allowedList = rolePages[role] ?? [];
  return allowedList.includes(page) || allowedList.includes(legacy);
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

