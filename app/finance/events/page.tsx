// College Finance Portal - Campus Events & Conferences P&L Workspace
// Approved Budget, Corporate Sponsorships, Actual Incurred Spend, Surplus / Deficit (P&L)

'use client';

import React, { useState } from 'react';
import {
  CalendarDays,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import type { CollegeEvent } from '@/lib/finance-portal/types/finance';

export default function EventsPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Computer Science & IT');
  const [date, setDate] = useState(currentDate);
  const [budgetRupees, setBudgetRupees] = useState('');
  const [sponsorRupees, setSponsorRupees] = useState('0');

  const handleCreateEvent = () => {
    if (!title.trim()) {
      showToast('Validation Error', 'Event title is required.', 'error');
      return;
    }

    const budgetPaise = toPaise(budgetRupees);
    const sponsorPaise = toPaise(sponsorRupees);

    const newEvent: CollegeEvent = {
      id: `EVT-${Date.now()}`,
      title: title.trim(),
      date,
      organizingDepartment: department,
      approvedBudgetPaise: budgetPaise,
      sponsorIncomePaise: sponsorPaise,
      actualSpendPaise: 0,
      status: 'Planned',
      reportNotes: 'Newly scheduled campus event.',
    };

    dispatch({ type: 'ADD_EVENT', event: newEvent });
    showToast('Event Created', `${title} registered with approved budget of ${formatINR(budgetPaise)}.`, 'success');

    setModalOpen(false);
    setTitle('');
    setBudgetRupees('');
    setSponsorRupees('0');
  };

  const totalEventBudgetPaise = state.events.reduce((s, e) => s + e.approvedBudgetPaise, 0);
  const totalEventSpendPaise = state.events.reduce((s, e) => s + e.actualSpendPaise, 0);
  const totalSponsorIncomePaise = state.events.reduce((s, e) => s + e.sponsorIncomePaise, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Campus Events & Conferences P&L</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Institutional fests, hackathons, academic symposia, sponsor revenue, and profit/loss reconciliation.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '8px 14px',
            backgroundColor: 'var(--navy)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <PlusCircle size={15} />
          <span>Register Event</span>
        </button>
      </div>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--navy)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SANCTIONED EVENT BUDGETS</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }} className="headline-number">
            {formatINR(totalEventBudgetPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {state.events.length} Major Annual Events
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--green)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SPONSORSHIP REVENUE INFLOW</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }} className="headline-number">
            {formatINR(totalSponsorIncomePaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Corporate & Title Sponsors
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--crimson)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ACTUAL INCURRED EXPENDITURE</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--crimson)', marginTop: '4px' }} className="headline-number">
            {formatINR(totalEventSpendPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Logistics, Stage, Hospitality & Prizes
          </span>
        </div>
      </div>

      {/* Events Table */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Event Title & Date</th>
                <th>Organizing Dept</th>
                <th style={{ textAlign: 'right' }}>Sanctioned Budget</th>
                <th style={{ textAlign: 'right' }}>Sponsor Income</th>
                <th style={{ textAlign: 'right' }}>Actual Spend</th>
                <th style={{ textAlign: 'right' }}>Net Financial Outcome</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.events.map(evt => {
                // Net outcome = Sponsor Income - Actual Spend
                const netPaise = evt.sponsorIncomePaise - evt.actualSpendPaise;
                const isSurplus = netPaise >= 0;

                return (
                  <tr key={evt.id}>
                    <td data-label="Event">
                      <strong>{evt.title}</strong>
                      <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        Date: {evt.date}
                      </span>
                    </td>
                    <td data-label="Department">{evt.organizingDepartment}</td>
                    <td data-label="Budget" style={{ textAlign: 'right' }} className="tabular-nums">
                      {formatINR(evt.approvedBudgetPaise)}
                    </td>
                    <td data-label="Sponsorship" style={{ textAlign: 'right', color: 'var(--green)' }} className="tabular-nums">
                      {formatINR(evt.sponsorIncomePaise)}
                    </td>
                    <td data-label="Spend" style={{ textAlign: 'right', color: 'var(--crimson)' }} className="tabular-nums">
                      {formatINR(evt.actualSpendPaise)}
                    </td>
                    <td data-label="Net P&L" style={{ textAlign: 'right', fontWeight: 700, color: isSurplus ? 'var(--green)' : 'var(--crimson)' }} className="tabular-nums">
                      {isSurplus ? `+${formatINR(netPaise)} (Surplus)` : `-${formatINR(Math.abs(netPaise))} (Deficit)`}
                    </td>
                    <td data-label="Status">
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor:
                            evt.status === 'Completed'
                              ? 'var(--green-light)'
                              : evt.status === 'Ongoing'
                              ? 'var(--gold-light)'
                              : 'var(--navy-light)',
                          color:
                            evt.status === 'Completed'
                              ? 'var(--green)'
                              : evt.status === 'Ongoing'
                              ? 'var(--gold)'
                              : 'var(--navy)',
                        }}
                      >
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Register Event */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Register Campus Event">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Event Title*</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. National Seminar on AI Ethics"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="Computer Science & IT">Computer Science & IT</option>
                <option value="Management & Business Studies">Management & Business</option>
                <option value="Commerce & Accounting">Commerce & Accounting</option>
                <option value="Basic Sciences & Research Lab">Basic Sciences</option>
                <option value="Campus Administration & Maintenance">Administration</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Scheduled Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Approved Budget (INR)*</label>
              <input
                type="number"
                value={budgetRupees}
                onChange={e => setBudgetRupees(e.target.value)}
                placeholder="250000"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Committed Sponsorship (INR)</label>
              <input
                type="number"
                value={sponsorRupees}
                onChange={e => setSponsorRupees(e.target.value)}
                placeholder="100000"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateEvent}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Sanction & Register Event
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

