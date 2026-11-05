'use client';

import { reconcileStatement } from '@/lib/erp-management';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { round, type SchoolFinance } from '@/lib/school-finance';
import { Currency, Dialog, Person, Status, downloadCSV } from './finance-ui';
import { useInstitution } from './institution';

type Props = {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  notify: (message: string) => void;
  page: string;
  canManagePay?: boolean;
};

export default function ErpOperations({ data, setData, notify, page, canManagePay = true }: Props) {
  const campus = useInstitution();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('');
  const [query, setQuery] = useState('');
  const pending = data.payments.filter(payment => !payment.verified && !payment.inactiveStatus);

  if (page === 'Employees') {
    const employees = data.staff.filter(employee => [employee.name, employee.id, employee.subject, employee.designation].join(' ').toLowerCase().includes(query.toLowerCase()));
    return <section className="card">
      <div className="premium-card-heading">
        <div><h3>Employee register</h3><p>Faculty and non-teaching staff share the leave and payroll workflows.</p></div>
        <button className="button primary" onClick={() => setOpen(true)}>Add employee</button>
      </div>
      <div className="premium-list-toolbar"><label className="input-search"><input aria-label="Search employees" placeholder="Search employees" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
      <div className="table-wrap mobile-scroll-table" tabIndex={0} role="region" aria-label="Employee records">
        <table><thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Employment</th>{canManagePay && <th>Gross salary</th>}</tr></thead>
          <tbody>{employees.map(employee => <tr key={employee.id}>
            <td><Person name={employee.name} sub={employee.id}/></td><td>{employee.subject}</td>
            <td>{employee.designation ?? 'Faculty'}</td><td>{employee.employment ?? 'Permanent'}</td>
            {canManagePay && <td><Currency value={employee.salary}/></td>}
          </tr>)}</tbody>
        </table>
        {!employees.length && <p className="empty-state">No matching employees.</p>}
      </div>
      {open && <Dialog title="Add employee" kicker="HUMAN RESOURCES" onClose={() => setOpen(false)}>
        <form onSubmit={event => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const name = String(fields.get('name')).trim();
          const subject = String(fields.get('department')).trim();
          if (!name || !subject) return;
          setData(current => ({
            ...current,
            staff: [...current.staff, {
              id: campus.prefix + '-EMP-' + String(current.staff.length + 1).padStart(3, '0'),
              name, subject, designation: String(fields.get('designation')),
              employment: String(fields.get('employment')), salary: canManagePay ? Number(fields.get('salary')) : 0,
              allowance: Number(fields.get('allowance')), priorUsed: 0, paidDays: 0, unpaidDays: 0, color: 'blue',
            }],
          }));
          setOpen(false);
          notify('Employee added to the leave and payroll registers');
        }}>
          <label>Full name<input name="name" required maxLength={80}/></label>
          <label>Department<input name="department" required maxLength={80}/></label>
          <div className="form-row">
            <label>Designation<select name="designation">{['Faculty', 'Administrative staff', 'Accounts staff', 'Support staff', 'Management'].map(option => <option key={option}>{option}</option>)}</select></label>
            <label>Employment<select name="employment">{['Permanent', 'Contract', 'Visiting', 'Guest'].map(option => <option key={option}>{option}</option>)}</select></label>
          </div>
          <div className="form-row">
            {canManagePay && <label>Monthly gross salary<input name="salary" type="number" min="1" max="10000000" step="0.01" required/></label>}
            <label>Annual paid leave days<input name="allowance" type="number" min="0" max="365" defaultValue="12" required/></label>
          </div>
          <button className="button primary full-width">Create employee</button>
        </form>
      </Dialog>}
    </section>;
  }

  return <section className="card">
    <div className="premium-card-heading">
      <div><h3>Bank reconciliation</h3><p>Simulate matching a statement entry to a pending fee payment by reference and amount.</p></div>
      <button className="button secondary" onClick={() => downloadCSV('reconciliation.csv', [
        ['Reference', 'Amount', 'Matched on'], ...(data.reconciliations ?? []).map(entry => [entry.reference, entry.amount, entry.date]),
      ])}>Export matches</button>
    </div>
    <div className="embedded-form-panel" style={{maxWidth: 640}}>
      <form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const reference = String(fields.get('reference')).trim().toUpperCase();
        const amount = round(Number(fields.get('amount')));
        if (reconcileStatement(data, reference, amount) === data) {
          setResult('Unmatched or already reconciled. Check the reference and amount.');
          return;
        }
        setData(current => reconcileStatement(current, reference, amount));
        setResult('Matched. The reconciliation is recorded.');
        notify('Simulated bank match recorded');
      }}>
        <div className="form-row">
          <label>Statement reference<input name="reference" required maxLength={100}/></label>
          <label>Statement amount<input name="amount" type="number" min="0.01" step="0.01" required/></label>
        </div>
        <button className="button primary">Match statement entry</button>
      </form>
      <form onSubmit={event => {
        event.preventDefault();
        const input = String(new FormData(event.currentTarget).get('statement'));
        const rows = input.split(/\r?\n/).map(line => line.trim()).filter(line => line && line.toLowerCase() !== 'reference,amount');
        let preview = data;
        const unmatched: string[] = [];
        const matched: { reference: string; amount: number }[] = [];
        for (const line of rows) {
          const [reference, rawAmount, extra] = line.split(',');
          const amount = round(Number(rawAmount));
          const next = extra === undefined ? reconcileStatement(preview, reference, amount) : preview;
          if (next === preview) unmatched.push(reference || '(blank reference)');
          else matched.push({ reference, amount });
          preview = next;
        }
        setData(current => matched.reduce((state, row) => reconcileStatement(state, row.reference, row.amount), current));
        setResult(matched.length + ' matched. ' + unmatched.length + ' unmatched.' + (unmatched.length ? ' ' + unmatched.join(', ') : ''));
      }}>
        <label>Import simulated statement CSV<textarea name="statement" rows={4} maxLength={20000} required placeholder="reference,amount"/></label>
        <button className="button secondary">Import and reconcile</button>
      </form>
      {result && <p role="status">{result}</p>}
    </div>
    {canManagePay && <div className="embedded-form-panel" style={{maxWidth: 700}}>
      <h3>Simulated bank accounts</h3>
      <form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const bank = String(fields.get('bank')).trim();
        const holder = String(fields.get('holder')).trim();
        const lastFour = String(fields.get('lastFour'));
        const ifsc = String(fields.get('ifsc')).trim().toUpperCase();
        if (!bank || !holder || !/^\d{4}$/.test(lastFour) || !ifsc) return;
        setData(current => ({ ...current, bankAccounts: [...(current.bankAccounts ?? []), {
          id: crypto.randomUUID(), bank, holder, lastFour, ifsc,
        }] }));
        setResult('Simulated bank account saved.');
      }}>
        <div className="form-row"><label>Bank<input name="bank" required maxLength={80}/></label>
          <label>Account holder<input name="holder" required maxLength={80}/></label>
          <label>Last four digits<input name="lastFour" inputMode="numeric" pattern="[0-9]{4}" required/></label>
          <label>IFSC<input name="ifsc" required maxLength={11}/></label></div>
        <button className="button secondary">Save demo bank account</button>
      </form>
      {(data.bankAccounts ?? []).map(account => <p key={account.id}>{account.bank} · {account.holder} · •••• {account.lastFour} · {account.ifsc}</p>)}
    </div>}
    <div className="table-wrap mobile-scroll-table" tabIndex={0} role="region" aria-label="Pending payment records">
      <table><thead><tr><th>Pending reference</th><th>Student</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>{pending.map(payment => <tr key={payment.id}>
          <td>{payment.reference}</td><td>{data.students.find(student => student.id === payment.studentId)?.name}</td>
          <td><Currency value={payment.amount}/></td><td><Status>Pending</Status></td>
        </tr>)}</tbody>
      </table>
      {!pending.length && <p className="empty-state">No pending payments.</p>}
    </div>
  </section>;
}
