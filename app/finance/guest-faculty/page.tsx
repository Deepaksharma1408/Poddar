// College Finance Portal - Guest Faculty Sessions & Honorarium Log
// Hourly / Per-Lecture Logging, Overlap Slot Checking, HOD Approvals & TDS Section 194J

'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Search,
  Download,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import type { GuestFacultyLog } from '@/lib/finance-portal/types/finance';

export default function GuestFacultyPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();
  const currentRole = state.settings.currentRole;

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState('Computer Science & IT');
  const [formCourse, setFormCourse] = useState('');
  const [formDate, setFormDate] = useState(currentDate);
  const [formStart, setFormStart] = useState('10:00');
  const [formEnd, setFormEnd] = useState('13:00');
  const [formHours, setFormHours] = useState('3');
  const [formRateRupees, setFormRateRupees] = useState('2500');

  // Check Slot Overlap
  const checkDuplicateSlot = (date: string, start: string, end: string, faculty: string) => {
    return state.guestFacultyLogs.some(
      l =>
        l.date === date &&
        l.facultyName.toLowerCase() === faculty.toLowerCase() &&
        l.startTime === start &&
        l.endTime === end
    );
  };

  const handleCreateLog = () => {
    if (!formName.trim() || !formCourse.trim()) {
      showToast('Validation Error', 'Faculty name and course title are required.', 'error');
      return;
    }

    if (checkDuplicateSlot(formDate, formStart, formEnd, formName)) {
      showToast('Duplicate Slot', `Faculty ${formName} already has an identical session logged for ${formDate} at ${formStart}!`, 'error');
      return;
    }

    const hours = parseFloat(formHours) || 2;
    const ratePaise = toPaise(formRateRupees);
    const totalPaise = Math.round(ratePaise * hours);
    const tdsRate = 10; // Section 194J 10%
    const tdsDeductionPaise = Math.round(totalPaise * (tdsRate / 100));
    const netPayablePaise = totalPaise - tdsDeductionPaise;

    const newLog: GuestFacultyLog = {
      id: `GF-${Date.now()}`,
      facultyName: formName.trim(),
      department: formDept,
      courseTitle: formCourse.trim(),
      date: formDate,
      startTime: formStart,
      endTime: formEnd,
      durationHours: hours,
      hourlyRatePaise: ratePaise,
      totalPaise,
      tdsSection: '194J',
      tdsRatePct: tdsRate,
      tdsDeductionPaise,
      netPayablePaise,
      status: 'Submitted',
      createdBy: currentRole,
    };

    dispatch({ type: 'LOG_GUEST_FACULTY', log: newLog });
    showToast('Session Logged', `Logged honorarium of ${formatINR(netPayablePaise)} for ${formName}.`, 'success');
    setLogModalOpen(false);
  };

  const handleApprove = (id: string, nextStatus: GuestFacultyLog['status']) => {
    dispatch({ type: 'UPDATE_GUEST_FACULTY_STATUS', id, status: nextStatus });
    showToast('Status Updated', `Session moved to ${nextStatus}.`, 'info');
  };

  const handleDownloadHonorariumPDF = (log: GuestFacultyLog) => {
    const pdf = new SimplePDF();
    let y = pdf.drawHeader(state.settings.institutionName, 'GUEST FACULTY HONORARIUM VOUCHER', 'ACADEMIC CONSULTING & VISITING FACULTY');

    pdf.drawRect(40, y - 56, pdf.pageWidth - 80, 48, {
      fill: PDF_COLORS.lightBg,
      stroke: PDF_COLORS.navy,
      lineWidth: 0.5,
    });

    pdf.drawText(`VOUCHER NO: HON-${log.id}`, 52, y - 14, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    pdf.drawText(`Date: ${log.date}  |  Department: ${log.department}`, 52, y - 26, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Session Timings: ${log.startTime} to ${log.endTime} (${log.durationHours} Hours)`, 52, y - 38, { font: 'Helvetica', size: 8 });

    pdf.drawText('NET HONORARIUM PAYABLE', pdf.pageWidth - 180, y - 14, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.mutedText, align: 'right' });
    pdf.drawText(formatINR(log.netPayablePaise), pdf.pageWidth - 52, y - 14, { font: 'Helvetica-Bold', size: 14, color: PDF_COLORS.green, align: 'right' });

    y -= 80;
    pdf.drawText(`Guest Faculty Name: ${log.facultyName}`, 40, y, { font: 'Helvetica-Bold', size: 9 });
    pdf.drawText(`Topic / Course Delivered: ${log.courseTitle}`, 40, y - 14, { font: 'Helvetica', size: 8.5 });

    y -= 36;
    pdf.drawLine(40, y, pdf.pageWidth - 40, y, { stroke: PDF_COLORS.border });
    y -= 18;

    pdf.drawText('Honorarium & Statutory TDS Computation:', 40, y, { font: 'Helvetica-Bold', size: 8.5, color: PDF_COLORS.navy });
    y -= 16;
    pdf.drawText(`Gross Lecture Honorarium (${log.durationHours} hrs @ ${formatINR(log.hourlyRatePaise)}/hr):`, 40, y, { font: 'Helvetica', size: 8 });
    pdf.drawText(formatINR(log.totalPaise), 380, y, { font: 'Helvetica-Bold', size: 8, align: 'right' });
    y -= 14;
    pdf.drawText(`Less: TDS Withheld under Section 194J (${log.tdsRatePct}%):`, 40, y, { font: 'Helvetica', size: 8, color: PDF_COLORS.crimson });
    pdf.drawText(`- ${formatINR(log.tdsDeductionPaise)}`, 380, y, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.crimson, align: 'right' });
    y -= 14;
    pdf.drawLine(40, y, 380, y, { stroke: PDF_COLORS.navy, lineWidth: 0.5 });
    y -= 14;
    pdf.drawText('Net Remittance to Bank Account:', 40, y, { font: 'Helvetica-Bold', size: 8.5, color: PDF_COLORS.green });
    pdf.drawText(formatINR(log.netPayablePaise), 380, y, { font: 'Helvetica-Bold', size: 8.5, color: PDF_COLORS.green, align: 'right' });

    y -= 80;
    pdf.drawText('Head of Department (HOD)', 40, y, { font: 'Helvetica-Bold', size: 8 });
    pdf.drawText('Syllabus & Lecture Delivery Verified', 40, y - 10, { font: 'Helvetica', size: 7.5, color: PDF_COLORS.mutedText });

    pdf.drawText('Accounts Officer', pdf.pageWidth - 180, y, { font: 'Helvetica-Bold', size: 8, align: 'right' });
    pdf.drawText('TDS 194J Compliant Settlement', pdf.pageWidth - 180, y - 10, { font: 'Helvetica', size: 7.5, color: PDF_COLORS.mutedText, align: 'right' });

    pdf.drawFooter('Institutional consulting honorarium voucher. Form 16A will be issued at the end of the financial quarter.');
    triggerPDFDownload(`Honorarium-${log.id}.pdf`, pdf.output());
    showToast('Voucher Downloaded', `Downloaded Honorarium-${log.id}.pdf`, 'info');
  };

  const totalGrossHonorariumPaise = state.guestFacultyLogs.reduce((s, l) => s + l.totalPaise, 0);
  const totalTdsPaise = state.guestFacultyLogs.reduce((s, l) => s + l.tdsDeductionPaise, 0);
  const totalNetHonorariumPaise = state.guestFacultyLogs.reduce((s, l) => s + l.netPayablePaise, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Guest Faculty Honorarium & Session Log</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Track specialized lectures, HOD syllabus verification, Section 194J TDS deductions, and honorarium payouts.
          </p>
        </div>

        <button
          onClick={() => setLogModalOpen(true)}
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
          <span>Log Guest Session</span>
        </button>
      </div>

      {/* Executive KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #102d47' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Total Gross Honorarium
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalGrossHonorariumPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Across all expert lecture sessions</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #ad211d' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            TDS u/s 194J Withheld
          </span>
          <div className="headline-number" style={{ color: '#ad211d', margin: '6px 0 2px' }}>
            {formatINR(totalTdsPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>10% professional tax withholding</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #25866b' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Net Honorarium Paid / Due
          </span>
          <div className="headline-number" style={{ color: '#25866b', margin: '6px 0 2px' }}>
            {formatINR(totalNetHonorariumPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#25866b', fontWeight: 550 }}>Payable via bank transfer</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #b49662' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Total Guest Lectures
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {state.guestFacultyLogs.length} Sessions
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Verified by academic HODs</small>
        </div>
      </div>

      {/* Table Card */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Guest Faculty & Course</th>
                <th>Department</th>
                <th>Date & Timings</th>
                <th>Duration & Rate</th>
                <th style={{ textAlign: 'right' }}>Total (Gross)</th>
                <th style={{ textAlign: 'right' }}>TDS u/s 194J (10%)</th>
                <th style={{ textAlign: 'right' }}>Net Payable</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.guestFacultyLogs.map(log => (
                <tr key={log.id}>
                  <td data-label="Faculty">
                    <strong>{log.facultyName}</strong>
                    <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      {log.courseTitle}
                    </span>
                  </td>
                  <td data-label="Department">{log.department}</td>
                  <td data-label="Timings">
                    {log.date}
                    <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--navy)' }}>
                      {log.startTime} – {log.endTime}
                    </span>
                  </td>
                  <td data-label="Duration">
                    {log.durationHours} hrs @ {formatINR(log.hourlyRatePaise)}/hr
                  </td>
                  <td data-label="Total" style={{ textAlign: 'right' }} className="tabular-nums">
                    {formatINR(log.totalPaise)}
                  </td>
                  <td data-label="TDS" style={{ textAlign: 'right', color: 'var(--crimson)' }} className="tabular-nums">
                    -{formatINR(log.tdsDeductionPaise)}
                  </td>
                  <td data-label="Net Pay" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }} className="tabular-nums">
                    {formatINR(log.netPayablePaise)}
                  </td>
                  <td data-label="Status">
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor:
                          log.status === 'Paid'
                            ? 'var(--green-light)'
                            : log.status.includes('Approved')
                            ? 'var(--navy-light)'
                            : 'var(--gold-light)',
                        color:
                          log.status === 'Paid'
                            ? 'var(--green)'
                            : log.status.includes('Approved')
                            ? 'var(--navy)'
                            : 'var(--gold)',
                      }}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {log.status === 'Submitted' && (
                        <button
                          onClick={() => handleApprove(log.id, 'Approved by HOD')}
                          style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--navy-light)', color: 'var(--navy)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          HOD Approve
                        </button>
                      )}
                      {log.status === 'Approved by HOD' && (
                        <button
                          onClick={() => handleApprove(log.id, 'Approved by Accounts')}
                          style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--green-light)', color: 'var(--green)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Accounts Approve
                        </button>
                      )}
                      {log.status === 'Approved by Accounts' && (
                        <button
                          onClick={() => {
                            dispatch({
                              type: 'UPDATE_GUEST_FACULTY_STATUS',
                              id: log.id,
                              status: 'Paid',
                              utr: `UTR-GF-${log.id}`,
                            });
                            showToast('Paid', `Honorarium disbursed for ${log.facultyName}.`, 'success');
                          }}
                          style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--navy)', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Pay Honorarium
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadHonorariumPDF(log)}
                        title="Download Honorarium Voucher PDF"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          backgroundColor: '#ffffff',
                          color: '#102d47',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Download size={11} style={{ color: '#b49662' }} />
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Log Guest Faculty Session */}
      <Dialog open={logModalOpen} onClose={() => setLogModalOpen(false)} title="Log Guest Lecture Session">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Guest Faculty Full Name*</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Dr. / Industry Expert Name"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
              <select
                value={formDept}
                onChange={e => setFormDept(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="Computer Science & IT">Computer Science & IT</option>
                <option value="Management & Business Studies">Management & Business</option>
                <option value="Commerce & Accounting">Commerce & Accounting</option>
                <option value="Basic Sciences & Research Lab">Basic Sciences</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Course / Topic Title*</label>
            <input
              type="text"
              value={formCourse}
              onChange={e => setFormCourse(e.target.value)}
              placeholder="e.g. Workshop on Applied Artificial Intelligence in Business"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Start Time</label>
              <input
                type="time"
                value={formStart}
                onChange={e => setFormStart(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>End Time</label>
              <input
                type="time"
                value={formEnd}
                onChange={e => setFormEnd(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Rate (INR/hr)</label>
              <input
                type="number"
                value={formRateRupees}
                onChange={e => setFormRateRupees(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => setLogModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateLog}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Submit Session for HOD Verification
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

