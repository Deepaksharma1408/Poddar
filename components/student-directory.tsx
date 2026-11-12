'use client';

import { useInstitution } from './institution';
import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  History,
  Info,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { money } from '@/lib/finance';
import { studentLedger, type FeeStudent, type SchoolFinance, AS_OF } from '@/lib/school-finance';
import { Dialog, Person, Status, downloadCSV } from './finance-ui';
import {
  downloadFeeReceiptPDF,
  downloadDuplicateFeeReceiptPDF,
  downloadFeeStatementPDF,
  downloadNoDuesCertificatePDF,
} from '@/lib/pdf-documents';

export type StudentProfileTab =
  | 'overview'
  | 'personal'
  | 'parents'
  | 'academic'
  | 'attendance'
  | 'fees'
  | 'payments'
  | 'documents'
  | 'notifications'
  | 'timeline';

export default function StudentDirectory({
  data,
  setData,
  openAccount,
  notify,
  search,
  setSearch,
  studentAttendance = {},
}: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  openAccount: (id: string) => void;
  notify: (s: string) => void;
  search: string;
  setSearch: (s: string) => void;
  studentAttendance?: Record<string, string>;
}) {
  const campus = useInstitution();
  const college = campus.prefix === 'PIC';
  const groups = college ? ['BCA', 'BBA', 'B.Com', 'B.Sc'] : ['VIII', 'IX', 'X', 'XI', 'XII'];

  const [filterClass, setFilterClass] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudentProfileTab>('overview');
  const [addModal, setAddModal] = useState(false);
  const [duplicateReason, setDuplicateReason] = useState('Official copy requested by parent');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // Compute student accounts
  const accounts = data.students.map(s => ({
    student: s,
    ledger: studentLedger(s, data.payments),
  }));

  const totalEnrolled = data.students.length;
  const activeStudents = totalEnrolled;
  const defaultersCount = accounts.filter(a => a.ledger.due > 0).length;
  const newAdmissions = data.students.filter(s => s.id.includes('26')).length;

  const filteredStudents = accounts.filter(({ student: s, ledger: l }) => {
    const textMatch = `${s.name} ${s.id} ${s.guardian} ${s.class} ${s.department ?? ''} ${s.batch ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const classMatch = filterClass === 'All' || s.class.startsWith(filterClass);
    const statusMatch =
      filterStatus === 'All' ||
      (filterStatus === 'Defaulters' && l.due > 0) ||
      (filterStatus === 'Paid' && l.due === 0 && l.paid > 0);
    return textMatch && classMatch && statusMatch;
  });

  const selectedAccount = accounts.find(a => a.student.id === selectedStudentId);

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ['Admission ID', 'Student Name', 'Class / Programme', 'Guardian', 'Contact', 'Plan', 'Total Fee', 'Paid', 'Due Now', 'Status'],
      ...filteredStudents.map(({ student: s, ledger: l }) => [
        s.id,
        s.name,
        s.class,
        s.guardian,
        s.profile?.phone ?? '+91-9829012345',
        s.plan.kind,
        l.total,
        l.paid,
        l.due,
        l.status,
      ]),
    ];
    downloadCSV(`poddar-${campus.prefix.toLowerCase()}-students.csv`, rows);
    notify('Student directory exported to CSV');
  };

  // If a student profile is open, render the 10-tab Profile view
  if (selectedAccount) {
    const { student: s, ledger: l } = selectedAccount;
    const studentPayments = data.payments.filter(p => p.studentId === s.id);
    const latestPayment = studentPayments[studentPayments.length - 1];

    // Attendance records for this student
    const attendanceEntries = Object.entries(studentAttendance).filter(
      ([key]) => key === s.id || key.endsWith('/' + s.id)
    );
    const presentDays = attendanceEntries.filter(([, status]) => status === 'Present').length;
    const totalMarkedDays = attendanceEntries.length || 1;
    const attendanceRate = Math.round((presentDays / totalMarkedDays) * 100);

    return (
      <div className="student-profile-view">
        <button
          className="button secondary"
          style={{ marginBottom: 18, gap: 8 }}
          onClick={() => setSelectedStudentId(null)}
        >
          <ArrowLeft size={15} /> Back to Student Directory
        </button>

        {/* Profile Hero Card */}
        <div className="student-profile-header-card">
          <div className="profile-header-main">
            <div className="profile-header-identity">
              <div className="profile-large-avatar">
                {s.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="profile-identity-text">
                <h2>{s.name}</h2>
                <div className="profile-identity-tags">
                  <span className="identity-badge active">● Active Enrolled</span>
                  <span className="identity-badge">ID: {s.id}</span>
                  <span className="identity-badge">{s.class}</span>
                  <span className="identity-badge">{s.plan.kind} Plan</span>
                </div>
              </div>
            </div>

            <div className="profile-header-actions">
              <button className="button primary" onClick={() => openAccount(s.id)}>
                <CreditCard size={15} /> Collect Fee
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  downloadFeeStatementPDF({
                    campusName: campus.name,
                    student: s,
                    ledger: l,
                  })
                }
              >
                <Download size={14} /> Fee Statement PDF
              </button>
              {latestPayment && (
                <button
                  className="button secondary"
                  onClick={() =>
                    downloadFeeReceiptPDF({
                      campusName: campus.name,
                      student: s,
                      payment: latestPayment,
                    })
                  }
                >
                  <Download size={14} /> Receipt PDF
                </button>
              )}
              {latestPayment && (
                <button
                  className="button secondary"
                  onClick={() => setShowDuplicateDialog(true)}
                >
                  <Download size={14} /> Duplicate Receipt
                </button>
              )}
              {l.remaining === 0 && (
                <button
                  className="button secondary"
                  onClick={() =>
                    downloadNoDuesCertificatePDF({
                      campusName: campus.name,
                      student: s,
                      asOf: AS_OF,
                    })
                  }
                >
                  <Download size={14} /> No-Dues Certificate
                </button>
              )}
            </div>
          </div>

          {/* 10 Navigation Tabs */}
          <nav className="profile-tabs-nav" aria-label="Student profile tabs">
            <button
              className={`profile-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              1. Overview
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              2. Personal Info
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'parents' ? 'active' : ''}`}
              onClick={() => setActiveTab('parents')}
            >
              3. Parents &amp; Guardians
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'academic' ? 'active' : ''}`}
              onClick={() => setActiveTab('academic')}
            >
              4. Academic Info
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              5. Attendance
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'fees' ? 'active' : ''}`}
              onClick={() => setActiveTab('fees')}
            >
              6. Fee Details
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              7. Payments &amp; Receipts
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              8. Documents
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              9. Notifications
            </button>
            <button
              className={`profile-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              10. Activity Timeline
            </button>
          </nav>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="profile-tab-panel">
            <div className="student-kpi-grid">
              <div className="student-kpi-card">
                <div className="student-kpi-icon"><Wallet size={20} /></div>
                <div className="student-kpi-content">
                  <div className="student-kpi-value">{money(l.total)}</div>
                  <div className="student-kpi-label">Committed Annual Fee</div>
                </div>
              </div>
              <div className="student-kpi-card">
                <div className="student-kpi-icon green"><CheckCircle2 size={20} /></div>
                <div className="student-kpi-content">
                  <div className="student-kpi-value">{money(l.paid)}</div>
                  <div className="student-kpi-label">Paid to Date</div>
                </div>
              </div>
              <div className="student-kpi-card">
                <div className="student-kpi-icon red"><ShieldAlert size={20} /></div>
                <div className="student-kpi-content">
                  <div className="student-kpi-value">{money(l.due)}</div>
                  <div className="student-kpi-label">Outstanding Due Now</div>
                </div>
              </div>
              <div className="student-kpi-card">
                <div className="student-kpi-icon gold"><CalendarCheck size={20} /></div>
                <div className="student-kpi-content">
                  <div className="student-kpi-value">{attendanceRate}%</div>
                  <div className="student-kpi-label">Attendance Rate</div>
                </div>
              </div>
            </div>

            <div className="profile-grid-2col">
              <section className="profile-card-section">
                <h4><Info size={16} /> Quick Highlights</h4>
                <dl className="profile-detail-list">
                  <div className="profile-detail-item">
                    <dt>Enrollment Status</dt>
                    <dd><span className="status-pill good">Verified &amp; Active</span></dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Class &amp; Section</dt>
                    <dd>{s.class}</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Primary Guardian</dt>
                    <dd>{s.guardian}</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Preferred Fee Mode</dt>
                    <dd>{s.plan.preferred}</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Remaining Balance</dt>
                    <dd>{money(l.remaining)}</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Verified Payments</dt>
                    <dd>{studentPayments.length} recorded</dd>
                  </div>
                </dl>
              </section>

              <section className="profile-card-section">
                <h4><History size={16} /> Recent Fee Transactions</h4>
                {studentPayments.length > 0 ? (
                  <div className="table-wrap">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>DATE</th>
                          <th>RECEIPT</th>
                          <th>AMOUNT</th>
                          <th>MODE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentPayments.slice(-3).map(p => (
                          <tr key={p.id}>
                            <td>{p.date}</td>
                            <td><strong>{p.reference || p.id}</strong></td>
                            <td className="positive">{money(p.amount)}</td>
                            <td>{p.method}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-state">No payment transactions recorded yet.</p>
                )}
              </section>
            </div>
          </div>
        )}

        {/* Tab 2: Personal Info */}
        {activeTab === 'personal' && (
          <div className="profile-tab-panel">
            <section className="profile-card-section">
              <h4><Users size={16} /> Student Personal Details</h4>
              <dl className="profile-detail-list">
                <div className="profile-detail-item">
                  <dt>Full Name</dt>
                  <dd>{s.name}</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Admission Number</dt>
                  <dd>{s.id}</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Gender</dt>
                  <dd>Student</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Date of Birth</dt>
                  <dd>{s.profile?.birthDate ?? '15 Aug 2010'}</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Blood Group</dt>
                  <dd>B+</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Nationality</dt>
                  <dd>Indian</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Category</dt>
                  <dd>General</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Aadhar / ID Number</dt>
                  <dd>XXXX-XXXX-4812</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Residential Address</dt>
                  <dd>{s.profile?.address ?? 'Sector-7, Mansarovar, Jaipur (RJ) – 302020'}</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Emergency Contact</dt>
                  <dd>{s.profile?.emergencyContact ?? '+91-9829012345'}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {/* Tab 3: Parents & Guardians */}
        {activeTab === 'parents' && (
          <div className="profile-tab-panel">
            <div className="profile-grid-2col">
              <section className="profile-card-section">
                <h4><Users size={16} /> Primary Guardian</h4>
                <dl className="profile-detail-list">
                  <div className="profile-detail-item">
                    <dt>Guardian Name</dt>
                    <dd>{s.guardian}</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Relation to Student</dt>
                    <dd>Father</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Contact Number</dt>
                    <dd><Phone size={12} style={{ marginRight: 4 }} />{s.profile?.phone ?? '+91-9829012345'}</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Email Address</dt>
                    <dd>{s.profile?.email ?? (s.guardian.toLowerCase().replace(/\s+/g, '.') + '@gmail.com')}</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Occupation</dt>
                    <dd>Business Executive</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Office Address</dt>
                    <dd>MI Road, Jaipur</dd>
                  </div>
                </dl>
              </section>

              <section className="profile-card-section">
                <h4><Users size={16} /> Secondary Guardian</h4>
                <dl className="profile-detail-list">
                  <div className="profile-detail-item">
                    <dt>Mother / Secondary Guardian</dt>
                    <dd>{s.profile?.parentNames?.split(',')[1]?.trim() ?? 'Mrs. Sunita Sharma'}</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Occupation</dt>
                    <dd>Educationist</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Alternate Contact</dt>
                    <dd>+91-9414012346</dd>
                  </div>
                  <div className="profile-detail-item">
                    <dt>Communication Preference</dt>
                    <dd>WhatsApp &amp; SMS</dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        )}

        {/* Tab 4: Academic Info */}
        {activeTab === 'academic' && (
          <div className="profile-tab-panel">
            <section className="profile-card-section">
              <h4><GraduationCap size={16} /> Academic Standing &amp; Enrollment</h4>
              <dl className="profile-detail-list">
                <div className="profile-detail-item">
                  <dt>Current Class / Programme</dt>
                  <dd>{s.class}</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Academic Session</dt>
                  <dd>2026–2027</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Roll Number</dt>
                  <dd>{s.id.slice(-3)}</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Department / Stream</dt>
                  <dd>{s.department ?? (college ? 'Computer Applications' : 'Science & Mathematics')}</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Batch Year</dt>
                  <dd>{s.batch ?? '2026'}</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Admission Date</dt>
                  <dd>01 Jul 2026</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>Medium of Instruction</dt>
                  <dd>English</dd>
                </div>
                <div className="profile-detail-item">
                  <dt>House / Section</dt>
                  <dd>Tagore House · Section A</dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {/* Tab 5: Attendance */}
        {activeTab === 'attendance' && (
          <div className="profile-tab-panel">
            <section className="profile-card-section">
              <h4><CalendarCheck size={16} /> Attendance Records</h4>
              <div className="student-kpi-grid" style={{ marginBottom: 20 }}>
                <div className="student-kpi-card">
                  <div className="student-kpi-icon green"><UserCheck size={20} /></div>
                  <div className="student-kpi-content">
                    <div className="student-kpi-value">{attendanceRate}%</div>
                    <div className="student-kpi-label">Cumulative Attendance</div>
                  </div>
                </div>
                <div className="student-kpi-card">
                  <div className="student-kpi-icon green"><CalendarCheck size={20} /></div>
                  <div className="student-kpi-content">
                    <div className="student-kpi-value">{presentDays || 22}</div>
                    <div className="student-kpi-label">Days Present</div>
                  </div>
                </div>
                <div className="student-kpi-card">
                  <div className="student-kpi-icon red"><Clock size={20} /></div>
                  <div className="student-kpi-content">
                    <div className="student-kpi-value">2</div>
                    <div className="student-kpi-label">Days Absent</div>
                  </div>
                </div>
                <div className="student-kpi-card">
                  <div className="student-kpi-icon gold"><Info size={20} /></div>
                  <div className="student-kpi-content">
                    <div className="student-kpi-value">1</div>
                    <div className="student-kpi-label">Approved Leave</div>
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>SESSION</th>
                      <th>STATUS</th>
                      <th>REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceEntries.length > 0 ? (
                      attendanceEntries.map(([key, status]) => (
                        <tr key={key}>
                          <td>{key === s.id ? AS_OF : key.split('/')[0]}</td>
                          <td>Morning Attendance Register</td>
                          <td>
                            <span className={`status-pill ${status === 'Present' ? 'good' : 'bad'}`}>
                              {status}
                            </span>
                          </td>
                          <td>Verified by Faculty Mentor</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td>{AS_OF}</td>
                        <td>Daily Register</td>
                        <td><span className="status-pill good">Present</span></td>
                        <td>Regular attendance verified</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Tab 6: Fee Details */}
        {activeTab === 'fees' && (
          <div className="profile-tab-panel">
            <section className="profile-card-section">
              <h4><Wallet size={16} /> Fee Structure &amp; Installment Schedule</h4>
              <div className="info-strip" style={{ marginBottom: 18 }}>
                <strong>Plan Type:</strong> {s.plan.kind} | <strong>Preferred Mode:</strong> {s.plan.preferred} | 
                <strong> Committed Annual Fee:</strong> {money(s.plan.fee)}
              </div>

              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>INSTALLMENT</th>
                      <th>DUE DATE</th>
                      <th>GROSS DUE</th>
                      <th>BALANCE OUTSTANDING</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.schedule.map((charge, idx) => (
                      <tr key={idx}>
                        <td><strong>{charge.label}</strong></td>
                        <td>{charge.date}</td>
                        <td>{money(charge.amount)}</td>
                        <td className={charge.outstanding > 0 ? 'negative' : 'positive'}>
                          {money(charge.outstanding)}
                        </td>
                        <td><Status>{charge.status}</Status></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Tab 7: Payments & Receipts */}
        {activeTab === 'payments' && (
          <div className="profile-tab-panel">
            <section className="profile-card-section">
              <h4><CreditCard size={16} /> Payment Ledger &amp; Digital Receipts</h4>
              {studentPayments.length > 0 ? (
                <div className="table-wrap">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>RECEIPT NO</th>
                        <th>DATE</th>
                        <th>AMOUNT</th>
                        <th>PAYMENT METHOD</th>
                        <th>REFERENCE / UTR</th>
                        <th>VERIFIED</th>
                        <th>DIRECT ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPayments.map(p => (
                        <tr key={p.id}>
                          <td><strong>{p.reference || p.id}</strong></td>
                          <td>{p.date}</td>
                          <td className="positive">{money(p.amount)}</td>
                          <td><span className="method">{p.method}</span></td>
                          <td>{p.reference ?? 'UTR-ICICI-89124'}</td>
                          <td>
                            <span className={`status-pill ${p.verified ? 'good' : 'neutral'}`}>
                              {p.verified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="button secondary small"
                              onClick={() =>
                                downloadFeeReceiptPDF({
                                  campusName: campus.name,
                                  student: s,
                                  payment: p,
                                })
                              }
                            >
                              <Download size={12} /> Receipt PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-state">No payment transactions found for this student account.</p>
              )}
            </section>
          </div>
        )}

        {/* Tab 8: Documents */}
        {activeTab === 'documents' && (
          <div className="profile-tab-panel">
            <section className="profile-card-section">
              <h4><FileText size={16} /> Institutional Documents &amp; Certificates</h4>
              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>DOCUMENT NAME</th>
                      <th>TYPE</th>
                      <th>UPLOADED ON</th>
                      <th>VERIFICATION</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Admission Application Form', 'Enrollment Record', '01 Jul 2026', 'Verified'],
                      ['Birth Certificate / Secondary Certificate', 'Age Verification', '01 Jul 2026', 'Verified'],
                      ['Previous Academic Marksheet', 'Academic Record', '02 Jul 2026', 'Verified'],
                      ['Transfer / Migration Certificate', 'Institution Transfer', '05 Jul 2026', 'Verified'],
                      ['Student Aadhar Card', 'National Identity', '01 Jul 2026', 'Verified'],
                    ].map(([docName, docType, date, verStatus], i) => (
                      <tr key={i}>
                        <td><strong>{docName}</strong></td>
                        <td>{docType}</td>
                        <td>{date}</td>
                        <td><span className="status-pill good">{verStatus}</span></td>
                        <td>
                          <button
                            className="button secondary small"
                            onClick={() => notify(`Viewing digital copy: ${docName}`)}
                          >
                            <FileCheck2 size={12} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Tab 9: Notifications */}
        {activeTab === 'notifications' && (
          <div className="profile-tab-panel">
            <section className="profile-card-section">
              <h4><Bell size={16} /> Communication &amp; Reminder History</h4>
              <div className="announcements-feed">
                <div className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-target-badge">Fee Reminder</span>
                    <span className="announcement-date">02 Nov 2026</span>
                  </div>
                  <h3>Installment Due Reminder Dispatched</h3>
                  <p>SMS and WhatsApp notification sent to {s.guardian} for pending balance of {money(l.due)}.</p>
                </div>
                <div className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-target-badge">Receipt Alert</span>
                    <span className="announcement-date">15 Oct 2026</span>
                  </div>
                  <h3>Fee Payment Receipt Generated</h3>
                  <p>Confirmation message with receipt reference delivered to registered guardian contact.</p>
                </div>
                <div className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-target-badge">Attendance Alert</span>
                    <span className="announcement-date">01 Oct 2026</span>
                  </div>
                  <h3>Monthly Attendance Report</h3>
                  <p>Student attendance for September verified at {attendanceRate}%.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Tab 10: Activity Timeline */}
        {activeTab === 'timeline' && (
          <div className="profile-tab-panel">
            <section className="profile-card-section">
              <h4><History size={16} /> Chronological Audit Timeline</h4>
              <div className="announcements-feed">
                <div className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-date">04 Nov 2026 · 10:30 AM</span>
                  </div>
                  <h3>Student Ledger Accessed</h3>
                  <p>Authorized administrator reviewed account balance and installment schedule.</p>
                </div>
                <div className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-date">15 Oct 2026 · 02:15 PM</span>
                  </div>
                  <h3>Fee Payment Verification</h3>
                  <p>Bank NEFT reference reconciled and verified against institution bank statement.</p>
                </div>
                <div className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-date">01 Jul 2026 · 09:00 AM</span>
                  </div>
                  <h3>Official Admission Completed</h3>
                  <p>Student enrolled in {s.class}. Initial fee account opened with {s.plan.kind} plan.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Modal for Duplicate Receipt Download */}
        {showDuplicateDialog && latestPayment && (
          <Dialog
            title="Download Duplicate Fee Receipt"
            kicker="RECEIPT RE-ISSUE"
            onClose={() => setShowDuplicateDialog(false)}
          >
            <p className="dialog-description">
              Re-issue an official duplicate receipt with timestamp and duplicate watermark.
            </p>
            <label>
              Reason for Duplicate Request
              <input
                value={duplicateReason}
                onChange={e => setDuplicateReason(e.target.value)}
                placeholder="e.g. Lost original / Employer reimbursement"
                required
              />
            </label>
            <button
              className="button primary full-width"
              onClick={() => {
                downloadDuplicateFeeReceiptPDF({
                  campusName: campus.name,
                  student: s,
                  payment: latestPayment,
                });
                setShowDuplicateDialog(false);
                notify('Duplicate fee receipt generated');
              }}
            >
              <Download size={15} /> Generate Duplicate Receipt PDF
            </button>
          </Dialog>
        )}
      </div>
    );
  }

  // DEFAULT VIEW: Directory Table with KPI Summary Cards
  return (
    <>
      <div className="workspace-intro">
        <div>
          <span className="editorial-kicker">OUR COMMUNITY / STUDENT DIRECTORY</span>
          <h2>Every student.<br /><em>A story worth knowing.</em></h2>
          <p>Unified directory, academic profiles, guardians, and fee ledgers in one seamless workspace.</p>
        </div>
        <div className="intro-actions">
          <button className="button primary" onClick={() => setAddModal(true)}>
            <Plus size={15} /> Admit a student
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="student-kpi-grid">
        <div className="student-kpi-card">
          <div className="student-kpi-icon"><Users size={22} /></div>
          <div className="student-kpi-content">
            <div className="student-kpi-value">{totalEnrolled}</div>
            <div className="student-kpi-label">Total Enrolled</div>
          </div>
        </div>
        <div className="student-kpi-card">
          <div className="student-kpi-icon green"><UserCheck size={22} /></div>
          <div className="student-kpi-content">
            <div className="student-kpi-value">{activeStudents}</div>
            <div className="student-kpi-label">Active Students</div>
          </div>
        </div>
        <div className="student-kpi-card">
          <div className="student-kpi-icon red"><ShieldAlert size={22} /></div>
          <div className="student-kpi-content">
            <div className="student-kpi-value">{defaultersCount}</div>
            <div className="student-kpi-label">Fee Overdue / Defaulters</div>
          </div>
        </div>
        <div className="student-kpi-card">
          <div className="student-kpi-icon gold"><GraduationCap size={22} /></div>
          <div className="student-kpi-content">
            <div className="student-kpi-value">{newAdmissions}</div>
            <div className="student-kpi-label">New Cohort (2026–27)</div>
          </div>
        </div>
      </div>

      {/* Directory Card */}
      <section className="card">
        <div className="premium-card-heading">
          <div>
            <h3>Student Directory <span className="count-chip">{filteredStudents.length} records</span></h3>
            <p>Click on any student row to view their complete 10-tab academic, fee, and attendance profile.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="button secondary" onClick={handleExportCSV}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Search and Filters Toolbar */}
        <div className="premium-list-toolbar">
          <label className="input-search">
            <Search size={16} />
            <input
              aria-label="Search student directory"
              placeholder="Search by student name, guardian, or admission ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="filter-select">
              <select
                aria-label="Filter student class"
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
              >
                <option value="All">All {college ? 'programmes' : 'classes'}</option>
                {groups.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="filter-select">
              <select
                aria-label="Filter status"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="All">All fee statuses</option>
                <option value="Paid">Paid in Full</option>
                <option value="Defaulters">Overdue / Defaulters</option>
              </select>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="table-wrap">
          <table role="table" className="premium-table">
            <thead>
              <tr>
                <th>STUDENT</th>
                <th>{campus.groupLabel.toUpperCase()}</th>
                <th>GUARDIAN &amp; CONTACT</th>
                <th>PLAN / METHOD</th>
                <th>DUE NOW</th>
                <th>FEE STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(({ student: s, ledger: l }) => (
                <tr
                  key={s.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedStudentId(s.id)}
                >
                  <td>
                    <Person name={s.name} color={s.color} sub={s.id} />
                  </td>
                  <td>
                    <strong>{s.class}</strong>
                    {s.department && (
                      <small className="block">
                        {s.department} · Batch {s.batch}
                      </small>
                    )}
                  </td>
                  <td>
                    <div><strong>{s.guardian}</strong></div>
                    <small className="block" style={{ color: '#718096' }}>
                      <Phone size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {s.profile?.phone ?? '+91-9829012345'}
                    </small>
                  </td>
                  <td>
                    <span className="plan-tag emi">{s.plan.kind}</span>
                    <small className="block">{s.plan.preferred}</small>
                  </td>
                  <td className={l.due > 0 ? 'negative' : 'positive'}>
                    <strong>{money(l.due)}</strong>
                  </td>
                  <td>
                    <Status>{l.status}</Status>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button
                        className="button secondary small"
                        onClick={() => setSelectedStudentId(s.id)}
                      >
                        Profile
                      </button>
                      <button
                        className="button primary small"
                        onClick={() => openAccount(s.id)}
                      >
                        Ledger
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredStudents.length && (
            <p className="empty-state">No student records match the selected filters.</p>
          )}
        </div>
      </section>

      {/* Add Student Modal */}
      {addModal && (
        <Dialog
          title="Admit a New Student"
          kicker="STUDENT ADMISSION"
          onClose={() => setAddModal(false)}
        >
          <p className="dialog-description">
            Register a new student and establish their initial institutional fee account.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const next = Math.max(0, ...data.students.map(s => Number(s.id.slice(5)))) + 1;
              const s: FeeStudent = {
                id: `${campus.prefix}26${String(next).padStart(3, '0')}`,
                name: String(f.get('name')).trim(),
                guardian: String(f.get('guardian')).trim(),
                class: college
                  ? `${f.get('class')} · Semester ${f.get('semester')}`
                  : String(f.get('class')),
                ...(college
                  ? {
                      department: String(f.get('department')).trim(),
                      batch: String(f.get('batch')),
                      specialization: String(f.get('specialization')).trim(),
                    }
                  : {}),
                color: 'blue',
                plan: {
                  kind: 'Full payment',
                  fee: Number(f.get('fee')),
                  down: 0,
                  months: 10,
                  rate: 0,
                  interest: 'Reducing balance',
                  start: AS_OF,
                  preferred: 'NEFT',
                },
                profile: {
                  phone: String(f.get('phone') || '+91-9829012345'),
                },
              };
              setData(d => ({ ...d, students: [...d.students, s] }));
              setAddModal(false);
              notify('Student admitted · Fee account created');
            }}
          >
            <label>
              Student Full Name
              <input name="name" required maxLength={80} placeholder="e.g. Rohan Verma" />
            </label>
            <label>
              Guardian Full Name
              <input name="guardian" required maxLength={80} placeholder="e.g. Rajesh Verma" />
            </label>
            <label>
              Guardian Contact Number
              <input name="phone" maxLength={20} defaultValue="+91-9829012345" />
            </label>
            <div className="form-row">
              <label>
                {college ? 'Programme' : 'Class & Section'}
                <select name="class">
                  {(college
                    ? groups
                    : ['VIII · A', 'IX · B', 'X · A', 'X · B', 'XI · A', 'XII · A']
                  ).map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Annual Fee (INR)
                <input
                  name="fee"
                  type="number"
                  min="1"
                  max="1000000"
                  step="0.01"
                  defaultValue={60000}
                  required
                />
              </label>
            </div>
            {college && (
              <>
                <div className="form-row">
                  <label>
                    Department
                    <input name="department" defaultValue="Computer Applications" required maxLength={80} />
                  </label>
                  <label>
                    Specialization
                    <input name="specialization" defaultValue="Cloud Computing" maxLength={80} />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Batch Year
                    <input name="batch" type="number" min="2000" max="2100" defaultValue="2026" required />
                  </label>
                  <label>
                    Semester
                    <input name="semester" type="number" min="1" max="12" defaultValue="1" required />
                  </label>
                </div>
              </>
            )}
            <div className="small-note">
              An initial full-payment fee plan is created automatically. You can configure installments, EMI, or scholarships in the student profile.
            </div>
            <button type="submit" className="button primary full-width">
              Complete Admission &amp; Open Fee Account <ArrowRight size={15} />
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
