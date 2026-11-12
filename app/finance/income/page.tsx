// College Finance Portal - Other Institutional Income & Caution Deposit Ledger
// Revenue Heads: Admission, Exam, Hostel & Mess, Library Fines, Grants, Rent, Caution Deposit with Refund Lifecycle

'use client';

import React, { useState } from 'react';
import {
  Wallet,
  PlusCircle,
  Search,
  RotateCcw,
  CheckCircle2,
  Download,
  Building,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import type { OtherIncome } from '@/lib/finance-portal/types/finance';

export default function IncomePage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [source, setSource] = useState<OtherIncome['source']>('Campus Space Rent');
  const [payerName, setPayerName] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [mode, setMode] = useState<OtherIncome['mode']>('NEFT');
  const [reference, setReference] = useState('');
  const [isDeposit, setIsDeposit] = useState(false);

  const handleRecordIncome = () => {
    if (!payerName.trim() || !reference.trim()) {
      showToast('Validation Error', 'Payer name and transaction reference are required.', 'error');
      return;
    }

    const amtPaise = toPaise(amountRupees);
    if (amtPaise <= 0) {
      showToast('Invalid Amount', 'Please enter a valid revenue amount.', 'error');
      return;
    }

    const newIncome: OtherIncome = {
      id: `INC-${Date.now()}`,
      source: isDeposit ? 'Caution Deposit' : source,
      payerName: payerName.trim(),
      amountPaise: amtPaise,
      date: currentDate,
      mode,
      reference: reference.trim().toUpperCase(),
      receiptNumber: `INC-RCPT-${Date.now().toString().slice(-4)}`,
      isRefundableDeposit: isDeposit,
      status: 'Collected',
    };

    dispatch({ type: 'ADD_OTHER_INCOME', income: newIncome });
    showToast('Income Recorded', `Receipt generated for ${formatINR(amtPaise)} from ${payerName}.`, 'success');

    setModalOpen(false);
    setPayerName('');
    setReference('');
    setAmountRupees('');
    setIsDeposit(false);
  };

  const totalOtherIncomePaise = state.otherIncome
    .filter(i => !i.isRefundableDeposit)
    .reduce((s, i) => s + i.amountPaise, 0);

  const totalCautionDepositHeldPaise = state.otherIncome
    .filter(i => i.isRefundableDeposit && i.status === 'Collected')
    .reduce((s, i) => s + i.amountPaise, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Other Institutional Income & Caution Deposits</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Exam registrations, hostel & mess receipts, campus facility rent, research grants, and refundable caution deposits.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
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
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <PlusCircle size={15} />
          <span>Record Revenue Entry</span>
        </button>
      </div>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--navy)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CUMULATIVE OTHER REVENUES</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }} className="headline-number">
            {formatINR(totalOtherIncomePaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Excluding Refundable Caution Deposits
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--gold)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CAUTION DEPOSITS IN ESCROW</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gold)', marginTop: '4px' }} className="headline-number">
            {formatINR(totalCautionDepositHeldPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Refundable Student & Vendor Guarantee Deposits
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Receipt # & Date</th>
                <th>Revenue Source Head</th>
                <th>Payer / Entity</th>
                <th>Payment Mode & Ref</th>
                <th style={{ textAlign: 'right' }}>Amount Collected</th>
                <th>Deposit Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.otherIncome.map(inc => (
                <tr key={inc.id}>
                  <td data-label="Receipt">
                    <strong>{inc.receiptNumber}</strong>
                    <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      {inc.date}
                    </span>
                  </td>
                  <td data-label="Head">
                    <strong>{inc.source}</strong>
                  </td>
                  <td data-label="Payer">{inc.payerName}</td>
                  <td data-label="Mode">
                    {inc.mode} · <span style={{ fontFamily: 'monospace' }}>{inc.reference}</span>
                  </td>
                  <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--navy)' }} className="tabular-nums">
                    {formatINR(inc.amountPaise)}
                  </td>
                  <td data-label="Deposit">
                    {inc.isRefundableDeposit ? (
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600, backgroundColor: 'var(--gold-light)', color: 'var(--gold)' }}>
                        Refundable Escrow
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Non-refundable</span>
                    )}
                  </td>
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
                      {inc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Income */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Record Miscellaneous Revenue / Deposit">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Revenue Source Head*</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value as any)}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
            >
              <option value="Admission Fees">Admission Prospectus / Application Fees</option>
              <option value="Exam Registration">University Examination Fees</option>
              <option value="Hostel & Mess">Hostel & Mess Boarding Fees</option>
              <option value="Library Fines">Library Overdue Fines</option>
              <option value="Grants & Donations">Research Grants & Corporate Donations</option>
              <option value="Campus Space Rent">Campus Facility & Hall Rent</option>
              <option value="Caution Deposit">Student / Hostel Caution Deposit</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payer / Organization Name*</label>
            <input
              type="text"
              value={payerName}
              onChange={e => setPayerName(e.target.value)}
              placeholder="e.g. Rajasthan University / Student Name"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Amount Collected (INR)*</label>
              <input
                type="number"
                value={amountRupees}
                onChange={e => setAmountRupees(e.target.value)}
                placeholder="e.g. 50000"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payment Mode</label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as any)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="NEFT">NEFT / RTGS</option>
                <option value="UPI">UPI</option>
                <option value="Bank transfer">Bank IMPS</option>
                <option value="Cheque">Bank Cheque</option>
                <option value="Cash">Cash Receipt</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>UTR / Reference No*</label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value.toUpperCase())}
              placeholder="UTR-202611-998877"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px' }}>
            <input
              type="checkbox"
              id="isDepositCheck"
              checked={isDeposit}
              onChange={e => setIsDeposit(e.target.checked)}
            />
            <label htmlFor="isDepositCheck" style={{ fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Mark as Refundable Caution Deposit (Held in institutional escrow)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleRecordIncome}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Confirm Collection Entry
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

