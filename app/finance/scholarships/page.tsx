// College Finance Portal - Scholarships & Institutional Grants Workspace
// Applications, Eligibility & Document Verification Checklist, Multi-tier Approval,
// Official Sanction Letter PDF Generator, and Fee Ledger Adjustment.

'use client';

import React, { useState, useMemo } from 'react';
import {
  Award,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Landmark,
  FileText,
  Download,
  CheckSquare,
  Square,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { useApprovalNotice } from '@/components/finance-portal/ui/approval-notice';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import type { ScholarshipApplication, ScholarshipRecord } from '@/lib/finance-portal/types/finance';

export default function ScholarshipsPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();
  const { showApprovalNotice } = useApprovalNotice();

  const [activeTab, setActiveTab] = useState<'grants' | 'applications'>('grants');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [newAppModalOpen, setNewAppModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ScholarshipApplication | null>(null);

  // Verification Checklist State
  const [checklist, setChecklist] = useState({
    incomeCertificate: false,
    domicileCertificate: false,
    previousMarksheet: false,
    bankPassbook: false,
    casteCertificate: false,
  });

  // New Application Form State
  const [studentId, setStudentId] = useState(state.students[0]?.id || '');
  const [schemeName, setSchemeName] = useState('');
  const [providerType, setProviderType] = useState<ScholarshipApplication['providerType']>('Government Body');
  const [appliedRupees, setAppliedRupees] = useState('');
  const [remarks, setRemarks] = useState('');

  // KPI Totals
  const totalSanctionedPaise = state.scholarships.reduce((s, r) => s + r.sanctionedPaise, 0);
  const totalReceivedPaise = state.scholarships.reduce((s, r) => s + r.receivedPaise, 0);
  const totalDisbursedPaise = state.scholarships.reduce((s, r) => s + r.disbursedToStudentLedgerPaise, 0);
  const totalPendingBodyPaise = state.scholarships
    .filter(r => r.pendingSource === 'Pending from Body')
    .reduce((s, r) => s + (r.sanctionedPaise - r.receivedPaise), 0);

  // Handle New Application Submission
  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    const student = state.students.find(s => s.id === studentId);
    if (!student || !schemeName.trim()) {
      showToast('Validation Error', 'Student and scholarship scheme name are required.', 'error');
      return;
    }

    const appliedAmountPaise = toPaise(appliedRupees);
    if (appliedAmountPaise <= 0) {
      showToast('Invalid Amount', 'Applied amount must be greater than zero.', 'error');
      return;
    }

    const newApp: ScholarshipApplication = {
      id: `SCH-APP-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      programme: `${student.programme} (Sem ${student.semester})`,
      schemeName: schemeName.trim(),
      providerType,
      appliedAmountPaise,
      sanctionedAmountPaise: 0,
      disbursedAmountPaise: 0,
      status: 'Submitted',
      verificationChecklist: {
        incomeCertificate: false,
        domicileCertificate: false,
        previousMarksheet: false,
        bankPassbook: false,
      },
      remarks: remarks.trim() || undefined,
    };

    dispatch({ type: 'SUBMIT_SCHOLARSHIP_APPLICATION', application: newApp });
    showToast('Application Submitted', `Application recorded for ${student.name}.`, 'success');
    showApprovalNotice({
      itemTitle: `${newApp.studentName} — ${newApp.schemeName}`,
      category: 'Scholarship Grant',
      amountPaise: newApp.appliedAmountPaise,
      reference: newApp.id,
      nextApproverTier: 'Management / Accounts Admin',
      notes: 'Scholarship application submitted for document verification and sanction.',
    });

    setNewAppModalOpen(false);
    setSchemeName('');
    setAppliedRupees('');
    setRemarks('');
  };

  // Open Verification Modal
  const openVerificationModal = (app: ScholarshipApplication) => {
    setSelectedApp(app);
    setChecklist({
      incomeCertificate: app.verificationChecklist.incomeCertificate,
      domicileCertificate: app.verificationChecklist.domicileCertificate,
      previousMarksheet: app.verificationChecklist.previousMarksheet,
      bankPassbook: app.verificationChecklist.bankPassbook,
      casteCertificate: app.verificationChecklist.casteCertificate || false,
    });
    setVerifyModalOpen(true);
  };

  // Save Verification Checklist
  const handleSaveVerification = () => {
    if (!selectedApp) return;

    dispatch({
      type: 'VERIFY_SCHOLARSHIP_DOCUMENTS',
      applicationId: selectedApp.id,
      checklist,
    });

    showToast('Documents Verified', `Checklist updated for ${selectedApp.studentName}.`, 'success');
    setVerifyModalOpen(false);
  };

  // Approve Scholarship Application & Generate Sanction Letter
  const handleApproveApplication = (app: ScholarshipApplication) => {
    const sanctionLetterNo = `PIC-SCH-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    dispatch({
      type: 'APPROVE_SCHOLARSHIP',
      applicationId: app.id,
      sanctionedPaise: app.appliedAmountPaise,
      sanctionLetterNo,
    });

    // Also register into scholarships list for ledger tracking
    const newRecord: ScholarshipRecord = {
      id: `SCH-${Date.now()}`,
      studentId: app.studentId,
      studentName: app.studentName,
      schemeName: app.schemeName,
      providerType: app.providerType,
      sanctionedPaise: app.appliedAmountPaise,
      receivedPaise: app.appliedAmountPaise,
      disbursedToStudentLedgerPaise: app.appliedAmountPaise,
      pendingSource: 'Settled',
      status: 'Disbursed',
      updatedAt: currentDate,
    };
    dispatch({ type: 'ADD_SCHOLARSHIP', scholarship: newRecord });

    showToast('Scholarship Approved', `Sanctioned ${formatINR(app.appliedAmountPaise)} under ${sanctionLetterNo}.`, 'success');
  };

  // Download Sanction Letter PDF
  const handleDownloadSanctionPDF = (app: ScholarshipApplication) => {
    const pdf = new SimplePDF();
    let y = pdf.drawHeader(
      state.settings.institutionName,
      'OFFICIAL SCHOLARSHIP SANCTION LETTER',
      'STUDENT FINANCIAL AID DIVISION'
    );

    pdf.drawRect(40, y - 56, pdf.pageWidth - 80, 48, {
      fill: PDF_COLORS.lightBg,
      stroke: PDF_COLORS.navy,
      lineWidth: 0.5,
    });

    pdf.drawText(`SANCTION ORDER NO: ${app.sanctionLetterNo || 'PIC-SCH-2026-001'}`, 52, y - 14, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    pdf.drawText(`Date of Sanction: ${app.sanctionedDate || currentDate}`, 52, y - 26, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Sponsoring Body: ${app.providerType} (${app.schemeName})`, 52, y - 38, { font: 'Helvetica', size: 8 });

    pdf.drawText('SANCTIONED AMOUNT', pdf.pageWidth - 180, y - 14, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.mutedText, align: 'right' });
    pdf.drawText(formatINR(app.sanctionedAmountPaise || app.appliedAmountPaise), pdf.pageWidth - 52, y - 14, {
      font: 'Helvetica-Bold',
      size: 14,
      color: PDF_COLORS.green,
      align: 'right',
    });

    y -= 80;
    pdf.drawText(`Recipient Student: ${app.studentName}`, 40, y, { font: 'Helvetica-Bold', size: 9 });
    pdf.drawText(`Admission ID: ${app.studentId}`, 250, y, { font: 'Helvetica-Bold', size: 9 });
    pdf.drawText(`Academic Programme: ${app.programme}`, 40, y - 14, { font: 'Helvetica', size: 8.5 });

    y -= 40;
    pdf.drawLine(40, y, pdf.pageWidth - 40, y, { stroke: PDF_COLORS.border });
    y -= 20;

    pdf.drawText('Terms of Sanction & Ledger Adjustment:', 40, y, { font: 'Helvetica-Bold', size: 8.5 });
    pdf.drawText('1. The sanctioned grant amount is credited directly against the student academic tuition fee ledger.', 40, y - 14, { font: 'Helvetica', size: 8 });
    pdf.drawText('2. All eligibility criteria including annual income verification and academic merit scores have been verified.', 40, y - 26, { font: 'Helvetica', size: 8 });
    pdf.drawText('3. The grant is non-transferable and subject to maintaining 75% class attendance throughout the semester.', 40, y - 38, { font: 'Helvetica', size: 8 });

    y -= 90;
    pdf.drawText('Dean of Academic Affairs', 40, y, { font: 'Helvetica-Bold', size: 8 });
    pdf.drawText('Poddar International College', 40, y - 10, { font: 'Helvetica', size: 7.5, color: PDF_COLORS.mutedText });

    pdf.drawText('Accounts Officer (Financial Aid)', pdf.pageWidth - 180, y, { font: 'Helvetica-Bold', size: 8, align: 'right' });
    pdf.drawText('Poddar Group of Institutions', pdf.pageWidth - 180, y - 10, { font: 'Helvetica', size: 7.5, color: PDF_COLORS.mutedText, align: 'right' });

    pdf.drawFooter('Institutional grant confirmation document. Valid for semester fee clearance.');
    triggerPDFDownload(`Sanction-Letter-${app.studentId}.pdf`, pdf.output());
    showToast('PDF Downloaded', `Downloaded Sanction-Letter-${app.studentId}.pdf`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b49662', marginBottom: '4px' }}>
            STUDENT FINANCIAL AID & WELFARE
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 750, color: '#102d47', margin: 0 }}>
            Scholarships & Institutional Grants
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Government welfare schemes, Poddar Trust endowments, corporate CSR aids, and document verification pipeline.
          </p>
        </div>

        <button
          onClick={() => setNewAppModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: '#102d47',
            border: 'none',
            borderRadius: '7px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(16, 45, 71, 0.1)',
          }}
        >
          <Plus size={14} />
          <span>New Scholarship Application</span>
        </button>
      </div>

      {/* 2. Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #102d47' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Total Aid Sanctioned
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalSanctionedPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Govt welfare & Poddar Trust funds</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #25866b' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Disbursed to Ledgers
          </span>
          <div className="headline-number" style={{ color: '#25866b', margin: '6px 0 2px' }}>
            {formatINR(totalDisbursedPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#25866b', fontWeight: 550 }}>Credited against student tuition fees</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #b49662' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Pending from Bodies
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalPendingBodyPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#b49662', fontWeight: 550 }}>Remittance expected from Social Welfare Dept</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #4f46e5' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Pending Applications
          </span>
          <div className="headline-number" style={{ color: '#4f46e5', margin: '6px 0 2px' }}>
            {state.scholarshipApplications.filter(a => a.status === 'Submitted' || a.status === 'Documents Verified').length}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Awaiting verification & sanction</small>
        </div>
      </div>

      {/* 3. Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('grants')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'grants' ? '2.5px solid #102d47' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'grants' ? '#102d47' : '#64748b',
            fontWeight: activeTab === 'grants' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Active Grants & Disbursements ({state.scholarships.length})
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'applications' ? '2.5px solid #102d47' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'applications' ? '#102d47' : '#64748b',
            fontWeight: activeTab === 'applications' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Applications & Document Verification ({state.scholarshipApplications.length})
        </button>
      </div>

      {/* 4. Tab 1: Grants & Disbursements */}
      {activeTab === 'grants' && (
        <div className="card-surface" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>STUDENT ID & NAME</th>
                  <th>SCHEME NAME</th>
                  <th>PROVIDER ENTITY</th>
                  <th style={{ textAlign: 'right' }}>SANCTIONED AID</th>
                  <th style={{ textAlign: 'right' }}>RECEIVED</th>
                  <th style={{ textAlign: 'right' }}>DISBURSED TO LEDGER</th>
                  <th>PENDING SOURCE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {state.scholarships.map(sch => (
                  <tr key={sch.id}>
                    <td>
                      <strong style={{ color: '#102d47', fontSize: '12.5px', display: 'block' }}>
                        {sch.studentName}
                      </strong>
                      <small style={{ color: '#64748b' }}>{sch.studentId}</small>
                    </td>
                    <td>
                      <strong style={{ color: '#1e293b' }}>{sch.schemeName}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{sch.providerType}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#102d47' }} className="tabular-nums">
                      {formatINR(sch.sanctionedPaise)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#25866b' }} className="tabular-nums">
                      {formatINR(sch.receivedPaise)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#102d47' }} className="tabular-nums">
                      {formatINR(sch.disbursedToStudentLedgerPaise)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: sch.pendingSource === 'Settled' ? '#edf7f1' : '#fbf6eb',
                          color: sch.pendingSource === 'Settled' ? '#25866b' : '#b49662',
                        }}
                      >
                        {sch.pendingSource}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${sch.status === 'Disbursed' ? 'good' : 'neutral'}`}>
                        <i />
                        {sch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Applications & Document Checklist Verification */}
      {activeTab === 'applications' && (
        <div className="card-surface" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>STUDENT / PROGRAMME</th>
                  <th>SCHEME & PROVIDER</th>
                  <th style={{ textAlign: 'right' }}>APPLIED AMOUNT</th>
                  <th>DOCUMENTS VERIFIED</th>
                  <th>APPLICATION STATUS</th>
                  <th style={{ textAlign: 'center' }}>APPROVAL WORKFLOW</th>
                </tr>
              </thead>
              <tbody>
                {state.scholarshipApplications.map(app => {
                  const verifiedCount = Object.values(app.verificationChecklist).filter(Boolean).length;
                  const totalDocs = Object.keys(app.verificationChecklist).length;

                  return (
                    <tr key={app.id}>
                      <td>
                        <strong style={{ color: '#102d47', fontSize: '12.5px', display: 'block' }}>
                          {app.studentName}
                        </strong>
                        <small style={{ color: '#64748b' }}>{app.studentId} · {app.programme}</small>
                      </td>
                      <td>
                        <div style={{ color: '#1e293b', fontWeight: 600 }}>{app.schemeName}</div>
                        <small style={{ color: '#83909d' }}>{app.providerType}</small>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#102d47' }} className="tabular-nums">
                        {formatINR(app.appliedAmountPaise)}
                      </td>
                      <td>
                        <button
                          onClick={() => openVerificationModal(app)}
                          style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: '5px',
                            background: '#ffffff',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: verifiedCount === totalDocs ? '#25866b' : '#b49662',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ShieldCheck size={12} />
                          <span>{verifiedCount} of {totalDocs} Docs Verified</span>
                        </button>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            app.status === 'Approved' || app.status === 'Disbursed'
                              ? 'good'
                              : app.status === 'Documents Verified'
                              ? 'neutral'
                              : 'bad'
                          }`}
                        >
                          <i />
                          {app.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {app.status === 'Documents Verified' && (
                            <button
                              onClick={() => handleApproveApplication(app)}
                              style={{
                                padding: '4px 9px',
                                border: 'none',
                                borderRadius: '5px',
                                background: '#25866b',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Sanction & Disburse
                            </button>
                          )}

                          {app.status === 'Submitted' && (
                            <button
                              onClick={() => openVerificationModal(app)}
                              style={{
                                padding: '4px 9px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '5px',
                                background: '#ffffff',
                                color: '#102d47',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Verify Docs
                            </button>
                          )}

                          {(app.status === 'Approved' || app.status === 'Disbursed') && (
                            <button
                              onClick={() => handleDownloadSanctionPDF(app)}
                              style={{
                                padding: '4px 9px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '5px',
                                background: '#ffffff',
                                color: '#102d47',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Download size={11} style={{ color: '#b49662' }} />
                              <span>Sanction Letter PDF</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Modal: Document Verification Checklist */}
      {verifyModalOpen && selectedApp && (
        <Dialog open={verifyModalOpen} title="Document Verification Checklist" subtitle={`${selectedApp.studentName} (${selectedApp.studentId})`} onClose={() => setVerifyModalOpen(false)} maxWidth="520px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Verify original documents submitted by the student for scholarship sanction under {selectedApp.schemeName}.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fafbf9', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#102d47', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checklist.incomeCertificate}
                  onChange={e => setChecklist({ ...checklist, incomeCertificate: e.target.checked })}
                />
                <span>Original Annual Family Income Certificate (Issued by Tehsildar / Competent Authority)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#102d47', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checklist.domicileCertificate}
                  onChange={e => setChecklist({ ...checklist, domicileCertificate: e.target.checked })}
                />
                <span>Rajasthan State Domicile / Mool Niwas Certificate</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#102d47', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checklist.previousMarksheet}
                  onChange={e => setChecklist({ ...checklist, previousMarksheet: e.target.checked })}
                />
                <span>Attested Copy of Previous Qualifying Examination Marksheet (Min 60% Aggregate)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#102d47', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checklist.bankPassbook}
                  onChange={e => setChecklist({ ...checklist, bankPassbook: e.target.checked })}
                />
                <span>Student Bank Passbook Copy (Aadhaar Seeded & Active NPCI Mapping)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#102d47', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checklist.casteCertificate}
                  onChange={e => setChecklist({ ...checklist, casteCertificate: e.target.checked })}
                />
                <span>Category / Caste Certificate (if applicable for Social Welfare scheme)</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVerification}
                style={{ padding: '8px 18px', background: '#102d47', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Mark Documents Verified
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* 7. Modal: New Application */}
      {newAppModalOpen && (
        <Dialog open={newAppModalOpen} title="New Scholarship Application" subtitle="Student Aid Registration" onClose={() => setNewAppModalOpen(false)}>
          <form onSubmit={handleCreateApplication} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Select Student *
              </label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                style={{ width: '100%' }}
                required
              >
                {state.students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id}) — {s.programme} (Sem {s.semester})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Scholarship Scheme Name *
              </label>
              <input
                placeholder="e.g. Rajasthan Post-Matric Merit Scholarship"
                value={schemeName}
                onChange={e => setSchemeName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Provider Entity Type *
                </label>
                <select
                  value={providerType}
                  onChange={e => setProviderType(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="Government Body">Government Body</option>
                  <option value="Institutional Trust">Poddar Institutional Trust</option>
                  <option value="Corporate CSR">Corporate CSR Endowment</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Applied Amount (₹) *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={appliedRupees}
                  onChange={e => setAppliedRupees(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Remarks / Criteria
              </label>
              <input
                placeholder="e.g. Merit ranking in Rajasthan university entrance"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setNewAppModalOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', background: '#102d47', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Submit Application
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
