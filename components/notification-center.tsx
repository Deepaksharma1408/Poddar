'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { AS_OF, studentLedger, type NotificationDispatch, type SchoolFinance } from '@/lib/school-finance';
import { moneyPrecise as money } from '@/lib/finance';
import { Bell, Send, CheckCircle2, AlertTriangle, ShieldCheck, Filter } from 'lucide-react';

export interface NotificationEvent {
  id: string;
  category: 'Fee Due' | 'Overdue Alert' | 'Payment Success' | 'Partial Payment' | 'Receipt' | 'Leave Decision' | 'Salary Processing' | 'Payslip' | 'NEFT Failure' | 'Salary Settlement';
  subject: string;
  recipient: string;
  priority: 'high' | 'normal' | 'low';
}

export default function NotificationCenter({
  data,
  setData,
}: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
}) {
  const [channel, setChannel] = useState('In-app');
  const [filter, setFilter] = useState<string>('All');
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // 1. Fee due reminders & 2. Overdue reminders (dynamically calculated based on current ledger)
  const feeReminders: NotificationEvent[] = data.students.flatMap(student => {
    const ledger = studentLedger(student, data.payments);
    // If student has paid in full, reminders stop completely!
    if (ledger.remaining <= 0) return [];

    const events: NotificationEvent[] = [];
    if (ledger.due > 0) {
      // Overdue reminder
      events.push({
        id: `overdue/${student.id}`,
        category: 'Overdue Alert',
        subject: `OVERDUE NOTICE: Outstanding fee of ${money(ledger.due)} for ${student.name} is past due date. Remaining balance: ${money(ledger.remaining)}.`,
        recipient: `${student.name} / ${student.guardian}`,
        priority: 'high',
      });
    } else if (ledger.upcoming > 0 && ledger.next) {
      // Fee due reminder
      events.push({
        id: `fee-due/${student.id}`,
        category: 'Fee Due',
        subject: `Fee Due Reminder: Upcoming installment of ${money(ledger.next.amount)} due on ${ledger.next.date}. Total balance: ${money(ledger.remaining)}.`,
        recipient: `${student.name} / ${student.guardian}`,
        priority: 'normal',
      });
    }
    return events;
  });

  // 3. Successful payment notifications, 4. Partial payment notifications & 5. Receipt notifications
  const paymentEvents: NotificationEvent[] = data.payments.flatMap(payment => {
    const student = data.students.find(s => s.id === payment.studentId);
    if (!student) return [];
    const ledger = studentLedger(student, data.payments);
    const recipient = `${student.name} / ${student.guardian}`;

    if (!payment.verified) {
      return [{
        id: `payment-pending/${payment.id}`,
        category: 'Partial Payment',
        subject: `Payment Verification Pending: ${money(payment.amount)} via ${payment.method} (Ref: ${payment.reference}) awaiting bank clearance.`,
        recipient,
        priority: 'normal',
      }];
    }

    const events: NotificationEvent[] = [];
    if (ledger.remaining === 0) {
      events.push({
        id: `payment-success/${payment.id}`,
        category: 'Payment Success',
        subject: `Payment Verified & Settled: ${money(payment.amount)} credited via ${payment.method} (Ref: ${payment.reference}). Account cleared in full!`,
        recipient,
        priority: 'normal',
      });
    } else {
      events.push({
        id: `payment-partial/${payment.id}`,
        category: 'Partial Payment',
        subject: `Partial Payment Confirmed: ${money(payment.amount)} credited via ${payment.method} (Ref: ${payment.reference}). Remaining balance: ${money(ledger.remaining)}.`,
        recipient,
        priority: 'normal',
      });
    }

    // Receipt notification
    events.push({
      id: `receipt/${payment.id}`,
      category: 'Receipt',
      subject: `Official Digital Receipt Available: Download receipt #${payment.reference} for ${money(payment.amount)}.`,
      recipient,
      priority: 'low',
    });

    return events;
  });

  // 6. Leave approval / rejection notifications
  const leaveEvents: NotificationEvent[] = data.leaves.flatMap((leave: any): NotificationEvent[] => {
    const employee = data.staff.find(e => e.id === leave.staffId);
    if (!employee) return [];
    const recipient = employee.name;

    if (leave.status === 'Approved') {
      return [{
        id: `leave-approved/${leave.id}`,
        category: 'Leave Decision',
        subject: `Leave Request Approved: ${leave.category} for ${leave.chargedDays ?? leave.days} days starting ${leave.from}. ${leave.approvalRemarks ? `Remarks: ${leave.approvalRemarks}` : ''}`,
        recipient,
        priority: 'normal',
      }];
    }
    if (leave.status === 'Rejected') {
      return [{
        id: `leave-rejected/${leave.id}`,
        category: 'Leave Decision',
        subject: `Leave Request Rejected: ${leave.category} (${leave.from}). ${leave.approvalRemarks ? `Reason: ${leave.approvalRemarks}` : ''}`,
        recipient,
        priority: 'high',
      }];
    }
    if (leave.status === 'Clarification') {
      return [{
        id: `leave-clarify/${leave.id}`,
        category: 'Leave Decision',
        subject: `Action Required - Leave Clarification: ${leave.approvalRemarks ?? 'Please provide details'} for ${leave.category}.`,
        recipient,
        priority: 'high',
      }];
    }
    return [];
  });

  // 7. Salary processing, 8. Payslip, 9. NEFT failure & 10. Successful salary payment notifications
  const payrollEvents: NotificationEvent[] = (data.payroll ?? []).flatMap(row => {
    const events: NotificationEvent[] = [];

    // Payslip notification (for approved, processing or paid)
    if (['Approved', 'Processing', 'Paid'].includes(row.status)) {
      events.push({
        id: `payslip/${row.id}`,
        category: 'Payslip',
        subject: `Monthly Payslip Available: Your ${row.period} payslip (${money(row.calculation.net)}) is ready for download.`,
        recipient: row.name,
        priority: 'normal',
      });
    }

    // Salary processing notification
    if (row.status === 'Processing') {
      events.push({
        id: `salary-processing/${row.id}`,
        category: 'Salary Processing',
        subject: `Salary Disbursement in Process: ${row.period} net pay of ${money(row.calculation.net)} queued in ${row.mode ?? 'NEFT'} batch ${row.batch ?? 'BATCH-1'}.`,
        recipient: row.name,
        priority: 'normal',
      });
    }

    // NEFT failure notification
    if (row.status === 'Failed') {
      events.push({
        id: `neft-failed/${row.id}`,
        category: 'NEFT Failure',
        subject: `URGENT - Transfer Failed: Simulated ${row.mode ?? 'NEFT'} transfer of ${money(row.calculation.net)} for ${row.name} (${row.period}) failed. Retry scheduled.`,
        recipient: `HR / Accounts & ${row.name}`,
        priority: 'high',
      });
    }

    // Successful salary payment notification
    if (row.status === 'Paid') {
      events.push({
        id: `salary-settled/${row.id}`,
        category: 'Salary Settlement',
        subject: `Salary Successfully Disbursed: ${money(row.calculation.net)} credited to account via ${row.mode ?? 'NEFT'} (UTR: ${row.reference}) for ${row.period}.`,
        recipient: row.name,
        priority: 'normal',
      });
    }

    return events;
  });

  const allEvents: NotificationEvent[] = [
    ...feeReminders,
    ...paymentEvents,
    ...leaveEvents,
    ...payrollEvents,
  ];

  const filteredEvents = allEvents.filter(e => {
    if (filter === 'All') return true;
    if (filter === 'Fees') return ['Fee Due', 'Overdue Alert', 'Payment Success', 'Partial Payment', 'Receipt'].includes(e.category);
    if (filter === 'Leave') return e.category === 'Leave Decision';
    if (filter === 'Payroll') return ['Salary Processing', 'Payslip', 'NEFT Failure', 'Salary Settlement'].includes(e.category);
    return true;
  });

  function dispatchSingle(event: NotificationEvent) {
    const dispatch: NotificationDispatch = {
      id: crypto.randomUUID(),
      subject: event.subject,
      recipient: event.recipient,
      channel,
      date: AS_OF,
    };
    setData(current => ({
      ...current,
      notificationDispatches: [dispatch, ...(current.notificationDispatches ?? [])],
    }));
    showToast(`Dispatched via ${channel} to ${event.recipient}`);
  }

  function dispatchAll() {
    const dispatches: NotificationDispatch[] = filteredEvents.map(e => ({
      id: crypto.randomUUID(),
      subject: e.subject,
      recipient: e.recipient,
      channel,
      date: AS_OF,
    }));
    setData(current => ({
      ...current,
      notificationDispatches: [...dispatches, ...(current.notificationDispatches ?? [])],
    }));
    showToast(`Dispatched ${dispatches.length} alerts via ${channel}.`);
  }

  return (
    <>
      <section className="card">
        <div className="premium-card-heading">
          <div>
            <h3>Enterprise Notification &amp; Reminder Center</h3>
            <p>
              Automated reminders, fee alerts, receipt links, leave statuses and payroll transfer confirmations.
            </p>
          </div>
          <button className="button primary" onClick={dispatchAll} disabled={!filteredEvents.length}>
            <Send size={14} /> Dispatch All ({filteredEvents.length})
          </button>
        </div>

        {toast && (
          <div className="info-strip positive" style={{ marginBottom: 12 }}>
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
        )}

        <div className="list-toolbar">
          <label>
            Simulation Channel
            <select value={channel} onChange={event => setChannel(event.target.value)}>
              {['In-app', 'Email', 'SMS', 'WhatsApp', 'Push Notification'].map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <div className="segmented">
            {['All', 'Fees', 'Leave', 'Payroll'].map(tab => (
              <button
                key={tab}
                type="button"
                className={filter === tab ? 'selected' : ''}
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap mobile-scroll-table">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Message Content</th>
                <th>Recipient</th>
                <th>Priority</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(event => (
                <tr key={event.id}>
                  <td>
                    <span className={`plan-tag ${event.category.includes('Overdue') || event.category.includes('Failure') ? 'unpaid-leave' : 'paid-leave'}`}>
                      {event.category}
                    </span>
                  </td>
                  <td>
                    <strong>{event.subject}</strong>
                  </td>
                  <td>{event.recipient}</td>
                  <td>
                    <span className={`badge ${event.priority === 'high' ? 'danger' : 'success'}`}>
                      <i /> {event.priority.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button
                      className="button secondary small"
                      onClick={() => dispatchSingle(event)}
                    >
                      <Send size={12} /> Send {channel}
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredEvents.length && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No active alerts in this category. All balances and requests are current.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="premium-card-heading">
          <div>
            <h3>Simulated Dispatch Audit History</h3>
            <p>Chronological record of all notifications delivered across institutional channels.</p>
          </div>
          {(data.notificationDispatches ?? []).length > 0 && (
            <button
              className="button secondary small"
              onClick={() => setData(d => ({ ...d, notificationDispatches: [] }))}
            >
              Clear Log
            </button>
          )}
        </div>
        <div className="table-wrap mobile-scroll-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Channel</th>
                <th>Recipient</th>
                <th>Delivered Message</th>
                <th>Delivery Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.notificationDispatches ?? []).map(row => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>
                    <span className="badge success">{row.channel}</span>
                  </td>
                  <td>{row.recipient}</td>
                  <td>{row.subject}</td>
                  <td>
                    <span className="status-pill good">
                      <i /> Delivered
                    </span>
                  </td>
                </tr>
              ))}
              {!(data.notificationDispatches ?? []).length && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No notifications dispatched yet in this browser session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
