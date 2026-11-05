'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { AS_OF, studentLedger, type SchoolFinance } from '@/lib/school-finance';
import { assessLateFees, assignAdjustment, refundFee, type FeeAdjustment } from '@/lib/erp-management';
import { Currency, downloadCSV } from './finance-ui';

const categories = ['Charge', 'Concession', 'Scholarship', 'Waiver', 'Late fee'] as const;
const feeHeads = ['Tuition', 'Admission', 'Registration', 'Development', 'Library', 'Laboratory', 'Examination', 'IT and computer', 'University', 'Hostel', 'Transport', 'Security deposit', 'Miscellaneous'];

export default function FeeAdministration({ data, setData }: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
}) {
  const [message, setMessage] = useState('');
  const [group, setGroup] = useState('');
  const [batch, setBatch] = useState('');
  const students = data.students.filter(student => (!group || student.class === group) && (!batch || student.batch === batch));
  return <>
    <section className="card">
      <div className="premium-card-heading"><div><h3>Fee assignments and adjustments</h3><p>Post individual or bulk charges and credits to the existing fee schedule.</p></div></div>
      <div className="premium-dialog" style={{maxWidth: 780}}>
        <form onSubmit={event => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const target = String(fields.get('student'));
          const ids = students.filter(student => !target || student.id === target).map(student => student.id);
          const adjustment: FeeAdjustment = {
            id: crypto.randomUUID(), category: String(fields.get('category')) as FeeAdjustment['category'],
            label: String(fields.get('label')).trim(), date: String(fields.get('date')), amount: Number(fields.get('amount')),
          };
          if (assignAdjustment(data, ids, adjustment) === data) {
            setMessage('Check the amount, selection and outstanding balances. Credits cannot exceed any selected balance.');
            return;
          }
          setData(current => assignAdjustment(current, ids, adjustment));
          setMessage('Posted to ' + ids.length + ' student accounts.');
        }}>
          <div className="form-row">
            <label>Class or programme / semester<select value={group} onChange={event => setGroup(event.target.value)}><option value="">All groups</option>{[...new Set(data.students.map(student => student.class))].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Batch<select value={batch} onChange={event => setBatch(event.target.value)}><option value="">All batches</option>{[...new Set(data.students.flatMap(student => student.batch ? [student.batch] : []))].map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
          <label>Apply to<select name="student" key={group + '/' + batch}><option value="">All {students.length} matching students</option>{students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.id}</option>)}</select></label>
          <div className="form-row">
            <label>Entry type<select name="category">{categories.map(category => <option key={category}>{category}</option>)}</select></label>
            <label>Fee component or reason<input name="label" list="fee-heads" required maxLength={80}/><datalist id="fee-heads">{feeHeads.map(head => <option key={head} value={head}/>)}</datalist></label>
            <label>Amount per student<input name="amount" type="number" required min="0.01" step="0.01"/></label>
            <label>Effective date<input name="date" type="date" required defaultValue={AS_OF}/></label>
          </div>
          <button className="button primary" disabled={!students.length}>Post fee adjustment</button>
        </form>
        <form onSubmit={event => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const name = String(fields.get('templateName')).trim();
          const components = String(fields.get('components')).split(/\r?\n/).filter(line => line.trim()).map(line => {
            const [label, amount] = line.split(',');
            return { label: label.trim(), amount: Number(amount) };
          });
          if (!name || !components.length || components.some(item => !item.label || !Number.isFinite(item.amount) || item.amount <= 0)) {
            setMessage('Enter a name and positive component amounts using component,amount on each line.');
            return;
          }
          const cycle = fields.get('cycle') === 'Semester' ? 'Semester' : 'Annual';
          setData(current => ({ ...current, feeTemplates: [...(current.feeTemplates ?? []), { id: crypto.randomUUID(), name, components, cycle }] }));
          setMessage('Fee structure saved.');
        }}>
          <h3>Reusable fee structures</h3>
          <div className="form-row"><label>Structure name<input name="templateName" required maxLength={70}/></label>
            <label>Cycle<select name="cycle"><option>Annual</option><option>Semester</option></select></label></div>
          <label>Components, one per line<textarea name="components" required rows={3} maxLength={4000} placeholder="Tuition,12000"/></label>
          <button className="button secondary">Save structure</button>
        </form>
        {!!data.feeTemplates?.length && <form onSubmit={event => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const template = data.feeTemplates?.find(item => item.id === fields.get('template'));
          const date = String(fields.get('effective'));
          if (!template || !students.length) return;
          const entries: FeeAdjustment[] = template.components.map((item, index) => ({
            ...item, label: template.name + ' · ' + item.label, date, category: 'Charge',
            id: template.id + '/' + date + '/' + index,
          }));
          setData(current => entries.reduce((state, entry) => {
            const ids = students.filter(student => !state.students.find(row => row.id === student.id)?.adjustments?.some(item => item.id === entry.id)).map(student => student.id);
            return assignAdjustment(state, ids, entry);
          }, current));
          setMessage('Structure applied to matching students. Existing assignments for this date were skipped.');
        }}>
          <div className="form-row"><label>Saved structure<select name="template">{data.feeTemplates.map(item => <option key={item.id} value={item.id}>{item.name} · {item.cycle}</option>)}</select></label>
            <label>Due date<input name="effective" type="date" defaultValue={AS_OF} required/></label></div>
          <button className="button secondary" disabled={!students.length}>Assign structure to {students.length} matching students</button>
        </form>}
        <form onSubmit={event => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const ids = students.map(student => student.id);
          const amount = Number(fields.get('lateAmount'));
          const grace = Number(fields.get('grace'));
          const next = assessLateFees(data, ids, amount, grace);
          if (next === data) { setMessage('No unassessed overdue balances match this rule.'); return; }
          setData(current => assessLateFees(current, ids, amount, grace));
          setMessage('Late fees assessed for eligible accounts.');
        }}>
          <h3>Assess overdue fees</h3>
          <div className="form-row"><label>Flat late fee<input name="lateAmount" type="number" min="0.01" step="0.01" required/></label>
            <label>Grace days<input name="grace" type="number" min="0" max="365" defaultValue="7" required/></label></div>
          <button className="button secondary" disabled={!students.length}>Assess late fees for matching students</button>
        </form>
      </div>
    </section>
    <section className="card">
      <div className="premium-card-heading"><div><h3>Fee refunds</h3><p>Record a simulated refund against a verified receipt. The original transaction stays in history.</p></div></div>
      <div className="premium-dialog" style={{maxWidth: 780}}>
        <form onSubmit={event => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const id = String(fields.get('payment'));
          const amount = Number(fields.get('amount'));
          const reference = String(fields.get('reference'));
          if (refundFee(data, id, amount, reference) === data) {
            setMessage('Use a unique reference and an amount within the remaining refundable balance.');
            return;
          }
          setData(current => refundFee(current, id, amount, reference));
          setMessage('Simulated refund recorded and fee balance updated.');
        }}>
          <label>Verified receipt<select name="payment" required><option value="">Select receipt</option>{data.payments.filter(payment => payment.verified && !payment.refundFor).map(payment =>
            <option key={payment.id} value={payment.id}>{payment.reference} · {data.students.find(student => student.id === payment.studentId)?.name} · ₹{payment.amount}</option>,
          )}</select></label>
          <div className="form-row"><label>Refund amount<input name="amount" type="number" required min="0.01" step="0.01"/></label><label>Refund reference<input name="reference" required maxLength={50}/></label></div>
          <button className="button primary">Record simulated refund</button>
        </form>
      </div>
      {message && <p className="info-strip" role="status">{message}</p>}
    </section>
    <section className="card">
      <div className="premium-card-heading"><div><h3>Pending payment exceptions</h3><p>Record failure or cancellation with a reason and keep the original reference.</p></div></div>
      <div className="premium-dialog" style={{maxWidth: 780}}><form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const id = String(fields.get('payment'));
        const statusReason = String(fields.get('reason')).trim();
        if (!id || !statusReason) return;
        const inactiveStatus = fields.get('status') === 'Failed' ? 'Failed' : 'Cancelled';
        setData(current => ({ ...current, payments: current.payments.map(payment =>
          payment.id === id && !payment.verified && !payment.inactiveStatus ? { ...payment, inactiveStatus, statusReason } : payment) }));
        setMessage('Payment exception recorded.');
      }}>
        <label>Pending transaction<select name="payment" required><option value="">Select transaction</option>
          {data.payments.filter(payment => !payment.verified && !payment.inactiveStatus).map(payment => <option key={payment.id} value={payment.id}>{payment.reference}</option>)}
        </select></label>
        <div className="form-row"><label>Outcome<select name="status"><option>Failed</option><option>Cancelled</option></select></label>
          <label>Reason<input name="reason" required maxLength={120}/></label></div>
        <button className="button secondary">Record exception</button>
      </form></div>
      <div className="table-wrap mobile-scroll-table"><table><thead><tr><th>Reference</th><th>Outcome</th><th>Reason</th></tr></thead>
        <tbody>{data.payments.filter(payment => payment.inactiveStatus).map(payment => <tr key={payment.id}><td>{payment.reference}</td><td>{payment.inactiveStatus}</td><td>{payment.statusReason}</td></tr>)}</tbody>
      </table></div>
    </section>
    <section className="card">
      <div className="premium-card-heading"><div><h3>Fee adjustment history</h3></div><button className="button secondary" onClick={() => downloadCSV('fee-adjustments.csv', [
        ['Student ID', 'Date', 'Category', 'Component', 'Amount'],
        ...students.flatMap(student => (student.adjustments ?? []).map(entry => [student.id, entry.date, entry.category, entry.label, entry.amount])),
      ])}>Export history</button></div>
      <div className="table-wrap mobile-scroll-table"><table><thead><tr><th>Student</th><th>Date</th><th>Category</th><th>Component</th><th>Amount</th></tr></thead>
        <tbody>{students.flatMap(student => (student.adjustments ?? []).map(entry => <tr key={student.id + entry.id}><td>{student.name}</td><td>{entry.date}</td><td>{entry.category}</td><td>{entry.label}</td><td><Currency value={entry.amount}/></td></tr>))}</tbody>
      </table></div>
    </section>
  </>;
}
