'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { RecordProfile, SchoolFinance, Staff, FeeStudent, Leave } from '@/lib/school-finance';
import { AS_OF, round, salaryBreakdown, studentLedger } from '@/lib/school-finance';
import { categoryBalance, defaultEvaluationCriteria, defaultLeaveRules, loanOutstanding, type PerformanceReview } from '@/lib/hr';
import { Currency, Dialog, Person, Status } from './finance-ui';
import { useInstitution } from './institution';
import {
  downloadPayslipPDF,
  downloadSalaryStatementPDF,
  downloadLeaveReportPDF,
  downloadAttendanceReportPDF,
  downloadPerformanceReviewPDF,
  downloadFeeStatementPDF,
  downloadNoDuesCertificatePDF,
} from '@/lib/pdf-documents';
import {
  Download,
  CalendarCheck,
  Award,
  FileText,
  DollarSign,
  Clock,
  Briefcase,
  User,
  Shield,
  Plus,
  Star,
  CheckCircle2,
} from 'lucide-react';

export type EmployeeTab =
  | 'personal'
  | 'employment'
  | 'department'
  | 'attendance'
  | 'leave_balance'
  | 'leave_applications'
  | 'paid_leave'
  | 'unpaid_leave'
  | 'salary_structure'
  | 'salary_revisions'
  | 'monthly_payroll'
  | 'payslips'
  | 'payment_history'
  | 'loans_advances'
  | 'documents'
  | 'performance'
  | 'activity_timeline';

export type StudentTab = 'personal' | 'academic' | 'fee_schedule' | 'payment_history' | 'documents';

