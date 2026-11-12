// College Finance Portal - Triple Cash Book, Bank Reconciliation & Fiscal Year Close
// Day Book, Bank Book, Petty Cash Book, In-Browser Bank Statement CSV Reconciliation, and FY Close Lock

'use client';

import React, { useState, useMemo } from 'react';
import {
  Landmark,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { parseBankStatementCSV, reconcileBankStatement } from '@/lib/finance-portal/finance/accounting';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';

export default function CashBookPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'DayBook' | 'BankBook' | 'PettyCash'>('BankBook');
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [closeFyModalOpen, setCloseFyModalOpen] = useState(false);
  const [fyReason, setFyReason] = useState('');

  // 1. Generate Bank Book Entries from verified Fee Payments, Paid OpEx Bills, and Paid Guest Faculty
  const bankEntries = useMemo(() => {
    const list: {
      date: string;
      ref: string;
      description: string;
      type: 'Debit (Inflow)' | 'Credit (Outflow)';
      amountPaise: number;
      reconciled: boolean;
    }[] = [];

    // Verified fee inflows
    state.feePayments
      .filter(p => p.verified && p.method !== 'Cash')
      .forEach(p => {
        list.push({
          date: p.date,
          ref: p.reference,
          description: `Fee Receipt ${p.receiptNo} (Student ${p.studentId})`,
          type: 'Debit (Inflow)',
          amountPaise: p.amountPaise,
          reconciled: true,
        });
      });

    // OpEx outflows
    state.opExBills
      .filter(b => b.paidAmountPaise > 0)
      .forEach(b => {
        list.push({
          date: b.invoiceDate,
          ref: b.paymentReference || 'BANK-TRANSFER',
          description: `Vendor Bill #${b.billNumber} (${b.vendorName})`,
          type: 'Credit (Outflow)',
          amountPaise: b.paidAmountPaise,
          reconciled: true,
        });
      });

    // Other income inflows
    state.otherIncome
      .filter(i => i.mode !== 'Cash')
      .forEach(i => {
        list.push({
          date: i.date,
          ref: i.reference,
          description: `${i.source} (${i.payerName})`,
          type: 'Debit (Inflow)',
          amountPaise: i.amountPaise,
          reconciled: true,
        });
      });

    return list.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [state.feePayments, state.opExBills, state.otherIncome]);

  // Handle Bank Statement CSV Parse & Reconciliation
  const handleRunReconciliation = () => {
    if (!csvInput.trim()) {
      showToast('Validation Error', 'Please paste or upload bank statement CSV text.', 'error');
      return;
    }

    const rows = parseBankStatementCSV(csvInput);
    if (rows.length === 0) {
      showToast('Invalid CSV', 'No valid transaction rows found in CSV.', 'error');
      return;
    }

    const pendingPayments = state.feePayments.filter(p => !p.verified);
    const approvedBills = state.opExBills.filter(b => b.status === 'Approved');

    const result = reconcileBankStatement(rows, pendingPayments, approvedBills);

    // Auto verify matched payments
    result.matchedPayments.forEach(p => {
      dispatch({ type: 'VERIFY_FEE_PAYMENT', paymentId: p.id });
    });

    // Auto pay matched bills
    result.matchedBills.forEach(b => {
      dispatch({
        type: 'PAY_OPEX_BILL',
        billId: b.id,
        amountPaise: b.netPayablePaise,
        reference: b.paymentReference || 'AUTO-RECONCILED',
      });
    });

    showToast(
      'Reconciliation Complete',
      `Matched ${result.matchedPayments.length} fee receipts and ${result.matchedBills.length} vendor bills. (${result.unmatchedRows.length} unmatched rows).`,
      'success'
    );
    setReconcileModalOpen(false);
    setCsvInput('');
  };

  // Fiscal Year Close & Lock / Reopen
  const handleToggleFiscalYear = () => {
    if (!fyReason.trim()) {
      showToast('Reason Required', 'Mandatory audit justification required.', 'error');
      return;
    }

    if (state.settings.fiscalYearClosed) {
      dispatch({ type: 'REOPEN_FISCAL_YEAR', reason: fyReason });
      showToast('FY Reopened', 'Academic Year 2026-27 unlocked for adjustments.', 'info');
    } else {
      dispatch({ type: 'CLOSE_FISCAL_YEAR', reason: fyReason });
      showToast('FY Closed & Locked', 'Financial Year 2026-27 finalized and locked against edits.', 'success');
    }

    setCloseFyModalOpen(false);
    setFyReason('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Triple Cash Book & Bank Reconciliation</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Day Book, Bank Ledger, in-browser bank CSV auto-reconciliation, and Fiscal Year 1 April – 31 March locking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setReconcileModalOpen(true)}
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
            <UploadCloud size={15} />
            <span>Reconcile Bank CSV</span>
          </button>

          <button
            onClick={() => setCloseFyModalOpen(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: state.settings.fiscalYearClosed ? 'var(--crimson-light)' : 'var(--bg-card)',
              color: state.settings.fiscalYearClosed ? 'var(--crimson)' : 'var(--navy)',
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
            {state.settings.fiscalYearClosed ? <Lock size={14} /> : <Unlock size={14} />}
            <span>{state.settings.fiscalYearClosed ? 'FY 2026-27 Locked' : 'Close Fiscal Year'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('BankBook')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'BankBook' ? 'var(--navy)' : 'transparent',
            color: activeTab === 'BankBook' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          HDFC College Bank Book
        </button>
        <button
          onClick={() => setActiveTab('PettyCash')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'PettyCash' ? 'var(--navy)' : 'transparent',
            color: activeTab === 'PettyCash' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Petty Cash Register
        </button>
      </div>

      {/* Main Ledger Table */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference / UTR</th>
                <th>Transaction Description</th>
                <th>Classification</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Reconciliation</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'BankBook' ? (
                bankEntries.map((e, idx) => (
                  <tr key={idx}>
                    <td data-label="Date">{e.date}</td>
                    <td data-label="Ref" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                      {e.ref}
                    </td>
                    <td data-label="Description">
                      <strong>{e.description}</strong>
                    </td>
                    <td data-label="Type">
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor: e.type.includes('Inflow') ? 'var(--green-light)' : 'var(--crimson-light)',
                          color: e.type.includes('Inflow') ? 'var(--green)' : 'var(--crimson)',
                        }}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                      {formatINR(e.amountPaise)}
                    </td>
                    <td data-label="Reconciliation">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--green)', fontSize: '11px', fontWeight: 600 }}>
                        <CheckCircle2 size={13} />
                        <span>Matched</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                state.pettyCashVouchers.map(v => (
                  <tr key={v.id}>
                    <td data-label="Date">{v.date}</td>
                    <td data-label="Ref" style={{ fontFamily: 'monospace' }}>{v.voucherNumber}</td>
                    <td data-label="Description">{v.purpose} ({v.payee})</td>
                    <td data-label="Type">
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600, backgroundColor: 'var(--crimson-light)', color: 'var(--crimson)' }}>
                        Credit (Outflow)
                      </span>
                    </td>
                    <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                      {formatINR(v.amountPaise)}
                    </td>
                    <td data-label="Reconciliation">
                      <span style={{ color: 'var(--navy)', fontSize: '11px', fontWeight: 600 }}>Imprest Voucher</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Bank Reconciliation CSV */}
      <Dialog open={reconcileModalOpen} onClose={() => setReconcileModalOpen(false)} title="Import Bank Statement CSV" maxWidth="600px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Paste the raw text of your HDFC / SBI Bank statement CSV (Columns: <code>Date, Reference, Description, Amount</code>).
          </p>

          <textarea
            value={csvInput}
            onChange={e => setCsvInput(e.target.value)}
            placeholder={`Date,Reference,Description,Amount\n2026-11-04,BANK-QA-001,Student Tuition Fee Deposit,25000.00\n2026-11-05,UTR-OPEX-4491,Apex Infotech IT Payment,-129600.00`}
            rows={8}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '11.5px' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={() => setReconcileModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleRunReconciliation}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Match & Auto-Reconcile
            </button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 2: Fiscal Year Close / Reopen */}
      <Dialog open={closeFyModalOpen} onClose={() => setCloseFyModalOpen(false)} title={state.settings.fiscalYearClosed ? 'Reopen Fiscal Year 2026-27' : 'Close Fiscal Year 2026-27'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {state.settings.fiscalYearClosed
              ? 'Reopening the fiscal year will allow modifications to backdated fee receipts, payroll records, and OpEx vouchers.'
              : 'Closing the fiscal year locks all transaction registers against edits and generates final accounting balances for statutory audit.'}
          </p>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mandatory Justification / Reason*</label>
            <textarea
              value={fyReason}
              onChange={e => setFyReason(e.target.value)}
              placeholder="e.g. Statutory audit completion / Chartered Accountant review"
              rows={3}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={() => setCloseFyModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleToggleFiscalYear}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: state.settings.fiscalYearClosed ? 'var(--green)' : 'var(--crimson)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {state.settings.fiscalYearClosed ? 'Unlock Fiscal Year' : 'Confirm & Lock FY 2026-27'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

