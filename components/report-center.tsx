'use client';

import { useState } from 'react';
import { AS_OF, studentLedger, type SchoolFinance } from '@/lib/school-finance';
import { categoryBalance, defaultLeaveRules, loanOutstanding } from '@/lib/hr';
import { downloadCSV } from './finance-ui';
import { useInstitution } from './institution';
import {
  downloadPaymentHistoryPDF,
  downloadLeaveReportPDF,
  downloadAttendanceReportPDF,
  downloadPayrollRegisterPDF,
  downloadFinancialReportPDF,
} from '@/lib/pdf-documents';
import { SimplePDF, triggerPDFDownload } from '@/lib/pdf-generator';
import { Download } from 'lucide-react';

type Cell = string | number;

export default function ReportCenter({ data, canSeePayroll }: { data: SchoolFinance; canSeePayroll: boolean }) {
  const campus = useInstitution();
  const [period, setPeriod] = useState(AS_OF.slice(0, 7));
  const [selected, setSelected] = useState('Fee balances');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const students = new Map(data.students.map(student => [student.id, student]));
  const employees = new Map(data.staff.map(employee => [employee.id, employee]));
  const payments = data.payments.filter(row => !period || row.date.startsWith(period));
  const leave = data.leaves.filter(row => !period || row.from.startsWith(period));
  const payroll = (data.payroll ?? []).filter(row => !period || row.period === period);
  const ledgers = data.students.map(student => ({ student, ledger: studentLedger(student, data.payments) }));

  const balanceRows = (rows: typeof ledgers) =>
    rows.map(({ student, ledger }) => [
      student.id,
      student.name,
      student.class,
      student.batch ?? '',
      ledger.total,
      ledger.paid,
      ledger.due,
      ledger.remaining,
    ]);
  const balanceHeaders = ['ID', 'Student', 'Class / programme', 'Batch', 'Payable', 'Net received', 'Due now', 'Remaining'];

  const reports: Record<string, Cell[][]> = {
    'Fee balances': [balanceHeaders, ...balanceRows(ledgers)],
    'Fee defaulters': [balanceHeaders, ...balanceRows(ledgers.filter(row => row.ledger.due > 0))],
    'Receipt and refund register': [
      ['Reference', 'Date', 'Student', 'Class / programme', 'Batch', 'Method', 'Amount', 'Status'],
      ...payments.map(row => [
        row.reference,
        row.date,
        students.get(row.studentId)?.name ?? row.studentId,
        students.get(row.studentId)?.class ?? '',
        students.get(row.studentId)?.batch ?? '',
        row.method,
        row.amount,
        row.inactiveStatus ?? (row.refundFor ? 'Refund' : row.verified ? 'Verified' : 'Pending'),
      ]),
    ],
    'Collection by payment mode': [
      ['Mode', 'Verified receipts', 'Refunds', 'Net receipts'],
      ...[...new Set(payments.map(row => row.method))].map(method => {
        const rows = payments.filter(row => row.verified && row.method === method);
        const received = rows.filter(row => !row.refundFor).reduce((total, row) => total + row.amount, 0);
        const refunded = -rows.filter(row => row.refundFor).reduce((total, row) => total + row.amount, 0);
        return [method, received, refunded, received - refunded];
      }),
    ],
    'Collection by programme and batch': [
      ['Class / programme', 'Batch', 'Net receipts'],
      ...[...new Set(data.students.map(row => row.class + '/' + (row.batch ?? '')))].map(key => {
        const [group, batch] = key.split('/');
        const ids = new Set(data.students.filter(row => row.class === group && (row.batch ?? '') === batch).map(row => row.id));
        return [group, batch, payments.filter(row => row.verified && ids.has(row.studentId)).reduce((sum, row) => sum + row.amount, 0)];
      }),
    ],
    'Fee adjustments and scholarships': [
      ['Student', 'Date', 'Type', 'Reason', 'Amount'],
      ...data.students.flatMap(student =>
        (student.adjustments ?? []).filter(row => !period || row.date.startsWith(period)).map(row => [
          student.name,
          row.date,
          row.category,
          row.label,
          row.amount,
        ])
      ),
    ],
    'Bank reconciliation': [
      ['Reference', 'Date', 'Amount'],
      ...(data.reconciliations ?? []).filter(row => !period || row.date.startsWith(period)).map(row => [row.reference, row.date, row.amount]),
    ],
  };

  if (canSeePayroll)
    Object.assign(reports, {
      'Employee directory': [
        ['ID', 'Name', 'Department', 'Designation', 'Employment'],
        ...data.staff.map(row => [row.id, row.name, row.subject, row.designation ?? 'Faculty', row.employment ?? 'Permanent']),
      ],
      'Employee attendance': [
        ['Employee', 'Department', 'Date', 'Status'],
        ...(data.employeeAttendance ?? []).filter(row => !period || row.date.startsWith(period)).map(row => [
          employees.get(row.employeeId)?.name ?? row.employeeId,
          employees.get(row.employeeId)?.subject ?? '',
          row.date,
          row.status,
        ]),
      ],
      'Leave approvals': [
        ['Employee', 'Category', 'Date', 'Days', 'Paid treatment', 'Status'],
        ...leave.map(row => [
          employees.get(row.staffId)?.name ?? row.staffId,
          row.category,
          row.from,
          row.chargedDays ?? row.days,
          row.kind,
          row.status,
        ]),
      ],
      'Leave balances': [
        ['Employee', 'Category', 'Available days'],
        ...data.staff.flatMap(employee =>
          (data.leaveRules ?? defaultLeaveRules).filter(rule => rule.paid).map(rule => [
            employee.name,
            rule.name,
            categoryBalance(data, employee.id, rule.name, period ? period + '-01' : AS_OF),
          ])
        ),
      ],
      'Leave encashment': [
        ['Employee', 'Category', 'Month', 'Days', 'Amount', 'Status'],
        ...(data.encashments ?? []).filter(row => !period || row.period === period).map(row => [
          employees.get(row.employeeId)?.name ?? row.employeeId,
          row.category,
          row.period,
          row.days,
          row.amount,
          row.status,
        ]),
      ],
      'Payroll and payslip register': [
        ['Employee', 'Department', 'Period', 'Gross', 'Paid days', 'Unpaid days', 'Deductions', 'Net', 'Status'],
        ...payroll.map(row => [
          row.name,
          row.department,
          row.period,
          row.gross,
          row.calculation.paidDays,
          row.calculation.unpaidDays,
          row.calculation.deduction,
          row.calculation.net,
          row.status,
        ]),
      ],
      'Salary transfers': [
        ['Employee', 'Department', 'Period', 'Batch', 'Method', 'Net', 'Status', 'Reference'],
        ...payroll.filter(row => row.batch).map(row => [
          row.name,
          row.department,
          row.period,
          row.batch ?? '',
          row.mode ?? 'NEFT',
          row.calculation.net,
          row.status,
          row.reference ?? '',
        ]),
      ],
      'Failed salary transfers': [
        ['Employee', 'Period', 'Batch', 'Net'],
        ...payroll.filter(row => row.status === 'Failed').map(row => [row.name, row.period, row.batch ?? '', row.calculation.net]),
      ],
      'Advances and loans': [
        ['Employee', 'Type', 'First recovery month', 'Status', 'Principal', 'Outstanding'],
        ...(data.employeeLoans ?? []).map(row => [
          employees.get(row.employeeId)?.name ?? row.employeeId,
          row.kind,
          row.firstPeriod,
          row.status,
          row.amount,
          loanOutstanding(data, row),
        ]),
      ],
    });

  const [headers, ...rows] = reports[selected] ?? reports['Fee balances'];
  const matching = rows.filter(row => row.join(' ').toLowerCase().includes(query.toLowerCase()));

  function handlePDFDownload() {
    if (selected === 'Receipt and refund register' || selected.startsWith('Collection')) {
      downloadPaymentHistoryPDF({
        campusName: campus.name,
        title: selected.toUpperCase(),
        payments,
        students: data.students,
      });
      return;
    }
    if (selected === 'Leave approvals' || selected === 'Leave balances' || selected === 'Leave encashment') {
      downloadLeaveReportPDF({
        campusName: campus.name,
        leaves: leave,
        staff: data.staff,
        period,
      });
      return;
    }
    if (selected === 'Employee attendance') {
      const records = (data.employeeAttendance ?? [])
        .filter(row => !period || row.date.startsWith(period))
        .map(row => ({
          name: employees.get(row.employeeId)?.name ?? row.employeeId,
          id: row.employeeId,
          group: employees.get(row.employeeId)?.subject ?? '',
          status: row.status,
        }));
      downloadAttendanceReportPDF({
        campusName: campus.name,
        title: 'Employee Attendance Register',
        date: period || AS_OF,
        records,
      });
      return;
    }
    if (selected.includes('Payroll') || selected.includes('Salary') || selected === 'Failed salary transfers') {
      downloadPayrollRegisterPDF({
        campusName: campus.name,
        period: period || AS_OF.slice(0, 7),
        records: payroll,
      });
      return;
    }

    // Generic tabular report PDF generator
    const pdf = new SimplePDF();
    const y = pdf.drawHeader(campus.name, selected.toUpperCase(), 'OFFICIAL INSTITUTIONAL REPORT');
    pdf.drawTable(y, headers.map(String), matching.map(r => r.map(String)));
    pdf.drawFooter();
    triggerPDFDownload(`${selected.toLowerCase().replaceAll(' ', '-')}.pdf`, pdf.output());
  }

  return (
    <section className="card">
      <div className="premium-card-heading">
        <div>
          <h3>Institutional Reports &amp; Registers</h3>
          <p>Audit and export real-time dynamic records stored in this workspace.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button primary" onClick={handlePDFDownload}>
            <Download size={14} /> Download PDF Report
          </button>
          <button
            className="button secondary"
            onClick={() =>
              downloadCSV(selected.toLowerCase().replaceAll(' ', '-') + '.csv', [headers, ...matching])
            }
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>
      <div className="list-toolbar">
        <label>
          Report
          <select
            value={selected}
            onChange={event => {
              setSelected(event.target.value);
              setPage(0);
            }}
          >
            {Object.keys(reports).map(name => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Month
          <input
            type="month"
            value={period}
            onChange={event => {
              setPeriod(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          Search
          <input
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      <div className="table-wrap mobile-scroll-table" role="region" aria-label={selected} tabIndex={0}>
        <table>
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matching.slice(page * 15, page * 15 + 15).map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) => (
                  <td key={column}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!matching.length && <p className="empty-state">No records match this report.</p>}
      <div className="list-toolbar">
        <button className="button secondary" disabled={!page} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page + 1} of {Math.max(1, Math.ceil(matching.length / 15))}
        </span>
        <button
          className="button secondary"
          disabled={(page + 1) * 15 >= matching.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
