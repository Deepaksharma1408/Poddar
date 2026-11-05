import { loanOutstanding, salaryTerms } from './hr';
import { AS_OF, round, salaryBreakdown, type SchoolFinance, type Staff } from './school-finance';

export type PayrollStatus =
  | 'Draft'
  | 'Calculated'
  | 'Pending HOD Review'
  | 'Pending HR Approval'
  | 'Pending Accounts Approval'
  | 'Approved'
  | 'On Hold'
  | 'Processing'
  | 'Processed'
  | 'Paid'
  | 'Failed';

export type PayrollRecord = {
  id: string;
  period: string;
  employeeId: string;
  name: string;
  department: string;
  gross: number;
  salaryTerms?: ReturnType<typeof salaryTerms>;
  loanRecoveries?: { loanId: string; amount: number }[];
  calculation: ReturnType<typeof salaryBreakdown>;
  status: PayrollStatus;
  previousStatus?: PayrollStatus;
  holdReason?: string;
  approvalRemarks?: string;
  batch?: string;
  mode?: string;
  divisor?: number;
  divisorMode?: string;
  workingDays?: number;
  presentDays?: number;
  reference?: string;
  history: { event: string; at: string; actor?: string; remarks?: string }[];
};

export const openingPeriod = AS_OF.slice(0, 7);

export function createPayrollRecord(data: SchoolFinance, employee: Staff, period: string): PayrollRecord | undefined {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return;
  const id = period + '/' + employee.id;
  if (data.payroll?.some(record => record.id === id)) return;
  if (period === openingPeriod && data.salaryPayments.some(payment => payment.staffId === employee.id)) return;
  const leaves = data.leaves.filter(leave => leave.from.startsWith(period + '-'));
  const [year, month] = period.split('-').map(Number);
  const calendarDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const workingDays = Array.from({ length: calendarDays }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index + 1));
    return ![0, 6].includes(date.getUTCDay()) &&
      !data.holidays?.some(holiday => holiday.date === date.toISOString().slice(0, 10));
  }).filter(Boolean).length;
  const divisorMode = data.policy.divisorMode ?? 'Fixed';
  const divisor = divisorMode === 'Calendar days' ? calendarDays : divisorMode === 'Working days' ? workingDays : data.policy.divisor;
  if (!Number.isFinite(divisor) || divisor <= 0) return;
  const presentDays = (data.employeeAttendance ?? []).filter(entry =>
    entry.employeeId === employee.id && entry.date.startsWith(period + '-'),
  ).reduce((total, entry) => total + (['Present', 'Late arrival', 'Early departure', 'Work from home'].includes(entry.status)
    ? 1 : entry.status === 'Half-day' ? 0.5 : 0), 0);
  const opening = period === openingPeriod ? employee : { ...employee, paidDays: 0, unpaidDays: 0 };
  const approvedPaidDays = leaves.filter(leave =>
    leave.staffId === employee.id && leave.kind === 'Paid' && leave.status === 'Approved',
  ).reduce((total, leave) => total + (leave.chargedDays ?? leave.days), opening.paidDays);
  const absenceDays = (data.employeeAttendance ?? [])
    .filter(entry => entry.employeeId === employee.id && entry.date.startsWith(period + '-'))
    .reduce((total, entry) => {
      const absent = entry.status === 'Absent' ? 1 : entry.status === 'Half-day' ? 0.5 : 0;
      if (!absent) return total;
      const covered = leaves.reduce((days, leave) => {
        if (leave.staffId !== employee.id || leave.status !== 'Approved' ||
          (leave.coveredDates && !leave.coveredDates.includes(entry.date))) return days;
        const elapsed = (Date.parse(entry.date) - Date.parse(leave.from)) / 86400000;
        return elapsed < 0 ? days : days + Math.max(0, Math.min(1, leave.days - elapsed));
      }, 0);
      return total + Math.max(0, absent - covered);
    }, 0);
  const terms = salaryTerms(data, employee, period);
  const calculation = salaryBreakdown({
    ...opening,
    salary: terms.gross,
    allowance: Math.max(opening.allowance, opening.priorUsed + approvedPaidDays),
    unpaidDays: opening.unpaidDays + absenceDays,
  }, leaves, { divisor, paidCoverage: 100 });
  const otherDeductions = Math.min(calculation.net, terms.otherDeductions);
  let available = round(calculation.net - otherDeductions);
  const loanRecoveries = [];
  for (const loan of data.employeeLoans ?? []) {
    if (loan.employeeId !== employee.id || loan.status !== 'Disbursed' || loan.firstPeriod > period) continue;
    const reserved = (data.payroll ?? []).filter(row => row.status !== 'Paid' && row.status !== 'Draft')
      .flatMap(row => row.loanRecoveries ?? []).filter(item => item.loanId === loan.id)
      .reduce((sum, item) => sum + item.amount, 0);
    const amount = round(Math.min(available, loan.installment, Math.max(0, loanOutstanding(data, loan) - reserved)));
    if (amount > 0) {
      loanRecoveries.push({ loanId: loan.id, amount });
      available = round(available - amount);
    }
  }
  return {
    id, period, employeeId: employee.id, name: employee.name, department: employee.subject,
    gross: terms.gross,
    divisor, divisorMode, workingDays, presentDays,
    salaryTerms: { ...terms, otherDeductions },
    loanRecoveries,
    calculation: { ...calculation, deduction: round(terms.gross - available), net: available },
    status: 'Draft',
    history: [{ event: 'Payroll calculated', at: new Date().toISOString() }],
  };
}

