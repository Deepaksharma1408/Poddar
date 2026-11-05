'use client';

import { categoryBalance, chargedLeave, defaultLeaveRules } from '@/lib/hr';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { AS_OF, salaryBreakdown, studentLedger, type SchoolFinance } from '@/lib/school-finance';
import { Currency, Status } from './finance-ui';
import { openingPeriod } from '@/lib/payroll';
import { useInstitution } from './institution';
import { downloadFeeStatementPDF, downloadNoDuesCertificatePDF, downloadPayslipPDF } from '@/lib/pdf-documents';
import { Download } from 'lucide-react';

export default function SelfService({ data, setData, role, id, studentAttendance = {} }: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  role: 'Employee' | 'Student';
  id: string;
  studentAttendance?: Record<string, string>;
}) {
  const campus = useInstitution();
  const [message, setMessage] = useState('');

  if (role === 'Student') {
    const student = data.students.find(row => row.id === id);
    if (!student) return null;
    const ledger = studentLedger(student, data.payments);
    return <section className="card">
      <div className="premium-card-heading">
        <div>
          <h3>{student.name}</h3>
          <p>{student.id} · {student.class} · Guardian {student.guardian}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button secondary" onClick={() => downloadFeeStatementPDF({ campusName: campus.name, student, ledger })}>
            <Download size={14}/> Download Fee Statement PDF
          </button>
          {ledger.remaining === 0 && (
            <button className="button primary" onClick={() => downloadNoDuesCertificatePDF({ campusName: campus.name, student, asOf: AS_OF })}>
              <Download size={14}/> Download No-Dues Certificate PDF
            </button>
          )}
        </div>
      </div>
      <div className="notification-row"><h3>My attendance</h3>
        {Object.entries(studentAttendance).filter(([key]) => key === id || key.endsWith('/' + id)).map(([key, status]) =>
          <p key={key}>{key === id ? AS_OF : key.split('/')[0]} · {status}</p>)}
      </div>
      {!!student.profile?.documents?.length && <div className="notification-row"><h3>My documents</h3><ul>{student.profile.documents.map((file, index) => <li key={index}>{file}</li>)}</ul></div>}
      <div className="info-strip">Paid <Currency value={ledger.paid}/> · Due now <Currency value={ledger.due}/> · Remaining <Currency value={ledger.remaining}/></div>
      <div className="table-wrap mobile-scroll-table" role="region" aria-label="My installment schedule" tabIndex={0}>
        <table><thead><tr><th>Installment</th><th>Due date</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>
          {ledger.schedule.map((charge, index) => <tr key={index}><td>{charge.label}</td><td>{charge.date}</td><td><Currency value={charge.outstanding}/></td><td>{charge.status}</td></tr>)}
        </tbody></table>
      </div>
    </section>;
  }

  const employee = data.staff.find(row => row.id === id);
  if (!employee) return null;
  const leaves = data.leaves.filter(row => row.staffId === id);
  const payroll = (data.payroll ?? []).filter(row => row.employeeId === id && row.status !== 'Draft');
  const balance = salaryBreakdown(employee, leaves.filter(leave => leave.from.startsWith(openingPeriod)), data.policy).balance;
  return <section className="card">
    <div className="premium-card-heading"><div><h3>{employee.name}</h3><p>{employee.id} · {employee.subject} · {employee.designation ?? 'Faculty'}</p></div></div>
    {!!employee.profile?.documents?.length && <div className="notification-row"><h3>My documents</h3><ul>{employee.profile.documents.map((file, index) => <li key={index}>{file}</li>)}</ul></div>}
    <div className="info-strip">Opening month paid leave balance: {balance} days</div>
    <div className="premium-dialog" style={{maxWidth: 620}}>
      <h3>Apply for leave</h3>
      <form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const from = String(fields.get('from'));
        const days = Number(fields.get('days'));
        const start = Date.parse(from);
        const end = start + Math.ceil(days) * 86400000;
        const overlaps = leaves.some(leave => leave.status !== 'Rejected' && leave.status !== 'Cancelled' && Date.parse(leave.from) < end && Date.parse(leave.from) + Math.ceil(leave.days) * 86400000 > start);
        if (!Number.isFinite(start) || days <= 0 || new Date(end - 1).toISOString().slice(0, 7) !== from.slice(0, 7) || overlaps) {
          setMessage('Choose non-overlapping dates within a single month.');
          return;
        }
        const category = String(fields.get('category'));
        const rule = (data.leaveRules ?? defaultLeaveRules).find(item => item.name === category);
        if (!rule || (!rule.halfDay && !Number.isInteger(days)) || (rule.paid && chargedLeave(data, from, days, rule).chargedDays > categoryBalance(data, id, category, from))) {
          setMessage('The request exceeds the category entitlement or half-day policy.');
          return;
        }
        setData(current => ({ ...current, leaves: [...current.leaves, {
          id: crypto.randomUUID(), staffId: id, from, days, category,
          kind: rule.paid ? 'Paid' : 'Unpaid',
          reason: String(fields.get('reason')).trim(), document: (fields.get('support') as File | null)?.name || undefined, status: 'Pending',
        }] }));
        setMessage('Request submitted for review.');
      }}>
        <div className="form-row">
          <label>Category<select name="category">{(data.leaveRules ?? defaultLeaveRules).map(rule => <option key={rule.name}>{rule.name}</option>)}</select></label>
          <label>Start date<input type="date" name="from" defaultValue={AS_OF} required/></label>
          <label>Days<input type="number" name="days" min="0.5" max="31" step="0.5" defaultValue="1" required/></label>
        </div>
        <label>Reason<input name="reason" maxLength={160} required/></label>
        <label>Supporting document (filename only)<input name="support" type="file"/></label><button className="button primary">Submit leave request</button>
      </form>
      {message && <p role="status">{message}</p>}
    </div>
    <div className="table-wrap mobile-scroll-table" role="region" aria-label="My leave requests" tabIndex={0}>
      <table><thead><tr><th>Date</th><th>Category</th><th>Days</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {leaves.map(leave => <tr key={leave.id}><td>{leave.from}</td><td>{leave.category}</td><td>{leave.days}</td>
          <td><Status>{leave.status}</Status></td><td>{leave.status === 'Pending' && <button className="button secondary" onClick={() => setData(current => ({
            ...current, leaves: current.leaves.map(row => row.id === leave.id && row.staffId === id && row.status === 'Pending' ? { ...row, status: 'Cancelled' } : row),
          }))}>Cancel request</button>}
          {leave.status === 'Clarification' && <form onSubmit={event=>{
            event.preventDefault();
            const reply = String(new FormData(event.currentTarget).get('reply')).trim();
            if (!reply) return;
            setData(current => ({...current, leaves:current.leaves.map(row=>row.id===leave.id && row.staffId===id && row.status==='Clarification' ? {...row,status:'Pending',clarificationReply:reply}:row)}));
          }}><p>{leave.approvalRemarks}</p><label>Clarification reply<input name="reply" required maxLength={180}/></label><button className="button secondary">Send reply</button></form>}
          </td></tr>)}
      </tbody></table>
    </div>
    <section className="premium-dialog" style={{maxWidth: 620}}>
      <h3>Attendance history and corrections</h3>
      {(data.employeeAttendance ?? []).filter(row => row.employeeId === id).map(row => <p key={row.date}>{row.date} · {row.status}</p>)}
      <form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const date = String(fields.get('date'));
        const reason = String(fields.get('reason')).trim();
        if (!reason || data.finalizedAttendance?.includes(date.slice(0, 7)) ||
          data.attendanceCorrections?.some(row => row.employeeId === id && row.date === date && row.status === 'Pending')) {
          setMessage('The month is locked or this date already has a pending correction.');
          return;
        }
        setData(current => ({ ...current, attendanceCorrections: [...(current.attendanceCorrections ?? []), {
          id: crypto.randomUUID(), employeeId: id, date, mark: String(fields.get('mark')), reason, status: 'Pending',
        }] }));
        setMessage('Attendance correction submitted.');
      }}>
        <div className="form-row"><label>Date<input type="date" name="date" defaultValue={AS_OF} required/></label>
          <label>Requested status<select name="mark"><option>Present</option><option>Absent</option><option>Half-day</option><option>Late arrival</option><option>Work from home</option></select></label></div>
        <label>Reason<input name="reason" maxLength={160} required/></label>
        <button className="button secondary">Submit attendance correction</button>
      </form>
      {(data.attendanceCorrections ?? []).filter(row => row.employeeId === id).map(row => <p key={row.id}>{row.date} · {row.mark} · {row.status}</p>)}
    </section>
    <section className="premium-dialog" style={{maxWidth: 620}}>
      <h3>Request an advance or loan</h3>
      <form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const kind = fields.get('kind') === 'Loan' ? 'Loan' : 'Advance';
        const amount = Number(fields.get('amount'));
        const installment = Number(fields.get('installment'));
        if (!Number.isFinite(amount) || !Number.isFinite(installment) || installment <= 0 || installment > amount) {
          setMessage('Enter a recovery amount within the requested total.');
          return;
        }
        const firstPeriod = String(fields.get('period'));
        setData(current => ({ ...current, employeeLoans: [...(current.employeeLoans ?? []), {
          id: crypto.randomUUID(), employeeId: id, kind, amount, installment, firstPeriod, status: 'Pending',
        }] }));
        setMessage(kind + ' requested.');
      }}>
        <div className="form-row"><label>Type<select name="kind"><option>Advance</option><option>Loan</option></select></label>
          <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required/></label>
          <label>Monthly recovery<input name="installment" type="number" min="0.01" step="0.01" required/></label>
          <label>First month<input name="period" type="month" required defaultValue={openingPeriod}/></label></div>
        <button className="button secondary">Submit request</button>
      </form>
      {(data.employeeLoans ?? []).filter(row => row.employeeId === id).map(row => <p key={row.id}>{row.kind} · ₹{row.amount} · {row.status}</p>)}
    </section>
    <div className="table-wrap mobile-scroll-table" role="region" aria-label="My payroll history" tabIndex={0}>
      <table><thead><tr><th>Month</th><th>Net salary</th><th>Status</th><th>UTR / Reference</th><th>Action</th></tr></thead><tbody>
        {payroll.map(row => <tr key={row.id}>
          <td>{row.period}</td>
          <td><Currency value={row.calculation.net}/></td>
          <td><Status>{row.status}</Status></td>
          <td>{row.reference ?? '—'}</td>
          <td>
            <button className="button secondary small" onClick={() => downloadPayslipPDF({ campusName: campus.name, employee, record: row })}>
              <Download size={13}/> Payslip PDF
            </button>
          </td>
        </tr>)}
      </tbody></table>
    </div>
  </section>;
}
