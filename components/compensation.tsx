'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { openingPeriod } from '@/lib/payroll';
import { loanOutstanding, type EmployeeLoan, type SalaryRevision } from '@/lib/hr';
import { AS_OF, type SchoolFinance } from '@/lib/school-finance';
import { Currency, downloadCSV } from './finance-ui';

export default function Compensation({ data, setData }: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
}) {
  const [message, setMessage] = useState('');
  const employeeOptions = data.staff.map(employee => <option key={employee.id} value={employee.id}>{employee.name} · {employee.id}</option>);
  const names = new Map(data.staff.map(employee => [employee.id, employee.name]));
  return <>
    <section className="card">
      <div className="premium-card-heading"><div><h3>Salary revisions</h3><p>Approved terms take effect in the selected month. Previously approved payroll keeps its original amounts.</p></div></div>
      <div className="premium-dialog" style={{maxWidth: 800}}><form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const revision: SalaryRevision = {
          id: crypto.randomUUID(), employeeId: String(fields.get('employee')), period: String(fields.get('period')),
          basic: Number(fields.get('basic')), allowances: Number(fields.get('allowances')),
          bonus: Number(fields.get('bonus')), otherDeductions: Number(fields.get('deductions')),
          reason: String(fields.get('reason')).trim(), approved: false,
        };
        if (!revision.reason || data.salaryRevisions?.some(item => item.employeeId === revision.employeeId && item.period === revision.period)) {
          setMessage('Enter a reason and choose a month without an existing revision.');
          return;
        }
        setData(current => ({ ...current, salaryRevisions: [...(current.salaryRevisions ?? []), revision] }));
        setMessage('Revision saved for approval.');
      }}>
        <div className="form-row"><label>Employee<select name="employee">{employeeOptions}</select></label><label>Effective month<input name="period" type="month" defaultValue={openingPeriod} required/></label></div>
        <div className="form-row">{[['basic', 'Basic salary'], ['allowances', 'Monthly allowances'], ['bonus', 'One-time bonus'], ['deductions', 'Monthly other deductions']].map(([name, label]) =>
          <label key={name}>{label}<input name={name} type="number" required min={name === 'basic' ? 0.01 : 0} step="0.01" defaultValue={name === 'basic' ? undefined : 0}/></label>,
        )}</div>
        <label>Reason<input name="reason" required maxLength={120}/></label>
        <button className="button primary">Submit salary revision</button>
      </form></div>
      <div className="table-wrap mobile-scroll-table"><table><thead><tr><th>Employee</th><th>Effective month</th><th>Basic</th><th>Allowances</th><th>Bonus</th><th>Deductions</th><th>Reason</th><th>Approval</th></tr></thead>
        <tbody>{(data.salaryRevisions ?? []).map(row => <tr key={row.id}><td>{names.get(row.employeeId)}</td><td>{row.period}</td><td><Currency value={row.basic}/></td><td><Currency value={row.allowances}/></td><td><Currency value={row.bonus}/></td><td><Currency value={row.otherDeductions}/></td><td>{row.reason}</td>
          <td>{row.approved ? 'Approved' : <button className="button secondary" onClick={() => setData(current => ({ ...current, salaryRevisions: current.salaryRevisions?.map(item => item.id === row.id ? { ...item, approved: true } : item) }))}>Approve revision</button>}</td>
        </tr>)}</tbody></table></div>
    </section>
    <section className="card">
      <div className="premium-card-heading"><div><h3>Salary advances and loans</h3><p>Approved and disbursed requests are recovered through future payroll.</p></div>
        <button className="button secondary" onClick={() => downloadCSV('employee-loans.csv', [
          ['Employee', 'Type', 'Amount', 'Monthly recovery', 'First month', 'Status', 'Outstanding'],
          ...(data.employeeLoans ?? []).map(loan => [names.get(loan.employeeId) ?? loan.employeeId, loan.kind, loan.amount, loan.installment, loan.firstPeriod, loan.status, loanOutstanding(data, loan)]),
        ])}>Export advances and loans</button></div>
      <div className="premium-dialog" style={{maxWidth: 800}}><form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const loan: EmployeeLoan = {
          id: crypto.randomUUID(), employeeId: String(fields.get('employee')), kind: String(fields.get('kind')) as EmployeeLoan['kind'],
          amount: Number(fields.get('amount')), installment: Number(fields.get('installment')),
          firstPeriod: String(fields.get('period')), status: 'Pending',
        };
        if (loan.installment > loan.amount) {
          setMessage('The monthly recovery must be within the requested amount.');
          return;
        }
        setData(current => ({ ...current, employeeLoans: [...(current.employeeLoans ?? []), loan] }));
        setMessage(loan.kind + ' request saved.');
      }}>
        <div className="form-row">
          <label>Employee<select name="employee">{employeeOptions}</select></label>
          <label>Request type<select name="kind"><option>Advance</option><option>Loan</option></select></label>
          <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required/></label>
          <label>Monthly recovery<input name="installment" type="number" min="0.01" step="0.01" required/></label>
          <label>First recovery month<input name="period" type="month" defaultValue={openingPeriod} required/></label>
        </div>
        <button className="button primary">Create request</button>
      </form></div>
      <div className="table-wrap mobile-scroll-table"><table><thead><tr><th>Employee</th><th>Type</th><th>Principal</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{(data.employeeLoans ?? []).map(loan => {
          const outstanding = loanOutstanding(data, loan);
          const transition = (status: EmployeeLoan['status']) => setData(current => ({ ...current,
            employeeLoans: current.employeeLoans?.map(row => row.id === loan.id && row.status === loan.status ? { ...row, status, ...(status === 'Disbursed' && { disbursedOn: AS_OF }) } : row),
          }));
          return <tr key={loan.id}><td>{names.get(loan.employeeId)}</td><td>{loan.kind}</td><td><Currency value={loan.amount}/></td>
            <td>{loan.status === 'Disbursed' ? <Currency value={outstanding}/> : '—'}</td><td>{loan.status === 'Disbursed' && outstanding === 0 ? 'Closed' : loan.status}</td>
            <td><div className="row-actions">{loan.status === 'Pending' && <>
              <button className="button secondary" onClick={() => transition('Approved')}>Approve</button>
              <button className="button secondary" onClick={() => transition('Rejected')}>Reject</button>
            </>}{loan.status === 'Approved' && <button className="button secondary" onClick={() => transition('Disbursed')}>Simulate disbursement</button>}</div></td>
          </tr>;
        })}</tbody></table></div>
      {message && <p className="info-strip" role="status">{message}</p>}
    </section>
  </>;
}
