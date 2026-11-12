// College Finance Portal - Scholarships & Financial Aid Management
// Sanctioned, Received, Balance, and Split between "Pending from Body" vs "Pending from Student"

'use client';

import React, { useState } from 'react';
import {
  Award,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Landmark,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import type { ScholarshipRecord } from '@/lib/finance-portal/types/finance';

export default function ScholarshipsPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [studentId, setStudentId] = useState(state.students[0]?.id || '');
  const [schemeName, setSchemeName] = useState('');
  const [providerType, setProviderType] = useState<ScholarshipRecord['providerType']>('Government Body');
  const [sanctionedRupees, setSanctionedRupees] = useState('');
  const [receivedRupees, setReceivedRupees] = useState('0');

  const handleAddScholarship = () => {
    const student = state.students.find(s => s.id === studentId);
    if (!student || !schemeName.trim()) {
      showToast('Validation Error', 'Student and scholarship scheme name are required.', 'error');
      return;
    }

    const sanctionedPaise = toPaise(sanctionedRupees);
    const receivedPaise = toPaise(receivedRupees);

    if (sanctionedPaise <= 0) {
      showToast('Invalid Amount', 'Sanctioned amount must be greater than zero.', 'error');
      return;
    }

    const pendingPaise = Math.max(0, sanctionedPaise - receivedPaise);
    const newRecord: ScholarshipRecord = {
      id: `SCH-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      schemeName: schemeName.trim(),
      providerType,
      sanctionedPaise,
      receivedPaise,
      disbursedToStudentLedgerPaise: receivedPaise,
      pendingSource: pendingPaise > 0 ? 'Pending from Body' : 'Settled',
      status: receivedPaise >= sanctionedPaise ? 'Disbursed' : receivedPaise > 0 ? 'Partially Received' : 'Sanctioned',
      updatedAt: currentDate,
    };

    dispatch({ type: 'ADD_SCHOLARSHIP', scholarship: newRecord });
    showToast('Scholarship Sanctioned', `${schemeName} recorded for ${student.name}.`, 'success');
    setModalOpen(false);
    setSchemeName('');
    setSanctionedRupees('');
    setReceivedRupees('0');
  };

  const totalSanctionedPaise = state.scholarships.reduce((s, r) => s + r.sanctionedPaise, 0);
  const totalReceivedPaise = state.scholarships.reduce((s, r) => s + r.receivedPaise, 0);
  const totalPendingBodyPaise = state.scholarships
    .filter(r => r.pendingSource === 'Pending from Body')
    .reduce((s, r) => s + (r.sanctionedPaise - r.receivedPaise), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Scholarships & Institutional Grants</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Government welfare schemes, trust endowments, CSR grants, and balance pending from disbursement bodies.
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
          <span>Sanction Scholarship</span>
        </button>
      </div>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--navy)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL SANCTIONED AID</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', marginTop: '4px' }} className="headline-number">
            {formatINR(totalSanctionedPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {state.scholarships.length} Beneficiary Students
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--green)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>RECEIVED & CREDITED</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }} className="headline-number">
            {formatINR(totalReceivedPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Transferred into Student Accounts
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid var(--gold)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PENDING FROM SCHOLARSHIP BODY</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gold)', marginTop: '4px' }} className="headline-number">
            {formatINR(totalPendingBodyPaise)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Govt / Trust Grant Remittance Expected
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Student ID & Name</th>
                <th>Scheme Name</th>
                <th>Provider Entity</th>
                <th style={{ textAlign: 'right' }}>Sanctioned Aid</th>
                <th style={{ textAlign: 'right' }}>Received to Date</th>
                <th>Pending Source</th>
                <th>Disbursement Status</th>
              </tr>
            </thead>
            <tbody>
              {state.scholarships.map(sch => (
                <tr key={sch.id}>
                  <td data-label="Student">
                    <strong>{sch.studentName}</strong>
                    <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      {sch.studentId}
                    </span>
                  </td>
                  <td data-label="Scheme">{sch.schemeName}</td>
                  <td data-label="Provider">{sch.providerType}</td>
                  <td data-label="Sanctioned" style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                    {formatINR(sch.sanctionedPaise)}
                  </td>
                  <td data-label="Received" style={{ textAlign: 'right', color: 'var(--green)' }} className="tabular-nums">
                    {formatINR(sch.receivedPaise)}
                  </td>
                  <td data-label="Pending From">
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor: sch.pendingSource === 'Settled' ? 'var(--green-light)' : 'var(--gold-light)',
                        color: sch.pendingSource === 'Settled' ? 'var(--green)' : 'var(--gold)',
                      }}
                    >
                      {sch.pendingSource}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor:
                          sch.status === 'Disbursed'
                            ? 'var(--green-light)'
                            : 'var(--navy-light)',
                        color:
                          sch.status === 'Disbursed'
                            ? 'var(--green)'
                            : 'var(--navy)',
                      }}
                    >
                      {sch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Sanction Scholarship */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Sanction Financial Aid / Scholarship">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Beneficiary Student*</label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
            >
              {state.students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.id} · {s.programme})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Scholarship Scheme Name*</label>
            <input
              type="text"
              value={schemeName}
              onChange={e => setSchemeName(e.target.value)}
              placeholder="e.g. Post-Matric State Scholarship"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Provider Type</label>
              <select
                value={providerType}
                onChange={e => setProviderType(e.target.value as any)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="Government Body">Government Body</option>
                <option value="Institutional Trust">Institutional Trust</option>
                <option value="Corporate CSR">Corporate CSR</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Sanctioned Total (INR)*</label>
              <input
                type="number"
                value={sanctionedRupees}
                onChange={e => setSanctionedRupees(e.target.value)}
                placeholder="40000"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Initial Disbursed Amount (INR)</label>
            <input
              type="number"
              value={receivedRupees}
              onChange={e => setReceivedRupees(e.target.value)}
              placeholder="0 if pending from body"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddScholarship}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Sanction & Credit Account
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

