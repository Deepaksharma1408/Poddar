// College Finance Portal - Student Fee Ledger & Payment Collection Workspace
// Premium Executive UI: Waterfall Installment Schedule, EMI Calculator, Statement & Receipt PDFs, Refunds, and Macro KPIs

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  FileText,
  Copy,
  RotateCcw,
  CheckCircle,
  Download,
  CreditCard,
  Award,
  Wallet,
  Calendar,
  ShieldCheck,
  Check,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, formatINRExact, toPaise, paiseInWords } from '@/lib/finance-portal/finance/money';
import { computeStudentLedger, validateAndRefundFee, StudentLedgerSummary } from '@/lib/finance-portal/finance/student-ledger';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { ConfirmDialog } from '@/components/finance-portal/ui/confirm-dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import type { Student, FeePayment } from '@/lib/finance-portal/types/finance';

function StudentAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Deterministic soft color badge
  const colors = [
    { bg: '#e8f1fa', text: '#102d47', border: '#c8dcf0' },
    { bg: '#fbf6eb', text: '#8c6d32', border: '#ebd8ad' },
    { bg: '#edf7f1', text: '#25866b', border: '#b8e4cb' },
    { bg: '#fbeeed', text: '#ad211d', border: '#f3c2be' },
  ];
  const charCode = name.charCodeAt(0) + (name.charCodeAt(name.length - 1) || 0);
  const theme = colors[charCode % colors.length];

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: theme.bg,
        color: theme.text,
        border: `1px solid ${theme.border}`,
        display: 'grid',
        placeItems: 'center',
        fontSize: size >= 40 ? '14px' : '11px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function FeesPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'PAID' | 'ON_TRACK'>('ALL');
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

  // Filtered Students list
  const filteredStudents = useMemo(() => {
    return state.students.filter(student => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProg = programmeFilter === 'ALL' || student.programme === programmeFilter;

      if (!matchesSearch || !matchesProg) return false;

      if (statusFilter !== 'ALL') {
        const ledger = computeStudentLedger(student, state.feePayments, currentDate);
        if (statusFilter === 'DUE' && ledger.dueNowPaise <= 0) return false;
        if (statusFilter === 'PAID' && ledger.remainingPaise > 0) return false;
        if (statusFilter === 'ON_TRACK' && (ledger.dueNowPaise > 0 || ledger.remainingPaise === 0)) return false;
      }

      return true;
    });
  }, [state.students, state.feePayments, searchQuery, programmeFilter, statusFilter, currentDate]);

  // Ensure an active student is selected by default
  useEffect(() => {
    if (!selectedStudent && state.students.length > 0) {
      setSelectedStudent(state.students[0]);
    } else if (selectedStudent && !state.students.some(s => s.id === selectedStudent.id)) {
      setSelectedStudent(state.students[0] || null);
    }
  }, [state.students, selectedStudent]);

  // Selected student's computed ledger
  const activeStudentLedger: StudentLedgerSummary | null = useMemo(() => {
    if (!selectedStudent) return null;
    return computeStudentLedger(selectedStudent, state.feePayments, currentDate);
  }, [selectedStudent, state.feePayments, currentDate]);

  // Macro Totals across all students for Executive Overview
  const macroStats = useMemo(() => {
    let totalCommitmentPaise = 0;
    let dueNowPaise = 0;
    let remainingPaise = 0;

    state.students.forEach(s => {
      const ledger = computeStudentLedger(s, state.feePayments, currentDate);
      totalCommitmentPaise += ledger.totalPaise;
      dueNowPaise += ledger.dueNowPaise;
      remainingPaise += ledger.remainingPaise;
    });

    const verifiedPaidPaise = state.feePayments
      .filter(p => p.status === 'Verified')
      .reduce((sum, p) => sum + (p.amountPaise - (p.refundedPaise || 0)), 0);

    return {
      totalCommitmentPaise,
      verifiedPaidPaise,
      dueNowPaise,
      remainingPaise,
    };
  }, [state.students, state.feePayments, currentDate]);

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
      verified: !needsVerification,
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
    pdf.drawText('Poddar International College', pdf.pageWidth - 180, y - 10, { font: 'Helvetica-Bold', size: 7.5, color: PDF_COLORS.navy, align: 'right' });

    pdf.drawFooter(isDuplicate ? 'Duplicate copy issued for student records. Valid without physical stamp.' : undefined);

    const filename = `${isDuplicate ? 'Duplicate-Receipt' : 'Fee-Receipt'}-${selectedStudent.id}-${payment.receiptNo}.pdf`;
    triggerPDFDownload(filename, pdf.output());
    showToast('PDF Generated', `Downloaded ${filename}`, 'info');
  };

  // Generate Comprehensive PDF Statement for Student
  const handleDownloadStatement = (student: Student, ledger: StudentLedgerSummary) => {
    const pdf = new SimplePDF();
    let y = pdf.drawHeader(
      state.settings.institutionName,
      'STUDENT FEE ACCOUNT STATEMENT',
      'OFFICIAL FINANCIAL LEDGER RECORD'
    );

    // Summary Box
    pdf.drawRect(40, y - 62, pdf.pageWidth - 80, 54, {
      fill: PDF_COLORS.lightBg,
      stroke: PDF_COLORS.navy,
      lineWidth: 0.5,
    });

    pdf.drawText(`STUDENT: ${student.name.toUpperCase()}`, 52, y - 12, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    pdf.drawText(`Roll No: ${student.rollNo}  |  Admission ID: ${student.id}`, 52, y - 24, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Programme: ${student.programme} (Sem ${student.semester})  |  Batch: ${student.batch}`, 52, y - 36, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Guardian: ${student.guardianName} (${student.guardianPhone})`, 52, y - 48, { font: 'Helvetica', size: 8 });

    pdf.drawText('NET REMAINING BALANCE', pdf.pageWidth - 180, y - 14, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.mutedText, align: 'right' });
    pdf.drawText(formatINRExact(ledger.remainingPaise), pdf.pageWidth - 52, y - 14, {
      font: 'Helvetica-Bold',
      size: 13,
      color: ledger.remainingPaise > 0 ? PDF_COLORS.navy : PDF_COLORS.green,
      align: 'right',
    });
    pdf.drawText(`STATUS: ${ledger.status.toUpperCase()}`, pdf.pageWidth - 52, y - 32, {
      font: 'Helvetica-Bold',
      size: 8,
      color: ledger.status === 'Paid in full' ? PDF_COLORS.green : ledger.status === 'Payment due' ? PDF_COLORS.crimson : PDF_COLORS.navy,
      align: 'right',
    });

    y -= 84;

    // Waterfall Schedule Section
    pdf.drawText('ITEMIZED FEE INSTALLMENT SCHEDULE', 40, y, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    y -= 12;

    const headers = ['Installment Head', 'Due Date', 'Amount', 'Paid', 'Outstanding', 'Status'];
    const widths = [180, 70, 75, 75, 75, 40];
    let startX = 40;

    // Draw table header
    pdf.drawRect(40, y - 16, pdf.pageWidth - 80, 16, { fill: PDF_COLORS.lightBg });
    headers.forEach((h, idx) => {
      const align = idx >= 2 && idx <= 4 ? 'right' : 'left';
      const colX = align === 'right' ? startX + widths[idx] - 6 : startX + 6;
      pdf.drawText(h, colX, y - 4, { font: 'Helvetica-Bold', size: 7.5, color: PDF_COLORS.darkSlate, align });
      startX += widths[idx];
    });

    y -= 18;

    ledger.schedule.forEach(row => {
      startX = 40;
      const vals = [
        row.label,
        row.date,
        formatINR(row.amountPaise),
        formatINR(row.paidPaise),
        formatINR(row.outstandingPaise),
        row.status,
      ];
      vals.forEach((v, idx) => {
        const align = idx >= 2 && idx <= 4 ? 'right' : 'left';
        const colX = align === 'right' ? startX + widths[idx] - 6 : startX + 6;
        pdf.drawText(v, colX, y - 2, {
          font: idx === 0 ? 'Helvetica-Bold' : 'Helvetica',
          size: 7.5,
          color: idx === 3 && row.paidPaise > 0 ? PDF_COLORS.green : idx === 4 && row.outstandingPaise > 0 ? PDF_COLORS.navy : PDF_COLORS.darkSlate,
          align,
        });
        startX += widths[idx];
      });
      pdf.drawLine(40, y - 6, pdf.pageWidth - 40, y - 6, { stroke: PDF_COLORS.border, lineWidth: 0.3 });
      y -= 16;
    });

    y -= 16;

    // Transaction History Section
    const studentPayments = state.feePayments.filter(p => p.studentId === student.id);
    if (studentPayments.length > 0) {
      pdf.drawText('RECORDED TRANSACTIONS & RECEIPTS', 40, y, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
      y -= 12;

      pdf.drawRect(40, y - 16, pdf.pageWidth - 80, 16, { fill: PDF_COLORS.lightBg });
      const payHeaders = ['Receipt No', 'Date', 'Payment Mode & Reference', 'Amount Paid', 'Status'];
      const payWidths = [100, 75, 185, 80, 75];
      startX = 40;
      payHeaders.forEach((h, idx) => {
        const align = idx === 3 ? 'right' : 'left';
        const colX = align === 'right' ? startX + payWidths[idx] - 6 : startX + 6;
        pdf.drawText(h, colX, y - 4, { font: 'Helvetica-Bold', size: 7.5, color: PDF_COLORS.darkSlate, align });
        startX += payWidths[idx];
      });

      y -= 18;

      studentPayments.forEach(p => {
        startX = 40;
        const vals = [
          p.receiptNo,
          p.date,
          `${p.method} (${p.reference})`,
          formatINR(p.amountPaise),
          p.status,
        ];
        vals.forEach((v, idx) => {
          const align = idx === 3 ? 'right' : 'left';
          const colX = align === 'right' ? startX + payWidths[idx] - 6 : startX + 6;
          pdf.drawText(v, colX, y - 2, {
            font: idx === 0 ? 'Helvetica-Bold' : 'Helvetica',
            size: 7.5,
            color: idx === 3 ? PDF_COLORS.green : PDF_COLORS.darkSlate,
            align,
          });
          startX += payWidths[idx];
        });
        pdf.drawLine(40, y - 6, pdf.pageWidth - 40, y - 6, { stroke: PDF_COLORS.border, lineWidth: 0.3 });
        y -= 16;
      });
    }

    pdf.drawFooter(`Official fee statement generated on ${currentDate}. Valid for college administrative use.`);

    const filename = `Fee-Statement-${student.id}-${student.name.replace(/\s+/g, '_')}.pdf`;
    triggerPDFDownload(filename, pdf.output());
    showToast('Statement Downloaded', `Downloaded ${filename}`, 'info');
  };

  // Generate No Dues Certificate PDF
  const handleDownloadNoDues = (student: Student) => {
    const pdf = new SimplePDF();
    let y = pdf.drawHeader(
      state.settings.institutionName,
      'NO DUES CLEARANCE CERTIFICATE',
      'ACADEMIC SESSION 2026-27'
    );

    // Box
    pdf.drawRect(40, y - 85, pdf.pageWidth - 80, 75, {
      fill: PDF_COLORS.lightBg,
      stroke: PDF_COLORS.green,
      lineWidth: 1,
    });

    pdf.drawText('CLEARANCE CONFIRMATION', 52, y - 14, { font: 'Helvetica-Bold', size: 10, color: PDF_COLORS.green });
    pdf.drawText(`This certifies that student ${student.name.toUpperCase()} (Admission ID: ${student.id}, Roll No: ${student.rollNo}),`, 52, y - 32, { font: 'Helvetica', size: 9 });
    pdf.drawText(`enrolled in ${student.programme} (Semester ${student.semester}, Batch ${student.batch}) has fulfilled all college`, 52, y - 46, { font: 'Helvetica', size: 9 });
    pdf.drawText(`academic tuition fee commitments for Session 2026-27. Zero outstanding balance remains.`, 52, y - 60, { font: 'Helvetica', size: 9 });

    y -= 130;
    pdf.drawLine(40, y, 180, y, { stroke: PDF_COLORS.border });
    pdf.drawLine(pdf.pageWidth - 180, y, pdf.pageWidth - 40, y, { stroke: PDF_COLORS.border });

    pdf.drawText('Accounts Officer', 40, y - 12, { font: 'Helvetica-Bold', size: 8 });
    pdf.drawText('Poddar International College', 40, y - 22, { font: 'Helvetica', size: 7.5, color: PDF_COLORS.mutedText });

    pdf.drawText('Dean / Principal', pdf.pageWidth - 180, y - 12, { font: 'Helvetica-Bold', size: 8 });
    pdf.drawText('Poddar Group of Institutions', pdf.pageWidth - 180, y - 22, { font: 'Helvetica', size: 7.5, color: PDF_COLORS.mutedText });

    pdf.drawFooter('Institutional No-Dues clearance for examination admittance and transfer certification.');

    const filename = `No-Dues-Certificate-${student.id}.pdf`;
    triggerPDFDownload(filename, pdf.output());
    showToast('Certificate Downloaded', `Downloaded ${filename}`, 'success');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.3px' }}>
            Student Fee Accounts & Collection
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Waterfall installment schedules, collection desk, duplicate receipt generator, and student statement export.
          </p>
        </div>
      </div>

      {/* 2. Executive Macro KPI Overview Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total Fee Commitments */}
        <div className="card-surface" style={{ borderLeft: '4px solid var(--navy)', padding: '18px 20px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Fee Commitments</span>
            <Layers size={14} style={{ color: 'var(--navy)' }} />
          </span>
          <div className="headline-number" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--navy)', margin: '8px 0 3px' }}>
            {formatINR(macroStats.totalCommitmentPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Annual tuition across 155 students
          </span>
        </div>

        {/* Collected & Verified */}
        <div className="card-surface" style={{ borderLeft: '4px solid var(--green)', padding: '18px 20px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Collected & Verified</span>
            <TrendingUp size={14} style={{ color: 'var(--green)' }} />
          </span>
          <div className="headline-number" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--green)', margin: '8px 0 3px' }}>
            {formatINR(macroStats.verifiedPaidPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--green)' }}>
            Credited to institutional bank account
          </span>
        </div>

        {/* Immediate Due Now */}
        <div className="card-surface" style={{ borderLeft: '4px solid var(--crimson)', padding: '18px 20px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Immediate Due Now</span>
            <AlertCircle size={14} style={{ color: 'var(--crimson)' }} />
          </span>
          <div className="headline-number" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--crimson)', margin: '8px 0 3px' }}>
            {formatINR(macroStats.dueNowPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--crimson)' }}>
            Scheduled charges due through {currentDate}
          </span>
        </div>

        {/* Total Remaining Balance */}
        <div className="card-surface" style={{ borderLeft: '4px solid var(--gold)', padding: '18px 20px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Outstanding</span>
            <Wallet size={14} style={{ color: 'var(--gold)' }} />
          </span>
          <div className="headline-number" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--gold)', margin: '8px 0 3px' }}>
            {formatINR(macroStats.remainingPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Due now + upcoming installments
          </span>
        </div>
      </div>

      {/* 3. Main Workspace Grid: Master-Detail Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '350px minmax(0, 1fr)', gap: '22px', alignItems: 'start' }}>
        {/* Left Column: Student Directory */}
        <div className="card-surface" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 210px)', overflow: 'hidden' }}>
          {/* Search, Program Tabs & Filter */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#ffffff' }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', padding: '7px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search name, roll no, ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '100%', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Programme Selector Pills */}
            <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '2px' }}>
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
                    transition: 'all 0.15s ease',
                  }}
                >
                  {prog}
                </button>
              ))}
            </div>

            {/* Status Filter Chips */}
            <div style={{ display: 'flex', gap: '5px', overflowX: 'auto' }}>
              {[
                { id: 'ALL', label: 'All Accounts' },
                { id: 'DUE', label: 'Due Now' },
                { id: 'ON_TRACK', label: 'On Track' },
                { id: 'PAID', label: 'Paid in Full' },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  style={{
                    padding: '2px 7px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    border: '1px solid',
                    borderColor: statusFilter === st.id ? 'var(--gold)' : 'var(--border)',
                    backgroundColor: statusFilter === st.id ? 'var(--gold-light)' : 'transparent',
                    color: statusFilter === st.id ? '#8c6d32' : 'var(--text-muted)',
                    fontWeight: statusFilter === st.id ? 600 : 450,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Student List Scroll Container */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No student accounts match your filter criteria.
              </div>
            ) : (
              filteredStudents.map(student => {
                const isSelected = selectedStudent?.id === student.id;
                const ledger = computeStudentLedger(student, state.feePayments, currentDate);

                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: isSelected ? '#f5f8fc' : 'transparent',
                      cursor: 'pointer',
                      borderLeft: isSelected ? '4px solid var(--navy)' : '4px solid transparent',
                      boxShadow: isSelected ? 'inset 2px 0 0 var(--gold)' : 'none',
                      transition: 'background-color 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '11px',
                    }}
                  >
                    <StudentAvatar name={student.name} size={34} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.name}
                        </strong>
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: ledger.remainingPaise > 0 ? 'var(--navy)' : 'var(--green)',
                            flexShrink: 0,
                            marginLeft: '6px',
                          }}
                        >
                          {formatINR(ledger.remainingPaise)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.id} · {student.programme} (S{student.semester})
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 500,
                            color: ledger.dueNowPaise > 0 ? 'var(--crimson)' : 'var(--text-muted)',
                            flexShrink: 0,
                          }}
                        >
                          {ledger.dueNowPaise > 0 ? `Due: ${formatINR(ledger.dueNowPaise)}` : ledger.remainingPaise === 0 ? 'Settled' : 'On track'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Student Account & Ledger Workspace */}
        {selectedStudent && activeStudentLedger ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
            {/* LUXURY EXECUTIVE STUDENT PROFILE BANNER */}
            <div
              className="card-surface"
              style={{
                background: 'linear-gradient(145deg, #102d47 0%, #091e31 100%)',
                color: '#ffffff',
                padding: '24px 26px',
                borderRadius: '12px',
                border: '1px solid rgba(180, 150, 98, 0.35)',
                boxShadow: '0 8px 24px rgba(16, 45, 71, 0.12)',
              }}
            >
              {/* Top Row: Avatar, Student Info, Badges and Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(198, 167, 108, 0.6)',
                      color: '#f7e8c6',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '17px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      flexShrink: 0,
                    }}
                  >
                    {selectedStudent.name
                      .split(' ')
                      .map(p => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
                        {selectedStudent.name}
                      </h2>
                      <span style={{ fontSize: '11px', backgroundColor: 'rgba(198, 167, 108, 0.25)', color: '#f7e8c6', border: '1px solid rgba(198, 167, 108, 0.4)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {selectedStudent.programme} · Sem {selectedStudent.semester}
                      </span>
                      <span style={{ fontSize: '11px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1', padding: '2px 8px', borderRadius: '4px' }}>
                        Roll: {selectedStudent.rollNo}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            activeStudentLedger.status === 'Paid in full'
                              ? 'rgba(37, 134, 107, 0.35)'
                              : activeStudentLedger.dueNowPaise > 0
                              ? 'rgba(173, 33, 29, 0.35)'
                              : 'rgba(180, 150, 98, 0.35)',
                          color:
                            activeStudentLedger.status === 'Paid in full'
                              ? '#6ee7b7'
                              : activeStudentLedger.dueNowPaise > 0
                              ? '#fca5a5'
                              : '#fde68a',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                        }}
                      >
                        {activeStudentLedger.status === 'Paid in full'
                          ? 'PAID IN FULL'
                          : activeStudentLedger.dueNowPaise > 0
                          ? `DUE NOW: ${formatINR(activeStudentLedger.dueNowPaise)}`
                          : 'ON TRACK'}
                      </span>
                    </div>

                    <p style={{ fontSize: '11.5px', color: '#a0b1c0', marginTop: '6px' }}>
                      Guardian: <span style={{ color: '#e2e8f0' }}>{selectedStudent.guardianName}</span> ({selectedStudent.guardianPhone}) · Batch: <span style={{ color: '#e2e8f0' }}>{selectedStudent.batch}</span> · Plan: <span style={{ color: '#f7e8c6' }}>{selectedStudent.plan.kind} ({selectedStudent.plan.interestType})</span>
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setPayAmountRupees(String(activeStudentLedger.dueNowPaise > 0 ? activeStudentLedger.dueNowPaise / 100 : activeStudentLedger.remainingPaise / 100));
                      setPaymentModalOpen(true);
                    }}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#b49662',
                      color: '#102d47',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <PlusCircle size={15} />
                    <span>Receive Payment</span>
                  </button>

                  <button
                    onClick={() => handleDownloadStatement(selectedStudent, activeStudentLedger)}
                    style={{
                      padding: '8px 13px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Download size={14} />
                    <span>Statement (PDF)</span>
                  </button>

                  {activeStudentLedger.remainingPaise === 0 && (
                    <button
                      onClick={() => handleDownloadNoDues(selectedStudent)}
                      style={{
                        padding: '8px 13px',
                        backgroundColor: 'rgba(37, 134, 107, 0.3)',
                        color: '#6ee7b7',
                        border: '1px solid rgba(110, 231, 183, 0.4)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Award size={14} />
                      <span>No-Dues (PDF)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Middle Row: Progress Bar */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '6px' }}>
                  <span>
                    Collection Progress: <strong style={{ color: '#f7e8c6' }}>{activeStudentLedger.progressPct}% paid</strong>
                  </span>
                  <span className="tabular-nums">
                    {formatINR(activeStudentLedger.paidPaise)} of {formatINR(activeStudentLedger.totalPaise)}
                  </span>
                </div>
                <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${activeStudentLedger.progressPct}%`,
                      background: 'linear-gradient(90deg, #b49662, #f7e8c6)',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Bottom Row: 4 Metric Tiles with Bold Numbers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginTop: '18px' }}>
                {/* Tile 1: Total Annual Fee */}
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#a0b1c0', display: 'block' }}>
                    Total Annual Fee
                  </span>
                  <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: '4px 0 2px' }}>
                    {formatINR(activeStudentLedger.totalPaise)}
                  </div>
                  <span style={{ fontSize: '10px', color: '#7893a9' }}>Tuition & Base Fees</span>
                </div>

                {/* Tile 2: Verified Paid */}
                <div style={{ backgroundColor: 'rgba(37, 134, 107, 0.12)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(110, 231, 183, 0.2)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6ee7b7', display: 'block' }}>
                    Verified Paid
                  </span>
                  <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: '#6ee7b7', margin: '4px 0 2px' }}>
                    {formatINR(activeStudentLedger.paidPaise)}
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(110, 231, 183, 0.8)' }}>Allocated & Credited</span>
                </div>

                {/* Tile 3: Immediate Due */}
                <div style={{ backgroundColor: 'rgba(173, 33, 29, 0.12)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(252, 165, 165, 0.2)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#fca5a5', display: 'block' }}>
                    Immediate Due
                  </span>
                  <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: '#fca5a5', margin: '4px 0 2px' }}>
                    {formatINR(activeStudentLedger.dueNowPaise)}
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(252, 165, 165, 0.8)' }}>Due As of {currentDate}</span>
                </div>

                {/* Tile 4: Remaining Balance */}
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#f7e8c6', display: 'block' }}>
                    Remaining Balance
                  </span>
                  <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: '#f7e8c6', margin: '4px 0 2px' }}>
                    {formatINR(activeStudentLedger.remainingPaise)}
                  </div>
                  <span style={{ fontSize: '10px', color: '#7893a9' }}>Future installments</span>
                </div>
              </div>
            </div>

            {/* WATERFALL INSTALLMENT SCHEDULE TABLE */}
            <div className="card-surface" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>
                    Itemized Waterfall Fee Schedule
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Collections automatically satisfy oldest installments first. Final installment carries rounding adjustment.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--green)' }} />
                    {activeStudentLedger.schedule.filter(c => c.status === 'Paid').length} Paid
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--crimson)' }} />
                    {activeStudentLedger.schedule.filter(c => c.status === 'Overdue').length} Overdue
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--gold)' }} />
                    {activeStudentLedger.schedule.filter(c => c.status === 'Upcoming').length} Upcoming
                  </span>
                </div>
              </div>

              <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
                <table className="data-table responsive-table" style={{ width: '100%', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '26%', textAlign: 'left' }}>Installment / Charge Head</th>
                      <th style={{ width: '15%', textAlign: 'left' }}>Due Date</th>
                      <th style={{ width: '16%', textAlign: 'right' }}>Scheduled Amount</th>
                      <th style={{ width: '16%', textAlign: 'right' }}>Allocated Paid</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Outstanding</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudentLedger.schedule.map(c => (
                      <tr key={c.id}>
                        <td data-label="Installment Head">
                          <strong style={{ color: 'var(--text-primary)', fontSize: '12.5px' }}>{c.label}</strong>
                        </td>
                        <td data-label="Due Date" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {c.date}
                        </td>
                        <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                          {formatINR(c.amountPaise)}
                        </td>
                        <td data-label="Paid" style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }} className="tabular-nums">
                          {formatINR(c.paidPaise)}
                        </td>
                        <td data-label="Outstanding" style={{ textAlign: 'right', color: c.outstandingPaise > 0 ? 'var(--navy)' : 'var(--text-muted)', fontWeight: 600 }} className="tabular-nums">
                          {formatINR(c.outstandingPaise)}
                        </td>
                        <td data-label="Status" style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '3px 8px',
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
                              display: 'inline-block',
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

            {/* TRANSACTION & RECEIPT HISTORY TABLE */}
            <div className="card-surface" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>
                    Transaction & Receipt History
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Complete audit of receipts, payment modes, UTR references, verification flags, and refund controls.
                  </p>
                </div>
              </div>

              <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
                {state.feePayments.filter(p => p.studentId === selectedStudent.id).length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No fee payments recorded yet for this student account.
                  </div>
                ) : (
                  <table className="data-table responsive-table" style={{ width: '100%', tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '18%', textAlign: 'left' }}>Receipt No</th>
                        <th style={{ width: '13%', textAlign: 'left' }}>Date</th>
                        <th style={{ width: '25%', textAlign: 'left' }}>Method & Reference</th>
                        <th style={{ width: '16%', textAlign: 'right' }}>Amount Paid</th>
                        <th style={{ width: '13%', textAlign: 'center' }}>Status</th>
                        <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.feePayments
                        .filter(p => p.studentId === selectedStudent.id)
                        .map(p => (
                          <tr key={p.id}>
                            <td data-label="Receipt No">
                              <strong style={{ color: 'var(--navy)', fontSize: '12px' }}>{p.receiptNo}</strong>
                            </td>
                            <td data-label="Date" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {p.date}
                            </td>
                            <td data-label="Method" style={{ fontSize: '12px' }}>
                              <span>{p.method}</span>
                              <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {p.reference}
                              </span>
                            </td>
                            <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">
                              <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{formatINR(p.amountPaise)}</span>
                              {p.refundedPaise ? (
                                <span style={{ display: 'block', fontSize: '10px', color: 'var(--crimson)' }}>
                                  (Refunded: {formatINR(p.refundedPaise)})
                                </span>
                              ) : null}
                            </td>
                            <td data-label="Status" style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '3px 8px',
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
                                      : '#8c6d32',
                                  display: 'inline-block',
                                }}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td data-label="Actions" style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '5px' }}>
                                <button
                                  onClick={() => handleDownloadReceipt(p, false)}
                                  title="Download Original PDF Receipt"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: 'var(--navy-light)',
                                    color: 'var(--navy)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <Download size={11} />
                                  <span>PDF</span>
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
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <Copy size={11} />
                                  <span>Copy</span>
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
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <RotateCcw size={11} />
                                    <span>Refund</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card-surface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Wallet size={36} style={{ color: 'var(--gold)', marginBottom: '12px' }} />
            <strong style={{ fontSize: '15px', color: 'var(--navy)' }}>No Student Selected</strong>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Select an account from the left directory to view the waterfall schedule and record payments.</p>
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
                Amount to Collect (INR)*
              </label>
              <input
                type="number"
                value={payAmountRupees}
                onChange={e => setPayAmountRupees(e.target.value)}
                placeholder="Enter amount in Rupees"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Payment Mode*
                </label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as FeePayment['method'])}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', backgroundColor: 'var(--bg-card)' }}
                >
                  <option value="NEFT">NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Demand Draft">Demand Draft</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  UTR / Cheque Reference*
                </label>
                <input
                  type="text"
                  value={payReference}
                  onChange={e => setPayReference(e.target.value)}
                  placeholder="Unique bank reference"
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