export default function RecordProfiles({
  data,
  setData,
  employee,
  showBank,
}: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  employee: boolean;
  showBank: boolean;
}) {
  const campus = useInstitution();
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState('');
  const [page, setPage] = useState(0);
  const [empTab, setEmpTab] = useState<EmployeeTab>('personal');
  const [stuTab, setStuTab] = useState<StudentTab>('personal');
  const [toastMessage, setToastMessage] = useState('');
  const [newReviewDialog, setNewReviewDialog] = useState(false);
  const [newLoanDialog, setNewLoanDialog] = useState(false);
  const [newRevisionDialog, setNewRevisionDialog] = useState(false);

  const records = employee ? data.staff : data.students;
  const filtered = records
    .filter(item => (item.name + ' ' + item.id).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const record = records.find(item => item.id === selection);
  const staffMember = employee ? (record as Staff | undefined) : undefined;
  const studentMember = !employee ? (record as FeeStudent | undefined) : undefined;
  const profile: RecordProfile = record?.profile ?? {};

  function notify(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }

  function updateStaffProfile(updater: (prevStaff: Staff) => Staff, logNote?: string) {
    if (!staffMember) return;
    setData(current => ({
      ...current,
      staff: current.staff.map(s => {
        if (s.id !== staffMember.id) return s;
        const updated = updater(s);
        if (logNote) {
          const hist = updated.profile?.history ?? [];
          updated.profile = {
            ...updated.profile,
            history: [...hist, { date: new Date().toISOString(), note: logNote }],
          };
        }
        return updated;
      }),
    }));
    notify('Profile updated successfully.');
  }

  // Employee-specific calculated data
  const empLeaves = staffMember ? data.leaves.filter(l => l.staffId === staffMember.id) : [];
  const empApprovedPaidLeaves = empLeaves.filter(l => l.kind === 'Paid' && l.status === 'Approved');
  const empApprovedUnpaidLeaves = empLeaves.filter(l => (l.kind === 'Unpaid' && l.status === 'Approved') || l.kind === 'Unpaid');
  const empPayroll = staffMember ? (data.payroll ?? []).filter(p => p.employeeId === staffMember.id) : [];
  const empPayments = staffMember
    ? [
        ...data.salaryPayments.filter(p => p.staffId === staffMember.id),
        ...empPayroll.filter(p => p.status === 'Paid').map(p => ({
          staffId: p.employeeId,
          amount: p.calculation.net,
          reference: p.reference ?? 'NEFT-' + p.period,
          method: p.mode ?? 'NEFT',
          date: p.history.find(h => h.event.includes('paid'))?.at.slice(0, 10) ?? AS_OF,
        })),
      ]
    : [];
  const empLoans = staffMember ? (data.employeeLoans ?? []).filter(l => l.employeeId === staffMember.id) : [];
  const empRevisions = staffMember ? (data.salaryRevisions ?? []).filter(r => r.employeeId === staffMember.id) : [];
  const empReviews = staffMember ? (data.performanceReviews ?? []).filter(r => r.employeeId === staffMember.id) : [];
  const empAttendance = staffMember ? (data.employeeAttendance ?? []).filter(a => a.employeeId === staffMember.id) : [];

  const attPresent = empAttendance.filter(a => a.status === 'Present' || a.status === 'Work from home').length;
  const attAbsent = empAttendance.filter(a => a.status === 'Absent').length;
  const attHalfDay = empAttendance.filter(a => a.status === 'Half-day').length;

  return (
    <section className="card">
      <div className="premium-card-heading">
        <div>
          <h3>{employee ? 'Employee' : 'Student'} profiles &amp; records</h3>
          <p>
            {employee
              ? 'Complete multi-tab personnel hub: personal, employment, salary, leaves, attendance, loans, documents and performance.'
              : 'Detailed student profiles, enrollment, fee records and academic credentials.'}
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="info-strip positive" style={{ marginBottom: 12 }}>
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="premium-list-toolbar">
        <label className="input-search">
          <input
            aria-label="Search profiles"
            value={query}
            placeholder="Search by name or ID..."
            onChange={event => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <button className="button secondary" disabled={!page} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 10))}
        </span>
        <button
          className="button secondary"
          disabled={(page + 1) * 10 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>

      <div className="table-wrap mobile-scroll-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>{employee ? 'Department' : 'Class / Batch'}</th>
              <th>{employee ? 'Designation' : 'Guardian'}</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 10, page * 10 + 10).map(item => (
              <tr key={item.id}>
                <td>
                  <Person name={item.name} sub={item.id} />
                </td>
                <td>{'class' in item ? item.class : item.subject}</td>
                <td>{'class' in item ? item.guardian : item.designation ?? 'Faculty'}</td>
                <td>
                  <Status>{item.profile?.status ?? 'Active'}</Status>
                </td>
                <td>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSelection(item.id);
                      setEmpTab('personal');
                      setStuTab('personal');
                    }}
                  >
                    Open profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filtered.length && <p className="empty-state">No matching profiles found.</p>}

      {/* EMPLOYEE FULL PROFILE DIALOG */}
      {staffMember && (
        <Dialog
          title={`${staffMember.name} · ${staffMember.id}`}
          kicker={`${campus.name.toUpperCase()} / EMPLOYEE PROFILE`}
          wide
          onClose={() => setSelection('')}
        >
          <div className="profile-topline" style={{ marginBottom: 16 }}>
            <Person
              name={staffMember.name}
              color={staffMember.color}
              sub={`${staffMember.id} · ${staffMember.subject} · ${staffMember.designation ?? 'Faculty'}`}
            />
            <div className="heading-actions">
              <span className="badge success">
                <i />
                {staffMember.profile?.status ?? 'Active'}
              </span>
            </div>
          </div>

          {/* 17 Employee Profile Tabs */}
          <div className="segmented" style={{ flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
            {[
              { id: 'personal', label: 'Personal Info' },
              { id: 'employment', label: 'Employment' },
              { id: 'department', label: 'Dept & Designation' },
              { id: 'attendance', label: 'Attendance History' },
              { id: 'leave_balance', label: 'Leave Balance' },
              { id: 'leave_applications', label: 'Leave Applications' },
              { id: 'paid_leave', label: 'Paid Leave' },
              { id: 'unpaid_leave', label: 'Unpaid Leave' },
              { id: 'salary_structure', label: 'Salary Structure' },
              { id: 'salary_revisions', label: 'Salary Revisions' },
              { id: 'monthly_payroll', label: 'Monthly Payroll' },
              { id: 'payslips', label: 'Payslips' },
              { id: 'payment_history', label: 'NEFT & Payments' },
              { id: 'loans_advances', label: 'Loans & Advances' },
              { id: 'documents', label: 'Documents' },
              { id: 'performance', label: 'Performance History' },
              { id: 'activity_timeline', label: 'Activity Timeline' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={empTab === tab.id ? 'selected' : ''}
                onClick={() => setEmpTab(tab.id as EmployeeTab)}
                style={{ fontSize: 11.5, padding: '5px 9px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: PERSONAL INFORMATION */}
          {empTab === 'personal' && (
            <form
              onSubmit={e => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                updateStaffProfile(
                  s => ({
                    ...s,
                    name: String(form.get('name')).trim() || s.name,
                    profile: {
                      ...s.profile,
                      email: String(form.get('email')).trim(),
                      phone: String(form.get('phone')).trim(),
                      address: String(form.get('address')).trim(),
                      birthDate: String(form.get('birthDate')).trim(),
                      emergencyContact: String(form.get('emergencyContact')).trim(),
                      parentNames: String(form.get('parentNames')).trim(),
                    },
                  }),
                  'Updated personal information'
                );
              }}
            >
              <h3>Personal Information</h3>
              <div className="form-row">
                <label>
                  Full Name
                  <input name="name" defaultValue={staffMember.name} required />
                </label>
                <label>
                  Date of Birth
                  <input name="birthDate" type="date" defaultValue={profile.birthDate ?? '1990-01-01'} />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Email Address
                  <input name="email" type="email" defaultValue={profile.email} placeholder="faculty@poddar.org" />
                </label>
                <label>
                  Phone Number
                  <input name="phone" type="tel" defaultValue={profile.phone} placeholder="+91-98290XXXXX" />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Emergency Contact
                  <input name="emergencyContact" defaultValue={profile.emergencyContact} placeholder="Name & Phone" />
                </label>
                <label>
                  Parents / Spouse / Guardian
                  <input name="parentNames" defaultValue={profile.parentNames} />
                </label>
              </div>
              <label>
                Permanent Residential Address
                <input name="address" defaultValue={profile.address} placeholder="Street, Locality, Jaipur, Rajasthan" />
              </label>
              <button className="button primary" type="submit">
                Save Personal Info
              </button>
            </form>
          )}

          {/* TAB 2: EMPLOYMENT INFORMATION */}
          {empTab === 'employment' && (
            <form
              onSubmit={e => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                updateStaffProfile(
                  s => ({
                    ...s,
                    employment: String(form.get('employment')),
                    profile: {
                      ...s.profile,
                      joiningDate: String(form.get('joiningDate')),
                      qualification: String(form.get('qualification')),
                      specialization: String(form.get('specialization')),
                      status: String(form.get('status')),
                    },
                  }),
                  'Updated employment records'
                );
              }}
            >
              <h3>Employment Information</h3>
              <div className="form-row">
                <label>
                  Employee ID
                  <input value={staffMember.id} disabled readOnly />
                </label>
                <label>
                  Joining Date
                  <input name="joiningDate" type="date" defaultValue={profile.joiningDate ?? '2021-07-01'} required />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Employment Type
                  <select name="employment" defaultValue={staffMember.employment ?? 'Permanent'}>
                    <option>Permanent</option>
                    <option>Probation</option>
                    <option>Contractual</option>
                    <option>Visiting Faculty</option>
                  </select>
                </label>
                <label>
                  Employment Status
                  <select name="status" defaultValue={profile.status ?? 'Active'}>
                    <option>Active</option>
                    <option>On Leave</option>
                    <option>Suspended</option>
                    <option>Separated</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Highest Qualification
                  <input name="qualification" defaultValue={profile.qualification} placeholder="e.g. M.Sc., Ph.D., B.Ed." />
                </label>
                <label>
                  Academic Specialization
                  <input name="specialization" defaultValue={profile.specialization} placeholder="e.g. Pure Mathematics" />
                </label>
              </div>
              <button className="button primary" type="submit">
                Save Employment Details
              </button>
            </form>
          )}

          {/* TAB 3: DEPARTMENT & DESIGNATION */}
          {empTab === 'department' && (
            <form
              onSubmit={e => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                updateStaffProfile(
                  s => ({
                    ...s,
                    subject: String(form.get('subject')).trim() || s.subject,
                    designation: String(form.get('designation')).trim() || s.designation,
                    profile: {
                      ...s.profile,
                      assignedSubjects: String(form.get('assignedSubjects')).trim(),
                      assignedGroups: String(form.get('assignedGroups')).trim(),
                    },
                  }),
                  'Updated department and designation'
                );
              }}
            >
              <h3>Department &amp; Designation</h3>
              <div className="form-row">
                <label>
                  Department / Subject Group
                  <input name="subject" defaultValue={staffMember.subject} required />
                </label>
                <label>
                  Official Designation
                  <input name="designation" defaultValue={staffMember.designation ?? 'Faculty'} required />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Assigned Teaching Subjects
                  <input
                    name="assignedSubjects"
                    defaultValue={profile.assignedSubjects ?? staffMember.subject}
                    placeholder="e.g. Class IX & X Mathematics"
                  />
                </label>
                <label>
                  Assigned Classes / Batches
                  <input
                    name="assignedGroups"
                    defaultValue={profile.assignedGroups ?? 'Class X-A, IX-B'}
                    placeholder="e.g. Section A, Section B"
                  />
                </label>
              </div>
              {showBank && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-sunken)', borderRadius: 8 }}>
                  <h4>Disbursement Bank Account</h4>
                  <div className="form-row">
                    <label>
                      Bank Name
                      <input name="bank" defaultValue={profile.bank ?? 'State Bank of India'} />
                    </label>
                    <label>
                      Account Holder
                      <input name="holder" defaultValue={profile.holder ?? staffMember.name} />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      Account Last 4 Digits
                      <input name="accountLastFour" maxLength={4} defaultValue={profile.accountLastFour ?? '4102'} />
                    </label>
                    <label>
                      IFSC Code
                      <input name="ifsc" defaultValue={profile.ifsc ?? 'SBIN0004123'} />
                    </label>
                  </div>
                </div>
              )}
              <button className="button primary" style={{ marginTop: 12 }} type="submit">
                Save Department &amp; Designation
              </button>
            </form>
          )}

          {/* TAB 4: ATTENDANCE HISTORY */}
          {empTab === 'attendance' && (
            <div>
              <div className="premium-card-heading">
                <div>
                  <h3>Attendance History &amp; Analytics</h3>
                  <p>Daily register records, punctuality marks and attendance summaries.</p>
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    downloadAttendanceReportPDF({
                      campusName: campus.name,
                      title: `Employee Attendance Register - ${staffMember.name}`,
                      date: AS_OF,
                      records: empAttendance.map(a => ({
                        id: staffMember.id,
                        name: staffMember.name,
                        group: staffMember.subject,
                        status: a.status,
                      })),
                    })
                  }
                >
                  <Download size={14} />
                  Download Attendance PDF
                </button>
              </div>
              <div className="premium-metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
                <div className="premium-metric">
                  <span>Present Days</span>
                  <strong>{attPresent}</strong>
                  <small>Recorded present</small>
                </div>
                <div className="premium-metric red">
                  <span>Absent Days</span>
                  <strong>{attAbsent}</strong>
                  <small>Unapproved absences</small>
                </div>
                <div className="premium-metric gold">
                  <span>Half Days</span>
                  <strong>{attHalfDay}</strong>
                  <small>0.5 day credits</small>
                </div>
                <div className="premium-metric green">
                  <span>Attendance Rate</span>
                  <strong>
                    {empAttendance.length
                      ? `${(((attPresent + attHalfDay * 0.5) / empAttendance.length) * 100).toFixed(0)}%`
                      : '100%'}
                  </strong>
                  <small>Based on logs</small>
                </div>
              </div>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status Mark</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empAttendance.map((a, i) => (
                      <tr key={i}>
                        <td>{a.date}</td>
                        <td>
                          <Status>{a.status}</Status>
                        </td>
                        <td>
                          <button
                            className="button secondary small"
                            onClick={() => {
                              const nextStatus =
                                a.status === 'Present' ? 'Absent' : a.status === 'Absent' ? 'Half-day' : 'Present';
                              setData(d => ({
                                ...d,
                                employeeAttendance: (d.employeeAttendance ?? []).map(row =>
                                  row.employeeId === staffMember.id && row.date === a.date
                                    ? { ...row, status: nextStatus }
                                    : row
                                ),
                              }));
                            }}
                          >
                            Toggle Mark
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!empAttendance.length && (
                      <tr>
                        <td colSpan={3} className="empty-state">
                          No daily attendance exceptions recorded for {staffMember.name} (marked Present by default).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: LEAVE BALANCE */}
          {empTab === 'leave_balance' && (
            <div>
              <div className="premium-card-heading">
                <div>
                  <h3>Annual Leave Entitlements &amp; Balance</h3>
                  <p>Category-wise annual quotas, utilized days, encashed days, and available leaves.</p>
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    downloadLeaveReportPDF({
                      campusName: campus.name,
                      leaves: empLeaves,
                      staff: [staffMember],
                      period: AS_OF.slice(0, 7),
                    })
                  }
                >
                  <Download size={14} />
                  Download Leave Report PDF
                </button>
              </div>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Leave Category</th>
                      <th>Treatment</th>
                      <th>Annual Quota</th>
                      <th>Carry Limit</th>
                      <th>Available Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.leaveRules ?? defaultLeaveRules).map(rule => {
                      const balance = categoryBalance(data, staffMember.id, rule.name, AS_OF);
                      return (
                        <tr key={rule.name}>
                          <td>
                            <strong>{rule.name}</strong>
                          </td>
                          <td>
                            <Status>{rule.paid ? 'Paid' : 'Unpaid'}</Status>
                          </td>
                          <td>{rule.annual} days / year</td>
                          <td>{rule.carryLimit} days</td>
                          <td className="positive">
                            <strong>{balance} days available</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: LEAVE APPLICATIONS */}
          {empTab === 'leave_applications' && (
            <div>
              <div className="premium-card-heading">
                <div>
                  <h3>Leave Applications</h3>
                  <p>All pending and historical leave requests with review remarks.</p>
                </div>
              </div>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>From Date</th>
                      <th>Category</th>
                      <th>Duration</th>
                      <th>Treatment</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Review Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empLeaves.map(l => (
                      <tr key={l.id}>
                        <td>{l.from}</td>
                        <td>{l.category}</td>
                        <td>
                          {l.chargedDays ?? l.days} day{l.days === 1 ? '' : 's'}
                        </td>
                        <td>
                          <span className={`plan-tag ${l.kind === 'Paid' ? 'paid-leave' : 'unpaid-leave'}`}>
                            {l.kind}
                          </span>
                        </td>
                        <td>{l.reason}</td>
                        <td>
                          <Status>{l.status}</Status>
                        </td>
                        <td>{l.approvalRemarks ?? '—'}</td>
                      </tr>
                    ))}
                    {!empLeaves.length && (
                      <tr>
                        <td colSpan={7} className="empty-state">
                          No leave applications on file.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: PAID LEAVE HISTORY */}
          {empTab === 'paid_leave' && (
            <div>
              <h3>Approved Paid Leave History</h3>
              <p>Leaves protected with full or partial salary coverage.</p>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Charged Days</th>
                      <th>Salary Protection</th>
                      <th>Approval Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empApprovedPaidLeaves.map(l => (
                      <tr key={l.id}>
                        <td>{l.from}</td>
                        <td>{l.category}</td>
                        <td>{l.chargedDays ?? l.days} days</td>
                        <td className="positive">
                          <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                          100% Protected (No salary deduction)
                        </td>
                        <td>{l.reviewedAt ? `Approved on ${l.reviewedAt.slice(0, 10)}` : 'Approved by HR'}</td>
                      </tr>
                    ))}
                    {!empApprovedPaidLeaves.length && (
                      <tr>
                        <td colSpan={5} className="empty-state">
                          No approved paid leave records.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: UNPAID LEAVE HISTORY */}
          {empTab === 'unpaid_leave' && (
            <div>
              <h3>Unpaid Leave &amp; Deduction Records</h3>
              <p>Approved unpaid days and entitlement overflow conversions.</p>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Duration</th>
                      <th>Daily Rate</th>
                      <th>Salary Deduction</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empApprovedUnpaidLeaves.map(l => {
                      const daily = round(staffMember.salary / data.policy.divisor);
                      const deduction = round(daily * (l.chargedDays ?? l.days));
                      return (
                        <tr key={l.id}>
                          <td>{l.from}</td>
                          <td>{l.category}</td>
                          <td>{l.chargedDays ?? l.days} days</td>
                          <td>
                            <Currency value={daily} />
                          </td>
                          <td className="negative">
                            −<Currency value={deduction} />
                          </td>
                          <td>{l.reason}</td>
                        </tr>
                      );
                    })}
                    {!empApprovedUnpaidLeaves.length && (
                      <tr>
                        <td colSpan={6} className="empty-state">
                          No unpaid leave deductions on record.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: SALARY STRUCTURE */}
          {empTab === 'salary_structure' && (
            <div>
              <h3>Current Salary Structure &amp; Compensation Terms</h3>
              <div className="calculation-lines" style={{ maxWidth: 520, margin: '16px 0' }}>
                <div>
                  <span>Monthly Base CTC Salary</span>
                  <strong>
                    <Currency value={staffMember.salary} />
                  </strong>
                </div>
                <div className="calculation-sub">
                  <span>
                    Salary Divisor Mode: {data.policy.divisorMode ?? 'Fixed'} ({data.policy.divisor} days)
                  </span>
                  <strong>
                    <Currency value={round(staffMember.salary / data.policy.divisor)} /> / day
                  </strong>
                </div>
                <div>
                  <span>Annual Paid Leave Allowance</span>
                  <strong>{staffMember.allowance} days / year</strong>
                </div>
                <div>
                  <span>Paid Leave Salary Coverage Policy</span>
                  <strong>{data.policy.paidCoverage}% protected</strong>
                </div>
                <div className="calculation-total">
                  <span>Annual Base Commitment</span>
                  <strong>
                    <Currency value={staffMember.salary * 12} />
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: SALARY REVISION HISTORY */}
          {empTab === 'salary_revisions' && (
            <div>
              <div className="premium-card-heading">
                <div>
                  <h3>Salary Revision History</h3>
                  <p>Increment, promotion and compensation adjustment track.</p>
                </div>
                <button className="button primary small" onClick={() => setNewRevisionDialog(true)}>
                  <Plus size={14} /> Propose Revision
                </button>
              </div>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Effective Period</th>
                      <th>Basic Salary</th>
                      <th>Allowances</th>
                      <th>Bonus</th>
                      <th>Deductions</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empRevisions.map(r => (
                      <tr key={r.id}>
                        <td>{r.period}</td>
                        <td>
                          <Currency value={r.basic} />
                        </td>
                        <td>
                          <Currency value={r.allowances} />
                        </td>
                        <td>
                          <Currency value={r.bonus} />
                        </td>
                        <td>
                          <Currency value={r.otherDeductions} />
                        </td>
                        <td>{r.reason}</td>
                        <td>
                          <Status>{r.approved ? 'Approved' : 'Pending Approval'}</Status>
                        </td>
                      </tr>
                    ))}
                    {!empRevisions.length && (
                      <tr>
                        <td colSpan={7} className="empty-state">
                          No revisions on record. Operating under initial base terms.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 11: MONTHLY PAYROLL */}
          {empTab === 'monthly_payroll' && (
            <div>
              <h3>Monthly Payroll Calculations</h3>
              <p>Generated payroll runs with gross, deductions, and net payable breakdown.</p>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Gross</th>
                      <th>Paid / Unpaid Days</th>
                      <th>Deductions</th>
                      <th>Net Payable</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empPayroll.map(p => (
                      <tr key={p.id}>
                        <td>{p.period}</td>
                        <td>
                          <Currency value={p.gross} />
                        </td>
                        <td>
                          {p.calculation.paidDays}d / {p.calculation.unpaidDays}d
                        </td>
                        <td className="negative">
                          −<Currency value={p.calculation.deduction} />
                        </td>
                        <td>
                          <strong>
                            <Currency value={p.calculation.net} />
                          </strong>
                        </td>
                        <td>
                          <Status>{p.status}</Status>
                        </td>
                      </tr>
                    ))}
                    {!empPayroll.length && (
                      <tr>
                        <td colSpan={6} className="empty-state">
                          No payroll calculated yet for this employee.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 12: PAYSLIPS */}
          {empTab === 'payslips' && (
            <div>
              <div className="premium-card-heading">
                <div>
                  <h3>Generated Monthly Payslips</h3>
                  <p>Download official PDF payslips with institutional branding and statutory breakdown.</p>
                </div>
              </div>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Net Payable</th>
                      <th>Status</th>
                      <th>Disbursement Reference</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empPayroll.map(p => (
                      <tr key={p.id}>
                        <td>{p.period}</td>
                        <td>
                          <strong>
                            <Currency value={p.calculation.net} />
                          </strong>
                        </td>
                        <td>
                          <Status>{p.status}</Status>
                        </td>
                        <td>{p.reference ?? (p.batch ? `Queued in ${p.batch}` : 'Settlement Pending')}</td>
                        <td>
                          <button
                            className="button primary small"
                            onClick={() =>
                              downloadPayslipPDF({
                                campusName: campus.name,
                                employee: staffMember,
                                record: p,
                              })
                            }
                          >
                            <Download size={13} />
                            Download PDF Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!empPayroll.length && (
                      <tr>
                        <td colSpan={5} className="empty-state">
                          No payslips generated yet. Calculate payroll in Payroll workspace.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 13: NEFT / PAYMENT HISTORY */}
          {empTab === 'payment_history' && (
            <div>
              <div className="premium-card-heading">
                <div>
                  <h3>NEFT &amp; Bank Disbursement History</h3>
                  <p>Recorded bank settlement references and transfer audit log.</p>
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    downloadSalaryStatementPDF({
                      campusName: campus.name,
                      employee: staffMember,
                      records: empPayroll,
                      year: '2026-27',
                    })
                  }
                >
                  <Download size={14} />
                  Download Salary Statement PDF
                </button>
              </div>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference / UTR</th>
                      <th>Method</th>
                      <th>Net Disbursed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empPayments.map((p, i) => (
                      <tr key={i}>
                        <td>{p.date}</td>
                        <td>
                          <strong>{p.reference}</strong>
                        </td>
                        <td>{p.method}</td>
                        <td className="positive">
                          <Currency value={p.amount} />
                        </td>
                        <td>
                          <Status>Paid</Status>
                        </td>
                      </tr>
                    ))}
                    {!empPayments.length && (
                      <tr>
                        <td colSpan={5} className="empty-state">
                          No disbursement settlements recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 14: ADVANCE AND LOAN RECORDS */}
          {empTab === 'loans_advances' && (
            <div>
              <div className="premium-card-heading">
                <div>
                  <h3>Advance &amp; Loan Records</h3>
                  <p>Employee loan disbursements, installment schedules and outstanding balances.</p>
                </div>
                <button className="button primary small" onClick={() => setNewLoanDialog(true)}>
                  <Plus size={14} /> New Loan / Advance
                </button>
              </div>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Principal Amount</th>
                      <th>Monthly Recovery</th>
                      <th>First Recovery Period</th>
                      <th>Outstanding Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empLoans.map(l => (
                      <tr key={l.id}>
                        <td>{l.kind}</td>
                        <td>
                          <Currency value={l.amount} />
                        </td>
                        <td>
                          <Currency value={l.installment} /> / month
                        </td>
                        <td>{l.firstPeriod}</td>
                        <td>
                          <Currency value={loanOutstanding(data, l)} />
                        </td>
                        <td>
                          <Status>{l.status}</Status>
                        </td>
                      </tr>
                    ))}
                    {!empLoans.length && (
                      <tr>
                        <td colSpan={6} className="empty-state">
                          No active or past loans on file.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 15: DOCUMENTS */}
          {empTab === 'documents' && (
            <div>
              <div className="premium-card-heading">
                <div>
                  <h3>Personnel Documents</h3>
                  <p>Verified certificates, appointment letters and identity credentials.</p>
                </div>
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const doc = String(form.get('docName')).trim();
                  if (!doc) return;
                  updateStaffProfile(
                    s => ({
                      ...s,
                      profile: {
                        ...s.profile,
                        documents: [...(s.profile?.documents ?? []), doc],
                      },
                    }),
                    `Added document: ${doc}`
                  );
                }}
                style={{ marginBottom: 16 }}
              >
                <div className="form-row">
                  <label>
                    Upload Document Reference
                    <input name="docName" placeholder="e.g. Police-Clearance-2026.pdf" required />
                  </label>
                  <button className="button secondary" style={{ alignSelf: 'flex-end' }} type="submit">
                    Add Document
                  </button>
                </div>
              </form>
              <div className="table-wrap mobile-scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Verification</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(profile.documents ?? []).map((doc, idx) => (
                      <tr key={idx}>
                        <td>
                          <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />
                          {doc}
                        </td>
                        <td>
                          <Status>Verified</Status>
                        </td>
                        <td>PDF Document</td>
                      </tr>
                    ))}
                    {!(profile.documents ?? []).length && (
                      <tr>
                        <td colSpan={3} className="empty-state">
                          No documents uploaded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 16: PERFORMANCE HISTORY (Requirement 3) */}
          {empTab === 'performance' && (
            <div>
              <div className="premium-card-heading">
                <div>
                  <h3>Teacher &amp; Staff Performance Management</h3>
                  <p>Configurable evaluation criteria, supervisor ratings, achievements, and review history.</p>
                </div>
                <button className="button primary small" onClick={() => setNewReviewDialog(true)}>
                  <Plus size={14} /> New Performance Review
                </button>
              </div>

              {/* Configurable Evaluation Criteria Info */}
              <div
                style={{
                  padding: 12,
                  background: 'var(--surface-sunken)',
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid var(--border)',
                }}
              >
                <strong style={{ fontSize: 13, color: 'var(--accent)' }}>Configurable Evaluation Criteria:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                  {defaultEvaluationCriteria.map(c => (
                    <span key={c.id} className="badge" style={{ fontSize: 11 }}>
                      {c.name} ({c.weight}%)
                    </span>
                  ))}
                </div>
              </div>

              {/* Review History Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {empReviews.map(r => (
                  <div
                    key={r.id}
                    className="card"
                    style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 15 }}>
                          Review Period: {r.period} · Reviewed on {r.reviewDate}
                        </strong>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                          Reviewer: <strong>{r.reviewer}</strong> · Department: {r.department}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge success">
                          <Star size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {r.ratings.overall} / 5.0 Rating
                        </span>
                        <button
                          className="button secondary small"
                          onClick={() =>
                            downloadPerformanceReviewPDF({
                              campusName: campus.name,
                              employee: staffMember,
                              review: r,
                            })
                          }
                        >
                          <Download size={13} /> Download Review PDF
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 8,
                        background: 'var(--surface-sunken)',
                        padding: 10,
                        borderRadius: 6,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <small>Teaching &amp; Pedagogy</small>
                        <strong className="block">{r.ratings.teaching} / 5</strong>
                      </div>
                      <div>
                        <small>Attendance &amp; Punctuality</small>
                        <strong className="block">{r.ratings.punctuality} / 5</strong>
                      </div>
                      <div>
                        <small>Student Engagement</small>
                        <strong className="block">{r.ratings.studentFeedback} / 5</strong>
                      </div>
                      <div>
                        <small>Admin &amp; Duties</small>
                        <strong className="block">{r.ratings.administrativeSupport} / 5</strong>
                      </div>
                    </div>

                    <dl className="profile-details" style={{ margin: 0 }}>
                      <div>
                        <dt>Teaching Performance</dt>
                        <dd>{r.teachingPerformance}</dd>
                      </div>
                      <div>
                        <dt>Attendance Performance</dt>
                        <dd>{r.attendancePerformance}</dd>
                      </div>
                      <div>
                        <dt>Key Responsibilities</dt>
                        <dd>{r.responsibilities}</dd>
                      </div>
                      <div>
                        <dt>Notable Achievements</dt>
                        <dd>{r.achievements}</dd>
                      </div>
                      <div>
                        <dt>Areas for Improvement</dt>
                        <dd>{r.areasForImprovement}</dd>
                      </div>
                      <div>
                        <dt>Supervisor Remarks</dt>
                        <dd>{r.remarks}</dd>
                      </div>
                    </dl>
                  </div>
                ))}

                {!empReviews.length && (
                  <p className="empty-state">No performance evaluations conducted yet for this staff member.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 17: ACTIVITY TIMELINE */}
          {empTab === 'activity_timeline' && (
            <div>
              <h3>Activity &amp; Operational Timeline</h3>
              <p>Chronological audit log of profile modifications, leaves, payouts and reviews.</p>
              <div className="payment-timeline" style={{ marginTop: 16 }}>
                {(profile.history ?? []).slice().reverse().map((h, i) => (
                  <div className="timeline-payment" key={i}>
                    <span className="payment-symbol">
                      <Clock size={16} />
                    </span>
                    <div className="transaction-info">
                      <strong>{h.note}</strong>
                      <small>{h.date.slice(0, 10)}</small>
                    </div>
                  </div>
                ))}
                {!profile.history?.length && <p className="empty-state">No historical activity recorded.</p>}
              </div>
            </div>
          )}

          {/* Modal for adding Performance Review */}
          {newReviewDialog && (
            <Dialog
              title={`Conduct Performance Review · ${staffMember.name}`}
              kicker="FACULTY EVALUATION"
              onClose={() => setNewReviewDialog(false)}
            >
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const period = String(form.get('period')).trim();
                  const reviewer = String(form.get('reviewer')).trim();
                  const teaching = Number(form.get('teachingRating'));
                  const punctuality = Number(form.get('punctualityRating'));
                  const student = Number(form.get('studentRating'));
                  const admin = Number(form.get('adminRating'));
                  const overall = round((teaching * 0.3 + punctuality * 0.2 + student * 0.25 + admin * 0.25));

                  const rev: PerformanceReview = {
                    id: `PR-${period}-${staffMember.id}-${crypto.randomUUID().slice(0, 4)}`,
                    employeeId: staffMember.id,
                    period,
                    reviewDate: AS_OF,
                    reviewer,
                    department: staffMember.subject,
                    teachingPerformance: String(form.get('teachingPerformance')).trim(),
                    attendancePerformance: String(form.get('attendancePerformance')).trim(),
                    responsibilities: String(form.get('responsibilities')).trim(),
                    achievements: String(form.get('achievements')).trim(),
                    areasForImprovement: String(form.get('areasForImprovement')).trim(),
                    ratings: {
                      teaching,
                      punctuality,
                      studentFeedback: student,
                      administrativeSupport: admin,
                      overall,
                    },
                    remarks: String(form.get('remarks')).trim(),
                    status: 'Finalized',
                    history: [{ event: `Review finalized by ${reviewer}`, at: new Date().toISOString(), actor: reviewer }],
                  };

                  setData(d => ({
                    ...d,
                    performanceReviews: [rev, ...(d.performanceReviews ?? [])],
                  }));
                  setNewReviewDialog(false);
                  notify('Performance review saved and finalized.');
                }}
              >
                <div className="form-row">
                  <label>
                    Review Period
                    <input name="period" defaultValue="2026-Q4" required placeholder="e.g. 2026-Q4 or 2026-H2" />
                  </label>
                  <label>
                    Reviewer / Evaluator Name
                    <input name="reviewer" defaultValue="Dr. Anita Saxena (Principal)" required />
                  </label>
                </div>
                <div className="form-row" style={{ flexWrap: 'wrap' }}>
                  <label style={{ flexBasis: 120 }}>
                    Teaching (1-5)
                    <input name="teachingRating" type="number" min="1" max="5" step="0.1" defaultValue="4.5" required />
                  </label>
                  <label style={{ flexBasis: 120 }}>
                    Attendance (1-5)
                    <input name="punctualityRating" type="number" min="1" max="5" step="0.1" defaultValue="4.8" required />
                  </label>
                  <label style={{ flexBasis: 120 }}>
                    Student Feedback (1-5)
                    <input name="studentRating" type="number" min="1" max="5" step="0.1" defaultValue="4.6" required />
                  </label>
                  <label style={{ flexBasis: 120 }}>
                    Admin Support (1-5)
                    <input name="adminRating" type="number" min="1" max="5" step="0.1" defaultValue="4.7" required />
                  </label>
                </div>
                <label>
                  Teaching Performance &amp; Pedagogy
                  <input
                    name="teachingPerformance"
                    required
                    defaultValue="Strong syllabus coverage and engaging classroom discussions."
                  />
                </label>
                <label>
                  Attendance &amp; Punctuality Performance
                  <input name="attendancePerformance" required defaultValue="High regularity with zero unexcused absences." />
                </label>
                <label>
                  Institutional Responsibilities
                  <input
                    name="responsibilities"
                    required
                    defaultValue="Departmental examination coordinator and mentor for junior students."
                  />
                </label>
                <label>
                  Achievements &amp; Contributions
                  <input name="achievements" required defaultValue="Guided students to distinction in board examinations." />
                </label>
                <label>
                  Areas for Improvement
                  <input
                    name="areasForImprovement"
                    required
                    defaultValue="Participate in advanced digital educational workshops."
                  />
                </label>
                <label>
                  Overall Remarks &amp; Feedback
                  <input name="remarks" required defaultValue="Highly recommended for upcoming senior grade promotion." />
                </label>
                <button className="button primary full-width" type="submit">
                  Save Performance Review
                </button>
              </form>
            </Dialog>
          )}

          {/* Modal for Proposing Salary Revision */}
          {newRevisionDialog && (
            <Dialog
              title={`Propose Salary Revision · ${staffMember.name}`}
              kicker="COMPENSATION MANAGEMENT"
              onClose={() => setNewRevisionDialog(false)}
            >
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const rev = {
                    id: crypto.randomUUID(),
                    employeeId: staffMember.id,
                    period: String(form.get('period')),
                    basic: Number(form.get('basic')),
                    allowances: Number(form.get('allowances')),
                    bonus: Number(form.get('bonus')),
                    otherDeductions: Number(form.get('otherDeductions')),
                    reason: String(form.get('reason')).trim(),
                    approved: true,
                  };
                  setData(d => ({
                    ...d,
                    salaryRevisions: [...(d.salaryRevisions ?? []), rev],
                  }));
                  setNewRevisionDialog(false);
                  notify('Salary revision saved and applied.');
                }}
              >
                <div className="form-row">
                  <label>
                    Effective Month
                    <input name="period" type="month" defaultValue={AS_OF.slice(0, 7)} required />
                  </label>
                  <label>
                    Revised Basic Pay (INR)
                    <input name="basic" type="number" defaultValue={staffMember.salary} required />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Allowances (INR)
                    <input name="allowances" type="number" defaultValue="2000" required />
                  </label>
                  <label>
                    Performance Bonus (INR)
                    <input name="bonus" type="number" defaultValue="0" required />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Other Deductions (INR)
                    <input name="otherDeductions" type="number" defaultValue="0" required />
                  </label>
                  <label>
                    Revision Reason
                    <input name="reason" placeholder="e.g. Annual Appraisal / Promotion" required />
                  </label>
                </div>
                <button className="button primary full-width" type="submit">
                  Apply Salary Revision
                </button>
              </form>
            </Dialog>
          )}

          {/* Modal for New Loan / Advance */}
          {newLoanDialog && (
            <Dialog
              title={`Grant Advance or Loan · ${staffMember.name}`}
              kicker="EMPLOYEE WELFARE"
              onClose={() => setNewLoanDialog(false)}
            >
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const kind: 'Loan' | 'Advance' = form.get('kind') === 'Loan' ? 'Loan' : 'Advance';
                  const amount = Number(form.get('amount'));
                  const installment = Number(form.get('installment'));
                  const firstPeriod = String(form.get('firstPeriod'));

                  const loan = {
                    id: `loan-${staffMember.id}-${crypto.randomUUID().slice(0, 4)}`,
                    employeeId: staffMember.id,
                    kind,
                    amount,
                    installment,
                    firstPeriod,
                    disbursedOn: AS_OF,
                    status: 'Disbursed' as const,
                  };

                  setData(d => ({
                    ...d,
                    employeeLoans: [...(d.employeeLoans ?? []), loan],
                  }));
                  setNewLoanDialog(false);
                  notify(`${kind} disbursed successfully.`);
                }}
              >
                <div className="form-row">
                  <label>
                    Assistance Type
                    <select name="kind">
                      <option>Advance</option>
                      <option>Loan</option>
                    </select>
                  </label>
                  <label>
                    Principal Amount (INR)
                    <input name="amount" type="number" min="500" step="100" defaultValue="10000" required />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Monthly Recovery (INR)
                    <input name="installment" type="number" min="100" step="50" defaultValue="2000" required />
                  </label>
                  <label>
                    First Recovery Month
                    <input name="firstPeriod" type="month" defaultValue={AS_OF.slice(0, 7)} required />
                  </label>
                </div>
                <button className="button primary full-width" type="submit">
                  Disburse &amp; Record Loan
                </button>
              </form>
            </Dialog>
          )}
        </Dialog>
      )}

      {/* STUDENT PROFILE DIALOG */}
      {studentMember && (
        <Dialog
          title={`${studentMember.name} · ${studentMember.id}`}
          kicker={`${campus.name.toUpperCase()} / STUDENT PROFILE`}
          wide
          onClose={() => setSelection('')}
        >
          {(() => {
            const ledger = studentLedger(studentMember, data.payments);
            return (
              <div>
                <div className="profile-topline" style={{ marginBottom: 16 }}>
                  <Person
                    name={studentMember.name}
                    color={studentMember.color}
                    sub={`${studentMember.id} · ${studentMember.class} · Guardian: ${studentMember.guardian}`}
                  />
                  <div className="heading-actions">
                    <button
                      className="button secondary"
                      onClick={() =>
                        downloadFeeStatementPDF({
                          campusName: campus.name,
                          student: studentMember,
                          ledger,
                        })
                      }
                    >
                      <Download size={14} /> Fee Statement PDF
                    </button>
                    {ledger.remaining === 0 && (
                      <button
                        className="button primary"
                        onClick={() =>
                          downloadNoDuesCertificatePDF({
                            campusName: campus.name,
                            student: studentMember,
                            asOf: AS_OF,
                          })
                        }
                      >
                        <Download size={14} /> No-Dues Certificate PDF
                      </button>
                    )}
                  </div>
                </div>

                <div className="segmented" style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    className={stuTab === 'personal' ? 'selected' : ''}
                    onClick={() => setStuTab('personal')}
                  >
                    Personal Info
                  </button>
                  <button
                    type="button"
                    className={stuTab === 'academic' ? 'selected' : ''}
                    onClick={() => setStuTab('academic')}
                  >
                    Academic &amp; Plan
                  </button>
                  <button
                    type="button"
                    className={stuTab === 'fee_schedule' ? 'selected' : ''}
                    onClick={() => setStuTab('fee_schedule')}
                  >
                    Fee Schedule
                  </button>
                  <button
                    type="button"
                    className={stuTab === 'payment_history' ? 'selected' : ''}
                    onClick={() => setStuTab('payment_history')}
                  >
                    Payment History
                  </button>
                </div>

                {stuTab === 'personal' && (
                  <dl className="profile-details">
                    <div>
                      <dt>Student Full Name</dt>
                      <dd>{studentMember.name}</dd>
                    </div>
                    <div>
                      <dt>Admission ID</dt>
                      <dd>{studentMember.id}</dd>
                    </div>
                    <div>
                      <dt>Class / Programme</dt>
                      <dd>{studentMember.class}</dd>
                    </div>
                    <div>
                      <dt>Guardian Name</dt>
                      <dd>{studentMember.guardian}</dd>
                    </div>
                    <div>
                      <dt>Payment Plan</dt>
                      <dd>{studentMember.plan.kind}</dd>
                    </div>
                    <div>
                      <dt>Preferred Mode</dt>
                      <dd>{studentMember.plan.preferred}</dd>
                    </div>
                  </dl>
                )}

                {stuTab === 'academic' && (
                  <dl className="profile-details">
                    <div>
                      <dt>Class / Group</dt>
                      <dd>{studentMember.class}</dd>
                    </div>
                    <div>
                      <dt>Department</dt>
                      <dd>{studentMember.department ?? 'General Academic'}</dd>
                    </div>
                    <div>
                      <dt>Batch</dt>
                      <dd>{studentMember.batch ?? '2026-27'}</dd>
                    </div>
                    <div>
                      <dt>Specialization</dt>
                      <dd>{studentMember.specialization ?? 'Standard Curriculum'}</dd>
                    </div>
                  </dl>
                )}

                {stuTab === 'fee_schedule' && (
                  <div>
                    <div className="schedule-summary" style={{ marginBottom: 12 }}>
                      <span>Total: <Currency value={ledger.total} /></span>
                      <span className="positive">Paid: <Currency value={ledger.paid} /></span>
                      <span className={ledger.due > 0 ? 'negative' : ''}>Due Now: <Currency value={ledger.due} /></span>
                      <span>Remaining: <Currency value={ledger.remaining} /></span>
                    </div>
                    <div className="table-wrap mobile-scroll-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Installment</th>
                            <th>Due Date</th>
                            <th>Committed</th>
                            <th>Paid</th>
                            <th>Outstanding</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger.schedule.map((c, i) => (
                            <tr key={i}>
                              <td>{c.label}</td>
                              <td>{c.date}</td>
                              <td><Currency value={c.amount} /></td>
                              <td className="positive"><Currency value={c.paid} /></td>
                              <td><Currency value={c.outstanding} /></td>
                              <td><Status>{c.status}</Status></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {stuTab === 'payment_history' && (
                  <div className="table-wrap mobile-scroll-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Reference</th>
                          <th>Method</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.entries.map(p => (
                          <tr key={p.id}>
                            <td>{p.date}</td>
                            <td>{p.reference}</td>
                            <td>{p.method}</td>
                            <td className="positive"><Currency value={p.amount} /></td>
                            <td><Status>{p.verified ? 'Verified' : 'Pending'}</Status></td>
                          </tr>
                        ))}
                        {!ledger.entries.length && (
                          <tr>
                            <td colSpan={5} className="empty-state">No payment entries found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </Dialog>
      )}
    </section>
  );
}
