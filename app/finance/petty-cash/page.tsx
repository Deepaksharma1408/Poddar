// College Finance Portal - Petty Cash (Imprest) System
// Fixed Float in INR, Sequential Vouchers, Per-Voucher Limit, Replenishment Workflow & Cash Count Reconciliation

'use client';

import React, { useState } from 'react';
import {
  Coins,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { useApprovalNotice } from '@/components/finance-portal/ui/approval-notice';
import type { PettyCashVoucher } from '@/lib/finance-portal/types/finance';

export default function PettyCashPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();
  const { showApprovalNotice } = useApprovalNotice();
  const currentRole = state.settings.currentRole;

  const floatPaise = state.settings.statutory.pettyCashFloatPaise;
  const voucherLimitPaise = state.settings.statutory.pettyCashVoucherLimitPaise;

  const spentPaise = state.pettyCashVouchers
    .filter(v => v.status === 'Approved')
    .reduce((sum, v) => sum + v.amountPaise, 0);
  const availablePaise = Math.max(0, floatPaise - spentPaise);

  // New Voucher Modal
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [payee, setPayee] = useState('');
  const [department, setDepartment] = useState('Campus Administration & Maintenance');
  const [purpose, setPurpose] = useState('');
  const [amountRupees, setAmountRupees] = useState('');

  // Cash Count Reconciliation Modal
  const [countModalOpen, setCountModalOpen] = useState(false);
  const [physicalCountRupees, setPhysicalCountRupees] = useState('');
  const [countVarianceNotes, setCountVarianceNotes] = useState('');

  const handleIssueVoucher = () => {
    const amtPaise = toPaise(amountRupees);
    if (!payee.trim() || amtPaise <= 0) {
      showToast('Validation Error', 'Payee and amount are required.', 'error');
      return;
    }

    if (amtPaise > voucherLimitPaise) {
      showToast(
        'Voucher Limit Exceeded',
        `Single petty cash voucher cannot exceed ₹${(voucherLimitPaise / 100).toLocaleString('en-IN')}. Please route through standard OpEx invoice.`,
        'error'
      );
      return;
    }

    if (amtPaise > availablePaise) {
      showToast('Insufficient Float', 'Available petty cash float is insufficient. Replenishment required.', 'error');
      return;
    }

    const nextSeq = state.pettyCashVouchers.length + 1;
    const newVoucher: PettyCashVoucher = {
      id: `PC-V-${Date.now()}`,
      voucherNumber: `PC-${new Date().getFullYear()}-${String(nextSeq).padStart(3, '0')}`,
      date: currentDate,
      payee: payee.trim(),
      department,
      purpose: purpose.trim(),
      amountPaise: amtPaise,
      approvedByRole: currentRole,
      status: 'Approved',
    };

    dispatch({ type: 'CREATE_PETTY_CASH_VOUCHER', voucher: newVoucher });
    showToast('Voucher Issued', `Petty cash voucher ${newVoucher.voucherNumber} recorded.`, 'success');

    setVoucherModalOpen(false);
    setPayee('');
    setPurpose('');
    setAmountRupees('');
  };

  const handleReplenishFloat = () => {
    showToast('Replenishment Requested', `A reimbursement request of ${formatINR(spentPaise)} has been submitted to Accounts.`, 'success');
    showApprovalNotice({
      itemTitle: 'Petty Cash Float Replenishment',
      category: 'Petty Cash',
      amountPaise: spentPaise,
      reference: `REQ-FLOAT-${currentDate}`,
      nextApproverTier: 'Accounts Admin / Management',
      notes: 'Reimbursement of spent imprest vouchers submitted for replenishment authorization.',
    });
  };

  const handleReconcileCashCount = () => {
    const physicalPaise = toPaise(physicalCountRupees);
    const variancePaise = physicalPaise - availablePaise;

    if (variancePaise === 0) {
      showToast('Reconciliation Complete', 'Physical cash count matches book balance exactly (Zero variance).', 'success');
    } else {
      const sign = variancePaise > 0 ? 'Surplus' : 'Deficit';
      showToast(
        `Variance Recorded: ${sign}`,
        `Physical count variance of ${formatINR(Math.abs(variancePaise))} logged. Reason: ${countVarianceNotes || 'Routine cash audit'}`,
        'info'
      );
    }
    setCountModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Petty Cash (Imprest Float Management)</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Sequential cash disbursement vouchers, imprest threshold replenishment, and physical cash count audits.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setVoucherModalOpen(true)}
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
            <span>Issue Cash Voucher</span>
          </button>

          <button
            onClick={() => setCountModalOpen(true)}
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
            <FileCheck size={15} />
            <span>Physical Cash Count</span>
          </button>

          <button
            onClick={handleReplenishFloat}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--green)',
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
            <RefreshCw size={14} />
            <span>Replenish Imprest</span>
          </button>
        </div>
      </div>

      {/* Float KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--green)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>AVAILABLE FLOAT CASH-IN-HAND</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }} className="headline-number">
            {formatINR(availablePaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Sanctioned Float: {formatINR(floatPaise)}
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--crimson)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CUMULATIVE VOUCHERS DISBURSED</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--crimson)', marginTop: '4px' }} className="headline-number">
            {formatINR(spentPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {state.pettyCashVouchers.length} Vouchers Awaiting Bank Replenishment
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--navy)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SINGLE VOUCHER CEILING</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }} className="headline-number">
            {formatINR(voucherLimitPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Requires Accounts Officer Authorization
          </span>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', marginBottom: '14px' }}>
          Sequential Petty Cash Disbursement Log
        </h3>

        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Date</th>
                <th>Payee Name</th>
                <th>Department</th>
                <th>Purpose of Disbursement</th>
                <th style={{ textAlign: 'right' }}>Amount Paid</th>
                <th>Approved By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.pettyCashVouchers.map(v => (
                <tr key={v.id}>
                  <td data-label="Voucher #">
                    <strong>{v.voucherNumber}</strong>
                  </td>
                  <td data-label="Date">{v.date}</td>
                  <td data-label="Payee">{v.payee}</td>
                  <td data-label="Department">{v.department}</td>
                  <td data-label="Purpose">{v.purpose}</td>
                  <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                    {formatINR(v.amountPaise)}
                  </td>
                  <td data-label="Approver">{v.approvedByRole}</td>
                  <td data-label="Status">
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor: 'var(--green-light)',
                        color: 'var(--green)',
                      }}
                    >
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Issue Petty Cash Voucher */}
      <Dialog open={voucherModalOpen} onClose={() => setVoucherModalOpen(false)} title="Issue Petty Cash Voucher">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payee / Recipient Name*</label>
            <input
              type="text"
              value={payee}
              onChange={e => setPayee(e.target.value)}
              placeholder="e.g. Speed Post / Local Courier / Refreshments"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="Campus Administration & Maintenance">Administration</option>
                <option value="Computer Science & IT">Computer Science & IT</option>
                <option value="Management & Business Studies">Management & Business</option>
                <option value="Commerce & Accounting">Commerce & Accounting</option>
                <option value="Basic Sciences & Research Lab">Basic Sciences</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Amount (INR)* (Max ₹5,000)</label>
              <input
                type="number"
                value={amountRupees}
                onChange={e => setAmountRupees(e.target.value)}
                placeholder="e.g. 1200"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Disbursement Purpose*</label>
            <textarea
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="Detail emergency campus cash expense"
              rows={2}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => setVoucherModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleIssueVoucher}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Disburse Cash & Generate Voucher
            </button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 2: Physical Cash Count Audit */}
      <Dialog open={countModalOpen} onClose={() => setCountModalOpen(false)} title="Physical Cash Count & Audit Reconciliation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            System Book Balance: <strong>{formatINR(availablePaise)}</strong>
          </p>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Actual Counted Cash-in-Drawer (INR)*</label>
            <input
              type="number"
              value={physicalCountRupees}
              onChange={e => setPhysicalCountRupees(e.target.value)}
              placeholder="Count actual currency notes"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Variance Justification / Audit Remarks</label>
            <textarea
              value={countVarianceNotes}
              onChange={e => setCountVarianceNotes(e.target.value)}
              placeholder="State reason if physical count does not match book balance"
              rows={2}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => setCountModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleReconcileCashCount}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Submit Reconciliation Report
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

