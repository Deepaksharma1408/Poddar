'use client';

import { categoryBalance, chargedLeave, defaultLeaveRules } from '@/lib/hr';
import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  AS_OF,
  salaryBreakdown,
  studentLedger,
  type FeePayment,
  type FeeStudent,
  type NotificationDispatch,
  type SchoolFinance,
} from '@/lib/school-finance';
import { Currency, Status } from './finance-ui';
import { money } from '@/lib/finance';
import { openingPeriod } from '@/lib/payroll';
import { useInstitution } from './institution';
import {
  downloadFeeReceiptPDF,
  downloadFeeStatementPDF,
  downloadNoDuesCertificatePDF,
  downloadPayslipPDF,
} from '@/lib/pdf-documents';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  MapPin,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Dialog } from './finance-ui';

export default function SelfService({
  data,
  setData,
  role,
  id,
  studentAttendance = {},
}: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  role: 'Employee' | 'Student' | 'Parent';
  id: string;
  studentAttendance?: Record<string, string>;
}) {
  const campus = useInstitution();
  const [message, setMessage] = useState('');

  // Parent child selector state
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // Payment Checkout Modal State
  const [payModal, setPayModal] = useState(false);
  const [payTargetStudent, setPayTargetStudent] = useState<FeeStudent | null>(null);
  const [payMethod, setPayMethod] = useState('UPI / QR Code (PhonePe, GPay, Paytm)');
  const [payAmount, setPayAmount] = useState<number>(10000);

  // Success Confirmation State
  const [paySuccess, setPaySuccess] = useState<{
    payment: FeePayment;
    student: FeeStudent;
    teacherName: string;
    parentName: string;
  } | null>(null);

  // Central Payment Processing Function with Tri-Party Notifications (Parent + Teacher + Student)
  const processOnlinePayment = (student: FeeStudent, amount: number, method: string) => {
    const ref = `UPI-${Date.now().toString().slice(-6)}`;
    const newPayment: FeePayment = {
      id: `pay-${Date.now()}`,
      studentId: student.id,
      amount,
      date: AS_OF,
      method,
      reference: ref,
      verified: true,
    };

    // Find assigned teacher / faculty in-charge for student's class
    const matchedTeacher =
      data.staff.find(
        st =>
          st.subject.toLowerCase().includes(student.class.toLowerCase()) ||
          st.designation === 'Faculty' ||
          !st.designation
      ) ?? data.staff[0] ?? { name: 'Dr. Priya Sharma' };

    const teacherName = matchedTeacher.name;
    const parentName = student.guardian;

    // 1. Parent Notification
    const parentDispatch: NotificationDispatch = {
      id: crypto.randomUUID(),
      recipient: `Parent (${parentName})`,
      subject: `Fee Payment Receipt Confirmed: ₹${money(amount)} credited for ${student.name} (${student.class}) via ${method}. UTR/Ref: ${ref}. Balance updated.`,
      channel: 'WhatsApp & SMS',
      date: AS_OF,
    };

    // 2. Student Notification
    const studentDispatch: NotificationDispatch = {
      id: crypto.randomUUID(),
      recipient: `Student (${student.name} · ${student.id})`,
      subject: `Fee Payment Credited: ₹${money(amount)} credited towards your ${student.class} academic fees. Official receipt #${ref} is ready to download.`,
      channel: 'Student Portal & Push',
      date: AS_OF,
    };

    // 3. Teacher / Faculty Notification
    const teacherDispatch: NotificationDispatch = {
      id: crypto.randomUUID(),
      recipient: `Teacher (${teacherName} · Class Coordinator)`,
      subject: `Student Fee Settlement: ${student.name} (${student.class}) has settled fee payment of ₹${money(amount)} via ${method} (Ref: ${ref}). Synchronized in class roster.`,
      channel: 'Staff Console & Email',
      date: AS_OF,
    };

    // Commit to central store
    setData(current => ({
      ...current,
      payments: [...current.payments, newPayment],
      notificationDispatches: [
        parentDispatch,
        studentDispatch,
        teacherDispatch,
        ...(current.notificationDispatches ?? []),
      ],
    }));

    setPayModal(false);
    setPaySuccess({
      payment: newPayment,
      student,
      teacherName,
      parentName,
    });
  };

  // ==========================================
  // 1. PARENT SELF-SERVICE PORTAL
  // ==========================================
  if (role === 'Parent') {
    const linkedStudents = data.students.filter(
      s => s.guardian === id || s.guardian.toLowerCase().includes(id.toLowerCase())
    );
    const children = linkedStudents.length > 0 ? linkedStudents : data.students.slice(0, 2);
    const effectiveChildId = selectedChildId || children[0]?.id || '';
    const currentChild = children.find(c => c.id === effectiveChildId) ?? children[0];

    if (!currentChild) {
      return (
        <section className="card">
          <p className="empty-state">No linked student records found for this guardian.</p>
        </section>
      );
    }

    const ledger = studentLedger(currentChild, data.payments);
    const childPayments = data.payments.filter(p => p.studentId === currentChild.id);
    const attendanceEntries = Object.entries(studentAttendance).filter(
      ([key]) => key === currentChild.id || key.endsWith('/' + currentChild.id)
    );
    const presentDays = attendanceEntries.filter(([, st]) => st === 'Present').length;
    const totalMarkedDays = attendanceEntries.length || 1;
    const attendanceRate = Math.round((presentDays / totalMarkedDays) * 100);

    // Filter notifications relevant to this child or parent
    const myNotifications = (data.notificationDispatches ?? []).filter(
      n =>
        n.recipient.includes(currentChild.guardian) ||
        n.recipient.includes(currentChild.name) ||
        n.subject.includes(currentChild.name)
    );

    return (
      <div className="parent-portal-shell" style={{ animation: 'viewFadeSlide 0.3s ease both' }}>
        {/* Linked Children Switcher Strip */}
        <div className="child-selector-strip" style={{ marginBottom: 20 }}>
          <span className="child-selector-label">
            <Users size={16} style={{ display: 'inline', marginRight: 6 }} />
            Linked Children:
          </span>
          {children.map(child => (
            <button
              key={child.id}
              className={`child-tab-pill ${child.id === currentChild.id ? 'active' : ''}`}
              onClick={() => setSelectedChildId(child.id)}
            >
              <strong>{child.name}</strong>
              <small>({child.class})</small>
            </button>
          ))}
        </div>

        {/* Executive Parent & Child Hero Banner */}
        <div className="executive-portal-hero">
          <div className="portal-hero-identity">
            <div className="portal-hero-avatar">
              {currentChild.guardian.slice(0, 2).toUpperCase()}
            </div>
            <div className="portal-hero-details">
              <h2>Parent &amp; Guardian Portal</h2>
              <div className="portal-hero-tags">
                <span className="glass-pill emerald">
                  <span className="live-dot" /> Enrolled Ward: <strong>{currentChild.name}</strong>
                </span>
                <span className="glass-pill">Admission ID: {currentChild.id}</span>
                <span className="glass-pill"><BookOpen size={13} /> {currentChild.class}</span>
                <span className="glass-pill gold"><Sparkles size={12} /> {currentChild.plan.kind} Fee Plan</span>
              </div>
            </div>
          </div>

          <div className="portal-hero-actions">
            <button
              className="btn-hero-pay"
              onClick={() => {
                setPayTargetStudent(currentChild);
                setPayAmount(ledger.due > 0 ? ledger.due : 10000);
                setPayModal(true);
              }}
            >
              <CreditCard size={16} /> {ledger.due > 0 ? `Pay Outstanding Dues (${money(ledger.due)})` : 'Pay Fees Online'}
            </button>
            <button
              className="btn-hero-secondary"
              onClick={() =>
                downloadFeeStatementPDF({
                  campusName: campus.name,
                  student: currentChild,
                  ledger,
                })
              }
            >
              <Download size={14} /> Fee Statement PDF
            </button>
            {ledger.remaining === 0 && (
              <button
                className="btn-hero-secondary"
                style={{ background: 'rgba(16, 185, 129, 0.25)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                onClick={() =>
                  downloadNoDuesCertificatePDF({
                    campusName: campus.name,
                    student: currentChild,
                    asOf: AS_OF,
                  })
                }
              >
                <Award size={14} /> No-Dues Certificate PDF
              </button>
            )}
          </div>
        </div>

        {/* High-End Metric Cards Grid */}
        <div className="portal-metric-grid">
          <div className={`portal-metric-card ${ledger.due > 0 ? 'red' : 'green'}`}>
            <div className="portal-metric-head">
              <span className="portal-metric-label">Immediate Dues</span>
              <div className="portal-metric-icon"><Clock size={18} /></div>
            </div>
            <div className="portal-metric-value">{money(ledger.due)}</div>
            <div className="portal-metric-sub">
              {ledger.due > 0 ? (
                <span style={{ color: '#DC2626', fontWeight: 600 }}>● Settlement pending</span>
              ) : (
                <span style={{ color: '#059669', fontWeight: 600 }}>● All scheduled dues settled</span>
              )}
            </div>
          </div>

          <div className="portal-metric-card gold">
            <div className="portal-metric-head">
              <span className="portal-metric-label">Total Cleared Fees</span>
              <div className="portal-metric-icon"><Wallet size={18} /></div>
            </div>
            <div className="portal-metric-value">{money(ledger.paid)}</div>
            <div className="portal-metric-sub">
              <span>Committed: {money(ledger.total)}</span>
            </div>
            <div className="metric-progress-bar">
              <div
                className="metric-progress-fill gold"
                style={{ width: `${Math.min(100, Math.round((ledger.paid / (ledger.total || 1)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="portal-metric-card green">
            <div className="portal-metric-head">
              <span className="portal-metric-label">Child Attendance</span>
              <div className="portal-metric-icon"><UserCheck size={18} /></div>
            </div>
            <div className="portal-metric-value">{attendanceRate}%</div>
            <div className="portal-metric-sub">
              <span>{presentDays} of {totalMarkedDays} marked sessions</span>
            </div>
            <div className="metric-progress-bar">
              <div
                className="metric-progress-fill green"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>

          <div className="portal-metric-card">
            <div className="portal-metric-head">
              <span className="portal-metric-label">Verified Receipts</span>
              <div className="portal-metric-icon"><ShieldCheck size={18} /></div>
            </div>
            <div className="portal-metric-value">{childPayments.length}</div>
            <div className="portal-metric-sub">
              <span>Official Institutional Receipts</span>
            </div>
          </div>
        </div>

        {/* Two-Column: Academic Timetable & Installment Schedule */}
        <div className="profile-grid-2col" style={{ marginBottom: 26 }}>
          {/* Child's Academic Schedule */}
          <section className="card" style={{ padding: 24 }}>
            <div className="portal-section-header">
              <div>
                <h3 className="portal-section-title">
                  <BookOpen size={16} /> {currentChild.name}&apos;s Daily Class Schedule
                </h3>
                <p className="portal-section-subtitle">
                  Academic Session 2026–27 · {currentChild.class}
                </p>
              </div>
              <span className="timetable-status-chip live">
                <span className="live-dot" /> Classes Active
              </span>
            </div>

            <div className="timetable-period-grid">
              {[
                { period: 'Period 1', time: '08:00 – 08:45 AM', subject: 'Computer Networks', faculty: 'Prof. S. R. Agrawal', room: 'Lab 1', status: 'past' },
                { period: 'Period 2', time: '08:45 – 09:30 AM', subject: 'Software Engineering', faculty: 'Dr. Priya Sharma', room: 'Room 204', status: 'past' },
                { period: 'Period 3', time: '09:45 – 10:30 AM', subject: 'Database Systems', faculty: 'Prof. Alok Gupta', room: 'Lab 2', status: 'live' },
                { period: 'Period 4', time: '10:30 – 11:15 AM', subject: 'Web Technology', faculty: 'Prof. Neha Sen', room: 'Room 204', status: 'upcoming' },
                { period: 'Period 5', time: '11:30 – 12:15 PM', subject: 'Placement Preparation', faculty: 'Mr. Vivek Joshi', room: 'Auditorium', status: 'upcoming' },
              ].map(item => (
                <div key={item.period} className={`timetable-period-item ${item.status === 'live' ? 'current' : ''}`}>
                  <div className="period-time-col">
                    <span className="period-chip">{item.period}</span>
                    <span className="period-time">{item.time}</span>
                  </div>
                  <div className="period-subject-col">
                    <div className="period-subject-name">{item.subject}</div>
                    <div className="period-faculty-name">{item.faculty}</div>
                  </div>
                  <div className="period-room-col">
                    <span className="timetable-room-chip">
                      <MapPin size={12} /> {item.room}
                    </span>
                    <span className={`timetable-status-chip ${item.status}`}>
                      {item.status === 'live' ? <><span className="live-dot" /> Live Now</> : item.status === 'past' ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Child's Installment Schedule & Direct Checkout */}
          <section className="card" style={{ padding: 24 }}>
            <div className="portal-section-header">
              <div>
                <h3 className="portal-section-title">
                  <Wallet size={16} /> Installment Schedule &amp; Checkout
                </h3>
                <p className="portal-section-subtitle">
                  Plan: {currentChild.plan.kind} ({currentChild.plan.preferred})
                </p>
              </div>
              <span className={`status-pill ${ledger.due > 0 ? 'bad' : 'good'}`}>
                {ledger.due > 0 ? 'Action Required' : 'On Track'}
              </span>
            </div>

            <div className="installment-list-wrap">
              {ledger.schedule.map((charge, idx) => (
                <div
                  key={idx}
                  className={`installment-row-item ${charge.outstanding > 0 ? 'due-active' : ''}`}
                >
                  <div className="installment-title-block">
                    <strong>{charge.label}</strong>
                    <small>
                      <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
                      Due: {charge.date}
                    </small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="installment-amount-block">
                      <strong className={charge.outstanding > 0 ? 'negative' : 'positive'}>
                        {money(charge.outstanding)}
                      </strong>
                      <small>{charge.outstanding > 0 ? 'Outstanding' : 'Cleared'}</small>
                    </div>
                    <div>
                      {charge.outstanding > 0 ? (
                        <button
                          className="btn-pay-now"
                          style={{ padding: '8px 14px', fontSize: 12 }}
                          onClick={() => {
                            setPayTargetStudent(currentChild);
                            setPayAmount(charge.outstanding);
                            setPayModal(true);
                          }}
                        >
                          <CreditCard size={13} /> Pay Online
                        </button>
                      ) : (
                        <span className="status-pill good">Settled</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Bottom Grid: Receipts & Real-Time Tri-Party Alerts */}
        <div className="profile-grid-2col" style={{ marginBottom: 26 }}>
          {/* Verified Official Receipts */}
          <section className="card" style={{ padding: 24 }}>
            <div className="portal-section-header">
              <div>
                <h3 className="portal-section-title">
                  <ShieldCheck size={16} /> Verified Official Fee Receipts
                </h3>
                <p className="portal-section-subtitle">Download official institution-stamped receipts.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>AMOUNT</th>
                    <th>REFERENCE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {childPayments.map(p => (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td className="positive"><strong>{money(p.amount)}</strong></td>
                      <td><small>{p.reference || p.id}</small></td>
                      <td>
                        <button
                          className="button secondary small"
                          onClick={() =>
                            downloadFeeReceiptPDF({
                              campusName: campus.name,
                              student: currentChild,
                              payment: p,
                            })
                          }
                        >
                          <Download size={12} /> Receipt PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!childPayments.length && (
                    <tr>
                      <td colSpan={4} className="empty-state">No payment receipts found yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tri-Party Notification Feed */}
          <section className="card" style={{ padding: 24 }}>
            <div className="portal-section-header">
              <div>
                <h3 className="portal-section-title">
                  <Bell size={16} /> Tri-Party Alerts &amp; SMS Feed
                </h3>
                <p className="portal-section-subtitle">Real-time dispatches to Parent, Student, and Teacher.</p>
              </div>
            </div>

            <div className="announcements-feed">
              {myNotifications.map(n => (
                <div key={n.id} className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-target-badge">{n.channel}</span>
                    <span className="announcement-date">{n.date}</span>
                  </div>
                  <h3>{n.subject}</h3>
                  <div className="tri-party-badge-strip">
                    <span className="party-badge parent">Delivered to Parent WhatsApp</span>
                    <span className="party-badge student">Student App</span>
                    <span className="party-badge teacher">Teacher Console</span>
                  </div>
                </div>
              ))}
              {!myNotifications.length && (
                <div className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-target-badge">Parent Alert Channel</span>
                    <span className="announcement-date">{AS_OF}</span>
                  </div>
                  <h3>All academic and fee records up to date</h3>
                  <p>When fees are paid online, instantaneous automated receipts and alerts are dispatched to you, your child, and the class teacher coordinator.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* SHARED PAYMENT CHECKOUT MODAL */}
        {renderPaymentModal()}

        {/* SHARED PAYMENT CONFIRMATION DIALOG */}
        {renderSuccessDialog()}
      </div>
    );
  }

  // ==========================================
  // 2. STUDENT SELF-SERVICE PORTAL
  // ==========================================
  if (role === 'Student') {
    const student = data.students.find(row => row.id === id);
    if (!student) return null;
    const ledger = studentLedger(student, data.payments);
    const myPayments = data.payments.filter(p => p.studentId === student.id);
    const attendanceEntries = Object.entries(studentAttendance).filter(
      ([key]) => key === id || key.endsWith('/' + id)
    );
    const presentDays = attendanceEntries.filter(([, st]) => st === 'Present').length;
    const totalMarkedDays = attendanceEntries.length || 1;
    const attendanceRate = Math.round((presentDays / totalMarkedDays) * 100);

    // Notifications for student
    const myNotifications = (data.notificationDispatches ?? []).filter(
      n => n.recipient.includes(student.name) || n.recipient.includes(student.id) || n.subject.includes(student.name)
    );

    return (
      <div className="parent-portal-shell" style={{ animation: 'viewFadeSlide 0.3s ease both' }}>
        {/* Executive Student Hero Banner */}
        <div className="executive-portal-hero">
          <div className="portal-hero-identity">
            <div className="portal-hero-avatar">
              {student.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="portal-hero-details">
              <h2>{student.name}</h2>
              <div className="portal-hero-tags">
                <span className="glass-pill emerald">
                  <span className="live-dot" /> Active Enrolled Student
                </span>
                <span className="glass-pill">Admission ID: <strong>{student.id}</strong></span>
                <span className="glass-pill"><BookOpen size={13} /> {student.class}</span>
                <span className="glass-pill"><Users size={13} /> Guardian: {student.guardian}</span>
                <span className="glass-pill gold"><Sparkles size={12} /> {student.plan.kind} Fee Plan</span>
              </div>
            </div>
          </div>

          <div className="portal-hero-actions">
            <button
              className="btn-hero-pay"
              onClick={() => {
                setPayTargetStudent(student);
                setPayAmount(ledger.due > 0 ? ledger.due : 10000);
                setPayModal(true);
              }}
            >
              <CreditCard size={16} /> {ledger.due > 0 ? `Pay Dues Online (${money(ledger.due)})` : 'Pay Fees Online'}
            </button>
            <button
              className="btn-hero-secondary"
              onClick={() =>
                downloadFeeStatementPDF({
                  campusName: campus.name,
                  student,
                  ledger,
                })
              }
            >
              <Download size={14} /> Fee Statement PDF
            </button>
            {ledger.remaining === 0 && (
              <button
                className="btn-hero-secondary"
                style={{ background: 'rgba(16, 185, 129, 0.25)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                onClick={() =>
                  downloadNoDuesCertificatePDF({
                    campusName: campus.name,
                    student,
                    asOf: AS_OF,
                  })
                }
              >
                <Award size={14} /> No-Dues Certificate PDF
              </button>
            )}
          </div>
        </div>

        {/* High-End Metric Cards Grid */}
        <div className="portal-metric-grid">
          <div className="portal-metric-card gold">
            <div className="portal-metric-head">
              <span className="portal-metric-label">Fees Paid to Date</span>
              <div className="portal-metric-icon"><Wallet size={18} /></div>
            </div>
            <div className="portal-metric-value">{money(ledger.paid)}</div>
            <div className="portal-metric-sub">
              <span>Total committed: {money(ledger.total)}</span>
            </div>
            <div className="metric-progress-bar">
              <div
                className="metric-progress-fill gold"
                style={{ width: `${Math.min(100, Math.round((ledger.paid / (ledger.total || 1)) * 100))}%` }}
              />
            </div>
          </div>

          <div className={`portal-metric-card ${ledger.due > 0 ? 'red' : 'green'}`}>
            <div className="portal-metric-head">
              <span className="portal-metric-label">Current Outstanding</span>
              <div className="portal-metric-icon"><Clock size={18} /></div>
            </div>
            <div className="portal-metric-value">{money(ledger.due)}</div>
            <div className="portal-metric-sub">
              {ledger.due > 0 ? (
                <span style={{ color: '#DC2626', fontWeight: 600 }}>● Immediate installment pending</span>
              ) : (
                <span style={{ color: '#059669', fontWeight: 600 }}>● All scheduled dues clear</span>
              )}
            </div>
          </div>

          <div className="portal-metric-card green">
            <div className="portal-metric-head">
              <span className="portal-metric-label">My Attendance Rate</span>
              <div className="portal-metric-icon"><CalendarCheck size={18} /></div>
            </div>
            <div className="portal-metric-value">{attendanceRate}%</div>
            <div className="portal-metric-sub">
              <span>{presentDays} of {totalMarkedDays} recorded sessions</span>
            </div>
            <div className="metric-progress-bar">
              <div
                className="metric-progress-fill green"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>

          <div className="portal-metric-card">
            <div className="portal-metric-head">
              <span className="portal-metric-label">Verified Receipts</span>
              <div className="portal-metric-icon"><ShieldCheck size={18} /></div>
            </div>
            <div className="portal-metric-value">{myPayments.length}</div>
            <div className="portal-metric-sub">
              <span>Official Institutional Receipts</span>
            </div>
          </div>
        </div>

        {/* Two-Column Section: Schedule & Installments */}
        <div className="profile-grid-2col" style={{ marginBottom: 26 }}>
          {/* Today's Academic Timetable */}
          <section className="card" style={{ padding: 24 }}>
            <div className="portal-section-header">
              <div>
                <h3 className="portal-section-title">
                  <BookOpen size={16} /> Today’s Academic Timetable
                </h3>
                <p className="portal-section-subtitle">
                  Wednesday, 04 November 2026 · Class: {student.class}
                </p>
              </div>
              <span className="timetable-status-chip live">
                <span className="live-dot" /> Classes in Session
              </span>
            </div>

            <div className="timetable-period-grid">
              {[
                { period: 'Period 1', time: '08:00 – 08:45 AM', subject: 'Computer Networks', faculty: 'Prof. S. R. Agrawal', room: 'Lab 1', status: 'past' },
                { period: 'Period 2', time: '08:45 – 09:30 AM', subject: 'Software Engineering', faculty: 'Dr. Priya Sharma', room: 'Room 204', status: 'past' },
                { period: 'Period 3', time: '09:45 – 10:30 AM', subject: 'Database Systems', faculty: 'Prof. Alok Gupta', room: 'Lab 2', status: 'live' },
                { period: 'Period 4', time: '10:30 – 11:15 AM', subject: 'Web Technology', faculty: 'Prof. Neha Sen', room: 'Room 204', status: 'upcoming' },
                { period: 'Period 5', time: '11:30 – 12:15 PM', subject: 'Aptitude & Soft Skills', faculty: 'Mr. Vivek Joshi', room: 'Auditorium', status: 'upcoming' },
              ].map(item => (
                <div key={item.period} className={`timetable-period-item ${item.status === 'live' ? 'current' : ''}`}>
                  <div className="period-time-col">
                    <span className="period-chip">{item.period}</span>
                    <span className="period-time">{item.time}</span>
                  </div>
                  <div className="period-subject-col">
                    <div className="period-subject-name">{item.subject}</div>
                    <div className="period-faculty-name">{item.faculty}</div>
                  </div>
                  <div className="period-room-col">
                    <span className="timetable-room-chip">
                      <MapPin size={12} /> {item.room}
                    </span>
                    <span className={`timetable-status-chip ${item.status}`}>
                      {item.status === 'live' ? <><span className="live-dot" /> Live</> : item.status === 'past' ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Installment Schedule & Direct Checkout */}
          <section className="card" style={{ padding: 24 }}>
            <div className="portal-section-header">
              <div>
                <h3 className="portal-section-title">
                  <Wallet size={16} /> My Installment Schedule
                </h3>
                <p className="portal-section-subtitle">
                  Account status: {ledger.status} · {student.plan.kind}
                </p>
              </div>
              <span className={`status-pill ${ledger.due > 0 ? 'bad' : 'good'}`}>
                {ledger.due > 0 ? 'Due Pending' : 'All Clear'}
              </span>
            </div>

            <div className="installment-list-wrap">
              {ledger.schedule.map((charge, idx) => (
                <div
                  key={idx}
                  className={`installment-row-item ${charge.outstanding > 0 ? 'due-active' : ''}`}
                >
                  <div className="installment-title-block">
                    <strong>{charge.label}</strong>
                    <small>
                      <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
                      Due: {charge.date}
                    </small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="installment-amount-block">
                      <strong className={charge.outstanding > 0 ? 'negative' : 'positive'}>
                        {money(charge.outstanding)}
                      </strong>
                      <small>{charge.outstanding > 0 ? 'Pending Payment' : 'Settled in Full'}</small>
                    </div>
                    <div>
                      {charge.outstanding > 0 ? (
                        <button
                          className="btn-pay-now"
                          style={{ padding: '8px 14px', fontSize: 12 }}
                          onClick={() => {
                            setPayTargetStudent(student);
                            setPayAmount(charge.outstanding);
                            setPayModal(true);
                          }}
                        >
                          <CreditCard size={13} /> Pay Online
                        </button>
                      ) : myPayments[idx] ? (
                        <button
                          className="button secondary small"
                          onClick={() =>
                            downloadFeeReceiptPDF({
                              campusName: campus.name,
                              student,
                              payment: myPayments[idx],
                            })
                          }
                        >
                          <Download size={11} /> Receipt PDF
                        </button>
                      ) : (
                        <span className="status-pill good">Settled</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Bottom Grid: Receipts & Tri-Party Alerts */}
        <div className="profile-grid-2col" style={{ marginBottom: 26 }}>
          {/* Official Receipts */}
          <section className="card" style={{ padding: 24 }}>
            <div className="portal-section-header">
              <div>
                <h3 className="portal-section-title">
                  <ShieldCheck size={16} /> Verified Payment Receipts
                </h3>
                <p className="portal-section-subtitle">Official fee receipts generated with digital verification.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>AMOUNT</th>
                    <th>REFERENCE</th>
                    <th>RECEIPT</th>
                  </tr>
                </thead>
                <tbody>
                  {myPayments.map(p => (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td className="positive"><strong>{money(p.amount)}</strong></td>
                      <td><small>{p.reference || p.id}</small></td>
                      <td>
                        <button
                          className="button secondary small"
                          onClick={() =>
                            downloadFeeReceiptPDF({
                              campusName: campus.name,
                              student,
                              payment: p,
                            })
                          }
                        >
                          <Download size={12} /> Receipt PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!myPayments.length && (
                    <tr>
                      <td colSpan={4} className="empty-state">No payment receipts found yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tri-Party Notification Feed */}
          <section className="card" style={{ padding: 24 }}>
            <div className="portal-section-header">
              <div>
                <h3 className="portal-section-title">
                  <Bell size={16} /> My Payment &amp; Campus Alerts
                </h3>
                <p className="portal-section-subtitle">Real-time dispatches sent upon online fee settlement.</p>
              </div>
            </div>

            <div className="announcements-feed">
              {myNotifications.map(n => (
                <div key={n.id} className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-target-badge">{n.channel}</span>
                    <span className="announcement-date">{n.date}</span>
                  </div>
                  <h3>{n.subject}</h3>
                  <div className="tri-party-badge-strip">
                    <span className="party-badge student">Student App</span>
                    <span className="party-badge parent">Parent WhatsApp</span>
                    <span className="party-badge teacher">Teacher Console</span>
                  </div>
                </div>
              ))}
              {!myNotifications.length && (
                <div className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-target-badge">Student Alert</span>
                    <span className="announcement-date">{AS_OF}</span>
                  </div>
                  <h3>Direct Online Payment Available</h3>
                  <p>You can pay your academic fees directly from this portal via UPI, Cards, or Net Banking. Once paid, notifications are dispatched to you, your parents, and your class teacher immediately.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* SHARED PAYMENT CHECKOUT MODAL */}
        {renderPaymentModal()}

        {/* SHARED PAYMENT CONFIRMATION DIALOG */}
        {renderSuccessDialog()}
      </div>
    );
  }

  // ==========================================
  // 3. EMPLOYEE / TEACHER PORTAL
  // ==========================================
  const employee = data.staff.find(row => row.id === id);
  if (!employee) return null;
  const leaves = data.leaves.filter(row => row.staffId === id);
  const payroll = (data.payroll ?? []).filter(row => row.employeeId === id && row.status !== 'Draft');
  const balance = salaryBreakdown(
    employee,
    leaves.filter(leave => leave.from.startsWith(openingPeriod)),
    data.policy
  ).balance;

  // Teacher notifications (including fee settlement alerts for their students)
  const teacherNotifications = (data.notificationDispatches ?? []).filter(
    n => n.recipient.includes(employee.name) || n.subject.includes(employee.name)
  );

  return (
    <div className="parent-portal-shell" style={{ animation: 'viewFadeSlide 0.3s ease both' }}>
      {/* Executive Faculty Hero Banner */}
      <div className="executive-portal-hero">
        <div className="portal-hero-identity">
          <div className="portal-hero-avatar">
            {employee.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="portal-hero-details">
            <h2>{employee.name}</h2>
            <div className="portal-hero-tags">
              <span className="glass-pill emerald">
                <span className="live-dot" /> Active Faculty Member
              </span>
              <span className="glass-pill">Employee ID: <strong>{employee.id}</strong></span>
              <span className="glass-pill"><BookOpen size={13} /> {employee.subject}</span>
              <span className="glass-pill">{employee.designation ?? 'Faculty'}</span>
            </div>
          </div>
        </div>

        <div className="portal-hero-actions">
          {payroll.length > 0 && (
            <button
              className="btn-hero-pay"
              onClick={() =>
                downloadPayslipPDF({
                  campusName: campus.name,
                  employee,
                  record: payroll[payroll.length - 1],
                })
              }
            >
              <Download size={14} /> Download Latest Payslip PDF
            </button>
          )}
        </div>
      </div>

      {/* High-End Metric Cards Grid */}
      <div className="portal-metric-grid">
        <div className="portal-metric-card green">
          <div className="portal-metric-head">
            <span className="portal-metric-label">Paid Leave Balance</span>
            <div className="portal-metric-icon"><CalendarCheck size={18} /></div>
          </div>
          <div className="portal-metric-value">{balance} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>Days</span></div>
          <div className="portal-metric-sub">
            <span>Opening period: November 2026</span>
          </div>
        </div>

        <div className="portal-metric-card gold">
          <div className="portal-metric-head">
            <span className="portal-metric-label">Monthly Gross Salary</span>
            <div className="portal-metric-icon"><Wallet size={18} /></div>
          </div>
          <div className="portal-metric-value">{money(employee.salary)}</div>
          <div className="portal-metric-sub">
            <span>Base contracted compensation</span>
          </div>
        </div>

        <div className="portal-metric-card">
          <div className="portal-metric-head">
            <span className="portal-metric-label">Approved Leaves</span>
            <div className="portal-metric-icon"><UserCheck size={18} /></div>
          </div>
          <div className="portal-metric-value">{leaves.filter(l => l.status === 'Approved').length}</div>
          <div className="portal-metric-sub">
            <span>Sanctioned leave records</span>
          </div>
        </div>

        <div className="portal-metric-card">
          <div className="portal-metric-head">
            <span className="portal-metric-label">Pending Reviews</span>
            <div className="portal-metric-icon"><Clock size={18} /></div>
          </div>
          <div className="portal-metric-value">{leaves.filter(l => l.status === 'Pending').length}</div>
          <div className="portal-metric-sub">
            <span>Awaiting HOD/HR approval</span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Teaching Timetable & Leave Application */}
      <div className="profile-grid-2col" style={{ marginBottom: 26 }}>
        {/* Faculty Today's Teaching Schedule */}
        <section className="card" style={{ padding: 24 }}>
          <div className="portal-section-header">
            <div>
              <h3 className="portal-section-title">
                <BookOpen size={16} /> Today’s Faculty Teaching Schedule
              </h3>
              <p className="portal-section-subtitle">
                Academic Session 2026–27 · Department of {employee.subject}
              </p>
            </div>
            <span className="timetable-status-chip live">
              <span className="live-dot" /> Active Session
            </span>
          </div>

          <div className="timetable-period-grid">
            {[
              { period: 'Period 1', time: '08:00 – 08:45 AM', subject: `${employee.subject} (Section A)`, faculty: 'Lecture & Class Roll', room: 'Room 204', status: 'past' },
              { period: 'Period 2', time: '08:45 – 09:30 AM', subject: `${employee.subject} (Section B)`, faculty: 'Interactive Workshop', room: 'Room 205', status: 'past' },
              { period: 'Period 3', time: '09:45 – 10:30 AM', subject: 'Faculty Research & Mentorship', faculty: 'Student Office Hours', room: 'Staff Room 3', status: 'live' },
              { period: 'Period 4', time: '10:30 – 11:15 AM', subject: 'Lab Practical & Projects', faculty: 'Guided Coding Lab', room: 'Computer Lab 2', status: 'upcoming' },
              { period: 'Period 5', time: '11:30 – 12:15 PM', subject: 'Department Academic Meeting', faculty: 'HOD Briefing & Planning', room: 'Conference Hall', status: 'upcoming' },
            ].map(item => (
              <div key={item.period} className={`timetable-period-item ${item.status === 'live' ? 'current' : ''}`}>
                <div className="period-time-col">
                  <span className="period-chip">{item.period}</span>
                  <span className="period-time">{item.time}</span>
                </div>
                <div className="period-subject-col">
                  <div className="period-subject-name">{item.subject}</div>
                  <div className="period-faculty-name">{item.faculty}</div>
                </div>
                <div className="period-room-col">
                  <span className="timetable-room-chip">
                    <MapPin size={12} /> {item.room}
                  </span>
                  <span className={`timetable-status-chip ${item.status}`}>
                    {item.status === 'live' ? <><span className="live-dot" /> Now</> : item.status === 'past' ? 'Done' : 'Upcoming'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Apply for Faculty Leave Form */}
        <section className="card" style={{ padding: 24 }}>
          <div className="portal-section-header">
            <div>
              <h3 className="portal-section-title">
                <Calendar size={16} /> Apply for Faculty Leave
              </h3>
              <p className="portal-section-subtitle">Submit for Dean and HR clearance.</p>
            </div>
          </div>

          <div>
            {message && <div className="info-strip" style={{ marginBottom: 14 }}>{message}</div>}
            <form
              onSubmit={event => {
                event.preventDefault();
                const fields = new FormData(event.currentTarget);
                const from = String(fields.get('from'));
                const days = Number(fields.get('days'));
                const start = Date.parse(from);
                const end = start + Math.ceil(days) * 86400000;
                const overlaps = leaves.some(
                  leave =>
                    leave.status !== 'Rejected' &&
                    leave.status !== 'Cancelled' &&
                    Date.parse(leave.from) < end &&
                    Date.parse(leave.from) + Math.ceil(leave.days) * 86400000 > start
                );
                if (
                  !Number.isFinite(start) ||
                  days <= 0 ||
                  new Date(end - 1).toISOString().slice(0, 7) !== from.slice(0, 7) ||
                  overlaps
                ) {
                  setMessage('Choose non-overlapping dates within a single calendar month.');
                  return;
                }
                const category = String(fields.get('category'));
                const rule = (data.leaveRules ?? defaultLeaveRules).find(item => item.name === category);
                if (
                  !rule ||
                  (!rule.halfDay && !Number.isInteger(days)) ||
                  (rule.paid &&
                    chargedLeave(data, from, days, rule).chargedDays >
                      categoryBalance(data, id, category, from))
                ) {
                  setMessage('The request exceeds the category entitlement or half-day policy.');
                  return;
                }
                setData(current => ({
                  ...current,
                  leaves: [
                    ...current.leaves,
                    {
                      id: crypto.randomUUID(),
                      staffId: id,
                      from,
                      days,
                      category,
                      kind: rule.paid ? 'Paid' : 'Unpaid',
                      reason: String(fields.get('reason')).trim(),
                      document: (fields.get('support') as File | null)?.name || undefined,
                      status: 'Pending',
                    },
                  ],
                }));
                setMessage('Leave request submitted successfully for review.');
              }}
            >
              <div className="form-row">
                <label>
                  Category
                  <select name="category">
                    {(data.leaveRules ?? defaultLeaveRules).map(rule => (
                      <option key={rule.name}>{rule.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Start Date
                  <input type="date" name="from" defaultValue={AS_OF} required />
                </label>
                <label>
                  Days
                  <input type="number" name="days" min="0.5" max="31" step="0.5" defaultValue="1" required />
                </label>
              </div>
              <label>
                Reason
                <input name="reason" maxLength={160} placeholder="e.g. Academic conference / Medical appointment" required />
              </label>
              <button type="submit" className="button primary full-width" style={{ marginTop: 14 }}>
                Submit Leave Application <ArrowRight size={15} />
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* Student Fee Settlement Notifications Received by Teacher */}
      <section className="card" style={{ padding: 24, marginBottom: 26 }}>
        <div className="portal-section-header">
          <div>
            <h3 className="portal-section-title">
              <Bell size={16} /> Class Fee Clearances &amp; Real-Time Alerts
            </h3>
            <p className="portal-section-subtitle">
              Automated notifications received when students in your class clear fees online.
            </p>
          </div>
        </div>

        <div className="announcements-feed">
          {teacherNotifications.map(n => (
            <div key={n.id} className="announcement-entry">
              <div className="announcement-meta">
                <span className="announcement-target-badge">{n.channel}</span>
                <span className="announcement-date">{n.date}</span>
              </div>
              <h3>{n.subject}</h3>
              <div className="tri-party-badge-strip">
                <span className="party-badge teacher">Teacher Roster Synced</span>
                <span className="party-badge parent">Parent WhatsApp Notified</span>
                <span className="party-badge student">Student Receipt Created</span>
              </div>
            </div>
          ))}
          {!teacherNotifications.length && (
            <div className="announcement-entry">
              <div className="announcement-meta">
                <span className="announcement-target-badge">Staff Alert</span>
                <span className="announcement-date">{AS_OF}</span>
              </div>
              <h3>Class Fee Status Up to Date</h3>
              <p>When any student or parent in your assigned classes settles fee dues online, you will receive an instantaneous coordinator clearance notification here.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  // ==========================================
  // SHARED PAYMENT CHECKOUT MODAL
  // ==========================================
  function renderPaymentModal() {
    if (!payModal || !payTargetStudent) return null;
    const ledger = studentLedger(payTargetStudent, data.payments);

    return (
      <Dialog
        title={`Direct Fee Checkout · ${payTargetStudent.name}`}
        kicker="ONLINE PAYMENT GATEWAY"
        onClose={() => setPayModal(false)}
      >
        <p className="dialog-description">
          Pay institutional fees directly from the platform. Instant receipt generation with automated tri-party notifications to <strong>Parent</strong>, <strong>Student</strong>, and <strong>Teacher</strong>.
        </p>

        <div className="wizard-preview-box" style={{ marginBottom: 18 }}>
          <div className="wizard-preview-grid">
            <div className="wizard-preview-item">
              <span>Student / Class</span>
              <strong>{payTargetStudent.name} ({payTargetStudent.class})</strong>
            </div>
            <div className="wizard-preview-item">
              <span>Current Outstanding Due</span>
              <strong className="negative">{money(ledger.due)}</strong>
            </div>
            <div className="wizard-preview-item">
              <span>Primary Guardian</span>
              <strong>{payTargetStudent.guardian}</strong>
            </div>
          </div>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            processOnlinePayment(payTargetStudent, Number(payAmount), payMethod);
          }}
        >
          <label>
            Payment Amount (INR)
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                min="1"
                step="0.01"
                value={payAmount}
                onChange={e => setPayAmount(Number(e.target.value))}
                required
                style={{ flex: 1, fontSize: 16, fontWeight: 700 }}
              />
            </div>
          </label>

          {/* Quick Amount Preset Chips */}
          <div className="payment-amount-chips">
            {ledger.due > 0 && (
              <button
                type="button"
                className={`payment-amount-chip ${payAmount === ledger.due ? 'active' : ''}`}
                onClick={() => setPayAmount(ledger.due)}
              >
                Pay Full Due ({money(ledger.due)})
              </button>
            )}
            <button
              type="button"
              className={`payment-amount-chip ${payAmount === 5000 ? 'active' : ''}`}
              onClick={() => setPayAmount(5000)}
            >
              ₹5,000
            </button>
            <button
              type="button"
              className={`payment-amount-chip ${payAmount === 10000 ? 'active' : ''}`}
              onClick={() => setPayAmount(10000)}
            >
              ₹10,000
            </button>
            <button
              type="button"
              className={`payment-amount-chip ${payAmount === 25000 ? 'active' : ''}`}
              onClick={() => setPayAmount(25000)}
            >
              ₹25,000
            </button>
          </div>

          <label style={{ marginTop: 14 }}>
            Choose Payment Method
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              <option>UPI / QR Code (PhonePe, GPay, Paytm, BHIM)</option>
              <option>Debit Card / Credit Card (Visa, RuPay, Mastercard)</option>
              <option>Net Banking (HDFC, ICICI, SBI, Axis, Kotak)</option>
              <option>Instant NEFT / RTGS Institutional Clearance</option>
            </select>
          </label>

          <div className="info-strip" style={{ marginTop: 16 }}>
            <Sparkles size={16} color="#B59A65" />
            <span>
              <strong>Tri-Party Notification Engine:</strong> On confirmation, instant notifications are automatically dispatched simultaneously to Parent ({payTargetStudent.guardian}), Student ({payTargetStudent.name}), and Class Teacher coordinator.
            </span>
          </div>

          <button type="submit" className="btn-hero-pay full-width" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}>
            <CheckCircle2 size={16} /> Confirm &amp; Pay {money(payAmount)} Now
          </button>
        </form>
      </Dialog>
    );
  }

  // ==========================================
  // SHARED PAYMENT CONFIRMATION DIALOG
  // ==========================================
  function renderSuccessDialog() {
    if (!paySuccess) return null;
    const { payment, student, teacherName, parentName } = paySuccess;

    return (
      <Dialog
        title="Fee Payment Successful &amp; Dispatched"
        kicker="FEE RECEIPT GENERATED"
        onClose={() => setPaySuccess(null)}
      >
        <p className="dialog-description">
          Payment of <strong>{money(payment.amount)}</strong> for {student.name} has been processed, verified, and credited.
        </p>

        <div className="wizard-preview-box" style={{ marginBottom: 16 }}>
          <div className="wizard-preview-grid">
            <div className="wizard-preview-item">
              <span>Receipt Ref / UTR</span>
              <strong>{payment.reference}</strong>
            </div>
            <div className="wizard-preview-item">
              <span>Amount Paid</span>
              <strong className="positive">{money(payment.amount)}</strong>
            </div>
            <div className="wizard-preview-item">
              <span>Method</span>
              <strong>{payment.method.split(' ')[0]}</strong>
            </div>
          </div>
        </div>

        {/* Tri-Party Notification Dispatch Card */}
        <div className="profile-card-section" style={{ background: '#F8FAFC', marginBottom: 18, padding: 16 }}>
          <h4 style={{ fontSize: 13, marginBottom: 10, color: '#065F46' }}>
            <CheckCircle2 size={16} color="#059669" /> Tri-Party Notifications Successfully Dispatched
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="party-badge parent">Parent Alert</span>
              <span>Delivered via WhatsApp &amp; SMS to <strong>{parentName}</strong></span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="party-badge student">Student Alert</span>
              <span>Delivered to Student Self-Service Inbox for <strong>{student.name}</strong></span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="party-badge teacher">Teacher Alert</span>
              <span>Delivered to Class Coordinator <strong>{teacherName}</strong></span>
            </li>
          </ul>
        </div>

        <button
          className="btn-hero-pay full-width"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => {
            downloadFeeReceiptPDF({
              campusName: campus.name,
              student,
              payment,
            });
            setPaySuccess(null);
          }}
        >
          <Download size={15} /> Download Official Fee Receipt PDF
        </button>
      </Dialog>
    );
  }
}
