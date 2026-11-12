// College Finance Portal - Student Fee Ledger & Payment Collection Workspace
// Features Oldest-Charge-First Waterfall, EMI Calculator, Receipt & Duplicate PDF Downloads, and Refunds

'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  PlusCircle,
  FileText,
  Copy,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Download,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, formatINRExact, toPaise, paiseInWords } from '@/lib/finance-portal/finance/money';
import { computeStudentLedger, validateAndRefundFee } from '@/lib/finance-portal/finance/student-ledger';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { ConfirmDialog } from '@/components/finance-portal/ui/confirm-dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import type { Student, FeePayment } from '@/lib/finance-portal/types/finance';

export default function FeesPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<FeePayment | null>(null);

  // Payment Form state
  const [payAmountRupees, setPayAmountRupees] = useState('');
  const [payMethod, setPayMethod] = useState<FeePayment['method']>('NEFT');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Refund Form state
  const [refundRupees, setRefundRupees] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Confirmation dialogs
  const [confirmCashWarningOpen, setConfirmCashWarningOpen] = useState(false);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return state.students.filter(student => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProg = programmeFilter === 'ALL' || student.programme === programmeFilter;
      return matchesSearch && matchesProg;
    });
  }, [state.students, searchQuery, programmeFilter]);

  // Selected student's computed ledger
  const activeStudentLedger = useMemo(() => {
    if (!selectedStudent) return null;
    return computeStudentLedger(selectedStudent, state.feePayments, currentDate);
  }, [selectedStudent, state.feePayments, currentDate]);

  // Handle Recording a New Fee Payment
  const handleRecordPayment = () => {
    if (!selectedStudent) return;
    const amountPaise = toPaise(payAmountRupees);
    if (amountPaise <= 0) {
      showToast('Invalid Amount', 'Please enter a valid payment amount', 'error');
      return;
    }

    if (!payReference.trim()) {
      showToast('Reference Required', 'Please enter a unique UTR or Cheque number', 'error');
      return;
    }

    // Check duplicate reference across all payments
    const isDup = state.feePayments.some(
      p => p.reference.trim().toUpperCase() === payReference.trim().toUpperCase()
    );
    if (isDup) {
      showToast('Duplicate Reference', `Reference ${payReference} has already been recorded!`, 'error');
      return;
    }

    // Large cash check warning (e.g. ₹10,000+)
    const cashLimitPaise = state.settings.statutory.cashTransactionWarningLimitPaise;
    if (payMethod === 'Cash' && amountPaise >= cashLimitPaise && !confirmCashWarningOpen) {
      setConfirmCashWarningOpen(true);
      return;
    }

    const receiptNo = `RCPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const needsVerification = ['NEFT', 'Cheque', 'Demand Draft', 'Bank transfer'].includes(payMethod);

    const newPayment: FeePayment = {
      id: `PAY-${selectedStudent.id}-${Date.now()}`,
      studentId: selectedStudent.id,
      amountPaise,
      date: currentDate,
      method: payMethod,
      reference: payReference.trim(),
      receiptNo,
      verified: !needsVerification, // Cash and instant UPI are verified immediately in demo
      status: needsVerification ? 'Pending Verification' : 'Verified',
      createdBy: state.settings.currentRole,
      notes: payNotes,
    };

    dispatch({ type: 'RECORD_FEE_PAYMENT', payment: newPayment });
    showToast('Payment Recorded', `Receipt ${receiptNo} generated for ${selectedStudent.name}.`, 'success');

    setPaymentModalOpen(false);
    setPayAmountRupees('');
    setPayReference('');
    setPayNotes('');
  };

  // Generate PDF Receipt
  const handleDownloadReceipt = (payment: FeePayment, isDuplicate = false) => {
    if (!selectedStudent) return;
    const pdf = new SimplePDF();
    const title = isDuplicate ? 'DUPLICATE FEE RECEIPT' : 'STUDENT FEE RECEIPT';
    let y = pdf.drawHeader(state.settings.institutionName, title, 'STUDENT FINANCIAL ACCOUNTS', isDuplicate);

    // Box
    pdf.drawRect(40, y - 50, pdf.pageWidth - 80, 45, {
      fill: PDF_COLORS.lightBg,
      stroke: PDF_COLORS.navy,
      lineWidth: 0.5,
    });

    pdf.drawText('RECEIPT DETAILS', 52, y - 10, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    pdf.drawText(`Receipt No: ${payment.receiptNo}`, 52, y - 22, { font: 'Helvetica-Bold', size: 8 });
    pdf.drawText(`Date: ${payment.date}`, 52, y - 34, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Mode: ${payment.method} | Ref: ${payment.reference}`, 52, y - 46, { font: 'Helvetica', size: 8 });

    pdf.drawText('AMOUNT PAID', pdf.pageWidth - 180, y - 12, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.mutedText, align: 'right' });
    pdf.drawText(formatINRExact(payment.amountPaise), pdf.pageWidth - 52, y - 12, { font: 'Helvetica-Bold', size: 14, color: PDF_COLORS.green, align: 'right' });
    pdf.drawText(`STATUS: ${payment.status.toUpperCase()}`, pdf.pageWidth - 52, y - 32, {
      font: 'Helvetica-Bold',
      size: 8,
      color: payment.verified ? PDF_COLORS.navy : PDF_COLORS.gold,
      align: 'right',
    });

    y -= 70;
    // Student Info
    pdf.drawText(`Student Name: ${selectedStudent.name}`, 40, y, { font: 'Helvetica-Bold', size: 9 });
    pdf.drawText(`Admission ID: ${selectedStudent.id}`, 250, y, { font: 'Helvetica-Bold', size: 9 });
    pdf.drawText(`Programme: ${selectedStudent.programme} (Semester ${selectedStudent.semester})`, 40, y - 14, { font: 'Helvetica', size: 8.5 });
    pdf.drawText(`Guardian: ${selectedStudent.guardianName}`, 250, y - 14, { font: 'Helvetica', size: 8.5 });

    y -= 35;
    pdf.drawLine(40, y, pdf.pageWidth - 40, y, { stroke: PDF_COLORS.border });
    y -= 20;

    // Amount in Words
    pdf.drawText(`Amount in Words: ${paiseInWords(payment.amountPaise)}`, 40, y, { font: 'Helvetica-Oblique', size: 8.5, color: PDF_COLORS.darkSlate });

    y -= 60;
    pdf.drawText('Accounts Officer / Cashier', pdf.pageWidth - 180, y, { font: 'Helvetica', size: 8, align: 'right' });
    pdf.drawText('Poddar Institute · College', pdf.pageWidth - 180, y - 10, { font: 'Helvetica-Bold', size: 7.5, color: PDF_COLORS.navy, align: 'right' });

    pdf.drawFooter(isDuplicate ? 'Duplicate copy issued for student records. Valid without physical stamp.' : undefined);

    const filename = `${isDuplicate ? 'Duplicate-Receipt' : 'Fee-Receipt'}-${selectedStudent.id}-${payment.receiptNo}.pdf`;
    triggerPDFDownload(filename, pdf.output());
    showToast('PDF Generated', `Downloaded ${filename}`, 'info');
  };

  // Handle Refund Submission
  const handleProcessRefund = () => {
    if (!selectedPaymentForRefund) return;
    const refundPaise = toPaise(refundRupees);
    const result = validateAndRefundFee(selectedPaymentForRefund, refundPaise, refundReason);

    if (!result.valid) {
      showToast('Refund Failed', result.error, 'error');
      return;
    }

    dispatch({
      type: 'REFUND_FEE_PAYMENT',
      paymentId: selectedPaymentForRefund.id,
      amountPaise: refundPaise,
      reason: refundReason,
    });

    showToast('Refund Processed', `Refund of ${formatINR(refundPaise)} recorded.`, 'success');
    setRefundModalOpen(false);
    setSelectedPaymentForRefund(null);
    setRefundRupees('');
    setRefundReason('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Student Fee Accounts & Collection</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Search student accounts, view waterfall installment schedules, record payments, and download receipts.
          </p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '20px' }}>
        {/* Left: Student Directory List */}
        <div className="card-surface" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
          {/* Search & Filters */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search name, roll no, ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '100%', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {['ALL', 'BCA', 'BBA', 'B.Com', 'B.Sc', 'MBA'].map(prog => (
                <button
                  key={prog}
                  onClick={() => setProgrammeFilter(prog)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    backgroundColor: programmeFilter === prog ? 'var(--navy)' : 'var(--bg-card)',
                    color: programmeFilter === prog ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: programmeFilter === prog ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {prog}
                </button>
              ))}
            </div>
          </div>

          {/* Student List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredStudents.map(student => {
              const isSelected = selectedStudent?.id === student.id;
              const ledger = computeStudentLedger(student, state.feePayments, currentDate);

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: isSelected ? 'var(--navy-light)' : 'transparent',
                    cursor: 'pointer',
                    borderLeft: isSelected ? '4px solid var(--navy)' : '4px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block' }}>
                        {student.name}
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {student.id} · {student.programme} (Sem {student.semester})
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="tabular-nums" style={{ fontSize: '12.5px', fontWeight: 600, color: ledger.remainingPaise > 0 ? 'var(--navy)' : 'var(--green)' }}>
                        {formatINR(ledger.remainingPaise)}
                      </span>
                      <span style={{ display: 'block', fontSize: '10px', color: ledger.dueNowPaise > 0 ? 'var(--crimson)' : 'var(--text-muted)' }}>
                        {ledger.dueNowPaise > 0 ? `Due: ${formatINR(ledger.dueNowPaise)}` : 'On track'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Student Account & Ledger Workspace */}
        {selectedStudent && activeStudentLedger ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
            {/* Student Header Summary Card */}
            <div className="card-surface" style={{ padding: '18px 20px', borderTop: '4px solid var(--navy)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy)' }}>{selectedStudent.name}</h2>
                    <span style={{ fontSize: '11px', backgroundColor: 'var(--navy-light)', color: 'var(--navy)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {selectedStudent.programme} Sem {selectedStudent.semester}
                    </span>
                    <span style={{ fontSize: '11px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                      Roll: {selectedStudent.rollNo}
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Guardian: {selectedStudent.guardianName} ({selectedStudent.guardianPhone}) · Plan: {selectedStudent.plan.kind} ({selectedStudent.plan.interestType})
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setPayAmountRupees(String(activeStudentLedger.dueNowPaise > 0 ? activeStudentLedger.dueNowPaise / 100 : activeStudentLedger.remainingPaise / 100));
                      setPaymentModalOpen(true);
                    }}
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
                    <PlusCircle size={14} />
                    <span>Receive Payment</span>
                  </button>
                </div>
              </div>

              {/* Balance Summary Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Total Annual Fee</span>
                  <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }} className="tabular-nums">
                    {formatINR(activeStudentLedger.totalPaise)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--green)', display: 'block' }}>Verified Paid</span>
                  <strong style={{ fontSize: '15px', color: 'var(--green)' }} className="tabular-nums">
                    {formatINR(activeStudentLedger.paidPaise)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--crimson)', display: 'block' }}>Immediate Due</span>
                  <strong style={{ fontSize: '15px', color: 'var(--crimson)' }} className="tabular-nums">
                    {formatINR(activeStudentLedger.dueNowPaise)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--navy)', display: 'block' }}>Remaining Balance</span>
                  <strong style={{ fontSize: '15px', color: 'var(--navy)' }} className="tabular-nums">
                    {formatINR(activeStudentLedger.remainingPaise)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Waterfall Installment Schedule Table */}
            <div className="card-surface" style={{ padding: '16px 20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', marginBottom: '12px' }}>
                Itemized Waterfall Fee Schedule
              </h3>

              <div className="table-container">
                <table className="data-table responsive-table">
                  <thead>
                    <tr>
                      <th>Installment / Charge Head</th>
                      <th>Due Date</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Allocated Paid</th>
                      <th style={{ textAlign: 'right' }}>Outstanding</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudentLedger.schedule.map(c => (
                      <tr key={c.id}>
                        <td data-label="Installment Head">
                          <strong>{c.label}</strong>
                        </td>
                        <td data-label="Due Date">{c.date}</td>
                        <td data-label="Amount" style={{ textAlign: 'right' }} className="tabular-nums">
                          {formatINR(c.amountPaise)}
                        </td>
                        <td data-label="Paid" style={{ textAlign: 'right', color: 'var(--green)' }} className="tabular-nums">
                          {formatINR(c.paidPaise)}
                        </td>
                        <td data-label="Outstanding" style={{ textAlign: 'right', color: c.outstandingPaise > 0 ? 'var(--navy)' : 'var(--text-muted)' }} className="tabular-nums">
                          {formatINR(c.outstandingPaise)}
                        </td>
                        <td data-label="Status">
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor:
                                c.status === 'Paid'
                                  ? 'var(--green-light)'
                                  : c.status === 'Overdue'
                                  ? 'var(--crimson-light)'
                                  : 'var(--navy-light)',
                              color:
                                c.status === 'Paid'
                                  ? 'var(--green)'
                                  : c.status === 'Overdue'
                                  ? 'var(--crimson)'
                                  : 'var(--navy)',
                            }}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment History & Receipts Table */}
            <div className="card-surface" style={{ padding: '16px 20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', marginBottom: '12px' }}>
                Transaction & Receipt History
              </h3>

              <div className="table-container">
                <table className="data-table responsive-table">
                  <thead>
                    <tr>
                      <th>Receipt No</th>
                      <th>Date</th>
                      <th>Method & Reference</th>
                      <th style={{ textAlign: 'right' }}>Amount Paid</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.feePayments
                      .filter(p => p.studentId === selectedStudent.id)
                      .map(p => (
                        <tr key={p.id}>
                          <td data-label="Receipt No">
                            <strong>{p.receiptNo}</strong>
                          </td>
                          <td data-label="Date">{p.date}</td>
                          <td data-label="Method">
                            {p.method} · <span style={{ fontFamily: 'monospace' }}>{p.reference}</span>
                          </td>
                          <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                            {formatINR(p.amountPaise)}
                            {p.refundedPaise ? (
                              <span style={{ display: 'block', fontSize: '10px', color: 'var(--crimson)' }}>
                                (Refunded: {formatINR(p.refundedPaise)})
                              </span>
                            ) : null}
                          </td>
                          <td data-label="Status">
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor:
                                  p.status === 'Verified'
                                    ? 'var(--green-light)'
                                    : p.status === 'Bounced'
                                    ? 'var(--crimson-light)'
                                    : 'var(--gold-light)',
                                color:
                                  p.status === 'Verified'
                                    ? 'var(--green)'
                                    : p.status === 'Bounced'
                                    ? 'var(--crimson)'
                                    : 'var(--gold)',
                              }}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td data-label="Actions" style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => handleDownloadReceipt(p, false)}
                                title="Download Original PDF Receipt"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  backgroundColor: 'var(--navy-light)',
                                  color: 'var(--navy)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                PDF
                              </button>
                              <button
                                onClick={() => handleDownloadReceipt(p, true)}
                                title="Download Duplicate Receipt"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  backgroundColor: 'var(--bg-subtle)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                Duplicate
                              </button>
                              {p.status === 'Verified' && (!p.refundedPaise || p.refundedPaise < p.amountPaise) && (
                                <button
                                  onClick={() => {
                                    setSelectedPaymentForRefund(p);
                                    setRefundRupees(String((p.amountPaise - (p.refundedPaise || 0)) / 100));
                                    setRefundModalOpen(true);
                                  }}
                                  title="Process Fee Refund"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    backgroundColor: 'var(--crimson-light)',
                                    color: 'var(--crimson)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Refund
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
          </div>
        ) : (
          <div className="card-surface" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Select a student account from the left panel to inspect fee schedule and transaction records.
          </div>
        )}
      </div>

      {/* MODAL 1: Receive Fee Payment */}
      <Dialog open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record Fee Collection">
        {selectedStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Recording fee receipt for <strong>{selectedStudent.name}</strong> ({selectedStudent.id})
            </p>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Payment Amount (INR)*
              </label>
              <input
                type="number"
                value={payAmountRupees}
                onChange={e => setPayAmountRupees(e.target.value)}
                placeholder="e.g. 25000"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Payment Method*
                </label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as FeePayment['method'])}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', backgroundColor: 'var(--bg-card)' }}
                >
                  <option value="NEFT">NEFT / RTGS</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank transfer">Direct Bank Transfer (IMPS)</option>
                  <option value="Cheque">Bank Cheque</option>
                  <option value="Demand Draft">Demand Draft</option>
                  <option value="Cash">Cash Receipt</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Reference / UTR / Cheque No*
                </label>
                <input
                  type="text"
                  value={payReference}
                  onChange={e => setPayReference(e.target.value)}
                  placeholder="e.g. UTR-202611-98765"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Internal Notes / Ledger Remarks
              </label>
              <textarea
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                placeholder="Optional remarks"
                rows={2}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setPaymentModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm & Generate Receipt
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL 2: Fee Refund */}
      <Dialog open={refundModalOpen} onClose={() => setRefundModalOpen(false)} title="Process Student Fee Refund">
        {selectedPaymentForRefund && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Refunding from verified Receipt <strong>{selectedPaymentForRefund.receiptNo}</strong> (Total: {formatINR(selectedPaymentForRefund.amountPaise)})
            </p>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Refund Amount (INR)* (Capped at available balance)
              </label>
              <input
                type="number"
                value={refundRupees}
                onChange={e => setRefundRupees(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Mandatory Refund Justification / Approval Notes*
              </label>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="Reason for concession, course withdrawal, or excess credit refund"
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setRefundModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessRefund}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--crimson)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Approve & Process Refund
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* CONFIRMATION: Large Cash Warning */}
      <ConfirmDialog
        open={confirmCashWarningOpen}
        onClose={() => setConfirmCashWarningOpen(false)}
        onConfirm={() => {
          setConfirmCashWarningOpen(false);
          handleRecordPayment();
        }}
        title="High Cash Transaction Warning"
        description={`This transaction of ${payAmountRupees} INR exceeds the standard cash threshold of ₹${(state.settings.statutory.cashTransactionWarningLimitPaise / 100).toLocaleString('en-IN')}. Are you sure you wish to record this as physical cash rather than digital bank transfer?`}
        confirmLabel="Proceed with Cash"
        isDestructive={false}
      />
    </div>
  );
}

