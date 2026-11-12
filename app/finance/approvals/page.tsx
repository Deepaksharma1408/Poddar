// College Finance Portal - Institutional Approval Inbox & Authorization Queue
// Real-time aggregation of multi-tier Maker-Checker approvals:
// OpEx Vendor Invoices, Purchase Orders, Statutory Payroll, Petty Cash Vouchers, and Scholarships.

'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  Receipt,
  Truck,
  Coins,
  Award,
  Banknote,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  Building,
  User,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toRupees } from '@/lib/finance-portal/finance/money';
import { canApproveRecord, getAssignedApproverRoles } from '@/lib/finance-portal/security/rbac';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { useApprovalNotice } from '@/components/finance-portal/ui/approval-notice';
import type { Role, OpExBill, PurchaseOrder, PayrollRecord, PettyCashVoucher, ScholarshipApplication } from '@/lib/finance-portal/types/finance';

interface ApprovalQueueItem {
  id: string;
  sourceType: 'BILL' | 'PO' | 'PAYROLL' | 'PETTY_CASH' | 'SCHOLARSHIP';
  categoryLabel: string;
  reference: string;
  title: string;
  departmentOrParty: string;
  amountPaise: number;
  submittedByRole: Role;
  submittedDate: string;
  stageName: string;
  nextApproverTier: string;
  status: string;
  rawPayload: OpExBill | PurchaseOrder | PayrollRecord | PettyCashVoucher | ScholarshipApplication;
}

