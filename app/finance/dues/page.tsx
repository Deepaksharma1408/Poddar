// College Finance Portal - Defaulters List & Dues Aging Workspace
// Defaulter Aging (0-30d, 31-60d, 60+d), Automated Reminders (SMS, WhatsApp, Email), and No-Dues Certificate

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
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR } from '@/lib/finance-portal/finance/money';
import { computeStudentLedger } from '@/lib/finance-portal/finance/student-ledger';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import { useToast } from '@/components/finance-portal/ui/toast';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import type { Student, DefaulterReminder } from '@/lib/finance-portal/types/finance';

export default function DuesPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [agingFilter, setAgingFilter] = useState<'ALL' | '0-30' | '31-60' | '60+'>('ALL');

  // Reminder Dispatch Modal
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [reminderChannel, setReminderChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');
  const [customReminderMsg, setCustomReminderMsg] = useState('');

  // Calculate Overdue Status & Aging for every student
  const defaulterList = useMemo(() => {
    const list: {
      student: Student;
      duePaise: number;
      remainingPaise: number;
      overdueDays: number;
      agingBucket: '0-30' | '31-60' | '60+';
      oldestOverdueDate: string;
    }[] = [];

    state.students.forEach(student => {
      const ledger = computeStudentLedger(student, state.feePayments, currentDate);
      if (ledger.dueNowPaise > 0) {
        // Find oldest overdue charge
        const overdueCharge = ledger.schedule.find(c => c.outstandingPaise > 0 && c.date < currentDate);
        let overdueDays = 0;
        let oldestDate = currentDate;

        if (overdueCharge) {
          oldestDate = overdueCharge.date;
          const diffMs = Date.parse(currentDate) - Date.parse(overdueCharge.date);
          overdueDays = Math.max(1, Math.floor(diffMs / 86400000));
        }

        let agingBucket: '0-30' | '31-60' | '60+' = '0-30';
        if (overdueDays > 60) agingBucket = '60+';
        else if (overdueDays > 30) agingBucket = '31-60';

        list.push({
          student,
          duePaise: ledger.dueNowPaise,
          remainingPaise: ledger.remainingPaise,
          overdueDays,
          agingBucket,
          oldestOverdueDate: oldestDate,
        });
      }
    });

    return list.sort((a, b) => b.duePaise - a.duePaise);
  }, [state.students, state.feePayments, currentDate]);

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

  // Dispatch Reminder
  const handleSendReminder = () => {
    if (!targetStudent) return;
    const item = defaulterList.find(d => d.student.id === targetStudent.id);
    if (!item) return;

    const reminder: DefaulterReminder = {
      id: `REM-${Date.now()}`,
      studentId: targetStudent.id,
      sentDate: currentDate,
      channel: reminderChannel,
      duePaise: item.duePaise,
      overdueDays: item.overdueDays,
      status: 'Delivered',
      messagePreview:
        customReminderMsg ||
        `Dear ${targetStudent.name}, your college installment of ${formatINR(item.duePaise)} is overdue by ${item.overdueDays} days. Please clear your dues on the student portal.`,
    };

    dispatch({ type: 'SEND_DEFAULTER_REMINDER', reminder });
    showToast('Reminder Dispatched', `${reminderChannel} reminder sent to ${targetStudent.guardianPhone}.`, 'success');
    setReminderModalOpen(false);
    setTargetStudent(null);
    setCustomReminderMsg('');
  };

  // Generate No-Dues Certificate PDF
  const handleDownloadNoDues = (student: Student) => {
    const ledger = computeStudentLedger(student, state.feePayments, currentDate);
    if (ledger.remainingPaise > 0) {
      showToast('Cannot Issue Certificate', `Student has pending balance of ${formatINR(ledger.remainingPaise)}`, 'error');
      return;
    }

    const pdf = new SimplePDF();
    let y = pdf.drawHeader(state.settings.institutionName, 'INSTITUTIONAL NO-DUES CLEARANCE CERTIFICATE', 'ACADEMIC EXAMINATION & CLEARANCE DIVISION');

    pdf.drawRect(40, y - 60, pdf.pageWidth - 80, 50, {
      fill: PDF_COLORS.goldLight,
      stroke: PDF_COLORS.gold,
      lineWidth: 0.8,
    });

    pdf.drawText('CLEARANCE STATUS: ALL DUES FULLY SATISFIED', 55, y - 18, {
      font: 'Helvetica-Bold',
      size: 9.5,
      color: PDF_COLORS.green,
    });
    pdf.drawText(`Certificate Serial No: PIS-NODUES-${student.id}-${new Date().getFullYear()}`, 55, y - 32, {
      font: 'Helvetica',
      size: 8,
    });
    pdf.drawText(`Clearance Timestamp: ${currentDate}`, 55, y - 44, {
      font: 'Helvetica',
      size: 8,
      color: PDF_COLORS.mutedText,
    });

    y -= 85;
    pdf.drawText(`Student Name: ${student.name}`, 40, y, { font: 'Helvetica-Bold', size: 9.5 });
    pdf.drawText(`Admission ID: ${student.id}`, 250, y, { font: 'Helvetica-Bold', size: 9.5 });
    pdf.drawText(`Programme: ${student.programme}`, 40, y - 16, { font: 'Helvetica', size: 8.5 });
    pdf.drawText(`Current Semester: Semester ${student.semester} (${student.batch})`, 250, y - 16, { font: 'Helvetica', size: 8.5 });

    y -= 40;
    pdf.drawLine(40, y, pdf.pageWidth - 40, y, { stroke: PDF_COLORS.border });
    y -= 25;

    pdf.drawText(
      `This is to formally certify that ${student.name} has settled all tuition fees, examination assessments, laboratory charges, and campus library accounts up to Academic Year ${state.settings.academicYear}. No financial liabilities remain pending on institutional records.`,
      40,
      y,
      { font: 'Helvetica', size: 8.5, color: PDF_COLORS.darkSlate }
    );

    y -= 70;
    pdf.drawText('Accounts Officer', 60, y, { font: 'Helvetica', size: 8 });
    pdf.drawText('Registrar / Examination Controller', pdf.pageWidth - 200, y, { font: 'Helvetica', size: 8, align: 'right' });

    pdf.drawFooter('Official clearance document. Valid for semester examinations and university degree convocation.');

    const filename = `No-Dues-Certificate-${student.id}.pdf`;
    triggerPDFDownload(filename, pdf.output());
    showToast('Certificate Generated', `Downloaded ${filename}`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Defaulters Aging & Automated Reminders</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Monitor overdue accounts by aging buckets (0–30d, 31–60d, 60+d) and dispatch reminder notifications.
        </p>
      </div>

      {/* Aging Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--crimson)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>OVERDUE (60+ DAYS)</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--crimson)', marginTop: '4px' }} className="headline-number">
            {formatINR(defaulterList.filter(d => d.agingBucket === '60+').reduce((s, d) => s + d.duePaise, 0))}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {defaulterList.filter(d => d.agingBucket === '60+').length} Severe Defaulters
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--gold)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>OVERDUE (31–60 DAYS)</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gold)', marginTop: '4px' }} className="headline-number">
            {formatINR(defaulterList.filter(d => d.agingBucket === '31-60').reduce((s, d) => s + d.duePaise, 0))}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {defaulterList.filter(d => d.agingBucket === '31-60').length} Students
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--navy)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>OVERDUE (0–30 DAYS)</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }} className="headline-number">
            {formatINR(defaulterList.filter(d => d.agingBucket === '0-30').reduce((s, d) => s + d.duePaise, 0))}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {defaulterList.filter(d => d.agingBucket === '0-30').length} Students
          </span>
        </div>
      </div>

      {/* Defaulter Table with Aging Filters */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '300px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter defaulters by name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', '0-30', '31-60', '60+'] as const).map(bucket => (
              <button
                key={bucket}
                onClick={() => setAgingFilter(bucket)}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: agingFilter === bucket ? 'var(--navy)' : 'var(--bg-card)',
                  color: agingFilter === bucket ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: agingFilter === bucket ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {bucket === 'ALL' ? 'All Buckets' : `${bucket} Days`}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Student ID & Name</th>
                <th>Programme & Batch</th>
                <th>Oldest Overdue Date</th>
                <th>Aging Bracket</th>
                <th style={{ textAlign: 'right' }}>Immediate Overdue</th>
                <th style={{ textAlign: 'right' }}>Total Remaining</th>
                <th style={{ textAlign: 'right' }}>Reminder Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefaulters.map(item => (
                <tr key={item.student.id}>
                  <td data-label="Student">
                    <strong>{item.student.name}</strong>
                    <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      {item.student.id} · Ph: {item.student.guardianPhone}
                    </span>
                  </td>
                  <td data-label="Programme">
                    {item.student.programme} (Sem {item.student.semester})
                  </td>
                  <td data-label="Oldest Overdue">{item.oldestOverdueDate}</td>
                  <td data-label="Aging">
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor:
                          item.agingBucket === '60+'
                            ? 'var(--crimson-light)'
                            : item.agingBucket === '31-60'
                            ? 'var(--gold-light)'
                            : 'var(--navy-light)',
                        color:
                          item.agingBucket === '60+'
                            ? 'var(--crimson)'
                            : item.agingBucket === '31-60'
                            ? 'var(--gold)'
                            : 'var(--navy)',
                      }}
                    >
                      {item.overdueDays} Days ({item.agingBucket})
                    </span>
                  </td>
                  <td data-label="Immediate Due" style={{ textAlign: 'right', color: 'var(--crimson)', fontWeight: 700 }} className="tabular-nums">
                    {formatINR(item.duePaise)}
                  </td>
                  <td data-label="Remaining" style={{ textAlign: 'right' }} className="tabular-nums">
                    {formatINR(item.remainingPaise)}
                  </td>
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setTargetStudent(item.student);
                        setReminderModalOpen(true);
                      }}
                      style={{
                        padding: '5px 10px',
                        fontSize: '11px',
                        backgroundColor: 'var(--navy)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Send size={12} />
                      <span>Send Reminder</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH REMINDER MODAL */}
      <Dialog open={reminderModalOpen} onClose={() => setReminderModalOpen(false)} title="Dispatch Dues Reminder Notice">
        {targetStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Dispatching payment reminder to <strong>{targetStudent.name}</strong> (Guardian: {targetStudent.guardianPhone})
            </p>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Delivery Channel
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['WhatsApp', 'SMS', 'Email'] as const).map(channel => (
                  <button
                    key={channel}
                    onClick={() => setReminderChannel(channel)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      backgroundColor: reminderChannel === channel ? 'var(--navy)' : 'var(--bg-card)',
                      color: reminderChannel === channel ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Notification Message Preview
              </label>
              <textarea
                value={customReminderMsg}
                onChange={e => setCustomReminderMsg(e.target.value)}
                placeholder={`Dear ${targetStudent.name}, this is a formal notice that your college fee installment is overdue. Kindly clear your balance on the student finance portal.`}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setReminderModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Transmit Notification
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

