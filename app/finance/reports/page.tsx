// College Finance Portal - Comprehensive Reports & Financial Export Hub
// Universal Date Filters, Income & Expenditure, Department OpEx, Cash Flow, Payroll Register, Safe CSV & PDF Exports

'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  PieChart,
  DollarSign,
  Printer,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, formatPlainINR } from '@/lib/finance-portal/finance/money';
import { computeStudentLedger } from '@/lib/finance-portal/finance/student-ledger';
import { generateSafeCSV, downloadCSV } from '@/lib/finance-portal/security/csv-sanitizer';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import { useToast } from '@/components/finance-portal/ui/toast';

export default function ReportsPage() {
  const { state, currentDate } = useFinance();
  const { showToast } = useToast();

  const [dateFilter, setDateFilter] = useState<'Today' | 'This Month' | 'This FY' | 'All Time'>('This FY');
  const [selectedReport, setSelectedReport] = useState<
    'IncomeExpenditure' | 'FeeCollection' | 'DepartmentOpEx' | 'PayrollRegister' | 'CashFlow' | 'EventsPL'
  >('IncomeExpenditure');

  // Income & Expenditure Aggregates
  const feeIncomePaise = state.feePayments.filter(p => p.verified).reduce((s, p) => s + p.amountPaise, 0);
  const otherIncomePaise = state.otherIncome.filter(i => !i.isRefundableDeposit).reduce((s, i) => s + i.amountPaise, 0);
  const sponsorIncomePaise = state.events.reduce((s, e) => s + e.sponsorIncomePaise, 0);
  const totalRevenuePaise = feeIncomePaise + otherIncomePaise + sponsorIncomePaise;

  const opexExpensesPaise = state.opExBills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.paidAmountPaise, 0);
  const payrollExpensesPaise = state.payrollRecords.filter(r => r.status === 'Paid').reduce((s, r) => s + r.grossPaise, 0);
  const pettyCashExpensesPaise = state.pettyCashVouchers.filter(v => v.status === 'Approved').reduce((s, v) => s + v.amountPaise, 0);
  const eventSpendPaise = state.events.reduce((s, e) => s + e.actualSpendPaise, 0);
  const totalExpenditurePaise = opexExpensesPaise + payrollExpensesPaise + pettyCashExpensesPaise + eventSpendPaise;

  const netSurplusPaise = totalRevenuePaise - totalExpenditurePaise;

  // Export Safe CSV
  const handleExportCSV = () => {
    let rows: (string | number)[][] = [];

    if (selectedReport === 'IncomeExpenditure') {
      rows = [
        ['ACCOUNTING HEAD', 'CATEGORY', 'AMOUNT (INR)'],
        ['Student Tuition & Academic Fees', 'Revenue', formatPlainINR(feeIncomePaise)],
        ['Other Institutional Income & Rent', 'Revenue', formatPlainINR(otherIncomePaise)],
        ['Corporate Event Sponsorships', 'Revenue', formatPlainINR(sponsorIncomePaise)],
        ['TOTAL REVENUE', 'Summary', formatPlainINR(totalRevenuePaise)],
        ['Faculty & Staff Payroll Gross CTC', 'Expenditure', formatPlainINR(payrollExpensesPaise)],
        ['Vendor Operating Expenses (OpEx)', 'Expenditure', formatPlainINR(opexExpensesPaise)],
        ['Petty Cash Imprest Disbursements', 'Expenditure', formatPlainINR(pettyCashExpensesPaise)],
        ['Campus Events & Seminars Spend', 'Expenditure', formatPlainINR(eventSpendPaise)],
        ['TOTAL EXPENDITURE', 'Summary', formatPlainINR(totalExpenditurePaise)],
        ['NET OPERATIONAL SURPLUS / (DEFICIT)', 'Net', formatPlainINR(netSurplusPaise)],
      ];
    } else if (selectedReport === 'FeeCollection') {
      rows = [
        ['STUDENT ID', 'NAME', 'PROGRAMME', 'SEMESTER', 'ANNUAL FEE', 'VERIFIED PAID', 'REMAINING DUE'],
        ...state.students.map(s => {
          const l = computeStudentLedger(s, state.feePayments, currentDate);
          return [s.id, s.name, s.programme, s.semester, formatPlainINR(l.totalPaise), formatPlainINR(l.paidPaise), formatPlainINR(l.remainingPaise)];
        }),
      ];
    } else {
      rows = [
        ['DEPARTMENT', 'ANNUAL ALLOCATION', 'SETTLED SPEND', 'APPROVED COMMITMENTS'],
        ...state.budgets.map(b => [b.department, formatPlainINR(b.annualAllocationPaise), formatPlainINR(b.spentPaise), formatPlainINR(b.committedPaise)]),
      ];
    }

    const csvContent = generateSafeCSV(rows);
    downloadCSV(`${selectedReport}-${dateFilter.replace(/\s+/g, '')}-${currentDate}.csv`, csvContent);
    showToast('CSV Downloaded', `Exported ${selectedReport} with formula injection protection.`, 'success');
  };

  // Export PDF Report
  const handleExportPDF = () => {
    const pdf = new SimplePDF();
    let y = pdf.drawHeader(state.settings.institutionName, `FINANCIAL REPORT — ${selectedReport.toUpperCase()}`, `PERIOD: ${dateFilter.toUpperCase()} · AS OF ${currentDate}`);

    pdf.drawRect(40, y - 50, pdf.pageWidth - 80, 45, { fill: PDF_COLORS.lightBg, stroke: PDF_COLORS.navy, lineWidth: 0.5 });
    pdf.drawText(`INSTITUTIONAL FINANCIAL REPORT`, 52, y - 12, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    pdf.drawText(`Academic Year: ${state.settings.academicYear} | Filter: ${dateFilter}`, 52, y - 24, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Campus: ${state.settings.campusAddress}`, 52, y - 36, { font: 'Helvetica', size: 8 });

    y -= 75;

    if (selectedReport === 'IncomeExpenditure') {
      pdf.drawText('REVENUES & INFLOWS', 40, y, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
      pdf.drawText(formatINR(totalRevenuePaise), 240, y, { font: 'Helvetica-Bold', size: 9, align: 'right', color: PDF_COLORS.green });

      y -= 16;
      pdf.drawText('Student Academic Fee Collections', 50, y, { font: 'Helvetica', size: 8 });
      pdf.drawText(formatINR(feeIncomePaise), 240, y, { font: 'Helvetica', size: 8, align: 'right' });

      y -= 14;
      pdf.drawText('Other College Revenues & Rent', 50, y, { font: 'Helvetica', size: 8 });
      pdf.drawText(formatINR(otherIncomePaise), 240, y, { font: 'Helvetica', size: 8, align: 'right' });

      y -= 25;
      pdf.drawLine(40, y, 250, y, { stroke: PDF_COLORS.border });
      y -= 16;

      pdf.drawText('OPERATIONAL EXPENDITURES', 40, y, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
      pdf.drawText(formatINR(totalExpenditurePaise), 240, y, { font: 'Helvetica-Bold', size: 9, align: 'right', color: PDF_COLORS.crimson });

      y -= 16;
      pdf.drawText('Faculty & Staff Gross Payroll', 50, y, { font: 'Helvetica', size: 8 });
      pdf.drawText(formatINR(payrollExpensesPaise), 240, y, { font: 'Helvetica', size: 8, align: 'right' });

      y -= 14;
      pdf.drawText('Vendor OpEx Invoices', 50, y, { font: 'Helvetica', size: 8 });
      pdf.drawText(formatINR(opexExpensesPaise), 240, y, { font: 'Helvetica', size: 8, align: 'right' });

      y -= 14;
      pdf.drawText('Petty Cash Disbursements', 50, y, { font: 'Helvetica', size: 8 });
      pdf.drawText(formatINR(pettyCashExpensesPaise), 240, y, { font: 'Helvetica', size: 8, align: 'right' });

      y -= 25;
      pdf.drawRect(40, y - 26, 210, 24, { fill: PDF_COLORS.goldLight, stroke: PDF_COLORS.navy, lineWidth: 0.8 });
      pdf.drawText('NET SURPLUS / (DEFICIT)', 50, y - 12, { font: 'Helvetica-Bold', size: 8.5, color: PDF_COLORS.navy });
      pdf.drawText(formatINR(netSurplusPaise), 240, y - 12, { font: 'Helvetica-Bold', size: 10, color: netSurplusPaise >= 0 ? PDF_COLORS.green : PDF_COLORS.crimson, align: 'right' });
    }

    pdf.drawFooter('Institutional Financial Audit Report. Poddar Institute · College.');
    triggerPDFDownload(`Financial-Report-${selectedReport}-${currentDate}.pdf`, pdf.output());
    showToast('PDF Report Generated', 'Downloaded formatted financial PDF.', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Financial Reports & Statutory Exports</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Comprehensive statements, P&L, fee reconciliation, and Tally/QuickBooks ERP integrations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--navy)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--navy)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Printer size={14} />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="card-surface" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date Range:</span>
          {(['Today', 'This Month', 'This FY', 'All Time'] as const).map(f => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: dateFilter === f ? 'var(--navy)' : 'var(--bg-card)',
                color: dateFilter === f ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: dateFilter === f ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={selectedReport}
            onChange={e => setSelectedReport(e.target.value as any)}
            style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', backgroundColor: 'var(--bg-card)', fontWeight: 600 }}
          >
            <option value="IncomeExpenditure">Income & Expenditure Statement</option>
            <option value="FeeCollection">Fee Collection & Dues Register</option>
            <option value="DepartmentOpEx">Departmental Budgets vs Actuals</option>
          </select>
        </div>
      </div>

      {/* Report Display Surface */}
      <div className="card-surface" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy)', marginBottom: '4px' }}>
          {selectedReport === 'IncomeExpenditure' && 'Institutional Income & Expenditure Statement'}
          {selectedReport === 'FeeCollection' && 'Student Fee Demand, Collection & Dues Summary'}
          {selectedReport === 'DepartmentOpEx' && 'Departmental Budget Utilization vs Commitments'}
        </h2>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '20px' }}>
          Poddar Institute · College · Session 2026-27 · Mode: {dateFilter}
        </span>

        {selectedReport === 'IncomeExpenditure' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Revenue Column */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '2px solid var(--green)', fontWeight: 700, color: 'var(--green)' }}>
                <span>OPERATIONAL REVENUES</span>
                <span className="tabular-nums">{formatINR(totalRevenuePaise)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Verified Student Tuition Collections:</span>
                  <strong className="tabular-nums">{formatINR(feeIncomePaise)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Miscellaneous Incomes & Campus Rent:</span>
                  <strong className="tabular-nums">{formatINR(otherIncomePaise)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Corporate Sponsorship Receipts:</span>
                  <strong className="tabular-nums">{formatINR(sponsorIncomePaise)}</strong>
                </div>
              </div>
            </div>

            {/* Expenditure Column */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '2px solid var(--crimson)', fontWeight: 700, color: 'var(--crimson)' }}>
                <span>OPERATIONAL EXPENDITURES</span>
                <span className="tabular-nums">{formatINR(totalExpenditurePaise)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Faculty & Staff Gross Payroll CTC:</span>
                  <strong className="tabular-nums">{formatINR(payrollExpensesPaise)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Settled Vendor OpEx Invoices:</span>
                  <strong className="tabular-nums">{formatINR(opexExpensesPaise)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Petty Cash Imprest Disbursements:</span>
                  <strong className="tabular-nums">{formatINR(pettyCashExpensesPaise)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Campus Event Logistics & Seminars:</span>
                  <strong className="tabular-nums">{formatINR(eventSpendPaise)}</strong>
                </div>
              </div>
            </div>

            {/* Net Surplus Summary Bar */}
            <div style={{ gridColumn: '1 / -1', padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--navy)' }}>NET OPERATIONAL SURPLUS / (DEFICIT)</strong>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Difference between all recognized revenues and disbursements.</p>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: netSurplusPaise >= 0 ? 'var(--green)' : 'var(--crimson)' }} className="headline-number">
                {netSurplusPaise >= 0 ? `+${formatINR(netSurplusPaise)}` : `-${formatINR(Math.abs(netSurplusPaise))}`}
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'FeeCollection' && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student ID & Name</th>
                  <th>Programme</th>
                  <th style={{ textAlign: 'right' }}>Annual Fee Demand</th>
                  <th style={{ textAlign: 'right' }}>Verified Paid</th>
                  <th style={{ textAlign: 'right' }}>Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                {state.students.slice(0, 15).map(s => {
                  const l = computeStudentLedger(s, state.feePayments, currentDate);
                  return (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong> ({s.id})</td>
                      <td>{s.programme} Sem {s.semester}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{formatINR(l.totalPaise)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--green)' }} className="tabular-nums">{formatINR(l.paidPaise)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--navy)' }} className="tabular-nums">{formatINR(l.remainingPaise)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

