import { round, type SchoolFinance, type Staff } from './school-finance';

export type LeaveRule = {
  name: string;
  paid: boolean;
  annual: number;
  monthly: number;
  carryLimit: number;
  expiryMonth: number;
  halfDay: boolean;
  excludeNonWorking?: boolean;
  encashRate?: number;
  departments?: string[];
  employmentTypes?: string[];
  probationDays?: number;
};

export type Encashment = {
  id: string;
  employeeId: string;
  category: string;
  period: string;
  days: number;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
};

export const defaultLeaveRules: LeaveRule[] = [
  { name: 'Casual leave', paid: true, annual: 12, monthly: 0, carryLimit: 0, expiryMonth: 12, halfDay: true },
  { name: 'Sick leave', paid: true, annual: 12, monthly: 0, carryLimit: 0, expiryMonth: 12, halfDay: true },
  { name: 'Personal leave', paid: true, annual: 6, monthly: 0, carryLimit: 0, expiryMonth: 12, halfDay: true },
  { name: 'Earned leave', paid: true, annual: 18, monthly: 1.5, carryLimit: 10, expiryMonth: 6, halfDay: true },
  { name: 'Unpaid leave', paid: false, annual: 0, monthly: 0, carryLimit: 0, expiryMonth: 12, halfDay: true },
];

export function categoryBalance(data: SchoolFinance, employeeId: string, category: string, date: string) {
  const rule = (data.leaveRules ?? defaultLeaveRules).find(item => item.name === category);
  if (!rule?.paid) return 0;
  const employee = data.staff.find(row => row.id === employeeId);
  if (!employee || (rule.departments?.length && !rule.departments.includes(employee.subject)) ||
    (rule.employmentTypes?.length && !rule.employmentTypes.includes(employee.employment ?? 'Permanent'))) return 0;
  const joined = employee.profile?.joiningDate;
  if (joined && Date.parse(date) - Date.parse(joined) < (rule.probationDays ?? 0) * 86400000) return 0;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const used = (leaveYear: number) => data.leaves.filter(leave =>
    leave.staffId === employeeId && leave.category === category && leave.status === 'Approved' &&
    leave.kind === 'Paid' && leave.from.startsWith(leaveYear + '-'),
  ).reduce((total, leave) => total + (leave.chargedDays ?? leave.days), 0);
  const hasPreviousYear = data.leaves.some(leave => leave.staffId === employeeId && leave.from.startsWith((year - 1) + '-'));
  const encashed = (leaveYear: number) => (data.encashments ?? []).filter(row => row.employeeId === employeeId &&
    row.category === category && row.status === 'Approved' && row.period.startsWith(leaveYear + '-'))
    .reduce((total, row) => total + row.days, 0);
  const prior = hasPreviousYear && month <= rule.expiryMonth
    ? Math.min(rule.carryLimit, Math.max(0, rule.annual - used(year - 1) - encashed(year - 1))) : 0;
  const firstMonth = joined?.startsWith(year + '-') ? Number(joined.slice(5, 7)) : 1;
  const earned = rule.monthly > 0 ? Math.min(rule.annual, Math.max(0, month - firstMonth + 1) * rule.monthly) : rule.annual;
  return round(Math.max(0, earned + prior - used(year) - encashed(year)));
}

export function chargedLeave(data: SchoolFinance, from: string, days: number, rule?: LeaveRule) {
  const start = Date.parse(from);
  if (!Number.isFinite(start) || !Number.isFinite(days) || days <= 0 || days > 31) return { chargedDays: 0, coveredDates: [] as string[] };
  const coveredDates: string[] = [];
  let chargedDays = 0;
  for (let offset = 0; offset < Math.ceil(days); offset++) {
    const date = new Date(start + offset * 86400000);
    const key = date.toISOString().slice(0, 10);
    if (rule?.excludeNonWorking && ([0, 6].includes(date.getUTCDay()) || data.holidays?.some(holiday => holiday.date === key))) continue;
    coveredDates.push(key);
    chargedDays += Math.min(1, days - offset);
  }
  return { chargedDays, coveredDates };
}

export type SalaryRevision = {
  id: string;
  employeeId: string;
  period: string;
  basic: number;
  allowances: number;
  bonus: number;
  otherDeductions: number;
  reason: string;
  approved: boolean;
};

export type EmployeeLoan = {
  id: string;
  employeeId: string;
  kind: 'Advance' | 'Loan';
  amount: number;
  installment: number;
  firstPeriod: string;
  disbursedOn?: string;
  status: 'Pending' | 'Approved' | 'Disbursed' | 'Rejected';
};

export function salaryTerms(data: SchoolFinance, employee: Staff, period: string) {
  const revision = (data.salaryRevisions ?? []).filter(row =>
    row.employeeId === employee.id && row.approved && row.period <= period,
  ).sort((a, b) => b.period.localeCompare(a.period))[0];
  const basic = revision?.basic ?? employee.salary;
  const allowances = revision?.allowances ?? 0;
  const bonus = revision?.period === period ? revision.bonus : 0;
  const encashment = (data.encashments ?? []).filter(row =>
    row.employeeId === employee.id && row.period === period && row.status === 'Approved',
  ).reduce((sum, row) => sum + row.amount, 0);
  return { basic, allowances, bonus, encashment, gross: round(basic + allowances + bonus + encashment), otherDeductions: revision?.otherDeductions ?? 0 };
}

export function loanOutstanding(data: SchoolFinance, loan: EmployeeLoan) {
  const recovered = (data.payroll ?? []).filter(row => row.status === 'Paid')
    .flatMap(row => row.loanRecoveries ?? []).filter(row => row.loanId === loan.id)
    .reduce((sum, row) => sum + row.amount, 0);
  return round(Math.max(0, loan.amount - recovered));
}


export type EvaluationCriteria = {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
  description: string;
};

export const defaultEvaluationCriteria: EvaluationCriteria[] = [
  { id: 'teaching', name: 'Teaching & Pedagogy', weight: 30, maxScore: 5, description: 'Curriculum delivery, instructional methodology, subject depth' },
  { id: 'attendance', name: 'Attendance & Punctuality', weight: 20, maxScore: 5, description: 'Class regularity, promptness, adherence to academic calendar' },
  { id: 'responsibilities', name: 'Administrative & Campus Duties', weight: 20, maxScore: 5, description: 'Exam coordination, student mentoring, extracurricular support' },
  { id: 'studentFeedback', name: 'Student Feedback & Engagement', weight: 15, maxScore: 5, description: 'Student rapport, doubt resolution, classroom management' },
  { id: 'professionalDevelopment', name: 'Professional Development & Growth', weight: 15, maxScore: 5, description: 'Workshops, certifications, innovative teaching practices' },
];

export type PerformanceReview = {
  id: string;
  employeeId: string;
  period: string;
  reviewDate: string;
  reviewer: string;
  department: string;
  teachingPerformance: string;
  attendancePerformance: string;
  responsibilities: string;
  achievements: string;
  areasForImprovement: string;
  ratings: {
    teaching: number;
    punctuality: number;
    studentFeedback: number;
    administrativeSupport: number;
    overall: number;
  };
  criteriaScores?: Record<string, number>;
  remarks: string;
  status: 'Draft' | 'Submitted' | 'Finalized';
  history?: { event: string; at: string; actor: string }[];
};
