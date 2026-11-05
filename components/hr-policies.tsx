'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { AS_OF, round, type SchoolFinance } from '@/lib/school-finance';
import { categoryBalance, defaultLeaveRules, type LeaveRule } from '@/lib/hr';

export default function HrPolicies({ data, setData }: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
}) {
  const rules = data.leaveRules ?? defaultLeaveRules;
  const [selected, setSelected] = useState(rules[0]?.name ?? '');
  const [employeeId, setEmployeeId] = useState(data.staff[0]?.id ?? '');
  const [date, setDate] = useState(AS_OF);
  const current = rules.find(rule => rule.name === selected);
  return <section className="card">
    <div className="premium-card-heading"><div><h3>Leave category policies</h3><p>Set paid treatment, annual entitlement, monthly accrual and carry-forward.</p></div></div>
    <div className="premium-dialog" style={{maxWidth: 820}}>
      <label>Policy<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Create a category</option>{rules.map(rule => <option key={rule.name}>{rule.name}</option>)}</select></label>
      <form key={selected} onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const name = current?.name ?? String(fields.get('name')).trim();
        if (!name) return;
        const rule: LeaveRule = {
          name, paid: fields.has('paid'), halfDay: fields.has('halfDay'), excludeNonWorking: fields.has('excludeNonWorking'), encashRate: Number(fields.get('encashRate')),
          departments: String(fields.get('departments')).split(',').map(value => value.trim()).filter(Boolean),
          employmentTypes: String(fields.get('employmentTypes')).split(',').map(value => value.trim()).filter(Boolean),
          probationDays: Number(fields.get('probationDays')),
          annual: Number(fields.get('annual')), monthly: Number(fields.get('monthly')),
          carryLimit: Number(fields.get('carry')), expiryMonth: Number(fields.get('expiry')),
        };
        setData(state => ({ ...state, leaveRules: [...(state.leaveRules ?? defaultLeaveRules).filter(item => item.name !== name), rule] }));
        setSelected(name);
      }}>
        {!current && <label>New category name<input name="name" required maxLength={60}/></label>}
        <div className="form-row">
          <label>Paid leave<input type="checkbox" name="paid" defaultChecked={current?.paid ?? true}/></label>
          <label>Allow half-days<input type="checkbox" name="halfDay" defaultChecked={current?.halfDay ?? true}/></label>
          <label>Exclude weekends and holidays<input type="checkbox" name="excludeNonWorking" defaultChecked={current?.excludeNonWorking ?? false}/></label><label>Annual days<input name="annual" type="number" min="0" max="366" step="0.5" defaultValue={current?.annual ?? 12} required/></label>
          <label>Monthly accrual<input name="monthly" type="number" min="0" max="31" step="0.01" defaultValue={current?.monthly ?? 0} required/></label>
          <label>Carry-forward cap<input name="carry" type="number" min="0" max="366" step="0.5" defaultValue={current?.carryLimit ?? 0} required/></label>
          <label>Encashment rate per day<input name="encashRate" type="number" min="0" step="0.01" defaultValue={current?.encashRate ?? 0} required/></label><label>Carry expiry month<input name="expiry" type="number" min="1" max="12" defaultValue={current?.expiryMonth ?? 12} required/></label>
        </div>
        <div className="form-row">
          <label>Eligible departments, comma separated<input name="departments" defaultValue={current?.departments?.join(', ')} maxLength={180}/></label>
          <label>Eligible employment types, comma separated<input name="employmentTypes" defaultValue={current?.employmentTypes?.join(', ')} maxLength={180}/></label>
          <label>Minimum days since joining<input name="probationDays" type="number" min="0" max="730" defaultValue={current?.probationDays ?? 0} required/></label>
        </div>
        <button className="button primary">Save leave policy</button>
      </form>
      <div className="form-row">
        <label>Employee balance<select value={employeeId} onChange={event => setEmployeeId(event.target.value)}>{data.staff.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label>As of<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label>
      </div>
      {date && rules.map(rule => <p key={rule.name}>{rule.name} · {rule.paid ? categoryBalance(data, employeeId, rule.name, date) + ' paid days available' : 'Unpaid category'}</p>)}
      <h3>Leave encashment</h3>
      <form onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const category = String(form.get('category'));
        const days = Number(form.get('days'));
        const period = String(form.get('period'));
        const rate = rules.find(rule => rule.name === category && rule.paid)?.encashRate ?? 0;
        if (!rate || days > categoryBalance(data, employeeId, category, period + '-01')) return;
        setData(state => ({ ...state, encashments: [...(state.encashments ?? []), {
          id: crypto.randomUUID(), employeeId, category, days, period, amount: round(days * rate), status: 'Pending',
        }] }));
      }}>
        <div className="form-row"><label>Category<select name="category" required><option value="">Select eligible category</option>{rules.filter(rule => rule.paid && rule.encashRate).map(rule => <option key={rule.name}>{rule.name}</option>)}</select></label>
          <label>Days<input name="days" type="number" min="0.5" step="0.5" required/></label>
          <label>Payroll month<input name="period" type="month" defaultValue={AS_OF.slice(0, 7)} required/></label></div>
        <button className="button secondary">Request encashment for selected employee</button>
      </form>
      {(data.encashments ?? []).filter(row => row.employeeId === employeeId).map(row => {
        const locked = data.payroll?.some(item => item.employeeId === employeeId && item.period === row.period && item.status !== 'Draft')
          || (row.period === AS_OF.slice(0, 7) && data.salaryPayments.some(item => item.staffId === employeeId));
        const eligible = row.days <= categoryBalance(data, employeeId, row.category, row.period + '-01');
        return <div className="notification-row" key={row.id}>
          <p>{row.category} · {row.days} days · ₹{row.amount} · {row.period} · {row.status}</p>
          {row.status === 'Pending' && <div className="row-actions">{(['Approved', 'Rejected'] as const).map(status =>
            <button className="button secondary" key={status} disabled={status === 'Approved' && (locked || !eligible)} onClick={() => setData(state => ({
              ...state, encashments: state.encashments?.map(item => item.id === row.id && item.status === 'Pending' ? { ...item, status } : item),
            }))}>{status === 'Approved' ? 'Approve encashment' : 'Reject encashment'}</button>,
          )}</div>}
        </div>;
      })}
    </div>
  </section>;
}
