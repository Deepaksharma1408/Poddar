'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { AS_OF, type SchoolFinance } from '@/lib/school-finance';
import { downloadCSV } from './finance-ui';

export default function PeopleCalendar({ data, setData, canEdit }: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  canEdit: boolean;
}) {
  const [period, setPeriod] = useState(AS_OF.slice(0, 7));
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [notice, setNotice] = useState('');
  const [year, month] = period.split('-').map(Number);
  const staff = data.staff.filter(person => (!department || person.subject === department) && (!employeeId || person.id === employeeId));
  const staffIds = new Set(staff.map(person => person.id));
  const entries = (data.employeeAttendance ?? []).filter(entry => entry.date.startsWith(period) && staffIds.has(entry.employeeId));
  const leaveRows = data.leaves.filter(leave => leave.from.startsWith(period) && staffIds.has(leave.staffId));
  const days = period ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0;
  const finalized = data.finalizedAttendance?.includes(period);
  const corrections = (data.attendanceCorrections ?? []).filter(item => item.date.startsWith(period) && staffIds.has(item.employeeId));
  return <>
    <section className="card">
      <div className="premium-card-heading"><div><h3>Leave and attendance calendar</h3><p>Monthly availability, approved leave, pending requests and campus holidays.</p></div>
        <button className="button secondary" onClick={() => downloadCSV('people-calendar-' + period + '.csv', [
          ['Employee', 'Date', 'Record', 'Status'],
          ...entries.map(entry => [entry.employeeId, entry.date, 'Attendance', entry.status]),
          ...leaveRows.map(entry => [entry.staffId, entry.from, entry.category, entry.status]),
        ])}>Export calendar records</button></div>
      <div className="list-toolbar">
        <label>Month<input type="month" value={period} onChange={event => setPeriod(event.target.value)}/></label>
        <label>Department<select value={department} onChange={event => {setDepartment(event.target.value);setEmployeeId('');}}><option value="">All departments</option>
          {[...new Set(data.staff.map(person => person.subject))].map(option => <option key={option}>{option}</option>)}</select></label>
        <label>Employee<select value={employeeId} onChange={event => setEmployeeId(event.target.value)}><option value="">All employees</option>
          {data.staff.filter(person => !department || person.subject === department).map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
        {canEdit && <button className="button secondary" disabled={!period || finalized || corrections.some(item => item.status === 'Pending')} onClick={() => {
          if ((data.attendanceCorrections ?? []).some(item => item.status === 'Pending' && item.date.startsWith(period))) {
            setNotice('Review all pending corrections for the month first.');
            return;
          }
          setData(current => ({ ...current, finalizedAttendance: [...new Set([...(current.finalizedAttendance ?? []), period])] }));
          setNotice('Attendance finalized for ' + period + '.');
        }}>{finalized ? 'Attendance finalized' : 'Finalize month'}</button>}
      </div>
      {notice && <p className="info-strip" role="status">{notice}</p>}
      <div className="table-wrap mobile-scroll-table"><table><thead><tr><th>Date</th><th>Calendar</th><th>Leave and availability</th><th>Attendance</th></tr></thead><tbody>
        {Array.from({ length: days }, (_, index) => {
          const date = period + '-' + String(index + 1).padStart(2, '0');
          const holiday = data.holidays?.find(item => item.date === date);
          const weekend = [0, 6].includes(new Date(date).getUTCDay());
          const requests = leaveRows.filter(leave => leave.status !== 'Rejected' && leave.status !== 'Cancelled' &&
            (leave.coveredDates ? leave.coveredDates.includes(date) : Date.parse(date) >= Date.parse(leave.from) &&
              Date.parse(date) < Date.parse(leave.from) + Math.ceil(leave.days) * 86400000));
          const unavailable = new Set(requests.filter(leave => leave.status === 'Approved').map(leave => leave.staffId));
          const marks = entries.filter(item => item.date === date);
          return <tr key={date}><td>{date}</td><td>{holiday?.title ?? (weekend ? 'Weekly off' : 'Working day')}</td>
            <td>{!holiday && !weekend && <span>{staff.length - unavailable.size} without approved leave</span>}
              {requests.map(leave => <small key={leave.id} className="block">{staff.find(person => person.id === leave.staffId)?.name} · {leave.kind} · {leave.status}</small>)}</td>
            <td>{marks.map(entry => <small key={entry.employeeId} className="block">{staff.find(person => person.id === entry.employeeId)?.name} · {entry.status}</small>)}</td></tr>;
        })}
      </tbody></table></div>
    </section>
    {canEdit && <section className="card">
      <div className="premium-card-heading"><div><h3>Holidays and vacations</h3></div></div>
      <div className="embedded-form-panel" style={{maxWidth: 740}}><form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const date = String(fields.get('date'));
        const title = String(fields.get('title')).trim();
        if (!title || data.finalizedAttendance?.includes(date.slice(0, 7))) return;
        setData(current => ({ ...current, holidays: [...(current.holidays ?? []).filter(item => item.date !== date), { date, title }] }));
        setNotice('Calendar entry saved.');
      }}><div className="form-row"><label>Date<input type="date" name="date" required defaultValue={AS_OF}/></label><label>Holiday or vacation name<input name="title" maxLength={100} required/></label></div>
        <button className="button secondary">Save calendar entry</button></form></div>
      <div className="premium-card-heading"><div><h3>Attendance correction requests</h3></div></div>
      <div className="table-wrap mobile-scroll-table"><table><thead><tr><th>Employee</th><th>Date</th><th>Requested mark</th><th>Reason</th><th>Review</th></tr></thead>
        <tbody>{corrections.map(item => <tr key={item.id}><td>{data.staff.find(person => person.id === item.employeeId)?.name}</td><td>{item.date}</td><td>{item.mark}</td><td>{item.reason}</td><td>
          {item.status !== 'Pending' ? item.status : <div className="row-actions">{(['Approved','Rejected'] as const).map(status => <button key={status} className="button secondary" disabled={status === 'Approved' && !!finalized} onClick={() => setData(current => {
            if (status === 'Approved' && (current.finalizedAttendance?.includes(period) || current.payroll?.some(row => row.period === period && row.employeeId === item.employeeId && row.status !== 'Draft'))) return current;
            return { ...current, attendanceCorrections: current.attendanceCorrections?.map(row => row.id === item.id ? { ...row, status } : row),
              employeeAttendance: status === 'Approved' ? [...(current.employeeAttendance ?? []).filter(entry => entry.employeeId !== item.employeeId || entry.date !== item.date), { employeeId: item.employeeId, date: item.date, status: item.mark }] : current.employeeAttendance };
          })}>{status === 'Approved' ? 'Approve' : 'Reject'}</button>)}</div>}
        </td></tr>)}</tbody>
      </table></div>
    </section>}
  </>;
}
