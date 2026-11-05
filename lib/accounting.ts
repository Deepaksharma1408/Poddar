import { round, type SchoolFinance } from './school-finance';

export type CashEntry = {
  id: string;
  date: string;
  reference: string;
  department: string;
  type: string;
  amount: number;
};

export type FinancialClose = {
  year: number;
  closedAt: string;
  receipts: number;
  outflows: number;
  entries: CashEntry[];
};

export function cashEntries(data: SchoolFinance): CashEntry[] {
  const linked = new Set((data.payroll ?? []).map(row => row.reference));
  return [
    ...data.payments.filter(row => row.verified).map(row => ({
      id: row.id, date: row.date, reference: row.reference, type: row.refundFor ? 'Fee refund' : 'Fee receipt',
      department: data.students.find(student => student.id === row.studentId)?.department ?? 'Student accounts',
      amount: row.amount,
    })),
    ...(data.payroll ?? []).filter(row => row.status === 'Paid').map(row => ({
      id: row.id, date: row.history.at(-1)?.at.slice(0, 10) ?? '', reference: row.reference ?? '',
      type: 'Salary settlement', department: row.department, amount: -row.calculation.net,
    })),
    ...data.salaryPayments.filter(row => !linked.has(row.reference)).map(row => ({
      id: row.reference, date: row.date, reference: row.reference, type: 'Salary settlement',
      department: data.staff.find(employee => employee.id === row.staffId)?.subject ?? 'Payroll', amount: -row.amount,
    })),
    ...(data.employeeLoans ?? []).filter(row => row.status === 'Disbursed' && row.disbursedOn).map(row => ({
      id: row.id, date: row.disbursedOn!, reference: row.id, type: row.kind + ' disbursement',
      department: data.staff.find(employee => employee.id === row.employeeId)?.subject ?? 'Payroll', amount: -row.amount,
    })),
    ...(data.expenses ?? []),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export function fiscalEntries(data: SchoolFinance, startYear: number) {
  return cashEntries(data).filter(row => row.date >= startYear + '-04-01' && row.date < (startYear + 1) + '-04-01');
}

export function totals(entries: CashEntry[]) {
  const receipts = round(entries.reduce((sum, row) => sum + Math.max(0, row.amount), 0));
  const outflows = round(entries.reduce((sum, row) => sum + Math.max(0, -row.amount), 0));
  return { receipts, outflows, net: round(receipts - outflows) };
}
