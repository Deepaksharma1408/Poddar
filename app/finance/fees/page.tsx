// College Finance Portal - Student Fee Ledger & Payment Collection Workspace
// Implements the signature Poddar Connect luxury design system:
// Workspace Intro, Premium Metric KPI Tiles, Account Directory Ledger, and Deep Navy Account Profile

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Download,
  CreditCard,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  RotateCcw,
  Copy,
  Check,
  Clock,
  Calendar,
  Eye,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, formatINRExact, toPaise, paiseInWords } from '@/lib/finance-portal/finance/money';
import { computeStudentLedger, validateAndRefundFee, StudentLedgerSummary } from '@/lib/finance-portal/finance/student-ledger';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { ConfirmDialog } from '@/components/finance-portal/ui/confirm-dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { useApprovalNotice } from '@/components/finance-portal/ui/approval-notice';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import type { Student, FeePayment } from '@/lib/finance-portal/types/finance';

function PersonBadge({ name, id, prog, sem }: { name: string; id: string; prog: string; sem: number }) {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="person premium-person" style={{ display: 'flex', alignItems: 'center', gap: '11px', textAlign: 'left' }}>
      <span className="avatar" style={{ width: '35px', height: '35px', borderRadius: '9px', fontSize: '11px', flexShrink: 0 }}>
        {initials}
      </span>
      <div>
        <strong style={{ fontSize: '12px', display: 'block', color: '#182e46' }}>{name}</strong>
        <small style={{ fontSize: '10px', color: '#8a99a4' }}>
          {id} · {prog} (Sem {sem})
        </small>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const isGood = ['Paid', 'Paid in full', 'On track', 'Verified'].includes(status);
  const isBad = ['Overdue', 'Payment due', 'Bounced'].includes(status);
  const className = `status-pill ${isGood ? 'good' : isBad ? 'bad' : 'neutral'}`;
  return (
    <span className={className}>
      <i />
      {status}
    </span>
  );
}

function PaymentMethodBadge({ method }: { method: FeePayment['method'] }) {
  const styles: Record<FeePayment['method'], { bg: string; color: string; border: string }> = {
    UPI: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    NEFT: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    'Bank transfer': { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    Cheque: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    Cash: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    'Demand Draft': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  };

  const current = styles[method] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2.5px 8px',
        borderRadius: '5px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {method}
    </span>
  );
}

