'use client';

import { cashEntries, fiscalEntries, totals } from '@/lib/accounting';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { AS_OF, studentLedger, type SchoolFinance } from '@/lib/school-finance';
import { openingPeriod } from '@/lib/payroll';
import { Currency, downloadCSV } from './finance-ui';

export default function ErpRegisters({ page, data, setData }: {
  page: string;
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
}) {
  const [date, setDate] = useState(AS_OF);
  const [year, setYear] = useState(Number(AS_OF.slice(0,4)));
  const [period, setPeriod] = useState(openingPeriod);
  const [message, setMessage] = useState('');

  if (page === 'Employee attendance') {
    const entries = data.employeeAttendance ?? [];
    const getStatus = (id: string) => entries.find(entry => entry.date === date && entry.employeeId === id)?.status ?? '';
    return <section className="card">
      <div className="premium-card-heading"><div><h3>Employee attendance</h3><p>Absences and half-days feed monthly payroll. Approved leave takes precedence.</p></div>
        <button className="button secondary" onClick={() => downloadCSV('employee-attendance.csv', [
          ['Employee ID', 'Date', 'Status'], ...entries.map(entry => [entry.employeeId, entry.date, entry.status]),
        ])}>Export history</button>
      </div>
      <div className="list-toolbar"><label>Attendance date <input type="date" value={date} onChange={event => { setDate(event.target.value); setMessage(''); }}/></label></div>
      {message && <p className="info-strip" role="status">{message}</p>}
      <div className="table-wrap mobile-scroll-table" role="region" aria-label="Employee attendance register" tabIndex={0}>
        <table><thead><tr><th>Employee</th><th>Department</th><th>Attendance</th></tr></thead><tbody>
          {data.staff.map(employee => {
            const payrollLocked = data.finalizedAttendance?.includes(date.slice(0, 7)) || data.payroll?.some(row => row.employeeId === employee.id && row.period === date.slice(0, 7) && row.status !== 'Draft');
            const legacyLocked = date.startsWith(openingPeriod) && data.salaryPayments.some(payment => payment.staffId === employee.id);
            const approvedLeave = data.leaves.find(leave => {
              const elapsed = (Date.parse(date) - Date.parse(leave.from)) / 86400000;
              return leave.staffId === employee.id && leave.status === 'Approved' && (leave.coveredDates ? leave.coveredDates.includes(date) : elapsed >= 0 && elapsed < Math.ceil(leave.days));
            });
            return <tr key={employee.id}><td>{employee.name}</td><td>{employee.subject}</td>
              <td>{approvedLeave ? approvedLeave.kind + ' approved leave' : <select aria-label={'Attendance for ' + employee.name} value={getStatus(employee.id)} disabled={!date || payrollLocked || legacyLocked} onChange={event => {
                const status = event.target.value;
                setData(current => {
                  const otherEntries = (current.employeeAttendance ?? []).filter(entry => entry.employeeId !== employee.id || entry.date !== date);
                  return { ...current, employeeAttendance: status ? [...otherEntries, { employeeId: employee.id, date, status }] : otherEntries };
                });
                setMessage('Attendance saved for ' + employee.name + '.');
              }}>
                <option value="">Unmarked</option>
                {['Present', 'Absent', 'Half-day', 'Late arrival', 'Early departure', 'Work from home', 'Holiday', 'Weekly off'].map(status => <option key={status}>{status}</option>)}
              </select>}{(payrollLocked || legacyLocked) && <small className="block">Payroll locked</small>}</td>
            </tr>;
          })}
        </tbody></table>
      </div>
    </section>;
  }

  const entries = cashEntries(data).filter(row => row.date.startsWith(period));
  const { receipts: income, outflows: outflow } = totals(entries);
  const annual = fiscalEntries(data, year);
  const annualTotals = totals(annual);
  const closing = data.financialCloses?.find(item => item.year === year);
  const due = data.students.reduce((sum, student) => sum + studentLedger(student, data.payments).due, 0);
  return <section className="card">
    <div className="premium-card-heading"><div><h3>Cash flow register</h3><p>Verified fees and completed salary transfers from this workspace.</p></div>
      <button className="button secondary" onClick={() => downloadCSV('cash-flow-' + period + '.csv', [
        ['Date', 'Reference', 'Type', 'Net movement'], ...entries.map(entry => [entry.date, entry.reference, entry.type, entry.amount]),
      ])}>Export cash flow</button>
    </div>
    <div className="list-toolbar"><label>Transaction month <input type="month" value={period} onChange={event => setPeriod(event.target.value)}/></label></div>
    <div className="info-strip">Fees received <Currency value={income}/> · Total outflows <Currency value={outflow}/> · Net cash movement <Currency value={income - outflow}/> · Current fee dues <Currency value={due}/></div>
    <div className="table-wrap mobile-scroll-table" role="region" aria-label="Cash flow transactions" tabIndex={0}>
      <table><thead><tr><th>Date</th><th>Reference</th><th>Department</th><th>Type</th><th>Movement</th></tr></thead>
        <tbody>{entries.map(entry => <tr key={entry.type + entry.id}><td>{entry.date}</td><td>{entry.reference}</td><td>{entry.type}</td><td><Currency value={entry.amount}/></td></tr>)}</tbody>
      </table>
      {!entries.length && <p className="empty-state">No settled transactions in this period.</p>}
    </div>
    <div className="premium-dialog" style={{maxWidth: 740}}>
      <h3>Department expenses</h3>
      <form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const reference = String(fields.get('reference')).trim().toUpperCase();
        const department = String(fields.get('department')).trim();
        const amount = Number(fields.get('amount'));
        const date = String(fields.get('date'));
        if (!reference || !department || !Number.isFinite(amount) || amount <= 0 || cashEntries(data).some(row => row.reference.toUpperCase() === reference)) {
          setMessage('Enter a unique expense reference, department and positive amount.');
          return;
        }
        setData(current => ({ ...current, expenses: [...(current.expenses ?? []), { id: crypto.randomUUID(), reference, department, amount: -amount, date, type: 'Department expense' }] }));
        setMessage('Expense recorded.');
      }}><div className="form-row"><label>Reference<input name="reference" maxLength={50} required/></label><label>Department<input name="department" maxLength={80} required/></label>
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Date<input name="date" type="date" defaultValue={AS_OF} required/></label></div>
        <button className="button secondary">Record expense</button>
      </form>
      <h3>Financial year summary and closing snapshot</h3>
      <label>Financial year starts in April<input type="number" min="2000" max="2100" value={year} onChange={event => setYear(Number(event.target.value))}/></label>
      <p>Receipts <Currency value={annualTotals.receipts}/> · Outflows <Currency value={annualTotals.outflows}/> · Net <Currency value={annualTotals.net}/></p>
      <div className="row-actions">
        <button className="button secondary" disabled={!Number.isInteger(year) || year < 2000 || year > 2100 || !!closing} onClick={() => {
          setData(current => current.financialCloses?.some(item => item.year === year) ? current : {
            ...current, financialCloses: [...(current.financialCloses ?? []), {
              year, entries: fiscalEntries(current, year), closedAt: new Date().toISOString(), ...totals(fiscalEntries(current, year)),
            }],
          });
          setMessage('Financial year snapshot saved.');
        }}>Save closing snapshot</button>
        <button className="button secondary" onClick={() => downloadCSV('financial-year-' + year + '.csv', [
          ['Date', 'Reference', 'Department', 'Type', 'Amount'],
          ...(closing?.entries ?? annual).map(entry => [entry.date, entry.reference, entry.department, entry.type, entry.amount]),
        ])}>Export {closing ? 'closing snapshot' : 'financial year'}</button>
      </div>
      {closing && <p>Snapshot saved {closing.closedAt.slice(0, 10)} · {closing.entries.length} entries.</p>}
      {message && <p role="status">{message}</p>}
    </div>
  </section>;
}
