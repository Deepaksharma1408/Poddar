// College Finance Portal - Institutional Audit Trail & Compliance Log
// Real Append-Only Browser Demo Log of Create, Edit, Approve, Pay, Refund, Void, and Persona Switches

'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Shield,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { generateSafeCSV, downloadCSV } from '@/lib/finance-portal/security/csv-sanitizer';
import { useToast } from '@/components/finance-portal/ui/toast';

export default function AuditPage() {
  const { state, currentDate } = useFinance();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredLogs = useMemo(() => {
    return state.auditLogs.filter(log => {
      const matchesSearch =
        log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [state.auditLogs, searchQuery, actionFilter]);

  const handleExportAuditCSV = () => {
    const headers = ['Timestamp', 'Action', 'Entity', 'Entity ID', 'Actor Role', 'Actor Name', 'Audit Summary'];
    const rows = state.auditLogs.map(l => [
      l.timestamp,
      l.action,
      l.entity,
      l.entityId,
      l.role,
      l.actorName,
      l.summary,
    ]);

    const csvContent = generateSafeCSV([headers, ...rows]);
    downloadCSV(`Audit-Trail-Log-${currentDate}.csv`, csvContent);
    showToast('Audit Log Exported', 'Downloaded sanitized audit trail CSV.', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>System Audit Trail & Compliance Log</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Real append-only record of financial creations, approvals, disbursements, refunds, and persona switches.
          </p>
        </div>

        <button
          onClick={handleExportAuditCSV}
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
          <Download size={14} />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Honest Prototype Notice */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '11.5px',
          color: 'var(--text-secondary)',
        }}
      >
        <Shield size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <span>
          <strong>Audit Compliance Notice:</strong> This log is an append-only in-browser audit simulation. In an enterprise production deployment, this would be mirrored into an immutable append-only database ledger (e.g. AWS QLDB or PostgreSQL write-ahead log) with cryptographic verification.
        </span>
      </div>

      {/* Search & Action Filters */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '320px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search audit summary, role, entity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'CREATE', 'APPROVE', 'PAY', 'REFUND', 'ROLE_SWITCH'] as const).map(act => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: actionFilter === act ? 'var(--navy)' : 'var(--bg-card)',
                  color: actionFilter === act ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: actionFilter === act ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Timestamp (ISO)</th>
                <th>Action Type</th>
                <th>Entity Head</th>
                <th>Actor Persona</th>
                <th>Audit Summary & Justification</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td data-label="Timestamp" style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {log.timestamp.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td data-label="Action">
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        backgroundColor:
                          log.action === 'APPROVE' || log.action === 'PAY'
                            ? 'var(--green-light)'
                            : log.action === 'REFUND'
                            ? 'var(--crimson-light)'
                            : 'var(--navy-light)',
                        color:
                          log.action === 'APPROVE' || log.action === 'PAY'
                            ? 'var(--green)'
                            : log.action === 'REFUND'
                            ? 'var(--crimson)'
                            : 'var(--navy)',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td data-label="Entity">
                    <strong>{log.entity}</strong>
                  </td>
                  <td data-label="Actor">
                    <span>{log.role}</span>
                    <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>
                      {log.actorName}
                    </span>
                  </td>
                  <td data-label="Summary" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    {log.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