export function changePayroll(
  data: SchoolFinance,
  id: string,
  action: 'approve' | 'queue' | 'fail' | 'pay' | 'hold' | 'resume' | 'submit_hod' | 'approve_hod' | 'approve_hr' | 'approve_accounts' | 'retry',
  value = '',
  mode = 'NEFT',
  remarks = ''
): SchoolFinance {
  const record = data.payroll?.find(row => row.id === id);
  if (!record) return data;
  const reference = value.trim().toUpperCase();

  // Workflow actions
  if (action === 'hold') {
    // Only pending/draft/approved payroll can be put on hold (not Paid/Failed)
    if (['Paid', 'Failed', 'On Hold'].includes(record.status)) return data;
    const reason = value.trim() || remarks.trim() || 'Verification hold';
    return {
      ...data,
      payroll: data.payroll?.map(row => row.id === id ? {
        ...row,
        previousStatus: row.status,
        status: 'On Hold',
        holdReason: reason,
        history: [...row.history, { event: `Payroll placed on hold: ${reason}`, at: new Date().toISOString(), remarks: reason }],
      } : row),
    };
  }

  if (action === 'resume') {
    if (record.status !== 'On Hold') return data;
    const restoredStatus: PayrollStatus = record.previousStatus ?? 'Draft';
    return {
      ...data,
      payroll: data.payroll?.map(row => row.id === id ? {
        ...row,
        status: restoredStatus,
        holdReason: undefined,
        previousStatus: undefined,
        history: [...row.history, { event: `Payroll resumed to ${restoredStatus}`, at: new Date().toISOString(), remarks: remarks.trim() || undefined }],
      } : row),
    };
  }

  if (action === 'submit_hod') {
    if (!['Draft', 'Calculated'].includes(record.status)) return data;
    return {
      ...data,
      payroll: data.payroll?.map(row => row.id === id ? {
        ...row,
        status: 'Pending HOD Review',
        history: [...row.history, { event: 'Submitted for HOD Review', at: new Date().toISOString(), remarks: remarks.trim() || undefined }],
      } : row),
    };
  }

  if (action === 'approve_hod') {
    if (record.status !== 'Pending HOD Review') return data;
    return {
      ...data,
      payroll: data.payroll?.map(row => row.id === id ? {
        ...row,
        status: 'Pending HR Approval',
        approvalRemarks: remarks.trim() || undefined,
        history: [...row.history, { event: 'Approved by HOD', at: new Date().toISOString(), remarks: remarks.trim() || undefined }],
      } : row),
    };
  }

  if (action === 'approve_hr') {
    if (record.status !== 'Pending HR Approval') return data;
    return {
      ...data,
      payroll: data.payroll?.map(row => row.id === id ? {
        ...row,
        status: 'Pending Accounts Approval',
        approvalRemarks: remarks.trim() || undefined,
        history: [...row.history, { event: 'Approved by HR', at: new Date().toISOString(), remarks: remarks.trim() || undefined }],
      } : row),
    };
  }

  if (action === 'approve_accounts') {
    if (record.status !== 'Pending Accounts Approval') return data;
    if (data.employeeAttendance?.some(entry => entry.date.startsWith(record.period + '-')) &&
      !data.finalizedAttendance?.includes(record.period)) return data;
    return changePayroll(data, id, 'approve', value, mode, remarks);
  }

  const approvableStatuses: PayrollStatus[] = ['Draft', 'Calculated', 'Pending HOD Review', 'Pending HR Approval', 'Pending Accounts Approval'];
  if (action === 'approve' && !approvableStatuses.includes(record.status)) return data;
  if (action === 'approve' && data.employeeAttendance?.some(entry => entry.date.startsWith(record.period + '-')) &&
    !data.finalizedAttendance?.includes(record.period)) return data;

  if (action === 'queue' && (!['Approved', 'Failed'].includes(record.status) || !value.trim())) return data;
  if (action === 'retry' && (record.status !== 'Failed' || !value.trim())) return data;
  if ((action === 'fail' || action === 'pay') && record.status !== 'Processing') return data;

  // Strict check: Records on hold or pending approval must NEVER be disbursed
  if (action === 'pay' && (['On Hold', 'Draft', 'Calculated', 'Pending HOD Review', 'Pending HR Approval', 'Pending Accounts Approval'].includes(record.status))) {
    return data;
  }

  // Duplicate reference prevention for disbursement
  if (action === 'pay' && (!reference ||
    data.payroll?.some(row => row.reference === reference) ||
    data.salaryPayments.some(payment => payment.reference.trim().toUpperCase() === reference) ||
    data.payments.some(payment => payment.reference.trim().toUpperCase() === reference))) return data;

  const employee = data.staff.find(person => person.id === record.employeeId);
  const refreshed = action === 'approve' && employee ? createPayrollRecord({
    ...data, payroll: data.payroll?.filter(row => row.id !== id),
  }, employee, record.period) : undefined;
  if (action === 'approve' && !refreshed) return data;

  const nextStatus: PayrollStatus = action === 'approve' ? 'Approved'
    : (action === 'queue' || action === 'retry') ? 'Processing'
    : action === 'fail' ? 'Failed'
    : 'Paid';

  const event = (action === 'queue' || action === 'retry') ? 'Queued in simulated ' + mode + ' batch ' + value
    : action === 'pay' ? 'Simulated ' + (record.mode ?? 'NEFT') + ' paid with reference ' + reference
    : action === 'fail' ? 'Simulated ' + (record.mode ?? 'NEFT') + ' failed' : 'Payroll approved';

  return {
    ...data,
    salaryPayments: action === 'pay' && record.period === openingPeriod
      ? [...data.salaryPayments, { staffId: record.employeeId, amount: record.calculation.net, reference, method: record.mode ?? 'NEFT', date: AS_OF }]
      : data.salaryPayments,
    payroll: data.payroll?.map(row => row.id === id ? {
      ...row, ...(refreshed && { calculation: refreshed.calculation, gross: refreshed.gross, salaryTerms: refreshed.salaryTerms,
        loanRecoveries: refreshed.loanRecoveries, divisor: refreshed.divisor, divisorMode: refreshed.divisorMode,
        workingDays: refreshed.workingDays, presentDays: refreshed.presentDays }),
      status: nextStatus,
      batch: (action === 'queue' || action === 'retry') ? value : row.batch,
      mode: (action === 'queue' || action === 'retry') ? mode : row.mode,
      reference: action === 'pay' ? reference : row.reference,
      approvalRemarks: remarks.trim() ? remarks.trim() : row.approvalRemarks,
      history: [...row.history, { event, at: new Date().toISOString(), remarks: remarks.trim() || undefined }],
    } : row),
  };
}
