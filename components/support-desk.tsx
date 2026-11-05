'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { SchoolFinance } from '@/lib/school-finance';

export default function SupportDesk({ data, setData, ownerId }: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  ownerId?: string;
}) {
  const [message, setMessage] = useState('');
  const rows = (data.supportTickets ?? []).filter(ticket => !ownerId || ticket.ownerId === ownerId);
  return <section className="card">
    <div className="premium-card-heading"><div><h3>Support requests</h3><p>Track questions and replies within this campus.</p></div></div>
    {ownerId && <div className="premium-dialog" style={{maxWidth: 640}}><form onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const subject = String(fields.get('subject')).trim();
      const detail = String(fields.get('detail')).trim();
      if (!subject || !detail) return;
      setData(current => ({ ...current, supportTickets: [...(current.supportTickets ?? []), {
        id: crypto.randomUUID(), ownerId, subject, detail, status: 'Open',
      }] }));
      setMessage('Support request submitted.');
    }}>
      <label>Subject<input name="subject" maxLength={80} required/></label>
      <label>Details<textarea name="detail" maxLength={1000} required rows={3}/></label>
      <button className="button primary">Submit support request</button>
    </form></div>}
    {message && <p className="info-strip" role="status">{message}</p>}
    {rows.map(ticket => <div className="notification-row" key={ticket.id}>
      <h3>{ticket.subject} · {ticket.status}</h3><p>{ticket.ownerId} · {ticket.detail}</p>
      {ticket.reply && <p>Reply: {ticket.reply}</p>}
      {!ownerId && ticket.status === 'Open' && <form onSubmit={event => {
        event.preventDefault();
        const reply = String(new FormData(event.currentTarget).get('reply')).trim();
        if (!reply) return;
        setData(current => ({ ...current, supportTickets: current.supportTickets?.map(row =>
          row.id === ticket.id ? { ...row, reply, status: 'Resolved' } : row) }));
      }}><label>Reply<input name="reply" maxLength={300} required/></label><button className="button secondary">Reply and resolve</button></form>}
    </div>)}
    {!rows.length && <p className="empty-state">No support requests.</p>}
  </section>;
}
