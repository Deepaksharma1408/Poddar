// College Finance Portal - Executive Dashboard
// Features College-Wide "Collected vs Outstanding" Bar, Key Metric Tiles, and Spend Breakdown

'use client';

import React from 'react';
import Link from 'next/link';
import {
  Wallet,
  AlertCircle,
  Banknote,
  Receipt,
  Truck,
  Coins,
  TrendingUp,
  ArrowUpRight,
  PlusCircle,
  FileCheck2,
  Calendar,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toRupees } from '@/lib/finance-portal/finance/money';
import { computeStudentLedger } from '@/lib/finance-portal/finance/student-ledger';

export default function DashboardPage() {
  const { state, currentDate } = useFinance();

  // 1. Calculate College-Wide Collected vs Outstanding Fee Metrics
  let totalFeeDemandPaise = 0;
  let totalFeeCollectedPaise = 0;
  let totalFeeOutstandingPaise = 0;
  let totalOverdueDuesPaise = 0;

  state.students.forEach(student => {
    const ledger = computeStudentLedger(student, state.feePayments, currentDate);
    totalFeeDemandPaise += ledger.totalPaise;
    totalFeeCollectedPaise += ledger.paidPaise;
    totalFeeOutstandingPaise += ledger.remainingPaise;
    totalOverdueDuesPaise += ledger.dueNowPaise;
  });

  const collectionRatePct = totalFeeDemandPaise > 0
    ? Math.round((totalFeeCollectedPaise / totalFeeDemandPaise) * 100)
    : 0;

  // 2. Vendor Liabilities (Approved unpaid or partially paid OpEx bills)
  const vendorLiabilitiesPaise = state.opExBills
    .filter(b => b.status === 'Approved' || b.status === 'Partially Paid')
    .reduce((sum, b) => sum + (b.netPayablePaise - b.paidAmountPaise), 0);

  // 3. Monthly Payroll Estimates (Active staff base CTC)
  const monthlyPayrollGrossPaise = state.employees
    .filter(e => e.status === 'Active')
    .reduce(
      (sum, e) =>
        sum +
        (e.baseSalaryPaise +
          e.hraPaise +
          e.daPaise +
          e.specialAllowancePaise +
          e.conveyancePaise),
      0
    );

  // 4. Petty Cash Spent vs Remaining
  const pettyCashSpentPaise = state.pettyCashVouchers
    .filter(v => v.status === 'Approved')
    .reduce((sum, v) => sum + v.amountPaise, 0);
  const pettyCashFloatPaise = state.settings.statutory.pettyCashFloatPaise;
  const pettyCashAvailablePaise = Math.max(0, pettyCashFloatPaise - pettyCashSpentPaise);

  // 5. OpEx Total Spent to date
  const opexSpentPaise = state.opExBills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + b.paidAmountPaise, 0);

  // 6. Events Total Spend
  const eventsSpendPaise = state.events.reduce((sum, e) => sum + e.actualSpendPaise, 0);

  // Spend Distribution Totals
  const totalExpenditurePaise = monthlyPayrollGrossPaise + opexSpentPaise + pettyCashSpentPaise + eventsSpendPaise;
  const payrollSpendPct = totalExpenditurePaise > 0 ? Math.round((monthlyPayrollGrossPaise / totalExpenditurePaise) * 100) : 0;
  const opexSpendPct = totalExpenditurePaise > 0 ? Math.round((opexSpentPaise / totalExpenditurePaise) * 100) : 0;
  const pettySpendPct = totalExpenditurePaise > 0 ? Math.round((pettyCashSpentPaise / totalExpenditurePaise) * 100) : 0;
  const eventsSpendPct = Math.max(0, 100 - (payrollSpendPct + opexSpendPct + pettySpendPct));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            College Financial Overview
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Live institutional revenue, operational commitments, and liquidity status
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/finance/fees"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'var(--navy)',
              color: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <PlusCircle size={15} />
            <span>Record Fee Payment</span>
          </Link>

          <Link
            href="/finance/expenses"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--navy)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Receipt size={15} />
            <span>Log Vendor Bill</span>
          </Link>
        </div>
      </div>

      {/* FEATURE 1: Strong College-Wide "Collected vs Outstanding" Bar */}
      <div
        className="card-surface"
        style={{
          padding: '24px',
          background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-subtle) 100%)',
          border: '1px solid var(--border)',
          borderTop: '4px solid var(--navy)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Academic Session 2026-27 Revenue Progress
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--navy)', marginTop: '2px' }}>
              {formatINR(totalFeeCollectedPaise)}
              <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '8px' }}>
                collected of {formatINR(totalFeeDemandPaise)} target
              </span>
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '18px', textAlign: 'right' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Outstanding</span>
              <strong style={{ fontSize: '17px', color: 'var(--navy)', fontFamily: 'var(--font-serif)' }}>
                {formatINR(totalFeeOutstandingPaise)}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--crimson)', display: 'block' }}>Overdue Now</span>
              <strong style={{ fontSize: '17px', color: 'var(--crimson)', fontFamily: 'var(--font-serif)' }}>
                {formatINR(totalOverdueDuesPaise)}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--green)', display: 'block' }}>Collection Rate</span>
              <strong style={{ fontSize: '17px', color: 'var(--green)', fontFamily: 'var(--font-serif)' }}>
                {collectionRatePct}%
              </strong>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div
          style={{
            height: '14px',
            backgroundColor: 'var(--border)',
            borderRadius: '7px',
            overflow: 'hidden',
            display: 'flex',
            margin: '12px 0 8px',
          }}
        >
          <div
            style={{
              width: `${collectionRatePct}%`,
              backgroundColor: 'var(--navy)',
              borderRadius: '7px 0 0 7px',
              transition: 'width 0.4s ease',
            }}
            title={`Verified Collected: ${collectionRatePct}%`}
          />
          <div
            style={{
              width: `${Math.min(100 - collectionRatePct, Math.round((totalOverdueDuesPaise / (totalFeeDemandPaise || 1)) * 100))}%`,
              backgroundColor: 'var(--crimson)',
            }}
            title="Overdue Dues"
          />
          <div
            style={{
              flex: 1,
              backgroundColor: 'var(--gold-light)',
            }}
            title="Upcoming Future Dues"
          />
        </div>

        <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--navy)' }} />
            <span>Verified Paid ({collectionRatePct}%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--crimson)' }} />
            <span>Immediate Overdue</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--gold)' }} />
            <span>Upcoming Installments</span>
          </div>
        </div>
      </div>

      {/* FEATURE 2: Key Operational Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {/* Monthly Payroll */}
        <div className="card-surface" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>MONTHLY PAYROLL CTC</span>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }} className="headline-number">
                {formatINR(monthlyPayrollGrossPaise)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {state.employees.filter(e => e.status === 'Active').length} Active Employees
              </span>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--navy-light)', color: 'var(--navy)' }}>
              <Banknote size={20} />
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '11px' }}>
            <Link href="/finance/payroll" style={{ color: 'var(--navy)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Open Payroll Register</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        {/* Vendor Liabilities */}
        <div className="card-surface" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>VENDOR LIABILITIES</span>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--crimson)', marginTop: '4px' }} className="headline-number">
                {formatINR(vendorLiabilitiesPaise)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {state.opExBills.filter(b => b.status === 'Approved').length} Approved Unpaid Invoices
              </span>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--crimson-light)', color: 'var(--crimson)' }}>
              <Truck size={20} />
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '11px' }}>
            <Link href="/finance/expenses" style={{ color: 'var(--navy)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Review Approved Bills</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        {/* Petty Cash Imprest */}
        <div className="card-surface" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PETTY CASH FLOAT</span>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }} className="headline-number">
                {formatINR(pettyCashAvailablePaise)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Spent: {formatINR(pettyCashSpentPaise)} of {formatINR(pettyCashFloatPaise)}
              </span>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--green-light)', color: 'var(--green)' }}>
              <Coins size={20} />
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '11px' }}>
            <Link href="/finance/petty-cash" style={{ color: 'var(--navy)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Issue Voucher / Replenish</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        {/* Operating Expenditure Spent */}
        <div className="card-surface" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SETTLED OPEX INVOICES</span>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }} className="headline-number">
                {formatINR(opexSpentPaise)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {state.opExBills.filter(b => b.status === 'Paid').length} Fully Disbursed Bills
              </span>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--navy-light)', color: 'var(--navy)' }}>
              <Receipt size={20} />
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '11px' }}>
            <Link href="/finance/expenses" style={{ color: 'var(--navy)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>View Full OpEx Ledger</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* FEATURE 3: Spend Distribution (Including Payroll) & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Spend Distribution Chart */}
        <div className="card-surface" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>
              Institutional Spend Breakdown
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Total: {formatINR(totalExpenditurePaise)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Payroll slice */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>1. Faculty & Staff Payroll</span>
                <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {formatINR(monthlyPayrollGrossPaise)} ({payrollSpendPct}%)
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${payrollSpendPct}%`, height: '100%', backgroundColor: 'var(--navy)' }} />
              </div>
            </div>

            {/* OpEx slice */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>2. Operational Vendor Invoices</span>
                <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {formatINR(opexSpentPaise)} ({opexSpendPct}%)
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${opexSpendPct}%`, height: '100%', backgroundColor: 'var(--gold)' }} />
              </div>
            </div>

            {/* Events slice */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>3. Campus Events & Conferences</span>
                <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {formatINR(eventsSpendPaise)} ({eventsSpendPct}%)
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${eventsSpendPct}%`, height: '100%', backgroundColor: 'var(--green)' }} />
              </div>
            </div>

            {/* Petty Cash slice */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>4. Petty Cash Imprest Expenses</span>
                <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {formatINR(pettyCashSpentPaise)} ({pettySpendPct}%)
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pettySpendPct}%`, height: '100%', backgroundColor: '#6366f1' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Audit & Financial Events */}
        <div className="card-surface" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>
              Recent Audit Log Highlights
            </h3>
            <Link href="/finance/audit" style={{ fontSize: '11px', color: 'var(--navy)', textDecoration: 'none', fontWeight: 600 }}>
              Full Log ({state.auditLogs.length})
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {state.auditLogs.slice(0, 4).map(log => (
              <div
                key={log.id}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      {log.entity} · {log.action}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                    {log.summary}
                  </p>
                  <span style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: 600 }}>
                    Actor: {log.role} ({log.actorName})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

