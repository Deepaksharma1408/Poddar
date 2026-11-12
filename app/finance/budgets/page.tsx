// College Finance Portal - Departmental Budgets & Commitments
// Allocation, Actual Spend, Approved Commitments, 80%/100% Thresholds & Overrun Authorizations

'use client';

import React, { useState } from 'react';
import {
  PieChart,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  PlusCircle,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';

export default function BudgetsPage() {
  const { state } = useFinance();
  const { showToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Departmental Budgets & Fiscal Commitments</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Annual departmental budget allocations, settled expenditures, approved commitments, and 80%/100% threshold safety alerts.
        </p>
      </div>

      {/* Budget Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {state.budgets.map(b => {
          // Calculate dynamic spent and committed from OpEx bills
          const dynamicSpentPaise = state.opExBills
            .filter(bill => bill.department === b.department && bill.status === 'Paid')
            .reduce((sum, bill) => sum + bill.paidAmountPaise, 0);

          const dynamicCommittedPaise = state.opExBills
            .filter(bill => bill.department === b.department && (bill.status === 'Approved' || bill.status === 'Partially Paid'))
            .reduce((sum, bill) => sum + (bill.netPayablePaise - bill.paidAmountPaise), 0);

          const totalUtilizedPaise = dynamicSpentPaise + dynamicCommittedPaise;
          const remainingPaise = b.annualAllocationPaise - totalUtilizedPaise;
          const utilizationPct = Math.round((totalUtilizedPaise / (b.annualAllocationPaise || 1)) * 100);

          const isOverrun = utilizationPct > 100;
          const isWarning = utilizationPct >= 80 && !isOverrun;

          return (
            <div
              key={b.department}
              className="card-surface"
              style={{
                padding: '20px',
                borderTop: `4px solid ${isOverrun ? 'var(--crimson)' : isWarning ? 'var(--gold)' : 'var(--navy)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>{b.department}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Annual Allocation: {formatINR(b.annualAllocationPaise)}</span>
                </div>

                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: isOverrun ? 'var(--crimson-light)' : isWarning ? 'var(--gold-light)' : 'var(--green-light)',
                    color: isOverrun ? 'var(--crimson)' : isWarning ? 'var(--gold)' : 'var(--green)',
                  }}
                >
                  {utilizationPct}% Utilized
                </span>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${Math.min(100, Math.round((dynamicSpentPaise / b.annualAllocationPaise) * 100))}%`, backgroundColor: 'var(--navy)' }} title="Settled Spend" />
                  <div style={{ width: `${Math.min(100, Math.round((dynamicCommittedPaise / b.annualAllocationPaise) * 100))}%`, backgroundColor: 'var(--gold)' }} title="Approved Commitments" />
                </div>
              </div>

              {/* Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px', marginTop: '4px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Settled Spend</span>
                  <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatINR(dynamicSpentPaise)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--gold)', display: 'block' }}>Committed Bills</span>
                  <strong className="tabular-nums" style={{ color: 'var(--gold)' }}>{formatINR(dynamicCommittedPaise)}</strong>
                </div>
                <div>
                  <span style={{ color: remainingPaise < 0 ? 'var(--crimson)' : 'var(--green)', display: 'block' }}>
                    {remainingPaise < 0 ? 'Overrun Deficit' : 'Available Balance'}
                  </span>
                  <strong className="tabular-nums" style={{ color: remainingPaise < 0 ? 'var(--crimson)' : 'var(--green)' }}>
                    {formatINR(Math.abs(remainingPaise))}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Status</span>
                  <strong style={{ color: isOverrun ? 'var(--crimson)' : isWarning ? 'var(--gold)' : 'var(--text-secondary)' }}>
                    {isOverrun ? 'Overrun Warning' : isWarning ? 'Near Threshold (80%+)' : 'Within Budget'}
                  </strong>
                </div>
              </div>

              {isOverrun && (
                <div style={{ backgroundColor: 'var(--crimson-light)', border: '1px solid var(--crimson)', borderRadius: '4px', padding: '6px 10px', fontSize: '11px', color: 'var(--crimson)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>Management Overrun Authorization Required for any further commitments.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

