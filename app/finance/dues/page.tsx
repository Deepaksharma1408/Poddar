// College Finance Portal - Defaulters List & Dues Ageing Workspace
// 4 Ageing Buckets (0-30d, 31-60d, 61-90d, 90+d), Automated Reminders (SMS, WhatsApp, Email),
// Follow-up Notes, Commitment Dates, Dispute/Hold Status, and Export.

'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCircle2,
  FileCheck,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  PhoneCall,
  UserCheck,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { computeStudentLedger } from '@/lib/finance-portal/finance/student-ledger';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import { useToast } from '@/components/finance-portal/ui/toast';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import type { Student, DefaulterFollowUp, ReminderDispatchLog } from '@/lib/finance-portal/types/finance';

export default function DuesPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [agingFilter, setAgingFilter] = useState<'ALL' | '0-30' | '31-60' | '61-90' | '90+'>('ALL');

  // Modals
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);

  // Reminder Form
  const [reminderChannel, setReminderChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');
  const [customReminderMsg, setCustomReminderMsg] = useState('');

  // Follow-Up Form
  const [followUpChannel, setFollowUpChannel] = useState<DefaulterFollowUp['channel']>('Phone Call');
  const [followUpRemarks, setFollowUpRemarks] = useState('');
  const [commitmentDate, setCommitmentDate] = useState('');
  const [commitmentRupees, setCommitmentRupees] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<DefaulterFollowUp['status']>('Promise to Pay');

  // Calculate Overdue Status & 4-Bucket Ageing
  const defaulterList = useMemo(() => {
    const list: {
      student: Student;
      duePaise: number;
      remainingPaise: number;
      overdueDays: number;
      agingBucket: '0-30' | '31-60' | '61-90' | '90+';
      oldestOverdueDate: string;
      hasDispute: boolean;
      commitmentDate?: string;
    }[] = [];

    state.students.forEach(student => {
      const ledger = computeStudentLedger(student, state.feePayments, currentDate);
      if (ledger.dueNowPaise > 0) {
        const overdueCharge = ledger.schedule.find(c => c.outstandingPaise > 0 && c.date < currentDate);
        let overdueDays = 0;
        let oldestDate = currentDate;

        if (overdueCharge) {
          oldestDate = overdueCharge.date;
          const diffMs = Date.parse(currentDate) - Date.parse(overdueCharge.date);
          overdueDays = Math.max(1, Math.floor(diffMs / 86400000));
        }

        let agingBucket: '0-30' | '31-60' | '61-90' | '90+' = '0-30';
        if (overdueDays > 90) agingBucket = '90+';
        else if (overdueDays > 60) agingBucket = '61-90';
        else if (overdueDays > 30) agingBucket = '31-60';

        // Check recent follow-ups for commitments or disputes
        const latestFollowUp = state.defaulterFollowUps?.find(f => f.studentId === student.id);

        list.push({
          student,
          duePaise: ledger.dueNowPaise,
          remainingPaise: ledger.remainingPaise,
          overdueDays,
          agingBucket,
          oldestOverdueDate: oldestDate,
          hasDispute: latestFollowUp?.status === 'Dispute Raised' || latestFollowUp?.status === 'Hardship Plea',
          commitmentDate: latestFollowUp?.commitmentDate,
        });
      }
    });

    return list.sort((a, b) => b.duePaise - a.duePaise);
  }, [state.students, state.feePayments, state.defaulterFollowUps, currentDate]);

  // Filtered List
  const filteredDefaulters = useMemo(() => {
    return defaulterList.filter(item => {
      const matchesSearch =
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.programme.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAging = agingFilter === 'ALL' || item.agingBucket === agingFilter;
      return matchesSearch && matchesAging;
    });
  }, [defaulterList, searchQuery, agingFilter]);

  // Totals across Ageing Buckets
  const bucket0_30 = defaulterList.filter(d => d.agingBucket === '0-30');
  const bucket31_60 = defaulterList.filter(d => d.agingBucket === '31-60');
  const bucket61_90 = defaulterList.filter(d => d.agingBucket === '61-90');
  const bucket90_plus = defaulterList.filter(d => d.agingBucket === '90+');

  const sum0_30 = bucket0_30.reduce((s, d) => s + d.duePaise, 0);
  const sum31_60 = bucket31_60.reduce((s, d) => s + d.duePaise, 0);
  const sum61_90 = bucket61_90.reduce((s, d) => s + d.duePaise, 0);
  const sum90_plus = bucket90_plus.reduce((s, d) => s + d.duePaise, 0);

  // Dispatch Reminder Simulator
  const handleSendReminder = () => {
    if (!targetStudent) return;
    const item = defaulterList.find(d => d.student.id === targetStudent.id);
    if (!item) return;

    const targetRecipient = reminderChannel === 'Email' ? targetStudent.email : targetStudent.guardianPhone;
    const templateMsg =
      customReminderMsg.trim() ||
      `Dear ${targetStudent.guardianName}, tuition fee installment of ${formatINR(item.duePaise)} for ${targetStudent.name} (${targetStudent.programme}) is overdue by ${item.overdueDays} days. Please clear dues to prevent administrative hold.`;

    const log: ReminderDispatchLog = {
      id: `REM-${Date.now()}`,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      channel: reminderChannel,
      template: templateMsg,
      timestamp: new Date().toISOString(),
      status: 'Delivered',
      recipientTarget: targetRecipient,
    };

    dispatch({ type: 'LOG_REMINDER_DISPATCH', log });
    showToast('Reminder Sent', `Simulated ${reminderChannel} notice delivered to ${targetRecipient}.`, 'success');

    setReminderModalOpen(false);
    setCustomReminderMsg('');
  };

  // Record Follow-Up Note & Commitment
  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !followUpRemarks.trim()) {
      showToast('Validation Error', 'Follow-up remarks are required.', 'error');
      return;
    }

    const followUp: DefaulterFollowUp = {
      id: `DFU-${Date.now()}`,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      date: currentDate,
      channel: followUpChannel,
      remarks: followUpRemarks.trim(),
      commitmentDate: commitmentDate || undefined,
      commitmentAmountPaise: commitmentRupees ? toPaise(commitmentRupees) : undefined,
      status: followUpStatus,
      recordedBy: state.settings.currentRole,
    };

    dispatch({ type: 'RECORD_DEFAULTER_FOLLOWUP', followUp });
    showToast('Follow-Up Logged', `Recorded note for ${targetStudent.name}: ${followUpStatus}.`, 'success');

    setFollowUpModalOpen(false);
    setFollowUpRemarks('');
    setCommitmentDate('');
    setCommitmentRupees('');
  };

  // Export Defaulters PDF
  const handleExportPDF = () => {
    const pdf = new SimplePDF();
    let y = pdf.drawHeader(
      state.settings.institutionName,
      'OFFICIAL DEFAULTERS & OVERDUE FEES REPORT',
      `ACADEMIC YEAR ${state.settings.academicYear}`
    );

    pdf.drawText(`Generated on: ${currentDate}  |  Total Overdue Students: ${defaulterList.length}`, 40, y, {
      font: 'Helvetica-Bold',
      size: 9,
      color: PDF_COLORS.navy,
    });
    y -= 16;

    const headers = ['Roll No', 'Student Name', 'Programme', 'Days Overdue', 'Bucket', 'Overdue Amount (INR)'];
    const widths = [65, 140, 80, 75, 60, 100];
    let startX = 40;

    pdf.drawRect(40, y - 16, pdf.pageWidth - 80, 16, { fill: PDF_COLORS.lightBg });
    headers.forEach((h, idx) => {
      const align = idx === 5 ? 'right' : 'left';
      const colX = align === 'right' ? startX + widths[idx] - 6 : startX + 6;
      pdf.drawText(h, colX, y - 12, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.navy, align });
      startX += widths[idx];
    });
    y -= 22;

    filteredDefaulters.slice(0, 35).forEach(item => {
      startX = 40;
      const vals = [
        item.student.rollNo,
        item.student.name,
        `${item.student.programme} (Sem ${item.student.semester})`,
        `${item.overdueDays} days`,
        `${item.agingBucket}d`,
        formatINR(item.duePaise),
      ];

      vals.forEach((v, idx) => {
        const align = idx === 5 ? 'right' : 'left';
        const colX = align === 'right' ? startX + widths[idx] - 6 : startX + 6;
        pdf.drawText(v, colX, y - 2, {
          font: idx === 1 ? 'Helvetica-Bold' : 'Helvetica',
          size: 7.5,
          color: idx === 5 ? PDF_COLORS.crimson : PDF_COLORS.darkSlate,
          align,
        });
        startX += widths[idx];
      });

      pdf.drawLine(40, y - 6, pdf.pageWidth - 40, y - 6, { stroke: PDF_COLORS.border, lineWidth: 0.3 });
      y -= 16;
    });

    pdf.drawFooter('Confidential institutional dues recovery register. Strictly for finance and administration use.');
    triggerPDFDownload(`Defaulters-Report-${currentDate}.pdf`, pdf.output());
    showToast('Report Downloaded', `Downloaded Defaulters-Report-${currentDate}.pdf`, 'info');
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Roll No', 'Admission ID', 'Student Name', 'Programme', 'Semester', 'Guardian Name', 'Guardian Phone', 'Oldest Due Date', 'Overdue Days', 'Ageing Bucket', 'Immediate Due (INR)', 'Remaining Total (INR)'],
      ...defaulterList.map(d => [
        d.student.rollNo,
        d.student.id,
        d.student.name,
        d.student.programme,
        d.student.semester,
        d.student.guardianName,
        d.student.guardianPhone,
        d.oldestOverdueDate,
        d.overdueDays,
        d.agingBucket,
        d.duePaise / 100,
        d.remainingPaise / 100,
      ]),
    ];
    const csvContent = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defaulters-aging-register-${currentDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV Exported', 'Downloaded defaulters-aging-register.csv', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b49662', marginBottom: '4px' }}>
            FEE COLLECTION & RECOVERY
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 750, color: '#102d47', margin: 0 }}>
            Fee Defaulters & Ageing Register
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Real-time overdue tracking, 4-tier ageing buckets, automated multi-channel reminders, and follow-up commitments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#102d47',
              cursor: 'pointer',
            }}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#102d47',
              border: 'none',
              borderRadius: '7px',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 45, 71, 0.1)',
            }}
          >
            <FileText size={13} />
            <span>Download Defaulters PDF</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Ageing Bucket KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        {/* Bucket 1: 0-30 Days */}
        <div
          onClick={() => setAgingFilter(agingFilter === '0-30' ? 'ALL' : '0-30')}
          className="card-surface"
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid #b49662',
            cursor: 'pointer',
            outline: agingFilter === '0-30' ? '2px solid #b49662' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              0–30 Days Overdue
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fbf6eb', color: '#b49662' }}>
              {bucket0_30.length} Students
            </span>
          </div>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(sum0_30)}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Grace period & automated SMS</small>
        </div>

        {/* Bucket 2: 31-60 Days */}
        <div
          onClick={() => setAgingFilter(agingFilter === '31-60' ? 'ALL' : '31-60')}
          className="card-surface"
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid #ea580c',
            cursor: 'pointer',
            outline: agingFilter === '31-60' ? '2px solid #ea580c' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              31–60 Days Overdue
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fff7ed', color: '#ea580c' }}>
              {bucket31_60.length} Students
            </span>
          </div>
          <div className="headline-number" style={{ color: '#ea580c', margin: '6px 0 2px' }}>
            {formatINR(sum31_60)}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>First warning letter & WhatsApp</small>
        </div>

        {/* Bucket 3: 61-90 Days */}
        <div
          onClick={() => setAgingFilter(agingFilter === '61-90' ? 'ALL' : '61-90')}
          className="card-surface"
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid #ad211d',
            cursor: 'pointer',
            outline: agingFilter === '61-90' ? '2px solid #ad211d' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              61–90 Days Overdue
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fbeeed', color: '#ad211d' }}>
              {bucket61_90.length} Students
            </span>
          </div>
          <div className="headline-number" style={{ color: '#ad211d', margin: '6px 0 2px' }}>
            {formatINR(sum61_90)}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Direct telephone & parent meeting</small>
        </div>

        {/* Bucket 4: 90+ Days */}
        <div
          onClick={() => setAgingFilter(agingFilter === '90+' ? 'ALL' : '90+')}
          className="card-surface"
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid #7f1d1d',
            cursor: 'pointer',
            outline: agingFilter === '90+' ? '2px solid #7f1d1d' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
              90+ Days (Severe Default)
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fef2f2', color: '#7f1d1d' }}>
              {bucket90_plus.length} Students
            </span>
          </div>
          <div className="headline-number" style={{ color: '#7f1d1d', margin: '6px 0 2px' }}>
            {formatINR(sum90_plus)}
          </div>
          <small style={{ fontSize: '11px', color: '#ad211d', fontWeight: 600 }}>Admit Card & Exam Hall Hold</small>
        </div>
      </div>

      {/* 3. Search & Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '6px 12px', width: '340px' }}>
          <Search size={14} style={{ color: '#83909d' }} />
          <input
            placeholder="Search by student name, roll no, or programme..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%', background: 'transparent' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', '0-30', '31-60', '61-90', '90+'].map(b => (
            <button
              key={b}
              onClick={() => setAgingFilter(b as any)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: agingFilter === b ? '#102d47' : '#e2e8f0',
                background: agingFilter === b ? '#102d47' : '#ffffff',
                color: agingFilter === b ? '#ffffff' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {b === 'ALL' ? 'All Defaulters' : `${b} Days`}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Defaulters Table */}
      <div className="card-surface" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>STUDENT / ROLL NO</th>
                <th>PROGRAMME</th>
                <th>GUARDIAN CONTACT</th>
                <th>OLDEST DUE DATE</th>
                <th style={{ textAlign: 'center' }}>DAYS OVERDUE</th>
                <th style={{ textAlign: 'center' }}>AGEING BUCKET</th>
                <th style={{ textAlign: 'right' }}>OVERDUE AMOUNT</th>
                <th>STATUS / COMMITMENT</th>
                <th style={{ textAlign: 'center' }}>RECOVERY ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefaulters.map(item => (
                <tr key={item.student.id}>
                  <td>
                    <strong style={{ color: '#102d47', fontSize: '12.5px', display: 'block' }}>
                      {item.student.name}
                    </strong>
                    <small style={{ color: '#64748b' }}>
                      {item.student.id} · Roll: {item.student.rollNo}
                    </small>
                  </td>
                  <td>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>
                      {item.student.programme} (Sem {item.student.semester})
                    </span>
                  </td>
                  <td>
                    <div style={{ color: '#1e293b', fontSize: '11.5px' }}>{item.student.guardianName}</div>
                    <small style={{ color: '#64748b' }}>{item.student.guardianPhone}</small>
                  </td>
                  <td style={{ color: '#64748b' }}>{item.oldestOverdueDate}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: item.overdueDays > 60 ? '#ad211d' : '#ea580c' }}>
                    {item.overdueDays} days
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background:
                          item.agingBucket === '90+'
                            ? '#fef2f2'
                            : item.agingBucket === '61-90'
                            ? '#fbeeed'
                            : item.agingBucket === '31-60'
                            ? '#fff7ed'
                            : '#fbf6eb',
                        color:
                          item.agingBucket === '90+'
                            ? '#7f1d1d'
                            : item.agingBucket === '61-90'
                            ? '#ad211d'
                            : item.agingBucket === '31-60'
                            ? '#ea580c'
                            : '#b49662',
                      }}
                    >
                      {item.agingBucket}d
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#ad211d' }} className="tabular-nums">
                    {formatINR(item.duePaise)}
                  </td>
                  <td>
                    {item.commitmentDate ? (
                      <div>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#edf7f1', color: '#25866b', fontWeight: 600 }}>
                          Promise: {item.commitmentDate}
                        </span>
                      </div>
                    ) : item.hasDispute ? (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#fbeeed', color: '#ad211d', fontWeight: 600 }}>
                        Dispute / Hold
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#83909d' }}>No commitment logged</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          setTargetStudent(item.student);
                          setFollowUpModalOpen(true);
                        }}
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
                        <PhoneCall size={12} style={{ color: '#b49662' }} />
                        <span>Log Call</span>
                      </button>

                      <button
                        onClick={() => {
                          setTargetStudent(item.student);
                          setReminderModalOpen(true);
                        }}
                        style={{
                          padding: '4px 8px',
                          border: 'none',
                          borderRadius: '5px',
                          background: '#102d47',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Send size={12} />
                        <span>Remind</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal: Send Reminder */}
      {reminderModalOpen && targetStudent && (
        <Dialog open={reminderModalOpen} title={`Dispatch Reminder: ${targetStudent.name}`} subtitle={`${targetStudent.id} · ${targetStudent.programme}`} onClose={() => setReminderModalOpen(false)} maxWidth="540px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Delivery Channel *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['WhatsApp', 'SMS', 'Email'] as const).map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setReminderChannel(ch)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: reminderChannel === ch ? '#102d47' : '#cbd5e1',
                      background: reminderChannel === ch ? '#f0f4fa' : '#ffffff',
                      color: reminderChannel === ch ? '#102d47' : '#64748b',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Recipient Destination
              </label>
              <input
                disabled
                value={reminderChannel === 'Email' ? targetStudent.email : targetStudent.guardianPhone}
                style={{ width: '100%', background: '#f5f5f2' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Custom Notification Message
              </label>
              <textarea
                rows={4}
                placeholder="Leave blank to dispatch standard statutory notice template..."
                value={customReminderMsg}
                onChange={e => setCustomReminderMsg(e.target.value)}
                style={{ width: '100%', fontSize: '12px', padding: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setReminderModalOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReminder}
                style={{ padding: '8px 18px', background: '#102d47', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Dispatch {reminderChannel} Notice
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* 6. Modal: Log Follow-up & Commitment */}
      {followUpModalOpen && targetStudent && (
        <Dialog open={followUpModalOpen} title={`Record Follow-Up: ${targetStudent.name}`} subtitle={`Guardian: ${targetStudent.guardianName}`} onClose={() => setFollowUpModalOpen(false)} maxWidth="540px">
          <form onSubmit={handleSaveFollowUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Interaction Mode *
                </label>
                <select
                  value={followUpChannel}
                  onChange={e => setFollowUpChannel(e.target.value as DefaulterFollowUp['channel'])}
                  style={{ width: '100%' }}
                >
                  <option value="Phone Call">Phone Call</option>
                  <option value="In-Person Meeting">In-Person Meeting</option>
                  <option value="WhatsApp">WhatsApp Message</option>
                  <option value="SMS">SMS Text</option>
                  <option value="Email">Email Communication</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Call Outcome / Status *
                </label>
                <select
                  value={followUpStatus}
                  onChange={e => setFollowUpStatus(e.target.value as DefaulterFollowUp['status'])}
                  style={{ width: '100%' }}
                >
                  <option value="Promise to Pay">Promise to Pay (Committed)</option>
                  <option value="Hardship Plea">Financial Hardship / EMI Extension</option>
                  <option value="Dispute Raised">Dispute Raised on Fee Component</option>
                  <option value="No Response">Unreachable / No Answer</option>
                  <option value="Resolved">Resolved / Paid</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Promised Payment Date
                </label>
                <input
                  type="date"
                  value={commitmentDate}
                  onChange={e => setCommitmentDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Committed Amount (INR ₹)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={commitmentRupees}
                  onChange={e => setCommitmentRupees(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Conversation Notes & Remarks *
              </label>
              <textarea
                rows={3}
                placeholder="Details of call with parent/student, reasons given, and agreed timeline..."
                value={followUpRemarks}
                onChange={e => setFollowUpRemarks(e.target.value)}
                required
                style={{ width: '100%', fontSize: '12px', padding: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setFollowUpModalOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', background: '#102d47', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Log Follow-Up
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
