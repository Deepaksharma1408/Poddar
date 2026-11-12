// College Finance Portal - Approval Notice Context & Global Popup System
// Triggers the mandatory modal popup: "Approval sent, wait for proceeding"
// whenever an approval request is submitted across any finance module.

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  ArrowRight,
  X,
  Building,
  User,
  Hash,
} from 'lucide-react';
import { Dialog } from './dialog';
import { formatINR } from '@/lib/finance-portal/finance/money';

export interface ApprovalNoticePayload {
  title?: string;
  itemTitle: string;
  category: 'Payroll & Salaries' | 'Operating Expenses' | 'Purchase Order' | 'Petty Cash' | 'Fee Refund' | 'Scholarship Grant' | 'General';
  amountPaise?: number;
  reference?: string;
  nextApproverTier?: string;
  submittedBy?: string;
  notes?: string;
}

interface ApprovalNoticeContextType {
  showApprovalNotice: (payload: ApprovalNoticePayload) => void;
  closeApprovalNotice: () => void;
}

const ApprovalNoticeContext = createContext<ApprovalNoticeContextType | null>(null);

export function useApprovalNotice() {
  const ctx = useContext(ApprovalNoticeContext);
  if (!ctx) {
    throw new Error('useApprovalNotice must be used within an ApprovalNoticeProvider');
  }
  return ctx;
}

export function ApprovalNoticeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ApprovalNoticePayload | null>(null);

  const showApprovalNotice = useCallback((payload: ApprovalNoticePayload) => {
    setData(payload);
    setOpen(true);
  }, []);

  const closeApprovalNotice = useCallback(() => {
    setOpen(false);
  }, []);

  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <ApprovalNoticeContext.Provider value={{ showApprovalNotice, closeApprovalNotice }}>
      {children}

      <Dialog
        open={open}
        onClose={closeApprovalNotice}
        title={data?.title || 'Approval Request Submitted'}
        subtitle="Institutional multi-tier authorization & maker-checker workflow"
        maxWidth="540px"
      >
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Hero Approval Banner */}
            <div
              style={{
                backgroundColor: '#edf7f1',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: '#25866b',
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(37, 134, 107, 0.25)',
                }}
              >
                <CheckCircle2 size={26} />
              </div>

              <div>
                <strong style={{ fontSize: '15px', color: '#166534', display: 'block', fontWeight: 700 }}>
                  Approval sent, wait for proceeding.
                </strong>
                <span style={{ fontSize: '12px', color: '#15803d', marginTop: '2px', display: 'block' }}>
                  Your request has been forwarded to the authorization authority for verification and signoff.
                </span>
              </div>
            </div>

            {/* 2. Structured Metadata Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Category & Item
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#e8f1fa',
                    color: '#102d47',
                  }}
                >
                  {data.category}
                </span>
              </div>

              <div>
                <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block' }}>
                  {data.itemTitle}
                </strong>
                {data.reference && (
                  <span style={{ fontSize: '11.5px', color: '#64748b', fontFamily: 'monospace' }}>
                    Tracking Ref: {data.reference}
                  </span>
                )}
              </div>

              {typeof data.amountPaise === 'number' && (
                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Total Exposure / Value:</span>
                  <strong style={{ fontSize: '15px', color: '#102d47' }} className="tabular-nums">
                    {formatINR(data.amountPaise)}
                  </strong>
                </div>
              )}

              <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Next Approving Authority:</span>
                  <strong style={{ color: '#1e293b' }}>
                    {data.nextApproverTier || 'Accounts Admin / Management'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Transmission Time:</span>
                  <span style={{ color: '#1e293b' }}>Today at {currentTime} IST</span>
                </div>
              </div>

              {data.notes && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                  <strong>Remarks:</strong> {data.notes}
                </div>
              )}
            </div>

            {/* 3. Workflow Notice */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11.5px', color: '#64748b' }}>
              <Clock size={14} style={{ color: '#b49662', marginTop: '2px', flexShrink: 0 }} />
              <span>
                Statutory Maker-Checker rules require the next authorized tier to review and sanction this entry before accounting ledger impact and disbursement proceeding.
              </span>
            </div>

            {/* 4. Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
              <Link
                href="/finance/approvals"
                onClick={closeApprovalNotice}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#102d47',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              >
                <span>View Approval Inbox</span>
                <ArrowRight size={13} />
              </Link>

              <button
                type="button"
                className="button primary"
                onClick={closeApprovalNotice}
                style={{ padding: '8px 18px', fontSize: '12px' }}
              >
                Understood, Proceed
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </ApprovalNoticeContext.Provider>
  );
}