export default function FeesPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();
  const { showApprovalNotice } = useApprovalNotice();
  const profileRef = useRef<HTMLElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All students');
  const [programmeTab, setProgrammeTab] = useState('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(state.students[0]?.id || 'PIC26001');

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<FeePayment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPaymentForDetail, setSelectedPaymentForDetail] = useState<FeePayment | null>(null);

  // Payment Form state
  const [paymentStudentId, setPaymentStudentId] = useState<string>(selectedStudentId);
  const [payAmountRupees, setPayAmountRupees] = useState('');
  const [payMethod, setPayMethod] = useState<FeePayment['method']>('NEFT');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Refund Form state
  const [refundRupees, setRefundRupees] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Confirmation dialogs
  const [confirmCashWarningOpen, setConfirmCashWarningOpen] = useState(false);

  // Active student object
  const activeStudent: Student = useMemo(() => {
    return state.students.find(s => s.id === selectedStudentId) || state.students[0];
  }, [state.students, selectedStudentId]);

  // Selected student's computed ledger
  const activeStudentLedger: StudentLedgerSummary = useMemo(() => {
    return computeStudentLedger(activeStudent, state.feePayments, currentDate);
  }, [activeStudent, state.feePayments, currentDate]);

  // All student ledgers mapped
  const allLedgers = useMemo(() => {
    return state.students.map(student => ({
      student,
      ledger: computeStudentLedger(student, state.feePayments, currentDate),
    }));
  }, [state.students, state.feePayments, currentDate]);

  // Filtered student list for directory table
  const filteredStudents = useMemo(() => {
    return allLedgers.filter(({ student: s, ledger: l }) => {
      const matchSearch =
        `${s.name} ${s.id} ${s.rollNo} ${s.programme}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchProg = programmeTab === 'ALL' || s.programme === programmeTab;
      if (!matchSearch || !matchProg) return false;

      if (filterType === 'Due now') return l.dueNowPaise > 0;
      if (filterType === 'EMI plans') return s.plan.kind === 'EMI';
      if (filterType === 'Semester plans') return s.plan.kind === 'Semester';
      if (filterType === 'Fully paid') return l.remainingPaise === 0;

      return true;
    });
  }, [allLedgers, searchQuery, programmeTab, filterType]);

  // Macro Totals for the 4 top KPI metrics
  const totals = useMemo(() => {
    let totalCommitmentPaise = 0;
    let dueNowPaise = 0;
    let remainingPaise = 0;

    allLedgers.forEach(({ ledger }) => {
      totalCommitmentPaise += ledger.totalPaise;
      dueNowPaise += ledger.dueNowPaise;
      remainingPaise += ledger.remainingPaise;
    });

    const verifiedPaidPaise = state.feePayments
      .filter(p => p.status === 'Verified')
      .reduce((sum, p) => sum + (p.amountPaise - (p.refundedPaise || 0)), 0);

    return {
      total: totalCommitmentPaise,
      paid: verifiedPaidPaise,
      due: dueNowPaise,
      remaining: remainingPaise,
    };
  }, [allLedgers, state.feePayments]);

  const selectStudent = (id: string) => {
    setSelectedStudentId(id);
    profileRef.current?.scrollIntoView({
      block: 'start',
      behavior: 'smooth',
    });
  };

  const openPayment = (studentId: string) => {
    const student = state.students.find(s => s.id === studentId) || activeStudent;
    const ledger = computeStudentLedger(student, state.feePayments, currentDate);
    setPaymentStudentId(student.id);
    setPayMethod(student.plan.preferredMethod || 'NEFT');
    setPayAmountRupees(String(ledger.dueNowPaise > 0 ? ledger.dueNowPaise / 100 : ledger.remainingPaise / 100));
    setPayReference('');
    setPayNotes('');
    setPaymentModalOpen(true);
  };

  const openPaymentDetail = (payment: FeePayment) => {
    setSelectedPaymentForDetail(payment);
    setDetailModalOpen(true);
  };

  // Handle Recording Payment
  const handleRecordPayment = () => {
    const targetStudent = state.students.find(s => s.id === paymentStudentId) || activeStudent;
    const amountPaise = toPaise(payAmountRupees);
    if (amountPaise <= 0) {
      showToast('Invalid Amount', 'Please enter a valid payment amount', 'error');
      return;
    }

    if (!payReference.trim()) {
      showToast('Reference Required', 'Please enter a unique UTR or Cheque number', 'error');
      return;
    }

    const isDup = state.feePayments.some(
      p => p.reference.trim().toUpperCase() === payReference.trim().toUpperCase()
    );
    if (isDup) {
      showToast('Duplicate Reference', `Reference ${payReference} has already been recorded!`, 'error');
      return;
    }

    const cashLimitPaise = state.settings.statutory.cashTransactionWarningLimitPaise;
    if (payMethod === 'Cash' && amountPaise >= cashLimitPaise && !confirmCashWarningOpen) {
      setConfirmCashWarningOpen(true);
      return;
    }

    const currentTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const receiptNo = `RCPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const needsVerification = ['NEFT', 'Cheque', 'Demand Draft', 'Bank transfer'].includes(payMethod);
    const bankAccount = payMethod === 'Cash'
      ? 'Campus Cash Counter 1'
      : 'SBI Institutional Collection A/c ••••4102';

    const newPayment: FeePayment = {
      id: `PAY-${targetStudent.id}-${Date.now()}`,
      studentId: targetStudent.id,
      amountPaise,
      date: currentDate,
      time: currentTime,
      method: payMethod,
      reference: payReference.trim(),
      receiptNo,
      verified: !needsVerification,
      status: needsVerification ? 'Pending Verification' : 'Verified',
      createdBy: state.settings.currentRole,
      notes: payNotes,
      bankAccount,
    };

    dispatch({ type: 'RECORD_FEE_PAYMENT', payment: newPayment });
    showToast('Payment Recorded', `Receipt ${receiptNo} generated for ${targetStudent.name}.`, 'success');

    setPaymentModalOpen(false);
  };

  // Generate Receipt PDF
  const handleDownloadReceipt = (payment: FeePayment, isDuplicate = false) => {
    const student = state.students.find(s => s.id === payment.studentId) || activeStudent;
    const pdf = new SimplePDF();
    const title = isDuplicate ? 'DUPLICATE FEE RECEIPT' : 'STUDENT FEE RECEIPT';
    let y = pdf.drawHeader(state.settings.institutionName, title, 'STUDENT FINANCIAL ACCOUNTS', isDuplicate);

    pdf.drawRect(40, y - 50, pdf.pageWidth - 80, 45, {
      fill: PDF_COLORS.lightBg,
      stroke: PDF_COLORS.navy,
      lineWidth: 0.5,
    });

    const timeDisplay = payment.time || '11:30 AM';
    pdf.drawText('RECEIPT DETAILS', 52, y - 10, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    pdf.drawText(`Receipt No: ${payment.receiptNo}`, 52, y - 22, { font: 'Helvetica-Bold', size: 8 });
    pdf.drawText(`Date & Time: ${payment.date} at ${timeDisplay} IST`, 52, y - 34, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Mode: ${payment.method} | Ref / UTR: ${payment.reference}`, 52, y - 46, { font: 'Helvetica', size: 8 });

    pdf.drawText('AMOUNT PAID', pdf.pageWidth - 180, y - 12, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.mutedText, align: 'right' });
    pdf.drawText(formatINRExact(payment.amountPaise), pdf.pageWidth - 52, y - 12, { font: 'Helvetica-Bold', size: 14, color: PDF_COLORS.green, align: 'right' });
    pdf.drawText(`STATUS: ${payment.status.toUpperCase()}`, pdf.pageWidth - 52, y - 32, {
      font: 'Helvetica-Bold',
      size: 8,
      color: payment.verified ? PDF_COLORS.navy : PDF_COLORS.gold,
      align: 'right',
    });

    y -= 70;
    pdf.drawText(`Student Name: ${student.name}`, 40, y, { font: 'Helvetica-Bold', size: 9 });
    pdf.drawText(`Admission ID: ${student.id}`, 250, y, { font: 'Helvetica-Bold', size: 9 });
    pdf.drawText(`Programme: ${student.programme} (Semester ${student.semester})`, 40, y - 14, { font: 'Helvetica', size: 8.5 });
    pdf.drawText(`Guardian: ${student.guardianName}`, 250, y - 14, { font: 'Helvetica', size: 8.5 });

    y -= 35;
    pdf.drawLine(40, y, pdf.pageWidth - 40, y, { stroke: PDF_COLORS.border });
    y -= 20;

    pdf.drawText(`Amount in Words: ${paiseInWords(payment.amountPaise)}`, 40, y, { font: 'Helvetica-Oblique', size: 8.5, color: PDF_COLORS.darkSlate });

    y -= 60;
    pdf.drawText('Accounts Officer / Cashier', pdf.pageWidth - 180, y, { font: 'Helvetica', size: 8, align: 'right' });
    pdf.drawText('Poddar International College', pdf.pageWidth - 180, y - 10, { font: 'Helvetica-Bold', size: 7.5, color: PDF_COLORS.navy, align: 'right' });

    pdf.drawFooter(isDuplicate ? 'Duplicate copy issued for student records. Valid without physical stamp.' : undefined);

    const filename = `${isDuplicate ? 'Duplicate-Receipt' : 'Fee-Receipt'}-${student.id}-${payment.receiptNo}.pdf`;
    triggerPDFDownload(filename, pdf.output());
    showToast('PDF Generated', `Downloaded ${filename}`, 'info');
  };

  // Generate Statement PDF
  const handleDownloadStatement = (student: Student, ledger: StudentLedgerSummary) => {
    const pdf = new SimplePDF();
    let y = pdf.drawHeader(
      state.settings.institutionName,
      'STUDENT FEE ACCOUNT STATEMENT',
      'OFFICIAL FINANCIAL LEDGER RECORD'
    );

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
    pdf.drawText('ITEMIZED FEE INSTALLMENT SCHEDULE', 40, y, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    y -= 12;

    const headers = ['Installment Head', 'Due Date', 'Amount', 'Paid', 'Outstanding', 'Status'];
    const widths = [180, 70, 75, 75, 75, 40];
    let startX = 40;

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

  // Generate No Dues Certificate
  const handleDownloadNoDues = (student: Student) => {
    const pdf = new SimplePDF();
    let y = pdf.drawHeader(
      state.settings.institutionName,
      'NO DUES CLEARANCE CERTIFICATE',
      'ACADEMIC SESSION 2026-27'
    );

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

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Student', 'Admission ID', 'Programme', 'Semester', 'Plan', 'Total Payable', 'Verified Paid', 'Due Now', 'Remaining Balance', 'Preferred Mode'],
      ...allLedgers.map(({ student: s, ledger: l }) => [
        s.name,
        s.id,
        s.programme,
        s.semester,
        s.plan.kind,
        l.totalPaise / 100,
        l.paidPaise / 100,
        l.dueNowPaise / 100,
        l.remainingPaise / 100,
        s.plan.preferredMethod,
      ]),
    ];
    const csvContent = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-fee-accounts-${currentDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Ledger Exported', 'Downloaded student-fee-accounts.csv', 'info');
  };

  // Process Refund
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
    showApprovalNotice({
      itemTitle: `Fee Refund — ${activeStudent.name} (${activeStudent.id})`,
      category: 'Fee Refund',
      amountPaise: refundPaise,
      reference: selectedPaymentForRefund.receiptNo,
      nextApproverTier: 'Accounts Admin / Management',
      notes: `Concession/Refund justification: ${refundReason}`,
    });
    setRefundModalOpen(false);
    setSelectedPaymentForRefund(null);
    setRefundRupees('');
    setRefundReason('');
  };

  return (
    <div className="premium-workspace">
      {/* 1. Workspace Intro */}
      <div className="workspace-intro">
        <div>
          <span className="editorial-kicker">FINANCE / STUDENT ACCOUNTS</span>
          <h2>Every payment.<br /><em>Perfectly accounted for.</em></h2>
          <p>One clear view of college fees, waterfall installment schedules and the balance ahead.</p>
        </div>
        <div className="intro-actions">
          <span className="secure-note"><ShieldCheck size={15} /> Tuition & Academic Fees · FY 2026–27</span>
          <button className="button primary" onClick={() => openPayment(activeStudent.id)}>
            <Plus size={16} /> Record payment
          </button>
        </div>
      </div>

      {/* 2. Executive Metric KPI Tiles */}
      <div className="premium-metrics">
        <div className="premium-metric">
          <span>Total fee commitments <ArrowUpRight size={13} /></span>
          <strong>{formatINR(totals.total)}</strong>
          <small>Annual tuition across 155 students</small>
        </div>
        <div className="premium-metric green">
          <span>Collected & verified <ArrowUpRight size={13} /></span>
          <strong>{formatINR(totals.paid)}</strong>
          <small>Credited to institutional account</small>
        </div>
        <div className="premium-metric red">
          <span>Due now <ArrowUpRight size={13} /></span>
          <strong>{formatINR(totals.due)}</strong>
          <small>Scheduled charges due through {currentDate}</small>
        </div>
        <div className="premium-metric gold">
          <span>Total remaining <ArrowUpRight size={13} /></span>
          <strong>{formatINR(totals.remaining)}</strong>
          <small>Due now + future installments</small>
        </div>
      </div>

      {/* 3. Student Fee Accounts Directory Table */}
      <section className="card account-directory">
        <div className="premium-card-heading">
          <div>
            <h3>Student fee accounts <span className="count-chip">{filteredStudents.length}</span></h3>
            <p>Select a student to explore their complete financial profile and waterfall schedule.</p>
          </div>
          <button className="text-button" onClick={handleExportCSV}>
            <Download size={14} /> Export ledger
          </button>
        </div>

        <div className="premium-list-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <label className="input-search">
            <Search size={15} />
            <input
              placeholder="Find a student, admission ID or programme..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="filter-select">
              <Filter size={13} />
              <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                {['All students', 'Due now', 'EMI plans', 'Semester plans', 'Fully paid'].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              {['ALL', 'BCA', 'BBA', 'B.Com', 'B.Sc', 'MBA'].map(prog => (
                <button
                  key={prog}
                  type="button"
                  onClick={() => setProgrammeTab(prog)}
                  style={{
                    padding: '4px 9px',
                    fontSize: '11px',
                    borderRadius: '5px',
                    border: '1px solid',
                    borderColor: programmeTab === prog ? '#102d47' : '#e2e7e2',
                    backgroundColor: programmeTab === prog ? '#102d47' : '#ffffff',
                    color: programmeTab === prog ? '#ffffff' : '#5b7482',
                    fontWeight: programmeTab === prog ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {prog}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="table-wrap" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table role="table" className="premium-table">
            <thead>
              <tr role="row">
                <th>STUDENT / PROGRAMME</th>
                <th>PAYMENT PLAN</th>
                <th style={{ textAlign: 'right' }}>TOTAL PAYABLE</th>
                <th style={{ textAlign: 'right' }}>PAID</th>
                <th style={{ textAlign: 'right' }}>DUE NOW</th>
                <th style={{ textAlign: 'right' }}>REMAINING</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.slice(0, 30).map(({ student: s, ledger: l }) => (
                <tr
                  key={s.id}
                  className={s.id === activeStudent.id ? 'selected-row' : ''}
                  onClick={() => selectStudent(s.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td data-label="Student / Programme">
                    <PersonBadge name={s.name} id={s.id} prog={s.programme} sem={s.semester} />
                  </td>
                  <td data-label="Payment Plan">
                    <span className={`plan-tag ${s.plan.kind === 'EMI' ? 'emi' : ''}`}>
                      {s.plan.kind === 'EMI' && <CreditCard size={11} />}
                      {s.plan.kind}
                    </span>
                    <small className="block" style={{ fontSize: '10px', color: '#8a99a4', marginTop: '3px' }}>
                      {s.plan.preferredMethod}
                    </small>
                  </td>
                  <td data-label="Total Payable" style={{ textAlign: 'right' }} className="tabular-nums">
                    {formatINR(l.totalPaise)}
                  </td>
                  <td data-label="Paid" className="positive tabular-nums" style={{ textAlign: 'right', color: '#25866b', fontWeight: 600 }}>
                    {formatINR(l.paidPaise)}
                  </td>
                  <td data-label="Due Now" className={`tabular-nums ${l.dueNowPaise > 0 ? 'negative' : ''}`} style={{ textAlign: 'right', color: l.dueNowPaise > 0 ? '#ad211d' : '#8a99a4', fontWeight: l.dueNowPaise > 0 ? 600 : 400 }}>
                    {formatINR(l.dueNowPaise)}
                  </td>
                  <td data-label="Remaining" style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                    {formatINR(l.remainingPaise)}
                  </td>
                  <td data-label="Status">
                    <StatusPill status={l.status} />
                  </td>
                  <td data-label="Action" style={{ textAlign: 'center' }}>
                    <button
                      className="account-arrow"
                      aria-label={`Open ${s.name} ledger`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectStudent(s.id);
                      }}
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: '#8a99a4', fontSize: '12px' }}>
              No student accounts match your search filter.
            </div>
          )}
        </div>
      </section>

      {/* 4. Student Account Profile & Detail Stack */}
      <div className="student-account-layout">
        {/* Left: Deep Navy Student Financial Profile */}
        <section ref={profileRef} className="account-profile">
          <div className="profile-topline">
            <span className="editorial-kicker">STUDENT FINANCIAL PROFILE</span>
            <span className="profile-orbit"><CreditCard size={18} /></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <span
              style={{
                width: '45px',
                height: '45px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#d8c8a8',
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '15px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {activeStudent.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <div>
              <strong style={{ fontSize: '16px', color: '#f2f2ed', fontWeight: 600, display: 'block' }}>
                {activeStudent.name}
              </strong>
              <small style={{ fontSize: '11px', color: '#8aa3b5' }}>
                {activeStudent.id} · {activeStudent.programme} (Sem {activeStudent.semester}) · Roll: {activeStudent.rollNo}
              </small>
            </div>
          </div>

          <div className="profile-rule" />

          {activeStudentLedger.remainingPaise === 0 && (
            <button
              className="button secondary"
              style={{ width: '100%', marginBottom: '16px', color: '#6ee7b7', borderColor: 'rgba(110, 231, 183, 0.4)' }}
              onClick={() => handleDownloadNoDues(activeStudent)}
            >
              Download No-dues certificate
            </button>
          )}

          <div className="account-balance">
            <span>Remaining balance</span>
            <strong>{formatINR(activeStudentLedger.remainingPaise)}</strong>
            <p>
              {formatINR(activeStudentLedger.dueNowPaise)} due now <span>·</span> {formatINR(activeStudentLedger.upcomingPaise)} upcoming
            </p>
          </div>

          <div className="account-progress">
            <div style={{ width: `${activeStudentLedger.progressPct}%` }} />
          </div>
          <div className="progress-caption">
            <span>{activeStudentLedger.progressPct}% paid</span>
            <span>{formatINR(activeStudentLedger.paidPaise)} of {formatINR(activeStudentLedger.totalPaise)}</span>
          </div>

          <dl className="profile-details">
            <div>
              <dt>Guardian</dt>
              <dd>{activeStudent.guardianName}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>{activeStudent.guardianPhone}</dd>
            </div>
            <div>
              <dt>Payment plan</dt>
              <dd>{activeStudent.plan.kind}</dd>
            </div>
            <div>
              <dt>Preferred mode</dt>
              <dd>{activeStudent.plan.preferredMethod}</dd>
            </div>
            <div>
              <dt>Academic fee principal</dt>
              <dd>{formatINR(activeStudent.plan.feePaise)}</dd>
            </div>
            {activeStudent.plan.kind === 'EMI' && (
              <>
                <div>
                  <dt>EMI duration</dt>
                  <dd>{activeStudent.plan.months} months</dd>
                </div>
                <div>
                  <dt>Annual interest</dt>
                  <dd>{activeStudent.plan.interestRatePct}% ({activeStudent.plan.interestType})</dd>
                </div>
              </>
            )}
          </dl>

          <button
            className="button gold-button full-width"
            onClick={() => openPayment(activeStudent.id)}
          >
            <Plus size={15} /> Record student payment
          </button>

          <button
            className="profile-link"
            style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }}
            onClick={() => handleDownloadStatement(activeStudent, activeStudentLedger)}
          >
            <Download size={13} /> Download Statement PDF
          </button>

          <span className="profile-disclaimer">Poddar International College · Academic session 2026–27</span>
        </section>

        {/* Right: Installment Schedule & Payment Timeline Cards */}
        <div className="account-detail-stack">
          {/* 1. Installment Schedule Card */}
          <section className="card installment-card">
            <div className="premium-card-heading">
              <div>
                <span className="editorial-kicker">THE ROAD AHEAD</span>
                <h3>{activeStudent.plan.kind === 'Full payment' ? 'Fee schedule' : 'Installment schedule'}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="button secondary small"
                  onClick={() => handleDownloadStatement(activeStudent, activeStudentLedger)}
                >
                  <Download size={13} /> Statement PDF
                </button>
              </div>
            </div>

            <div className="schedule-summary">
              <span>
                <i className="green-dot" />
                {activeStudentLedger.schedule.filter(c => c.status === 'Paid').length} paid
              </span>
              <span>
                <i className="red-dot" />
                {activeStudentLedger.schedule.filter(c => c.status === 'Overdue').length} overdue
              </span>
              <span>
                <i className="gold-dot" />
                {activeStudentLedger.schedule.filter(c => c.status === 'Upcoming').length} upcoming
              </span>
              <span className="schedule-note">Payments allocate oldest charge first</span>
            </div>

            <div className="table-wrap schedule-scroll" role="region" aria-label="Scrollable installment schedule" tabIndex={0}>
              <table role="table" className="premium-table">
                <thead>
                  <tr role="row">
                    <th>INSTALLMENT</th>
                    <th>DUE DATE</th>
                    <th style={{ textAlign: 'right' }}>AMOUNT</th>
                    <th style={{ textAlign: 'right' }}>PAID</th>
                    <th style={{ textAlign: 'right' }}>OUTSTANDING</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudentLedger.schedule.map((c, i) => (
                    <tr role="row" key={c.id}>
                      <td data-label="Installment">
                        <span className="schedule-number">{String(i + 1).padStart(2, '0')}</span>
                        {c.label}
                      </td>
                      <td data-label="Due Date">{c.date}</td>
                      <td data-label="Amount" style={{ textAlign: 'right' }} className="tabular-nums">
                        {formatINR(c.amountPaise)}
                      </td>
                      <td data-label="Paid" className="positive tabular-nums" style={{ textAlign: 'right', color: '#25866b', fontWeight: 600 }}>
                        {formatINR(c.paidPaise)}
                      </td>
                      <td data-label="Outstanding" style={{ textAlign: 'right' }} className="tabular-nums">
                        {formatINR(c.outstandingPaise)}
                      </td>
                      <td data-label="Status">
                        <StatusPill status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. Transaction & Receipt History Card */}
          <section className="card">
            <div className="premium-card-heading" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span className="editorial-kicker">VERIFIED SETTLEMENTS & AUDIT LOG</span>
                <h3>Transaction & Receipt History</h3>
                <p>Click any transaction row to inspect complete payment details, mode, date-time, and download receipts.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  {state.feePayments.filter(p => p.studentId === activeStudent.id).length}{' '}
                  {state.feePayments.filter(p => p.studentId === activeStudent.id).length === 1 ? 'Receipt' : 'Receipts'}
                </span>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => openPayment(activeStudent.id)}
                >
                  <Plus size={13} /> Collect payment
                </button>
              </div>
            </div>

            {state.feePayments.filter(p => p.studentId === activeStudent.id).length > 0 ? (
              <div className="table-wrap">
                <table role="table" className="premium-table">
                  <thead>
                    <tr role="row">
                      <th>RECEIPT NO</th>
                      <th>DATE & TIME</th>
                      <th>PAYMENT MODE</th>
                      <th>REFERENCE / UTR</th>
                      <th style={{ textAlign: 'right' }}>AMOUNT</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'center' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.feePayments
                      .filter(p => p.studentId === activeStudent.id)
                      .slice()
                      .reverse()
                      .map(p => (
                        <tr
                          key={p.id}
                          onClick={() => openPaymentDetail(p)}
                          style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                          className="hover-row"
                          title="Click to view full payment details"
                        >
                          <td data-label="Receipt No">
                            <strong style={{ color: '#102d47', fontSize: '12px' }}>{p.receiptNo}</strong>
                          </td>
                          <td data-label="Date & Time">
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                              {p.date}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} /> {p.time || '11:30 AM'} IST
                            </div>
                          </td>
                          <td data-label="Payment Mode">
                            <PaymentMethodBadge method={p.method} />
                          </td>
                          <td data-label="Reference / UTR" style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                            {p.reference}
                          </td>
                          <td data-label="Amount" style={{ textAlign: 'right' }} className="tabular-nums">
                            <strong style={{ color: '#25866b', fontSize: '13px' }}>{formatINR(p.amountPaise)}</strong>
                            {p.refundedPaise ? (
                              <small style={{ display: 'block', color: '#ad211d', fontSize: '10px' }}>
                                Refunded: {formatINR(p.refundedPaise)}
                              </small>
                            ) : null}
                          </td>
                          <td data-label="Status">
                            <StatusPill status={p.status} />
                          </td>
                          <td data-label="Action" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                className="button secondary small"
                                style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => openPaymentDetail(p)}
                                title="View full payment details"
                              >
                                <Eye size={12} />
                                <span>Details</span>
                              </button>
                              <button
                                type="button"
                                className="icon-button"
                                title="Download Receipt PDF"
                                onClick={() => handleDownloadReceipt(p, false)}
                              >
                                <Download size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state" style={{ padding: '24px', textAlign: 'center', color: '#8a99a4', fontSize: '12px' }}>
                No payments recorded yet for this student account.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* 5. Footnote */}
      <div className="finance-footnote">
        <ShieldCheck size={15} />
        <span>
          As of {currentDate}. Due now is part of the remaining balance. EMI is a payment plan; NEFT, UPI, cash and cheque are payment methods.
        </span>
      </div>

      {/* MODAL 1: Record Student Payment */}
      <Dialog open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record a student payment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '12px', color: '#64748b' }}>
            Recording payment receipt for <strong>{activeStudent.name}</strong> ({activeStudent.id})
          </p>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#182e46', display: 'block', marginBottom: '4px' }}>
              Amount (₹)*
            </label>
            <input
              type="number"
              value={payAmountRupees}
              onChange={e => setPayAmountRupees(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#182e46', display: 'block', marginBottom: '4px' }}>
                Payment Method*
              </label>
              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value as FeePayment['method'])}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff' }}
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
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#182e46', display: 'block', marginBottom: '4px' }}>
                UTR / Receipt Reference*
              </label>
              <input
                type="text"
                value={payReference}
                onChange={e => setPayReference(e.target.value)}
                placeholder="Unique reference"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#182e46', display: 'block', marginBottom: '4px' }}>
              Internal Notes / Ledger Remarks
            </label>
            <textarea
              value={payNotes}
              onChange={e => setPayNotes(e.target.value)}
              placeholder="Optional remarks"
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="button secondary"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleRecordPayment}
              className="button primary"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              Save Payment
            </button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 2: Fee Refund */}
      <Dialog open={refundModalOpen} onClose={() => setRefundModalOpen(false)} title="Process Student Fee Refund">
        {selectedPaymentForRefund && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Refunding from verified Receipt <strong>{selectedPaymentForRefund.receiptNo}</strong> (Total: {formatINR(selectedPaymentForRefund.amountPaise)})
            </p>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#182e46', display: 'block', marginBottom: '4px' }}>
                Refund Amount (₹)*
              </label>
              <input
                type="number"
                value={refundRupees}
                onChange={e => setRefundRupees(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#182e46', display: 'block', marginBottom: '4px' }}>
                Mandatory Refund Justification*
              </label>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="Reason for concession, course withdrawal, or excess credit refund"
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setRefundModalOpen(false)}
                className="button secondary"
                style={{ padding: '8px 14px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessRefund}
                className="button primary"
                style={{ padding: '8px 16px', fontSize: '12px', backgroundColor: '#ad211d' }}
              >
                Approve & Process Refund
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL 3: Fee Payment & Receipt Details Popup */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Fee Payment & Receipt Transaction Details"
        subtitle="Institutional collection desk verification & transaction audit record"
        maxWidth="680px"
      >
        {selectedPaymentForDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Hero Amount & Status Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #102d47',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
                  RECEIPT #{selectedPaymentForDetail.receiptNo}
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#102d47', margin: '4px 0 2px' }} className="headline-number">
                  {formatINRExact(selectedPaymentForDetail.amountPaise)}
                </div>
                <div style={{ fontSize: '11.5px', color: '#475569', fontStyle: 'italic' }}>
                  {paiseInWords(selectedPaymentForDetail.amountPaise)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StatusPill status={selectedPaymentForDetail.status} />
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  <Calendar size={12} /> {selectedPaymentForDetail.date}
                  <span>·</span>
                  <Clock size={12} /> {selectedPaymentForDetail.time || '11:30 AM'} IST
                </div>
              </div>
            </div>

            {/* 2. Transaction & Payment Mode Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Mode / Method of Payment
                </span>
                <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PaymentMethodBadge method={selectedPaymentForDetail.method} />
                  <span style={{ fontSize: '11.5px', color: '#334155', fontWeight: 500 }}>
                    {selectedPaymentForDetail.method === 'UPI' && 'UPI Virtual Payment Address'}
                    {selectedPaymentForDetail.method === 'NEFT' && 'National Electronic Funds Transfer'}
                    {selectedPaymentForDetail.method === 'Bank transfer' && 'RTGS / IMPS Bank Transfer'}
                    {selectedPaymentForDetail.method === 'Cheque' && 'Clearing Cheque Deposit'}
                    {selectedPaymentForDetail.method === 'Cash' && 'Physical Cash Counter Receipt'}
                    {selectedPaymentForDetail.method === 'Demand Draft' && 'Bank Demand Draft'}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Transaction Date & Time
                </span>
                <strong style={{ fontSize: '12.5px', color: '#1e293b', display: 'block', marginTop: '4px' }}>
                  {selectedPaymentForDetail.date} at {selectedPaymentForDetail.time || '11:30 AM'} IST
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  UTR / Reference / Instrument No.
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>
                    {selectedPaymentForDetail.reference}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedPaymentForDetail.reference);
                      showToast('Copied', 'Reference number copied to clipboard', 'info');
                    }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}
                    title="Copy reference number"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Deposited Bank Account
                </span>
                <strong style={{ fontSize: '12px', color: '#1e293b', display: 'block', marginTop: '4px' }}>
                  {selectedPaymentForDetail.bankAccount || (selectedPaymentForDetail.method === 'Cash' ? 'Campus Cash Counter 1' : 'SBI Institutional Collection A/c ••••4102')}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Recorded / Collected By
                </span>
                <span style={{ fontSize: '12px', color: '#334155', display: 'block', marginTop: '4px' }}>
                  {selectedPaymentForDetail.createdBy} (Poddar Finance Counter)
                </span>
              </div>

              <div>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Settlement Verification
                </span>
                <span style={{ fontSize: '12px', color: selectedPaymentForDetail.verified ? '#15803d' : '#b45309', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                  {selectedPaymentForDetail.verified ? '✓ Verified in Bank Reconciliation' : '⏳ Pending Bank Realization'}
                </span>
              </div>
            </div>

            {/* 3. Student Profile Context */}
            {(() => {
              const student = state.students.find(s => s.id === selectedPaymentForDetail.studentId) || activeStudent;
              return (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                    STUDENT & ENROLLMENT CONTEXT
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Student Name:</span>{' '}
                      <strong style={{ color: '#0f172a' }}>{student.name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Admission ID:</span>{' '}
                      <strong style={{ color: '#0f172a' }}>{student.id}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Roll Number:</span>{' '}
                      <span style={{ color: '#0f172a' }}>{student.rollNo}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Programme:</span>{' '}
                      <span style={{ color: '#0f172a' }}>{student.programme} (Sem {student.semester})</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Guardian:</span>{' '}
                      <span style={{ color: '#0f172a' }}>{student.guardianName} ({student.guardianPhone})</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Payment Plan:</span>{' '}
                      <span style={{ color: '#0f172a' }}>{student.plan.kind}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. Notes if available */}
            {selectedPaymentForDetail.notes && (
              <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 14px', fontSize: '11.5px', color: '#334155' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>Cashier / Officer Notes:</strong>
                {selectedPaymentForDetail.notes}
              </div>
            )}

            {/* 5. Refund notice if refunded */}
            {selectedPaymentForDetail.refundedPaise ? (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 14px', fontSize: '11.5px', color: '#991b1b' }}>
                <strong>Fee Refund Recorded:</strong> {formatINR(selectedPaymentForDetail.refundedPaise)} was refunded.
                {selectedPaymentForDetail.refundReason && <span> Reason: {selectedPaymentForDetail.refundReason}</span>}
              </div>
            ) : null}

            {/* 6. Action Buttons Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="button primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleDownloadReceipt(selectedPaymentForDetail, false)}
                >
                  <Download size={14} />
                  <span>Download Receipt (PDF)</span>
                </button>
                <button
                  type="button"
                  className="button secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleDownloadReceipt(selectedPaymentForDetail, true)}
                >
                  <Copy size={14} />
                  <span>Duplicate Copy</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    const student = state.students.find(s => s.id === selectedPaymentForDetail.studentId) || activeStudent;
                    const text = `PODDAR INTERNATIONAL COLLEGE - FEE RECEIPT
Receipt No: ${selectedPaymentForDetail.receiptNo}
Student: ${student.name} (${student.id})
Programme: ${student.programme} (Sem ${student.semester})
Date & Time: ${selectedPaymentForDetail.date} at ${selectedPaymentForDetail.time || '11:30 AM'} IST
Payment Mode: ${selectedPaymentForDetail.method}
Reference / UTR: ${selectedPaymentForDetail.reference}
Amount: ${formatINRExact(selectedPaymentForDetail.amountPaise)} (${paiseInWords(selectedPaymentForDetail.amountPaise)})
Status: ${selectedPaymentForDetail.status}
Account: ${selectedPaymentForDetail.bankAccount || 'SBI Collection A/c ••••4102'}`;
                    navigator.clipboard.writeText(text);
                    showToast('Copied', 'Full receipt details copied to clipboard', 'success');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Copy size={13} />
                  <span>Copy Details</span>
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setDetailModalOpen(false)}
                >
                  Close
                </button>
              </div>
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
        description={`This transaction of ₹${payAmountRupees} exceeds the standard cash threshold of ₹${(state.settings.statutory.cashTransactionWarningLimitPaise / 100).toLocaleString('en-IN')}. Are you sure you wish to record this as physical cash?`}
        confirmLabel="Proceed with Cash"
        isDestructive={false}
      />
    </div>
  );
}
