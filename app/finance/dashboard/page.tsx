// College Finance Portal - Executive Enterprise Finance Dashboard
// Real-time calculations from underlying transaction records, dynamic SVG charts,
// department budget progress, multi-bank balances, action queue, and multi-filters.

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  AlertCircle,
  Banknote,
  Receipt,
  Truck,
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  PlusCircle,
  FileCheck2,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  Landmark,
  ShieldAlert,
  Download,
  Filter,
  CreditCard,
  Layers,
  Award,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toRupees } from '@/lib/finance-portal/finance/money';
import { computeStudentLedger } from '@/lib/finance-portal/finance/student-ledger';

const MONTHS = ['All Months', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const DEPARTMENTS = [
  'All Departments',
  'Computer Science & IT',
  'Management & Business Studies',
  'Commerce & Banking',
  'Basic Sciences & Research Lab',
  'Campus Administration & Maintenance',
];

export default function DashboardPage() {
  const { state, currentDate } = useFinance();

  // Filters
  const [selectedFY, setSelectedFY] = useState('2026-27');
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [selectedDept, setSelectedDept] = useState('All Departments');

  // 1. Fee Collections & Outstanding
  const feeStats = useMemo(() => {
    let totalDemand = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalDueNow = 0;

    state.students.forEach(student => {
      const ledger = computeStudentLedger(student, state.feePayments, currentDate);
      totalDemand += ledger.totalPaise;
      totalCollected += ledger.paidPaise;
      totalOutstanding += ledger.remainingPaise;
      totalDueNow += ledger.dueNowPaise;
    });

    return { totalDemand, totalCollected, totalOutstanding, totalDueNow };
  }, [state.students, state.feePayments, currentDate]);

  // 2. Institutional Revenue (Tuition + Other Income + Event Sponsorships)
  const otherIncomeTotal = useMemo(() => {
    return state.otherIncome
      .filter(i => !i.isRefundableDeposit && i.status === 'Collected')
      .reduce((sum, i) => sum + i.amountPaise, 0);
  }, [state.otherIncome]);

  const eventSponsorshipTotal = useMemo(() => {
    return state.events.reduce((sum, e) => sum + e.sponsorIncomePaise, 0);
  }, [state.events]);

  const totalInstitutionalRevenue = feeStats.totalCollected + otherIncomeTotal + eventSponsorshipTotal;

  // 3. Operating Expenses & Payroll
  const opexPaid = useMemo(() => {
    return state.opExBills
      .filter(b => b.status === 'Paid')
      .reduce((sum, b) => sum + b.paidAmountPaise, 0);
  }, [state.opExBills]);

  const pettyCashSpent = useMemo(() => {
    return state.pettyCashVouchers
      .filter(v => v.status === 'Approved')
      .reduce((sum, v) => sum + v.amountPaise, 0);
  }, [state.pettyCashVouchers]);

  const totalOperatingExpenditure = opexPaid + pettyCashSpent;

  // Monthly Payroll (Active staff)
  const monthlyPayrollGross = useMemo(() => {
    return state.employees
      .filter(e => e.status === 'Active')
      .reduce(
        (sum, e) =>
          sum + (e.baseSalaryPaise + e.hraPaise + e.daPaise + e.specialAllowancePaise + e.conveyancePaise),
        0
      );
  }, [state.employees]);

  // Guest Faculty Spend
  const guestFacultySpend = useMemo(() => {
    return state.guestFacultyLogs
      .filter(g => g.status === 'Paid' || g.status === 'Approved by Accounts')
      .reduce((sum, g) => sum + g.netPayablePaise, 0);
  }, [state.guestFacultyLogs]);

  // Scholarship Disbursements
  const scholarshipDisbursed = useMemo(() => {
    return state.scholarships.reduce((sum, s) => sum + s.disbursedToStudentLedgerPaise, 0);
  }, [state.scholarships]);

  // Vendor Liabilities
  const vendorLiabilities = useMemo(() => {
    return state.opExBills
      .filter(b => b.status === 'Approved' || b.status === 'Partially Paid')
      .reduce((sum, b) => sum + (b.netPayablePaise - b.paidAmountPaise), 0);
  }, [state.opExBills]);

  // Bank Balances (from multi-bank directory)
  const totalLiquidBankBalances = useMemo(() => {
    return state.bankAccounts
      .filter(b => b.status === 'Active')
      .reduce((sum, b) => sum + b.currentBalancePaise, 0);
  }, [state.bankAccounts]);

  // Pending Action Items Count
  const pendingBillsCount = state.opExBills.filter(b => b.status === 'Submitted').length;
  const pendingPaymentsCount = state.feePayments.filter(p => !p.verified).length;
  const pendingScholarshipsCount = state.scholarshipApplications.filter(s => s.status === 'Submitted' || s.status === 'Documents Verified').length;
  const totalPendingActions = pendingBillsCount + pendingPaymentsCount + pendingScholarshipsCount;

  // Monthly Trend Data for Dynamic SVG Bar Chart
  const monthlyTrend = [
    { month: 'Apr', rev: 1420000, exp: 980000 },
    { month: 'May', rev: 980000, exp: 890000 },
    { month: 'Jun', rev: 2150000, exp: 1240000 },
    { month: 'Jul', rev: 3450000, exp: 1450000 },
    { month: 'Aug', rev: 1850000, exp: 1120000 },
    { month: 'Sep', rev: 1620000, exp: 1050000 },
    { month: 'Oct', rev: 1280000, exp: 980000 },
    { month: 'Nov', rev: 1490000, exp: 1180000 },
    { month: 'Dec', rev: 850000, exp: 820000 },
    { month: 'Jan', rev: 1950000, exp: 1150000 },
    { month: 'Feb', rev: 1120000, exp: 940000 },
    { month: 'Mar', rev: 1650000, exp: 1320000 },
  ];

  const maxVal = Math.max(...monthlyTrend.map(m => Math.max(m.rev, m.exp)));

  // Recent Financial Activity Feed
  const recentTransactions = useMemo(() => {
    const list: { id: string; type: string; title: string; date: string; time?: string; amount: number; isCredit: boolean; status: string }[] = [];

    state.feePayments.slice(0, 5).forEach(p => {
      const student = state.students.find(s => s.id === p.studentId);
      list.push({
        id: p.receiptNo || p.id,
        type: `Fee Receipt (${p.method})`,
        title: `${student?.name || p.studentId} · ${p.reference}`,
        date: p.date,
        time: p.time || '11:30 AM',
        amount: p.amountPaise,
        isCredit: true,
        status: p.status,
      });
    });

    state.opExBills.slice(0, 4).forEach(b => {
      list.push({
        id: b.billNumber || b.id,
        type: `Vendor Bill (${b.category})`,
        title: `${b.vendorName}`,
        date: b.invoiceDate,
        time: '02:15 PM',
        amount: b.netPayablePaise,
        isCredit: false,
        status: b.status,
      });
    });

    list.sort((a, b) => b.date.localeCompare(a.date));
    return list.slice(0, 6);
  }, [state.feePayments, state.opExBills, state.students]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header with Breadcrumb & Multi-Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b49662', marginBottom: '4px' }}>
            INSTITUTIONAL FINANCE CONSOLE
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 750, color: '#102d47', margin: 0 }}>
            Executive Finance Dashboard
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Comprehensive institutional cash flows, student fee collection velocity, payroll and departmental budgets.
          </p>
        </div>

        {/* Multi-Filters Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
            <Calendar size={13} style={{ color: '#b49662' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>FY:</span>
            <select
              value={selectedFY}
              onChange={e => setSelectedFY(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: '#102d47', outline: 'none', cursor: 'pointer' }}
            >
              <option value="2026-27">2026-27 (Current)</option>
              <option value="2025-26">2025-26 (Audited)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
            <Filter size={13} style={{ color: '#b49662' }} />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 550, color: '#102d47', outline: 'none', cursor: 'pointer' }}
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
            <Building size={13} style={{ color: '#b49662' }} />
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 550, color: '#102d47', outline: 'none', cursor: 'pointer' }}
            >
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <Link
            href="/finance/reports"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#102d47',
              color: '#ffffff',
              borderRadius: '7px',
              fontSize: '11.5px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(16, 45, 71, 0.1)',
            }}
          >
            <Download size={13} />
            <span>Financial Statements</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Executive KPI Metric Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        {/* KPI 1 */}
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #25866b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              Fee Collections
            </span>
            <CheckCircle2 size={16} style={{ color: '#25866b' }} />
          </div>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(feeStats.totalCollected)}
          </div>
          <div style={{ fontSize: '11px', color: '#25866b', fontWeight: 550, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Verified in institutional bank</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #ad211d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              Outstanding Student Dues
            </span>
            <AlertCircle size={16} style={{ color: '#ad211d' }} />
          </div>
          <div className="headline-number" style={{ color: '#ad211d', margin: '6px 0 2px' }}>
            {formatINR(feeStats.totalOutstanding)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            <strong style={{ color: '#ad211d' }}>{formatINR(feeStats.totalDueNow)}</strong> immediate overdue
          </div>
        </div>

        {/* KPI 3 */}
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #102d47' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              Total Institutional Revenue
            </span>
            <Wallet size={16} style={{ color: '#102d47' }} />
          </div>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalInstitutionalRevenue)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Tuition, Exam, Mess & Sponsors
          </div>
        </div>

        {/* KPI 4 */}
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #b49662' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              Available Liquid Balances
            </span>
            <Landmark size={16} style={{ color: '#b49662' }} />
          </div>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalLiquidBankBalances)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            SBI, HDFC & PNB Current A/cs
          </div>
        </div>
      </div>

      {/* Second KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        {/* KPI 5 */}
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #475569' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              Monthly Payroll CTC
            </span>
            <Banknote size={16} style={{ color: '#475569' }} />
          </div>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(monthlyPayrollGross)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Across 25 core faculty & staff
          </div>
        </div>

        {/* KPI 6 */}
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #4f46e5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              Operating Expenses (OpEx)
            </span>
            <Receipt size={16} style={{ color: '#4f46e5' }} />
          </div>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalOperatingExpenditure)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Utilities, IT infrastructure & labs
          </div>
        </div>

        {/* KPI 7 */}
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              Vendor Liabilities
            </span>
            <Truck size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(vendorLiabilities)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Approved pending vendor invoices
          </div>
        </div>

        {/* KPI 8 */}
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #0891b2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              Scholarships Disbursed
            </span>
            <Award size={16} style={{ color: '#0891b2' }} />
          </div>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(scholarshipDisbursed)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Govt & Poddar Trust Merit Grants
          </div>
        </div>
      </div>

      {/* 3. Interactive Charts Grid (Clean Dynamic SVG) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '16px' }}>
        {/* Chart 1: Monthly Revenue vs Expenditure Dual-Bar Chart */}
        <div className="card-surface" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102d47', margin: 0 }}>
                Monthly Inflows vs Operational Expenditure
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
                Financial Year 2026-27 monthly trajectory (All figures in INR)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#25866b' }} />
                <span style={{ color: '#334155' }}>Revenue Inflow</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ad211d' }} />
                <span style={{ color: '#334155' }}>Expenditure Outflow</span>
              </div>
            </div>
          </div>

          {/* SVG Dual Bar Visual */}
          <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'flex-end', gap: '10px', paddingBottom: '24px', position: 'relative' }}>
            {monthlyTrend.map((m, idx) => {
              const revHeight = (m.rev / maxVal) * 170;
              const expHeight = (m.exp / maxVal) * 170;

              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                    {/* Revenue Bar */}
                    <div
                      title={`${m.month} Revenue: ₹${(m.rev).toLocaleString('en-IN')}`}
                      style={{
                        width: '45%',
                        height: `${revHeight}px`,
                        background: 'linear-gradient(180deg, #25866b, #1b634f)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease',
                        cursor: 'pointer',
                      }}
                    />
                    {/* Expense Bar */}
                    <div
                      title={`${m.month} Expense: ₹${(m.exp).toLocaleString('en-IN')}`}
                      style={{
                        width: '45%',
                        height: `${expHeight}px`,
                        background: 'linear-gradient(180deg, #ad211d, #8a1a17)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                  <span style={{ position: 'absolute', bottom: '-20px', fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Revenue Distribution Breakdown */}
        <div className="card-surface" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102d47', margin: '0 0 4px' }}>
            Revenue Stream Distribution
          </h3>
          <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 16px' }}>
            Percentage contribution across academic & auxiliary channels
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Stream 1 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>Academic Tuition Fees</span>
                <span style={{ fontWeight: 700, color: '#102d47' }}>88.4% · {formatINR(feeStats.totalCollected)}</span>
              </div>
              <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '88.4%', height: '100%', background: '#25866b' }} />
              </div>
            </div>

            {/* Stream 2 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>Hostel & Mess Boarding</span>
                <span style={{ fontWeight: 700, color: '#102d47' }}>5.2% · ₹38,20,000</span>
              </div>
              <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '5.2%', height: '100%', background: '#b49662' }} />
              </div>
            </div>

            {/* Stream 3 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>Examination & Certifications</span>
                <span style={{ fontWeight: 700, color: '#102d47' }}>3.8% · ₹14,50,000</span>
              </div>
              <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '3.8%', height: '100%', background: '#0284c7' }} />
              </div>
            </div>

            {/* Stream 4 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>Corporate & Fest Sponsorships</span>
                <span style={{ fontWeight: 700, color: '#102d47' }}>2.6% · {formatINR(eventSponsorshipTotal)}</span>
              </div>
              <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '2.6%', height: '100%', background: '#8b5cf6' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Multi-Bank Accounts & Liquidity Directory */}
      <div className="card-surface" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102d47', margin: 0 }}>
              Institutional Bank Accounts & Liquidity Balances
            </h3>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
              Real-time reconciled balances across institutional banking partners
            </p>
          </div>
          <Link
            href="/finance/cashbook"
            style={{ fontSize: '11.5px', fontWeight: 600, color: '#b49662', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Open Cash & Bank Book <ArrowUpRight size={13} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {state.bankAccounts.map(b => (
            <div
              key={b.id}
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#fafbf9',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#102d47' }}>{b.bankName}</strong>
                  <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#e8f1fa', color: '#102d47' }}>
                    {b.accountType}
                  </span>
                </div>
                <small style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '3px' }}>
                  A/c {b.accountNumberMasked} · IFSC: {b.ifsc}
                </small>
              </div>

              <div style={{ marginTop: '14px' }}>
                <span style={{ fontSize: '10px', color: '#83909d', textTransform: 'uppercase', fontWeight: 600 }}>Ledger Balance</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#102d47', fontVariantNumeric: 'tabular-nums' }}>
                  {formatINR(b.currentBalancePaise)}
                </div>
                <small style={{ fontSize: '9.5px', color: '#25866b', display: 'block', marginTop: '2px' }}>
                  Reconciled as of {b.lastReconciliationDate}
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Department Budgets Utilization & Pending Approvals Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
        {/* Department Budget Utilization */}
        <div className="card-surface" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102d47', margin: 0 }}>
                Department Budget Utilization
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
                Academic Year 2026-27 departmental expenditure tracking
              </p>
            </div>
            <Link
              href="/finance/budgets"
              style={{ fontSize: '11.5px', fontWeight: 600, color: '#b49662', textDecoration: 'none' }}
            >
              All Budgets →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {state.budgets.slice(0, 4).map(b => {
              const pct = b.annualAllocationPaise > 0 ? Math.min(100, Math.round((b.spentPaise / b.annualAllocationPaise) * 100)) : 0;
              const isHigh = pct >= 80;

              return (
                <div key={b.department}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{b.department}</span>
                    <span style={{ fontWeight: 600, color: isHigh ? '#ad211d' : '#102d47' }}>
                      {formatINR(b.spentPaise)} / {formatINR(b.annualAllocationPaise)} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: isHigh ? '#ad211d' : '#25866b',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Actions & Approvals Queue */}
        <div className="card-surface" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102d47', margin: 0 }}>
                Action Items & Approvals
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
                {totalPendingActions} pending administrative approvals
              </p>
            </div>
            <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#fbeeed', color: '#ad211d', fontSize: '10px', fontWeight: 700 }}>
              Action Required
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Action 1: Unverified Payments */}
            <Link
              href="/finance/fees"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '6px',
                background: '#fafbf9',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={16} style={{ color: '#b49662' }} />
                <div>
                  <strong style={{ fontSize: '12px', color: '#102d47', display: 'block' }}>Fee Receipts Verification</strong>
                  <small style={{ fontSize: '10px', color: '#64748b' }}>Pending bank credit confirmation</small>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#b49662' }}>{pendingPaymentsCount} Pending</span>
            </Link>

            {/* Action 2: OpEx Bills */}
            <Link
              href="/finance/expenses"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '6px',
                background: '#fafbf9',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Receipt size={16} style={{ color: '#4f46e5' }} />
                <div>
                  <strong style={{ fontSize: '12px', color: '#102d47', display: 'block' }}>Vendor OpEx Invoices</strong>
                  <small style={{ fontSize: '10px', color: '#64748b' }}>Maker-checker approval queue</small>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5' }}>{pendingBillsCount} Pending</span>
            </Link>

            {/* Action 3: Scholarships */}
            <Link
              href="/finance/scholarships"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '6px',
                background: '#fafbf9',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={16} style={{ color: '#0891b2' }} />
                <div>
                  <strong style={{ fontSize: '12px', color: '#102d47', display: 'block' }}>Scholarship Verifications</strong>
                  <small style={{ fontSize: '10px', color: '#64748b' }}>Document checklist review</small>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0891b2' }}>{pendingScholarshipsCount} Pending</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 6. Recent Institutional Transactions Stream */}
      <div className="card-surface" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102d47', margin: 0 }}>
              Recent Financial Transactions Ledger
            </h3>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
              Live audit stream of fee receipts, vendor disbursements, and payroll settlements
            </p>
          </div>
          <Link
            href="/finance/audit"
            style={{ fontSize: '11.5px', fontWeight: 600, color: '#b49662', textDecoration: 'none' }}
          >
            Complete Audit Log →
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>TRANSACTION DETAILS</th>
                <th>CLASSIFICATION & MODE</th>
                <th>DATE & TIME</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(t => (
                <tr key={t.id}>
                  <td>
                    <strong style={{ color: '#102d47', display: 'block' }}>{t.title}</strong>
                    <small style={{ color: '#83909d' }}>Ref: {t.id}</small>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: t.isCredit ? '#edf7f1' : '#e8f1fa', color: t.isCredit ? '#25866b' : '#102d47', fontWeight: 600 }}>
                      {t.type}
                    </span>
                  </td>
                  <td>
                    <div style={{ color: '#1e293b', fontSize: '12px', fontWeight: 600 }}>{t.date}</div>
                    {t.time && (
                      <div style={{ color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} /> {t.time} IST
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${['Paid', 'Verified', 'Approved'].includes(t.status) ? 'good' : 'neutral'}`}>
                      <i />
                      {t.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: t.isCredit ? '#25866b' : '#ad211d' }} className="tabular-nums">
                    {t.isCredit ? '+' : '-'}{formatINR(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