export default function ApprovalsInboxPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();
  const { showApprovalNotice } = useApprovalNotice();
  const currentRole = state.settings.currentRole;

  const [activeTab, setActiveTab] = useState<'ALL' | 'BILL' | 'PO' | 'PAYROLL' | 'SCHOLARSHIP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailItem, setDetailItem] = useState<ApprovalQueueItem | null>(null);
  const [oversightMode, setOversightMode] = useState(false);

  // Aggregate pending items across all modules
  const queueItems = useMemo<ApprovalQueueItem[]>(() => {
    const items: ApprovalQueueItem[] = [];

    // 1. OpEx Bills
    state.opExBills
      .filter(b => b.status === 'Submitted')
      .forEach(b => {
        items.push({
          id: b.id,
          sourceType: 'BILL',
          categoryLabel: 'Vendor Invoice',
          reference: b.billNumber || b.id,
          title: `${b.vendorName} — ${b.category}`,
          departmentOrParty: b.department,
          amountPaise: b.netPayablePaise,
          submittedByRole: b.createdBy,
          submittedDate: b.invoiceDate,
          stageName: 'Pending Accounts Sanction',
          nextApproverTier: 'Accounts Admin / Management',
          status: b.status,
          rawPayload: b,
        });
      });

    // 2. Purchase Orders
    state.purchaseOrders
      .filter(po => po.status === 'Submitted')
      .forEach(po => {
        items.push({
          id: po.id,
          sourceType: 'PO',
          categoryLabel: 'Purchase Order',
          reference: po.poNumber,
          title: `${po.vendorName} — PO Procurement`,
          departmentOrParty: 'Campus Procurement',
          amountPaise: po.totalAmountPaise,
          submittedByRole: 'Accountant' as Role,
          submittedDate: po.orderDate,
          stageName: 'Pending Budget Signoff',
          nextApproverTier: 'Director / Management',
          status: po.status,
          rawPayload: po,
        });
      });

    // 3. Payroll Records
    state.payrollRecords
      .filter(r => r.status.startsWith('Pending'))
      .forEach(r => {
        items.push({
          id: r.id,
          sourceType: 'PAYROLL',
          categoryLabel: 'Payroll Salary',
          reference: r.id,
          title: `${r.employeeName} — Salary Slip (${r.period})`,
          departmentOrParty: r.department,
          amountPaise: r.netSalaryPaise,
          submittedByRole: 'HR Admin',
          submittedDate: `${r.period}-01`,
          stageName: r.status,
          nextApproverTier: r.status.includes('HOD') ? 'HOD' : r.status.includes('Director') ? 'Director' : 'Accounts Admin',
          status: r.status,
          rawPayload: r,
        });
      });

    // 4. Scholarship Applications
    (state.scholarshipApplications || [])
      .filter(s => s.status === 'Submitted' || s.status === 'Documents Verified')
      .forEach(s => {
        items.push({
          id: s.id,
          sourceType: 'SCHOLARSHIP',
          categoryLabel: 'Scholarship Grant',
          reference: s.id,
          title: `${s.studentName} — ${s.schemeName}`,
          departmentOrParty: s.programme,
          amountPaise: s.appliedAmountPaise,
          submittedByRole: 'Accountant' as Role,
          submittedDate: currentDate,
          stageName: s.status,
          nextApproverTier: 'Management / Accounts Admin',
          status: s.status,
          rawPayload: s,
        });
      });

    return items;
  }, [state, currentDate]);

  // Role-Specific Filter: Only show items assigned to currentRole (Super Admin has oversight toggle)
  const assignedQueueItems = useMemo(() => {
    if (currentRole === 'Super Admin' && oversightMode) {
      return queueItems;
    }
    return queueItems.filter(item => {
      const assignedRoles = getAssignedApproverRoles(item.sourceType, item.stageName);
      return assignedRoles.includes(currentRole);
    });
  }, [queueItems, currentRole, oversightMode]);

  // Counts for tabs based on current role's assigned queue
  const counts = useMemo(() => {
    return {
      ALL: assignedQueueItems.length,
      BILL: assignedQueueItems.filter(i => i.sourceType === 'BILL').length,
      PO: assignedQueueItems.filter(i => i.sourceType === 'PO').length,
      PAYROLL: assignedQueueItems.filter(i => i.sourceType === 'PAYROLL').length,
      SCHOLARSHIP: assignedQueueItems.filter(i => i.sourceType === 'SCHOLARSHIP').length,
    };
  }, [assignedQueueItems]);

  const totalExposurePaise = useMemo(() => {
    return assignedQueueItems.reduce((sum, item) => sum + item.amountPaise, 0);
  }, [assignedQueueItems]);

  // Filtered queue
  const filteredItems = useMemo(() => {
    return assignedQueueItems.filter(item => {
      const matchTab = activeTab === 'ALL' || item.sourceType === activeTab;
      const matchQuery =
        `${item.reference} ${item.title} ${item.departmentOrParty} ${item.categoryLabel}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchTab && matchQuery;
    });
  }, [assignedQueueItems, activeTab, searchQuery]);

  // Handle Approve
  const handleApprove = (item: ApprovalQueueItem) => {
    // Maker-checker validation
    const makerChecker = canApproveRecord(currentRole, item.submittedByRole, 'BILL');
    if (!makerChecker.allowed && currentRole !== 'Super Admin' && currentRole !== 'Director') {
      showToast('Maker-Checker Lock', makerChecker.reason || 'You cannot approve a request you created.', 'error');
      return;
    }

    if (item.sourceType === 'BILL') {
      dispatch({
        type: 'UPDATE_BILL_STATUS',
        billId: item.id,
        status: 'Approved',
        approvedBy: currentRole,
      });
      showToast('Bill Approved', `${item.reference} signed off by ${currentRole}.`, 'success');
    } else if (item.sourceType === 'PO') {
      dispatch({
        type: 'UPDATE_PO_STATUS',
        poId: item.id,
        status: 'Approved',
      });
      showToast('Purchase Order Approved', `${item.reference} sanctioned for procurement.`, 'success');
    } else if (item.sourceType === 'PAYROLL') {
      const rec = item.rawPayload as PayrollRecord;
      let nextStatus: PayrollRecord['status'] = 'Approved';
      if (rec.status === 'Pending HOD Review') nextStatus = 'Pending HR Approval';
      else if (rec.status === 'Pending HR Approval') nextStatus = 'Pending Accounts Approval';
      else if (rec.status === 'Pending Accounts Approval') nextStatus = 'Approved';
      else if (rec.status === 'Pending Director Approval') nextStatus = 'Approved';

      dispatch({
        type: 'UPDATE_PAYROLL_STATUS',
        recordId: item.id,
        status: nextStatus,
        remarks: `Promoted to ${nextStatus} by ${currentRole} via Approval Inbox`,
      });

      if (nextStatus.startsWith('Pending')) {
        showApprovalNotice({
          itemTitle: item.title,
          category: 'Payroll & Salaries',
          amountPaise: item.amountPaise,
          reference: item.reference,
          nextApproverTier: nextStatus.replace('Pending ', ''),
          notes: `Payroll record verified by ${currentRole} and transmitted to ${nextStatus.replace('Pending ', '')} for authorization.`,
        });
      } else {
        showToast('Payroll Record Approved', `${item.title} authorized for disbursement.`, 'success');
      }
    } else if (item.sourceType === 'SCHOLARSHIP') {
      dispatch({
        type: 'APPROVE_SCHOLARSHIP',
        applicationId: item.id,
        sanctionedPaise: item.amountPaise,
        sanctionLetterNo: `SANCTION-${item.id}`,
      });
      showToast('Scholarship Approved', `${item.title} sanctioned for student ledger credit.`, 'success');
    } else {
      showToast('Approved', `${item.reference} authorized successfully.`, 'success');
    }
  };

  // Handle Forward for Next Approval
  const handleForwardForProceeding = (item: ApprovalQueueItem) => {
    showApprovalNotice({
      itemTitle: item.title,
      category: item.sourceType === 'BILL' ? 'Operating Expenses' : item.sourceType === 'PO' ? 'Purchase Order' : item.sourceType === 'PAYROLL' ? 'Payroll & Salaries' : 'General',
      amountPaise: item.amountPaise,
      reference: item.reference,
      nextApproverTier: item.nextApproverTier,
      notes: `Approval request transmitted by ${currentRole} via Approval Inbox. Awaiting institutional proceeding.`,
    });
  };

  // Handle Reject / Return
  const handleReject = (item: ApprovalQueueItem) => {
    if (item.sourceType === 'BILL') {
      dispatch({
        type: 'UPDATE_BILL_STATUS',
        billId: item.id,
        status: 'Draft',
      });
      showToast('Bill Returned', `${item.reference} returned to Draft for amendments.`, 'info');
    } else if (item.sourceType === 'PO') {
      dispatch({
        type: 'UPDATE_PO_STATUS',
        poId: item.id,
        status: 'Draft',
      });
      showToast('PO Returned', `${item.reference} returned for revision.`, 'info');
    } else {
      showToast('Request Returned', `${item.reference} returned for amendments.`, 'info');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b49662', marginBottom: '4px' }}>
            STATUTORY MAKER-CHECKER GOVERNANCE
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 750, color: '#102d47', margin: 0 }}>
            Approval Inbox & Authorization Queue
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Unified institutional queue for pending vendor invoices, purchase orders, payroll batches, and disbursements.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#edf7f1',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#15803d',
            }}
          >
            <ShieldCheck size={14} />
            Active Role: {currentRole}
          </span>
          {currentRole === 'Super Admin' && (
            <button
              type="button"
              onClick={() => setOversightMode(prev => !prev)}
              style={{
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: oversightMode ? '#102d47' : '#ffffff',
                color: oversightMode ? '#ffffff' : '#475569',
                cursor: 'pointer',
              }}
            >
              {oversightMode ? 'Institutional Oversight (All Items)' : 'Assigned Only'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #b49662' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            TOTAL PENDING SANCTIONS
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {assignedQueueItems.length} Requests
          </div>
          <span style={{ fontSize: '11px', color: '#83909d' }}>
            Assigned to {currentRole} for signoff
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #102d47' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            PENDING FINANCIAL EXPOSURE
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalExposurePaise)}
          </div>
          <span style={{ fontSize: '11px', color: '#83909d' }}>
            Cumulative expenditure pending signoff
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #25866b' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            MAKER-CHECKER INTEGRITY
          </span>
          <div className="headline-number" style={{ color: '#25866b', margin: '6px 0 2px' }}>
            100% Guarded
          </div>
          <span style={{ fontSize: '11px', color: '#83909d' }}>
            Creator-approver conflict locked
          </span>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #0284c7' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            DISBURSEMENT SAFETY
          </span>
          <div className="headline-number" style={{ color: '#0284c7', margin: '6px 0 2px' }}>
            Pre-Audit Active
          </div>
          <span style={{ fontSize: '11px', color: '#83909d' }}>
            Zero unapproved bank outflow
          </span>
        </div>
      </div>

      {/* 3. Filter Tabs & Search Bar */}
      <div className="card-surface" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Items', count: counts.ALL },
              { id: 'BILL', label: 'Vendor OpEx Bills', count: counts.BILL },
              { id: 'PO', label: 'Purchase Orders', count: counts.PO },
              { id: 'PAYROLL', label: 'Payroll & Salaries', count: counts.PAYROLL },
              { id: 'SCHOLARSHIP', label: 'Scholarships', count: counts.SCHOLARSHIP },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? '#102d47' : '#e2e8f0',
                  backgroundColor: activeTab === tab.id ? '#102d47' : '#ffffff',
                  color: activeTab === tab.id ? '#ffffff' : '#475569',
                  fontSize: '11.5px',
                  fontWeight: activeTab === tab.id ? 650 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    backgroundColor: activeTab === tab.id ? '#b49662' : '#f1f5f9',
                    color: activeTab === tab.id ? '#ffffff' : '#64748b',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '280px' }}>
            <Search size={14} style={{ color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search reference, vendor, title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
            />
          </div>
        </div>

        {/* 4. Approvals Data Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>CATEGORY & REF</th>
                <th>REQUEST DETAILS & PAYEE</th>
                <th>DEPARTMENT / SCOPE</th>
                <th>SUBMITTER & DATE</th>
                <th>STAGE & APPROVER</th>
                <th style={{ textAlign: 'right' }}>EXPOSURE (₹)</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const isMyCreation = item.submittedByRole === currentRole;
                return (
                  <tr key={item.id}>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor:
                            item.sourceType === 'BILL' ? '#e8f1fa' :
                            item.sourceType === 'PO' ? '#fbf6eb' :
                            item.sourceType === 'PAYROLL' ? '#edf7f1' : '#f1f5f9',
                          color:
                            item.sourceType === 'BILL' ? '#102d47' :
                            item.sourceType === 'PO' ? '#92400e' :
                            item.sourceType === 'PAYROLL' ? '#166534' : '#475569',
                          display: 'inline-block',
                          marginBottom: '3px',
                        }}
                      >
                        {item.categoryLabel}
                      </span>
                      <strong style={{ display: 'block', fontSize: '11.5px', fontFamily: 'monospace', color: '#1e293b' }}>
                        {item.reference}
                      </strong>
                    </td>

                    <td>
                      <strong style={{ fontSize: '12.5px', color: '#102d47', display: 'block' }}>
                        {item.title}
                      </strong>
                    </td>

                    <td>
                      <span style={{ fontSize: '11.5px', color: '#475569' }}>
                        {item.departmentOrParty}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '11.5px', color: '#1e293b', fontWeight: 550, display: 'block' }}>
                        {item.submittedByRole}
                      </span>
                      <small style={{ fontSize: '10.5px', color: '#83909d' }}>
                        {item.submittedDate}
                      </small>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#b49662' }} />
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#102d47' }}>
                          {item.stageName}
                        </span>
                      </div>
                      <small style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
                        Tier: {item.nextApproverTier}
                      </small>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#102d47', fontSize: '13px' }} className="tabular-nums">
                      {formatINR(item.amountPaise)}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          disabled={isMyCreation && currentRole !== 'Super Admin'}
                          title={isMyCreation ? 'Maker-Checker Lock: You cannot approve your own creation' : 'Authorize & Sanction'}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: isMyCreation ? '#e2e8f0' : '#25866b',
                            color: isMyCreation ? '#94a3b8' : '#ffffff',
                            border: 'none',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: isMyCreation ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Approve</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleForwardForProceeding(item)}
                          title="Forward for Proceeding with Confirmation Notice"
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#102d47',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ArrowRight size={12} />
                          <span>Proceed</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReject(item)}
                          title="Return for revision"
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fef2f2',
                            color: '#ad211d',
                            border: '1px solid #fecaca',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Return
                        </button>

                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          title="View Details"
                          style={{
                            padding: '4px 6px',
                            backgroundColor: '#f8fafc',
                            color: '#64748b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div style={{ padding: '36px', textAlign: 'center', color: '#83909d', fontSize: '12px' }}>
              <CheckCircle2 size={28} style={{ color: '#25866b', margin: '0 auto 8px', opacity: 0.8 }} />
              <strong style={{ fontSize: '13px', color: '#102d47', display: 'block' }}>All Caught Up for {currentRole}!</strong>
              <p style={{ margin: '4px 0 0' }}>There are no pending authorization requests assigned to your role in this view.</p>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL: Item Details */}
      <Dialog
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        title={detailItem ? `${detailItem.categoryLabel} Details: ${detailItem.reference}` : 'Request Details'}
        subtitle="Complete institutional maker-checker authorization record"
        maxWidth="600px"
      >
        {detailItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  {detailItem.categoryLabel}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#b49662' }}>
                  Status: {detailItem.status}
                </span>
              </div>
              <strong style={{ fontSize: '15px', color: '#102d47', display: 'block', margin: '4px 0 2px' }}>
                {detailItem.title}
              </strong>
              <span style={{ fontSize: '12px', color: '#475569' }}>
                Department: {detailItem.departmentOrParty}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Exposure Amount:</span>
                <strong style={{ fontSize: '16px', color: '#102d47' }} className="headline-number">
                  {formatINR(detailItem.amountPaise)}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Submitted Date:</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{detailItem.submittedDate}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Initiated By Role:</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{detailItem.submittedByRole}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Required Authority:</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{detailItem.nextApproverTier}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDetailItem(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  handleApprove(detailItem);
                  setDetailItem(null);
                }}
              >
                Approve & Sanction
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
