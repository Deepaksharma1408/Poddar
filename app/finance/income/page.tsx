// College Finance Portal - Other Institutional Income & Caution Deposit Ledger
// Revenue Heads: Admission, Exam, Hostel & Mess, Library Fines, Grants, Space Rent,
// with Strict Caution Deposit Segregation as Refundable Balance Sheet Liability.

'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  RotateCcw,
  CheckCircle2,
  Download,
  Building,
  ShieldAlert,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import type { OtherIncome } from '@/lib/finance-portal/types/finance';

export default function IncomePage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [filterType, setFilterType] = useState<'ALL' | 'REVENUE' | 'DEPOSIT'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedIncomeForRefund, setSelectedIncomeForRefund] = useState<OtherIncome | null>(null);

  // Form
  const [source, setSource] = useState<OtherIncome['source']>('Campus Space Rent');
  const [payerName, setPayerName] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [mode, setMode] = useState<OtherIncome['mode']>('NEFT');
  const [reference, setReference] = useState('');
  const [isDeposit, setIsDeposit] = useState(false);

  // Refund Form
  const [refundReason, setRefundReason] = useState('');

  const handleRecordIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName.trim() || !reference.trim()) {
      showToast('Validation Error', 'Payer name and transaction reference are required.', 'error');
      return;
    }

    const amtPaise = toPaise(amountRupees);
    if (amtPaise <= 0) {
      showToast('Invalid Amount', 'Please enter a valid revenue amount.', 'error');
      return;
    }

    const receiptNo = `INC-RCPT-${Date.now().toString().slice(-5)}`;
    const newIncome: OtherIncome = {
      id: `INC-${Date.now()}`,
      source: isDeposit ? 'Caution Deposit' : source,
      payerName: payerName.trim(),
      amountPaise: amtPaise,
      date: currentDate,
      mode,
      reference: reference.trim().toUpperCase(),
      receiptNumber: receiptNo,
      isRefundableDeposit: isDeposit,
      status: 'Collected',
    };

    dispatch({ type: 'ADD_OTHER_INCOME', income: newIncome });
    showToast('Income Recorded', `Receipt ${receiptNo} generated for ${formatINR(amtPaise)} from ${payerName}.`, 'success');

    setModalOpen(false);
    setPayerName('');
    setReference('');
    setAmountRupees('');
    setIsDeposit(false);
  };

  // Download Income Receipt PDF
  const handleDownloadReceipt = (inc: OtherIncome) => {
    const pdf = new SimplePDF();
    const title = inc.isRefundableDeposit ? 'CAUTION DEPOSIT RECEIPT (LIABILITY)' : 'INSTITUTIONAL INFLOW RECEIPT';
    let y = pdf.drawHeader(state.settings.institutionName, title, 'AUXILIARY FINANCIAL INFLOW');

    pdf.drawRect(40, y - 56, pdf.pageWidth - 80, 48, {
      fill: PDF_COLORS.lightBg,
      stroke: PDF_COLORS.navy,
      lineWidth: 0.5,
    });

    pdf.drawText(`RECEIPT NO: ${inc.receiptNumber}`, 52, y - 14, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    pdf.drawText(`Date: ${inc.date}  |  Payment Mode: ${inc.mode}`, 52, y - 26, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Bank Ref / UTR: ${inc.reference}`, 52, y - 38, { font: 'Helvetica', size: 8 });

    pdf.drawText('AMOUNT RECEIVED', pdf.pageWidth - 180, y - 14, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.mutedText, align: 'right' });
    pdf.drawText(formatINR(inc.amountPaise), pdf.pageWidth - 52, y - 14, { font: 'Helvetica-Bold', size: 14, color: PDF_COLORS.green, align: 'right' });

    y -= 80;
    pdf.drawText(`Received With Thanks From: ${inc.payerName}`, 40, y, { font: 'Helvetica-Bold', size: 9 });
    pdf.drawText(`Classification Head: ${inc.source}`, 40, y - 14, { font: 'Helvetica', size: 8.5 });
    if (inc.isRefundableDeposit) {
      pdf.drawText('Note: This deposit is refundable upon course completion subject to no-dues clearance.', 40, y - 28, { font: 'Helvetica-Oblique', size: 8, color: PDF_COLORS.crimson });
    }

    y -= 70;
    pdf.drawText('Cashier / Accounts Officer', pdf.pageWidth - 180, y, { font: 'Helvetica-Bold', size: 8, align: 'right' });
    pdf.drawText('Poddar International College', pdf.pageWidth - 180, y - 10, { font: 'Helvetica', size: 7.5, color: PDF_COLORS.mutedText, align: 'right' });

    pdf.drawFooter('Official institutional auxiliary receipt. Generated from Poddar Connect Finance.');
    triggerPDFDownload(`Receipt-${inc.receiptNumber}.pdf`, pdf.output());
    showToast('Receipt Downloaded', `Downloaded Receipt-${inc.receiptNumber}.pdf`, 'info');
  };

  // Process Deposit Refund
  const handleProcessRefund = () => {
    if (!selectedIncomeForRefund) return;

    dispatch({
      type: 'ADD_OTHER_INCOME',
      income: {
        ...selectedIncomeForRefund,
        status: 'Refunded',
        refundedPaise: selectedIncomeForRefund.amountPaise,
      },
    });

    showToast('Refund Processed', `Caution deposit of ${formatINR(selectedIncomeForRefund.amountPaise)} marked refunded.`, 'success');
    setRefundModalOpen(false);
    setSelectedIncomeForRefund(null);
  };

  // Filtered List
  const filteredList = state.otherIncome.filter(i => {
    if (filterType === 'REVENUE') return !i.isRefundableDeposit;
    if (filterType === 'DEPOSIT') return i.isRefundableDeposit;
    return true;
  });

  const totalOtherIncomePaise = state.otherIncome
    .filter(i => !i.isRefundableDeposit && i.status === 'Collected')
    .reduce((s, i) => s + i.amountPaise, 0);

  const totalCautionDepositHeldPaise = state.otherIncome
    .filter(i => i.isRefundableDeposit && i.status === 'Collected')
    .reduce((s, i) => s + i.amountPaise, 0);

  const totalCautionDepositRefundedPaise = state.otherIncome
    .filter(i => i.isRefundableDeposit && i.status === 'Refunded')
    .reduce((s, i) => s + i.amountPaise, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b49662', marginBottom: '4px' }}>
            AUXILIARY REVENUES & DEPOSITS
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 750, color: '#102d47', margin: 0 }}>
            Other Institutional Income & Caution Deposits
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Examination fees, hostel & mess boarding, campus space rentals, and segregated refundable caution deposit liabilities.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: '#102d47',
            border: 'none',
            borderRadius: '7px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(16, 45, 71, 0.1)',
          }}
        >
          <Plus size={14} />
          <span>Record Inflow / Deposit</span>
        </button>
      </div>

      {/* 2. Statutory Advisory Banner */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: '#fbf6eb',
          border: '1px solid #e7d8b5',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <ShieldAlert size={18} style={{ color: '#b49662', flexShrink: 0 }} />
        <div style={{ fontSize: '11.5px', color: '#785b24', lineHeight: 1.5 }}>
          <strong>Statutory Accounting Standard:</strong> Caution Deposits collected from students are segregated as
          <strong> Refundable Current Liabilities (Account 2010)</strong> on the Balance Sheet. They are strictly excluded
          from earned operational revenues and do not artificially inflate the institutional surplus.
        </div>
      </div>

      {/* 3. Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #25866b' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Earned Auxiliary Revenue
          </span>
          <div className="headline-number" style={{ color: '#25866b', margin: '6px 0 2px' }}>
            {formatINR(totalOtherIncomePaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#25866b', fontWeight: 550 }}>Rentals, exam & hostel revenue</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #b49662' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Caution Deposits Held (Liability)
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalCautionDepositHeldPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#b49662', fontWeight: 600 }}>Refundable student security deposits</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #475569' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Refunded to Alumni
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalCautionDepositRefundedPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Settled on no-dues clearance</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #102d47' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Total Inflow Records
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {state.otherIncome.length}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Receipts with bank reconciliation</small>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { id: 'ALL', label: 'All Inflows' },
          { id: 'REVENUE', label: 'Earned Revenue Only' },
          { id: 'DEPOSIT', label: 'Caution Deposits (Liabilities)' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              border: '1px solid',
              borderColor: filterType === tab.id ? '#102d47' : '#cbd5e1',
              background: filterType === tab.id ? '#102d47' : '#ffffff',
              color: filterType === tab.id ? '#ffffff' : '#64748b',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. Transactions Table */}
      <div className="card-surface" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>RECEIPT NO & DATE</th>
                <th>CLASSIFICATION HEAD</th>
                <th>PAYER / SOURCE DETAILS</th>
                <th>MODE & REFERENCE</th>
                <th style={{ textAlign: 'right' }}>AMOUNT (INR)</th>
                <th>LIABILITY TYPE</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#102d47', fontSize: '12px' }}>
                      {item.receiptNumber}
                    </strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{item.date}</div>
                  </td>
                  <td>
                    <strong style={{ color: '#1e293b' }}>{item.source}</strong>
                  </td>
                  <td>
                    <div style={{ color: '#1e293b', fontWeight: 500 }}>{item.payerName}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '11.5px', color: '#102d47', fontWeight: 600 }}>{item.mode}</div>
                    <small style={{ color: '#83909d' }}>Ref: {item.reference}</small>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: item.isRefundableDeposit ? '#b49662' : '#25866b' }} className="tabular-nums">
                    {formatINR(item.amountPaise)}
                  </td>
                  <td>
                    {item.isRefundableDeposit ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fbf6eb', color: '#b49662', border: '1px solid #ebd9b0' }}>
                        Refundable Liability
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: '#edf7f1', color: '#25866b' }}>
                        Earned Revenue
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${item.status === 'Collected' ? 'good' : 'neutral'}`}>
                      <i />
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => handleDownloadReceipt(item)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          background: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#102d47',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Download size={11} style={{ color: '#b49662' }} />
                        <span>Receipt</span>
                      </button>

                      {item.isRefundableDeposit && item.status === 'Collected' && (
                        <button
                          onClick={() => {
                            setSelectedIncomeForRefund(item);
                            setRefundModalOpen(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '5px',
                            background: '#ad211d',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          Process Refund
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

      {/* 6. Modal: Record Inflow / Deposit */}
      {modalOpen && (
        <Dialog open={modalOpen} title="Record Auxiliary Inflow or Deposit" subtitle="Institutional Cash & Bank Inflow" onClose={() => setModalOpen(false)} maxWidth="540px">
          <form onSubmit={handleRecordIncome} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 12px', borderRadius: '6px', background: isDeposit ? '#fbf6eb' : '#edf7f1', border: `1px solid ${isDeposit ? '#ebd9b0' : '#c3e6d3'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="isDep"
                checked={isDeposit}
                onChange={e => setIsDeposit(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="isDep" style={{ fontSize: '12px', fontWeight: 600, color: '#102d47', cursor: 'pointer' }}>
                This is a Student Caution Deposit (Refundable Liability, NOT Income)
              </label>
            </div>

            {!isDeposit && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Revenue Stream Category *
                </label>
                <select
                  value={source}
                  onChange={e => setSource(e.target.value as OtherIncome['source'])}
                  style={{ width: '100%' }}
                >
                  <option value="Campus Space Rent">Campus Space Rent / Ground Lease</option>
                  <option value="Admission Fees">Admission & Prospectus Processing Fees</option>
                  <option value="Exam Registration">Exam Registration & Evaluation Fees</option>
                  <option value="Hostel & Mess">Hostel & Mess Boarding Fees</option>
                  <option value="Library Fines">Library Fines & Book Replacements</option>
                  <option value="Grants & Donations">Research Grants & Endowments</option>
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Payer / Entity Name *
              </label>
              <input
                placeholder={isDeposit ? 'Student Name & Admission ID' : 'Organization or Payer Name'}
                value={payerName}
                onChange={e => setPayerName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Amount (INR ₹) *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amountRupees}
                  onChange={e => setAmountRupees(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Payment Method *
                </label>
                <select
                  value={mode}
                  onChange={e => setMode(e.target.value as OtherIncome['mode'])}
                  style={{ width: '100%' }}
                >
                  <option value="NEFT">NEFT / RTGS</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="Bank transfer">Direct Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash (Vault Deposit)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Bank Reference / UTR / Cheque Number *
              </label>
              <input
                placeholder="Unique bank transaction reference"
                value={reference}
                onChange={e => setReference(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', background: '#102d47', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save Inflow Receipt
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* 7. Modal: Process Deposit Refund */}
      {refundModalOpen && selectedIncomeForRefund && (
        <Dialog open={refundModalOpen} title="Process Caution Deposit Refund" subtitle={selectedIncomeForRefund.payerName} onClose={() => setRefundModalOpen(false)} maxWidth="480px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Verify student no-dues clearance certificate before processing this refund of {formatINR(selectedIncomeForRefund.amountPaise)}.
            </p>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Refund Reason / Clearances Verified
              </label>
              <input
                placeholder="e.g. Completed BCA degree, verified library and lab no-dues"
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                style={{ padding: '8px 18px', background: '#ad211d', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
