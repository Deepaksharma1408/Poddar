// College Finance Portal - Operational Expenditure (OpEx) Bills & Invoices
// Vendor Bills, GST (0-28%), TDS Calculation on Base, Duplicate Bill Guard & Multi-Stage Approvals

'use client';

import React, { useState, useMemo } from 'react';
import {
  Receipt,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  DollarSign,
  Download,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise, formatPlainINR } from '@/lib/finance-portal/finance/money';
import { canApproveRecord } from '@/lib/finance-portal/security/rbac';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { ConfirmDialog } from '@/components/finance-portal/ui/confirm-dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { useApprovalNotice } from '@/components/finance-portal/ui/approval-notice';
import { generateTallyOpExCSV } from '@/lib/finance-portal/export/tally-export';
import { downloadCSV } from '@/lib/finance-portal/security/csv-sanitizer';
import type { OpExBill, Vendor } from '@/lib/finance-portal/types/finance';

export default function ExpensesPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();
  const { showApprovalNotice } = useApprovalNotice();
  const currentRole = state.settings.currentRole;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OpExBill['status']>('ALL');

  // Entry Modal
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [vendorId, setVendorId] = useState(state.vendors[0]?.id || '');
  const [billNumber, setBillNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science & IT');
  const [category, setCategory] = useState('IT & Hardware');
  const [invoiceDate, setInvoiceDate] = useState(currentDate);
  const [baseRupees, setBaseRupees] = useState('');
  const [gstRate, setGstRate] = useState<number>(18);
  const [tdsSection, setTdsSection] = useState<'194C' | '194J' | '194I' | 'None'>('194J');
  const [simulatedFile, setSimulatedFile] = useState('');

  // Settlement Modal
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [activeBillForSettle, setActiveBillForSettle] = useState<OpExBill | null>(null);
  const [settleUtr, setSettleUtr] = useState('');
  const [settleRupees, setSettleRupees] = useState('');

  // Calculated values on the fly
  const basePaise = toPaise(baseRupees);
  const gstPaise = Math.round(basePaise * (gstRate / 100));
  const totalPaise = basePaise + gstPaise;

  // TDS computed on base amount when GST is itemized
  const tdsRatePct = tdsSection === '194C' ? 2 : tdsSection === '194J' ? 10 : tdsSection === '194I' ? 10 : 0;
  const tdsDeductionPaise = Math.round(basePaise * (tdsRatePct / 100));
  const netPayablePaise = totalPaise - tdsDeductionPaise;

  // Check Duplicate Vendor + Bill Number
  const checkDuplicateBill = (vId: string, bNum: string) => {
    return state.opExBills.some(
      b => b.vendorId === vId && b.billNumber.trim().toUpperCase() === bNum.trim().toUpperCase()
    );
  };

  const handleCreateBill = () => {
    if (!billNumber.trim() || basePaise <= 0) {
      showToast('Validation Error', 'Bill number and base amount are required.', 'error');
      return;
    }

    if (checkDuplicateBill(vendorId, billNumber)) {
      showToast('Duplicate Bill Rejected', `Bill #${billNumber} has already been registered for this vendor!`, 'error');
      return;
    }

    const vendor = state.vendors.find(v => v.id === vendorId);
    const newBill: OpExBill = {
      id: `BILL-${Date.now()}`,
      billNumber: billNumber.trim().toUpperCase(),
      vendorId,
      vendorName: vendor?.name || 'Authorized Vendor',
      department,
      category,
      invoiceDate,
      dueDate: new Date(Date.parse(invoiceDate) + (vendor?.paymentTermsDays || 30) * 86400000).toISOString().slice(0, 10),
      baseAmountPaise: basePaise,
      gstRatePct: gstRate,
      gstAmountPaise: gstPaise,
      totalAmountPaise: totalPaise,
      tdsSection,
      tdsRatePct,
      tdsDeductionPaise,
      netPayablePaise,
      paidAmountPaise: 0,
      status: 'Submitted',
      simulatedInvoiceFile: simulatedFile || 'Scanned-Vendor-Tax-Invoice.pdf',
      createdBy: currentRole,
    };

    dispatch({ type: 'CREATE_OPEX_BILL', bill: newBill });
    showToast('Bill Submitted', `OpEx Invoice #${newBill.billNumber} queued for Accounts review.`, 'success');
    showApprovalNotice({
      itemTitle: `${newBill.vendorName} — ${newBill.category}`,
      category: 'Operating Expenses',
      amountPaise: newBill.netPayablePaise,
      reference: newBill.billNumber,
      nextApproverTier: 'Accounts Admin / Management',
      notes: 'Vendor tax invoice submitted for verification and statutory signoff.',
    });
    setBillModalOpen(false);
    setBillNumber('');
    setBaseRupees('');
    setSimulatedFile('');
  };

  // Approval with Maker-Checker
  const handleApproveBill = (bill: OpExBill) => {
    const check = canApproveRecord(currentRole, bill.createdBy, 'BILL');
    if (!check.allowed) {
      showToast('Authorization Denied', check.reason, 'error');
      return;
    }

    dispatch({ type: 'UPDATE_BILL_STATUS', billId: bill.id, status: 'Approved', approvedBy: currentRole });
    showToast('Bill Approved', `Bill #${bill.billNumber} approved for disbursement.`, 'success');
  };

  // Settle Bill Payment
  const handleSettleBill = () => {
    if (!activeBillForSettle || !settleUtr.trim()) return;
    const payPaise = toPaise(settleRupees);

    // Duplicate check
    const isDup = state.opExBills.some(
      b => b.paymentReference?.trim().toUpperCase() === settleUtr.trim().toUpperCase()
    );
    if (isDup) {
      showToast('Duplicate UTR', `Transaction reference ${settleUtr} is already used.`, 'error');
      return;
    }

    dispatch({
      type: 'PAY_OPEX_BILL',
      billId: activeBillForSettle.id,
      amountPaise: payPaise,
      reference: settleUtr.trim().toUpperCase(),
    });

    showToast('Payment Settled', `Disbursed ${formatINR(payPaise)} against Bill #${activeBillForSettle.billNumber}.`, 'success');
    setSettleModalOpen(false);
    setActiveBillForSettle(null);
    setSettleUtr('');
    setSettleRupees('');
  };

  // Export Tally CSV
  const handleExportTally = () => {
    const csvContent = generateTallyOpExCSV(state.opExBills);
    downloadCSV(`Tally-OpEx-Ledger-${currentDate}.csv`, csvContent);
    showToast('Tally Export Generated', 'Downloaded Tally/QuickBooks compliant CSV.', 'success');
  };

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return state.opExBills.filter(b => {
      const matchesSearch =
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [state.opExBills, searchQuery, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Operating Expenses & Vendor Invoices</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Vendor bill logging, statutory TDS & GST calculations, maker-checker authorization, and Tally ERP exports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setBillModalOpen(true)}
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
            <PlusCircle size={15} />
            <span>Enter Vendor Bill</span>
          </button>

          <button
            onClick={handleExportTally}
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
            <Download size={15} />
            <span>Export Tally CSV</span>
          </button>
        </div>
      </div>

      {/* Executive OpEx KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #102d47' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Total Invoiced Spend
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(state.opExBills.reduce((s, b) => s + b.totalAmountPaise, 0))}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Gross operating billings</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #25866b' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Disbursed & Paid
          </span>
          <div className="headline-number" style={{ color: '#25866b', margin: '6px 0 2px' }}>
            {formatINR(state.opExBills.reduce((s, b) => s + b.paidAmountPaise, 0))}
          </div>
          <small style={{ fontSize: '11px', color: '#25866b', fontWeight: 550 }}>Settled via bank transfers</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #ad211d' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Vendor Liabilities
          </span>
          <div className="headline-number" style={{ color: '#ad211d', margin: '6px 0 2px' }}>
            {formatINR(state.opExBills.filter(b => b.status === 'Approved' || b.status === 'Partially Paid').reduce((s, b) => s + (b.netPayablePaise - b.paidAmountPaise), 0))}
          </div>
          <small style={{ fontSize: '11px', color: '#ad211d', fontWeight: 600 }}>Approved pending payment</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #b49662' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            GST Input Credit & TDS
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(state.opExBills.reduce((s, b) => s + b.gstAmountPaise, 0))}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Eligible GSTR-2B Input Tax Credit</small>
        </div>
      </div>

      {/* Table Card */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        {/* Search & Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '300px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search bill number, vendor, category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'Submitted', 'Approved', 'Partially Paid', 'Paid'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: statusFilter === st ? 'var(--navy)' : 'var(--bg-card)',
                  color: statusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: statusFilter === st ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Bill # & Date</th>
                <th>Vendor & Category</th>
                <th>Department</th>
                <th style={{ textAlign: 'right' }}>Base Amount</th>
                <th style={{ textAlign: 'right' }}>GST</th>
                <th style={{ textAlign: 'right' }}>TDS Deducted</th>
                <th style={{ textAlign: 'right' }}>Net Payable</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(b => (
                <tr key={b.id}>
                  <td data-label="Bill Details">
                    <strong>{b.billNumber}</strong>
                    <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Inv: {b.invoiceDate} (Due: {b.dueDate})
                    </span>
                  </td>
                  <td data-label="Vendor">
                    <span>{b.vendorName}</span>
                    <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--navy)' }}>
                      {b.category}
                    </span>
                  </td>
                  <td data-label="Department">{b.department}</td>
                  <td data-label="Base" style={{ textAlign: 'right' }} className="tabular-nums">
                    {formatINR(b.baseAmountPaise)}
                  </td>
                  <td data-label="GST" style={{ textAlign: 'right' }} className="tabular-nums">
                    {b.gstAmountPaise > 0 ? `${formatINR(b.gstAmountPaise)} (${b.gstRatePct}%)` : '0%'}
                  </td>
                  <td data-label="TDS" style={{ textAlign: 'right', color: 'var(--crimson)' }} className="tabular-nums">
                    {b.tdsDeductionPaise ? `-${formatINR(b.tdsDeductionPaise)} (${b.tdsSection})` : '—'}
                  </td>
                  <td data-label="Net Payable" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }} className="tabular-nums">
                    {formatINR(b.netPayablePaise)}
                  </td>
                  <td data-label="Status">
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor:
                          b.status === 'Paid'
                            ? 'var(--green-light)'
                            : b.status === 'Approved'
                            ? 'var(--navy-light)'
                            : 'var(--gold-light)',
                        color:
                          b.status === 'Paid'
                            ? 'var(--green)'
                            : b.status === 'Approved'
                            ? 'var(--navy)'
                            : 'var(--gold)',
                      }}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {b.status === 'Submitted' && (
                        <button
                          onClick={() => handleApproveBill(b)}
                          style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--navy-light)', color: 'var(--navy)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Approve Bill
                        </button>
                      )}
                      {b.status === 'Approved' && (
                        <button
                          onClick={() => {
                            setActiveBillForSettle(b);
                            setSettleRupees(String((b.netPayablePaise - b.paidAmountPaise) / 100));
                            setSettleUtr(`UTR-OPEX-${b.billNumber.replace(/[^A-Z0-9]/g, '')}`);
                            setSettleModalOpen(true);
                          }}
                          style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--navy)', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Settle Payment
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Enter Vendor Bill */}
      <Dialog open={billModalOpen} onClose={() => setBillModalOpen(false)} title="Register Vendor Operating Bill" maxWidth="640px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Vendor Master*</label>
              <select
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                {state.vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Vendor Tax Invoice #*</label>
              <input
                type="text"
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                placeholder="INV/2026/9901"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department Head</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="Computer Science & IT">Computer Science & IT</option>
                <option value="Management & Business Studies">Management & Business</option>
                <option value="Commerce & Accounting">Commerce & Accounting</option>
                <option value="Basic Sciences & Research Lab">Basic Sciences</option>
                <option value="Campus Administration & Maintenance">Administration</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Base Amount (INR)*</label>
              <input
                type="number"
                value={baseRupees}
                onChange={e => setBaseRupees(e.target.value)}
                placeholder="e.g. 50000"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>GST Rate (%)</label>
              <select
                value={gstRate}
                onChange={e => setGstRate(Number(e.target.value))}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18% (Standard)</option>
                <option value={28}>28%</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>TDS Section</label>
              <select
                value={tdsSection}
                onChange={e => setTdsSection(e.target.value as any)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="194C">194C (Contractor 2%)</option>
                <option value="194J">194J (Tech/Prof 10%)</option>
                <option value="194I">194I (Rent 10%)</option>
                <option value="None">None (0%)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Calculation Review Box */}
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Base Amount:</span>
              <strong className="tabular-nums">{formatINR(basePaise)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>GST ({gstRate}%):</span>
              <span className="tabular-nums">+{formatINR(gstPaise)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--crimson)' }}>
              <span>TDS u/s {tdsSection} ({tdsRatePct}% on base):</span>
              <span className="tabular-nums">-{formatINR(tdsDeductionPaise)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border)', fontWeight: 700, color: 'var(--navy)' }}>
              <span>Net Take-Home Payable to Vendor:</span>
              <span className="tabular-nums" style={{ fontSize: '14px' }}>{formatINR(netPayablePaise)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => setBillModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBill}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Submit Bill for Approval
            </button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 2: Settle Bill */}
      <Dialog open={settleModalOpen} onClose={() => setSettleModalOpen(false)} title="Settle Vendor Invoice Payment">
        {activeBillForSettle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Settling payment for Bill <strong>#{activeBillForSettle.billNumber}</strong> from <strong>{activeBillForSettle.vendorName}</strong>.
            </p>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payment Amount (INR)*</label>
              <input
                type="number"
                value={settleRupees}
                onChange={e => setSettleRupees(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bank Transaction UTR / Ref*</label>
              <input
                type="text"
                value={settleUtr}
                onChange={e => setSettleUtr(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setSettleModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSettleBill}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

