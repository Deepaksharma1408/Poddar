'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { SchoolFinance } from '@/lib/school-finance';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  HelpCircle,
  Check,
  User,
} from 'lucide-react';

export default function SupportDesk({
  data,
  setData,
  ownerId,
}: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  ownerId?: string;
}) {
  const [message, setMessage] = useState('');
  const rows = (data.supportTickets ?? []).filter(ticket => !ownerId || ticket.ownerId === ownerId);
  const openCount = rows.filter(t => t.status === 'Open').length;

  return (
    <section className="card" style={{ marginBottom: 28 }}>
      <div className="premium-card-heading">
        <div>
          <h3>
            <MessageSquare size={17} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
            Campus Help &amp; Support Desk
          </h3>
          <p>Track questions, fee clarifications, academic queries, and administrative resolutions.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`status-pill ${openCount > 0 ? 'warning' : 'good'}`}>
            {openCount > 0 ? `${openCount} Open Inquiry` : 'All Resolved'}
          </span>
        </div>
      </div>

      <div className="support-desk-shell">
        {/* Support Request Form for Portal Users (Students, Parents, Faculty) */}
        {ownerId && (
          <div className="support-compose-panel">
            <div className="support-compose-header">
              <h4 className="support-compose-title">
                <Send size={15} color="#234D70" /> Submit New Support Request
              </h4>
              <p className="support-compose-desc">
                Our institutional helpdesk responds within 24 working hours. Your inquiry will be logged under your identity (<strong>{ownerId}</strong>).
              </p>
            </div>

            <form
              onSubmit={event => {
                event.preventDefault();
                const fields = new FormData(event.currentTarget);
                const subject = String(fields.get('subject')).trim();
                const detail = String(fields.get('detail')).trim();
                if (!subject || !detail) return;
                setData(current => ({
                  ...current,
                  supportTickets: [
                    ...(current.supportTickets ?? []),
                    {
                      id: crypto.randomUUID(),
                      ownerId,
                      subject,
                      detail,
                      status: 'Open',
                    },
                  ],
                }));
                setMessage('Support request successfully submitted. Campus administration has been notified.');
                event.currentTarget.reset();
              }}
            >
              <label>
                Subject / Inquiry Topic
                <input
                  name="subject"
                  maxLength={80}
                  placeholder="e.g. Fee installment receipt confirmation / Timetable revision query"
                  required
                />
              </label>

              <label>
                Detailed Message &amp; Explanation
                <textarea
                  name="detail"
                  maxLength={1000}
                  rows={4}
                  placeholder="Please provide complete context or transaction reference so our campus office can assist you quickly..."
                  required
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
                <button type="submit" className="button primary" style={{ minWidth: 200 }}>
                  <Send size={14} /> Submit Support Request
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Confirmation Banner */}
        {message && (
          <div className="info-strip" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46', marginBottom: 20 }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>{message}</span>
          </div>
        )}

        {/* Ticket Feed Header */}
        <div className="portal-section-header" style={{ marginTop: ownerId ? 10 : 0 }}>
          <h4 className="portal-section-title" style={{ fontSize: 14 }}>
            {ownerId ? 'My Logged Support Inquiries' : 'Campus Master Support Inquiries'} ({rows.length})
          </h4>
        </div>

        {/* Tickets Feed */}
        <div className="support-tickets-list">
          {rows.map(ticket => (
            <div className="support-ticket-item" key={ticket.id}>
              <div className="support-ticket-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="support-ticket-ref">#TICK-{ticket.id.slice(0, 8).toUpperCase()}</span>
                  <span className="party-badge student" style={{ fontSize: 11 }}>
                    <User size={11} style={{ display: 'inline', marginRight: 3 }} />
                    {ticket.ownerId}
                  </span>
                </div>
                <div>
                  {ticket.status === 'Open' ? (
                    <span className="status-pill warning">
                      <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                      Awaiting Campus Reply
                    </span>
                  ) : (
                    <span className="status-pill good">
                      <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 4 }} />
                      Resolved by Office
                    </span>
                  )}
                </div>
              </div>

              <h3 className="support-ticket-subject">{ticket.subject}</h3>
              <p className="support-ticket-detail">{ticket.detail}</p>

              {/* Official Campus Reply Banner */}
              {ticket.reply && (
                <div className="support-reply-box">
                  <div className="support-reply-header">
                    <ShieldCheck size={14} />
                    <span>Campus Administration Official Resolution:</span>
                  </div>
                  <p className="support-reply-text">{ticket.reply}</p>
                </div>
              )}

              {/* Admin Resolve / Reply Action (Visible only in Master Admin Console) */}
              {!ownerId && ticket.status === 'Open' && (
                <div className="support-admin-reply-box">
                  <form
                    onSubmit={event => {
                      event.preventDefault();
                      const reply = String(new FormData(event.currentTarget).get('reply')).trim();
                      if (!reply) return;
                      setData(current => ({
                        ...current,
                        supportTickets: current.supportTickets?.map(row =>
                          row.id === ticket.id ? { ...row, reply, status: 'Resolved' } : row
                        ),
                      }));
                    }}
                  >
                    <label>
                      Administrative Resolution / Reply
                      <textarea
                        name="reply"
                        maxLength={300}
                        rows={2}
                        placeholder="Type official response or instructions for the user..."
                        required
                      />
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <button type="submit" className="button secondary small">
                        <Check size={13} /> Send Official Reply &amp; Resolve Ticket
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ))}

          {/* Clean Empty State */}
          {!rows.length && (
            <div className="support-empty-state">
              <HelpCircle size={32} color="#94A3B8" />
              <div className="support-empty-title">No Active Support Requests</div>
              <p className="support-empty-desc">
                {ownerId
                  ? 'Have a question about fees, academic schedules, or documents? Submit an inquiry above and our campus office will assist you.'
                  : 'All institutional questions and inquiries have been resolved.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
