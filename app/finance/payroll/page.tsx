// College Finance Portal - Monthly Payroll Register & Approval Workflow
// Multi-Tier Approvals (Draft -> HOD -> HR -> Accounts -> Approved -> Paid), LOP Divisors, Bank Bulk File & PDF Payslips

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Banknote,
  Search,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Shield,
  Layers,
  PlusCircle,
  UserCheck,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise, toRupees } from '@/lib/finance-portal/finance/money';
import { calculateLop, calculateStatutory, validatePayrollTransition } from '@/lib/finance-portal/hr/payroll-engine';
import { canApproveRecord } from '@/lib/finance-portal/security/rbac';
import { SimplePDF, triggerPDFDownload, PDF_COLORS } from '@/lib/finance-portal/export/pdf-generator';
import { downloadCSV } from '@/lib/finance-portal/security/csv-sanitizer';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { ConfirmDialog } from '@/components/finance-portal/ui/confirm-dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { useApprovalNotice } from '@/components/finance-portal/ui/approval-notice';
import type { PayrollRecord, PayrollStatus, Role } from '@/lib/finance-portal/types/finance';

export default function PayrollPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();
  const { showApprovalNotice } = useApprovalNotice();
  const currentRole = state.settings.currentRole;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentPeriod = currentDate.slice(0, 7); // '2026-11'
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PayrollStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Settle / Payout Dialog
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [activeRecordForSettle, setActiveRecordForSettle] = useState<PayrollRecord | null>(null);
  const [utrInput, setUtrInput] = useState('');

  // Bulk Generate Dialog
  const [bulkComputeOpen, setBulkComputeOpen] = useState(false);
  const [selectedBankTemplate, setSelectedBankTemplate] = useState<'SBI' | 'HDFC' | 'ICICI'>('SBI');

  // Add Manual Payroll Entry Dialog
  const [addPayrollOpen, setAddPayrollOpen] = useState(false);
  const [entryEmployeeId, setEntryEmployeeId] = useState('');
  const [entryWorkingDays, setEntryWorkingDays] = useState(30);
  const [entryPresentDays, setEntryPresentDays] = useState(30);
  const [entryPaidLeaveDays, setEntryPaidLeaveDays] = useState(1);
  const [entryUnpaidLeaveDays, setEntryUnpaidLeaveDays] = useState(0);
  const [entryBaseSalary, setEntryBaseSalary] = useState('45000');
  const [entryHra, setEntryHra] = useState('18000');
  const [entryDa, setEntryDa] = useState('4500');
  const [entrySpecial, setEntrySpecial] = useState('2500');
  const [entryConveyance, setEntryConveyance] = useState('1600');
  const [entryLopDeduction, setEntryLopDeduction] = useState('0');
  const [entryPfDeduction, setEntryPfDeduction] = useState('1800');
  const [entryEsiDeduction, setEntryEsiDeduction] = useState('0');
  const [entryTds, setEntryTds] = useState('0');
  const [entryLoanRecovery, setEntryLoanRecovery] = useState('0');
  const [entryInitialStatus, setEntryInitialStatus] = useState<PayrollStatus>('Draft');

  const populateEmpFields = (emp: typeof state.employees[0]) => {
    setEntryEmployeeId(emp.id);
    const base = toRupees(emp.baseSalaryPaise);
    const hra = toRupees(emp.hraPaise);
    const da = toRupees(emp.daPaise);
    const sp = toRupees(emp.specialAllowancePaise);
    const conv = toRupees(emp.conveyancePaise);
    setEntryBaseSalary(String(base));
    setEntryHra(String(hra));
    setEntryDa(String(da));
    setEntrySpecial(String(sp));
    setEntryConveyance(String(conv));
    setEntryWorkingDays(30);
    setEntryPresentDays(30);
    setEntryPaidLeaveDays(1);
    setEntryUnpaidLeaveDays(0);
    setEntryLopDeduction('0');

    // Auto statutory
    const statutory = calculateStatutory(
      emp.baseSalaryPaise,
      emp.baseSalaryPaise + emp.hraPaise + emp.daPaise + emp.specialAllowancePaise + emp.conveyancePaise,
      emp,
      {
        pfEmployeePct: state.settings.statutory.pfEmployeeRatePct,
        pfEmployerPct: state.settings.statutory.pfEmployerRatePct,
        esiEmployeePct: state.settings.statutory.esiEmployeeRatePct,
        esiEmployerPct: state.settings.statutory.esiEmployerRatePct,
        esiCeilingPaise: state.settings.statutory.esiGrossCeilingPaise,
      }
    );
    setEntryPfDeduction(String(toRupees(statutory.pfEmployeePaise)));
    setEntryEsiDeduction(String(toRupees(statutory.esiEmployeePaise)));
    setEntryTds(String(toRupees(statutory.tdsDeductionPaise)));
    setEntryLoanRecovery('0');
    setEntryInitialStatus('Draft');
  };

  const handleOpenAddPayroll = () => {
    const firstEmp = state.employees.find(e => e.status === 'Active') || state.employees[0];
    if (firstEmp) {
      populateEmpFields(firstEmp);
    }
    setAddPayrollOpen(true);
  };

  const handleSelectEmployee = (empId: string) => {
    const emp = state.employees.find(e => e.id === empId);
    if (emp) populateEmpFields(emp);
  };

  const handleUnpaidDaysChange = (unpaid: number) => {
    setEntryUnpaidLeaveDays(unpaid);
    setEntryPresentDays(Math.max(0, entryWorkingDays - unpaid));
    const grossPaise =
      toPaise(parseFloat(entryBaseSalary) || 0) +
      toPaise(parseFloat(entryHra) || 0) +
      toPaise(parseFloat(entryDa) || 0) +
      toPaise(parseFloat(entrySpecial) || 0) +
      toPaise(parseFloat(entryConveyance) || 0);
    const lop = calculateLop(grossPaise, unpaid, selectedPeriod, state.settings.statutory.dailyDivisorMode);
    setEntryLopDeduction(String(toRupees(lop.lopDeductionPaise)));
  };

  // Live computed amounts
  const calcGrossRupees =
    (parseFloat(entryBaseSalary) || 0) +
    (parseFloat(entryHra) || 0) +
    (parseFloat(entryDa) || 0) +
    (parseFloat(entrySpecial) || 0) +
    (parseFloat(entryConveyance) || 0);

  const calcDeductionsRupees =
    (parseFloat(entryLopDeduction) || 0) +
    (parseFloat(entryPfDeduction) || 0) +
    (parseFloat(entryEsiDeduction) || 0) +
    (parseFloat(entryTds) || 0) +
    (parseFloat(entryLoanRecovery) || 0);

  const calcNetRupees = Math.max(0, calcGrossRupees - calcDeductionsRupees);

  const handleSaveManualPayroll = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = state.employees.find(e => e.id === entryEmployeeId);
    if (!emp) {
      showToast('Validation Error', 'Please select a valid staff member.', 'error');
      return;
    }

    const recId = `${selectedPeriod}/${emp.id}`;
    const grossPaise = toPaise(calcGrossRupees);
    const lopPaise = toPaise(parseFloat(entryLopDeduction) || 0);
    const pfPaise = toPaise(parseFloat(entryPfDeduction) || 0);
    const esiPaise = toPaise(parseFloat(entryEsiDeduction) || 0);
    const tdsPaise = toPaise(parseFloat(entryTds) || 0);
    const loanPaise = toPaise(parseFloat(entryLoanRecovery) || 0);
    const deductionsPaise = lopPaise + pfPaise + esiPaise + tdsPaise + loanPaise;
    const netPaise = Math.max(0, grossPaise - deductionsPaise);

    const newRecord: PayrollRecord = {
      id: recId,
      period: selectedPeriod,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      grossPaise,
      earnedBasicPaise: toPaise(parseFloat(entryBaseSalary) || 0),
      earnedHraPaise: toPaise(parseFloat(entryHra) || 0),
      earnedDaPaise: toPaise(parseFloat(entryDa) || 0),
      earnedSpecialPaise: toPaise(parseFloat(entrySpecial) || 0),
      earnedConveyancePaise: toPaise(parseFloat(entryConveyance) || 0),
      workingDays: entryWorkingDays,
      presentDays: entryPresentDays,
      paidLeaveDays: entryPaidLeaveDays,
      unpaidLeaveDays: entryUnpaidLeaveDays,
      lopDeductionPaise: lopPaise,
      pfEmployeePaise: pfPaise,
      pfEmployerPaise: Math.round(pfPaise * 1.04),
      esiEmployeePaise: esiPaise,
      esiEmployerPaise: Math.round(esiPaise * 4.33),
      tdsDeductionPaise: tdsPaise,
      loanRecoveryPaise: loanPaise,
      totalDeductionsPaise: deductionsPaise,
      netSalaryPaise: netPaise,
      status: entryInitialStatus,
      history: [
        {
          event: entryInitialStatus === 'Approved' ? 'Directly Sanctioned & Approved' : `Created as ${entryInitialStatus}`,
          timestamp: new Date().toISOString(),
          actor: currentRole,
          remarks: `Manual salary entry created via Payroll Register by ${currentRole}`,
        },
      ],
      createdBy: 'HR Admin',
    };

    dispatch({ type: 'SAVE_PAYROLL_RECORD', record: newRecord });
    showToast('Salary Entry Created', `Payroll record for ${emp.name} saved as ${entryInitialStatus}.`, 'success');
    setAddPayrollOpen(false);
  };

  // Compute or get payroll records for current period
  const activeRecords = useMemo(() => {
    return state.payrollRecords.filter(r => r.period === selectedPeriod);
  }, [state.payrollRecords, selectedPeriod]);

  // Bulk Compute Drafts for all active employees
  const handleBulkComputeDrafts = () => {
    let createdCount = 0;
    const workingDays = 30;

    state.employees
      .filter(e => e.status === 'Active')
      .forEach(emp => {
        const id = `${selectedPeriod}/${emp.id}`;
        // Skip if already computed
        if (state.payrollRecords.some(r => r.id === id)) return;

        const gross =
          emp.baseSalaryPaise +
          emp.hraPaise +
          emp.daPaise +
          emp.specialAllowancePaise +
          emp.conveyancePaise;

        // Simulate 0 to 1.5 unpaid leave days
        const unpaidDays = emp.id === 'EMP004' ? 1 : emp.id === 'EMP009' ? 0.5 : 0;
        const lop = calculateLop(
          gross,
          unpaidDays,
          selectedPeriod,
          state.settings.statutory.dailyDivisorMode
        );

        const earnedBasic = Math.max(0, emp.baseSalaryPaise - Math.round(lop.lopDeductionPaise * 0.5));
        const statutory = calculateStatutory(
          earnedBasic,
          gross - lop.lopDeductionPaise,
          emp,
          {
            pfEmployeePct: state.settings.statutory.pfEmployeeRatePct,
            pfEmployerPct: state.settings.statutory.pfEmployerRatePct,
            esiEmployeePct: state.settings.statutory.esiEmployeeRatePct,
            esiEmployerPct: state.settings.statutory.esiEmployerRatePct,
            esiCeilingPaise: state.settings.statutory.esiGrossCeilingPaise,
          }
        );

        const totalDeductions =
          lop.lopDeductionPaise +
          statutory.pfEmployeePaise +
          statutory.esiEmployeePaise +
          statutory.tdsDeductionPaise;
        const netSalary = Math.max(0, gross - totalDeductions);

        const newRecord: PayrollRecord = {
          id,
          period: selectedPeriod,
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          grossPaise: gross,
          earnedBasicPaise: earnedBasic,
          earnedHraPaise: emp.hraPaise,
          earnedDaPaise: emp.daPaise,
          earnedSpecialPaise: emp.specialAllowancePaise,
          earnedConveyancePaise: emp.conveyancePaise,
          workingDays,
          presentDays: workingDays - unpaidDays,
          paidLeaveDays: 1,
          unpaidLeaveDays: unpaidDays,
          lopDeductionPaise: lop.lopDeductionPaise,
          pfEmployeePaise: statutory.pfEmployeePaise,
          pfEmployerPaise: statutory.pfEmployerPaise,
          esiEmployeePaise: statutory.esiEmployeePaise,
          esiEmployerPaise: statutory.esiEmployerPaise,
          tdsDeductionPaise: statutory.tdsDeductionPaise,
          loanRecoveryPaise: 0,
          totalDeductionsPaise: totalDeductions,
          netSalaryPaise: netSalary,
          status: 'Draft',
          history: [
            {
              event: 'Draft Computed',
              timestamp: new Date().toISOString(),
              actor: currentRole,
              remarks: `Generated via bulk engine (${state.settings.statutory.dailyDivisorMode} divisor)`,
            },
          ],
          createdBy: currentRole,
        };

        dispatch({ type: 'SAVE_PAYROLL_RECORD', record: newRecord });
        createdCount++;
      });

    showToast('Payroll Computed', `Created draft payroll calculations for ${createdCount} employees.`, 'success');
    setBulkComputeOpen(false);
  };

  // State Transition Handlers with Maker-Checker
  const handleTransitionStatus = (record: PayrollRecord, targetStatus: PayrollStatus) => {
    // Maker-checker check on approval steps
    if (['Approved', 'Pending Accounts Approval', 'Pending Director Approval'].includes(targetStatus)) {
      if (currentRole !== 'Super Admin' && currentRole !== 'Director' && currentRole !== 'HOD') {
        const check = canApproveRecord(currentRole, record.createdBy, 'PAYROLL');
        if (!check.allowed) {
          showToast('Authorization Denied', check.reason, 'error');
          return;
        }
      }
    }

    const val = validatePayrollTransition(record, targetStatus, currentRole);
    if (!val.valid) {
      showToast('Action Blocked', val.reason, 'error');
      return;
    }

    dispatch({
      type: 'UPDATE_PAYROLL_STATUS',
      recordId: record.id,
      status: targetStatus,
      remarks: `Promoted to ${targetStatus} by ${currentRole}`,
    });

    showToast('Stage Updated', `${record.employeeName} moved to ${targetStatus}.`, 'info');

    if (targetStatus.startsWith('Pending')) {
      showApprovalNotice({
        itemTitle: `${record.employeeName} — Salary Slip (${record.period})`,
        category: 'Payroll & Salaries',
        amountPaise: record.netSalaryPaise,
        reference: record.id,
        nextApproverTier: targetStatus.replace('Pending ', ''),
        notes: `Payroll record transitioned to ${targetStatus} by ${currentRole}.`,
      });
    }
  };

  // Settle / Disburse Payment with unique UTR
  const handleSettlePayment = () => {
    if (!activeRecordForSettle || !utrInput.trim()) return;

    // Check duplicate UTR across fee payments and OpEx bills
    const isDup =
      state.feePayments.some(p => p.reference.trim().toUpperCase() === utrInput.trim().toUpperCase()) ||
      state.opExBills.some(b => b.paymentReference?.trim().toUpperCase() === utrInput.trim().toUpperCase()) ||
      state.payrollRecords.some(r => r.paymentReference?.trim().toUpperCase() === utrInput.trim().toUpperCase());

    if (isDup) {
      showToast('Duplicate UTR', `UTR ${utrInput} has already been registered in institutional records.`, 'error');
      return;
    }

    dispatch({
      type: 'UPDATE_PAYROLL_STATUS',
      recordId: activeRecordForSettle.id,
      status: 'Paid',
      utr: utrInput.trim().toUpperCase(),
      remarks: `Disbursed via bank transfer. UTR: ${utrInput.trim().toUpperCase()}`,
    });

    showToast('Salary Disbursed', `Payment settled for ${activeRecordForSettle.employeeName}.`, 'success');
    setSettleModalOpen(false);
    setActiveRecordForSettle(null);
    setUtrInput('');
  };

  // Generate Bank Bulk Disbursement File (CSV)
  const handleExportBankFile = () => {
    const approvedOrProcessing = activeRecords.filter(r => r.status === 'Approved' || r.status === 'Processing');
    if (approvedOrProcessing.length === 0) {
      showToast('No Records', 'No Approved or Processing records ready for bank file generation.', 'error');
      return;
    }

    let csvContent = '';
    if (selectedBankTemplate === 'SBI') {
      csvContent = 'Beneficiary Name,Account Number,IFSC Code,Amount INR,Payment Narration\r\n';
      approvedOrProcessing.forEach(r => {
        const emp = state.employees.find(e => e.id === r.employeeId);
        csvContent += `"${r.employeeName}","39912000${emp?.accountLastFour || '4102'}","${emp?.ifsc || 'SBIN0004123'}",${r.netSalaryPaise / 100},"Salary ${selectedPeriod}"\r\n`;
      });
    } else {
      csvContent = 'Payment Date,Debit Account,Beneficiary Name,Beneficiary IFSC,Credit Account,Amount,Remarks\r\n';
      approvedOrProcessing.forEach(r => {
        const emp = state.employees.find(e => e.id === r.employeeId);
        csvContent += `"${currentDate}","HDFC_COLLEGE_PAYROLL","${r.employeeName}","${emp?.ifsc || 'HDFC0001234'}","501000${emp?.accountLastFour || '7821'}",${r.netSalaryPaise / 100},"Poddar Payroll ${selectedPeriod}"\r\n`;
      });
    }

    downloadCSV(`Bank-Disbursement-${selectedBankTemplate}-${selectedPeriod}.csv`, csvContent);
    showToast('Bank File Downloaded', `Generated ${selectedBankTemplate} format for ${approvedOrProcessing.length} transfers.`, 'success');
  };

  // Generate Payslip PDF
  const handleDownloadPayslip = (record: PayrollRecord) => {
    const emp = state.employees.find(e => e.id === record.employeeId);
    if (!emp) return;

    const pdf = new SimplePDF();
    let y = pdf.drawHeader(state.settings.institutionName, `SALARY PAYSLIP — ${record.period}`, 'FACULTY & STAFF PAYROLL REGISTER');

    // Employee Key Details Box
    pdf.drawRect(40, y - 50, pdf.pageWidth - 80, 45, {
      fill: PDF_COLORS.lightBg,
      stroke: PDF_COLORS.navy,
      lineWidth: 0.5,
    });

    pdf.drawText(`Employee Name: ${record.employeeName}`, 52, y - 10, { font: 'Helvetica-Bold', size: 9, color: PDF_COLORS.navy });
    pdf.drawText(`Employee ID: ${record.employeeId} | Dept: ${record.department}`, 52, y - 22, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Designation: ${emp.designation}`, 52, y - 34, { font: 'Helvetica', size: 8 });
    pdf.drawText(`Bank Acc: •••• ${emp.accountLastFour} (${emp.bankName}) | IFSC: ${emp.ifsc}`, 52, y - 46, { font: 'Helvetica', size: 8 });

    pdf.drawText('NET TAKE-HOME', pdf.pageWidth - 180, y - 12, { font: 'Helvetica-Bold', size: 8, color: PDF_COLORS.mutedText, align: 'right' });
    pdf.drawText(formatINR(record.netSalaryPaise), pdf.pageWidth - 52, y - 12, { font: 'Helvetica-Bold', size: 14, color: PDF_COLORS.navy, align: 'right' });
    pdf.drawText(`STATUS: ${record.status.toUpperCase()}`, pdf.pageWidth - 52, y - 32, {
      font: 'Helvetica-Bold',
      size: 8,
      color: record.status === 'Paid' ? PDF_COLORS.green : PDF_COLORS.gold,
      align: 'right',
    });

    y -= 70;

    // Earnings vs Deductions Table
    pdf.drawText('EARNINGS & ALLOWANCES', 40, y, { font: 'Helvetica-Bold', size: 8.5, color: PDF_COLORS.navy });
    pdf.drawText('STATUTORY & OTHER DEDUCTIONS', 300, y, { font: 'Helvetica-Bold', size: 8.5, color: PDF_COLORS.crimson });

    y -= 14;
    pdf.drawLine(40, y, pdf.pageWidth - 40, y, { stroke: PDF_COLORS.border });
    y -= 14;

    const earnings = [
      ['Basic Pay', formatINR(record.earnedBasicPaise)],
      ['House Rent Allowance (HRA)', formatINR(record.earnedHraPaise)],
      ['Dearness Allowance (DA)', formatINR(record.earnedDaPaise)],
      ['Special Allowance', formatINR(record.earnedSpecialPaise)],
      ['Conveyance Allowance', formatINR(record.earnedConveyancePaise)],
    ];

    const deductions = [
      ['Loss of Pay (LOP) Days', `${record.unpaidLeaveDays}d: ${formatINR(record.lopDeductionPaise)}`],
      ['Employee PF (12%)', formatINR(record.pfEmployeePaise)],
      ['Employee ESI', formatINR(record.esiEmployeePaise)],
      ['Income Tax / TDS', formatINR(record.tdsDeductionPaise)],
      ['Loan Recovery', formatINR(record.loanRecoveryPaise)],
    ];

    for (let i = 0; i < Math.max(earnings.length, deductions.length); i++) {
      if (earnings[i]) {
        pdf.drawText(earnings[i][0], 40, y, { font: 'Helvetica', size: 8 });
        pdf.drawText(earnings[i][1], 240, y, { font: 'Helvetica', size: 8, align: 'right' });
      }
      if (deductions[i]) {
        pdf.drawText(deductions[i][0], 300, y, { font: 'Helvetica', size: 8 });
        pdf.drawText(deductions[i][1], pdf.pageWidth - 40, y, { font: 'Helvetica', size: 8, align: 'right' });
      }
      y -= 14;
    }

    y -= 10;
    pdf.drawLine(40, y, pdf.pageWidth - 40, y, { stroke: PDF_COLORS.border });
    y -= 14;

    pdf.drawText('Total Gross Earnings', 40, y, { font: 'Helvetica-Bold', size: 8.5 });
    pdf.drawText(formatINR(record.grossPaise), 240, y, { font: 'Helvetica-Bold', size: 8.5, align: 'right' });
    pdf.drawText('Total Deductions', 300, y, { font: 'Helvetica-Bold', size: 8.5, color: PDF_COLORS.crimson });
    pdf.drawText(formatINR(record.totalDeductionsPaise), pdf.pageWidth - 40, y, { font: 'Helvetica-Bold', size: 8.5, align: 'right', color: PDF_COLORS.crimson });

    y -= 50;
    pdf.drawText('Authorized HR Officer', 60, y, { font: 'Helvetica', size: 8 });
    pdf.drawText('Chief Accounts Officer', pdf.pageWidth - 180, y, { font: 'Helvetica', size: 8, align: 'right' });

    pdf.drawFooter('Official confidential salary statement. Poddar Institute · College HRMS.');

    const filename = `Payslip-${record.employeeId}-${record.period}.pdf`;
    triggerPDFDownload(filename, pdf.output());
    showToast('Payslip Generated', `Downloaded ${filename}`, 'info');
  };

  // Filtered Display List
  const filteredRecords = useMemo(() => {
    return activeRecords.filter(r => {
      const matchesSearch =
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeRecords, searchQuery, statusFilter]);

  if (!isMounted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '600px', opacity: 0.5 }}>
        <div style={{ height: '32px', width: '300px', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px' }} />
        <div style={{ height: '70px', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ height: '80px', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }} />
          ))}
        </div>
        <div style={{ height: '300px', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} suppressHydrationWarning>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Monthly Payroll Register & Approvals</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Attendance-driven LOP calculation, multi-stage approval pipeline, and bank transfer settlement.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleOpenAddPayroll}
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
              boxShadow: '0 2px 4px rgba(11,29,58,0.2)',
            }}
          >
            <PlusCircle size={15} />
            <span>Add Payroll Entry</span>
          </button>

          <button
            onClick={() => setBulkComputeOpen(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--navy)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Layers size={15} />
            <span>Compute Month Drafts</span>
          </button>

          <button
            onClick={handleExportBankFile}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--navy)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Generate Bank File</span>
          </button>
        </div>
      </div>

      {/* Multi-Tier Approval Stepper Pipeline */}
      <div className="card-surface" style={{ padding: '14px 20px' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.8px', color: '#83909d', textTransform: 'uppercase', marginBottom: '8px' }}>
          7-STAGE STATUTORY PAYROLL APPROVAL PIPELINE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflowX: 'auto', gap: '8px' }}>
          {[
            { step: '1', label: 'Draft Computed', count: activeRecords.filter(r => r.status === 'Draft').length },
            { step: '2', label: 'HOD Verified', count: activeRecords.filter(r => r.status === 'Pending HOD Review').length },
            { step: '3', label: 'HR Checked', count: activeRecords.filter(r => r.status === 'Pending HR Approval').length },
            { step: '4', label: 'Accounts Audited', count: activeRecords.filter(r => r.status === 'Pending Accounts Approval').length },
            { step: '5', label: 'Director Approved', count: activeRecords.filter(r => r.status === 'Pending Director Approval' || r.status === 'Approved').length },
            { step: '6', label: 'Disbursed (Paid)', count: activeRecords.filter(r => r.status === 'Paid').length },
          ].map((stage, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: stage.count > 0 ? '#102d47' : '#e2e8f0',
                  color: stage.count > 0 ? '#ffffff' : '#64748b',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {stage.step}
              </div>
              <div>
                <strong style={{ fontSize: '11px', display: 'block', color: '#102d47' }}>{stage.label}</strong>
                <small style={{ fontSize: '10px', color: '#64748b' }}>{stage.count} records</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Executive Payroll KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #102d47' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Total Gross Earnings
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(activeRecords.reduce((s, r) => s + r.grossPaise, 0))}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Basic + HRA + DA + Allowances</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #25866b' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Net Take-Home Payable
          </span>
          <div className="headline-number" style={{ color: '#25866b', margin: '6px 0 2px' }}>
            {formatINR(activeRecords.reduce((s, r) => s + r.netSalaryPaise, 0))}
          </div>
          <small style={{ fontSize: '11px', color: '#25866b', fontWeight: 550 }}>Payable via bank NEFT batch</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #ad211d' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Statutory Withholdings
          </span>
          <div className="headline-number" style={{ color: '#ad211d', margin: '6px 0 2px' }}>
            {formatINR(activeRecords.reduce((s, r) => s + (r.pfEmployeePaise + r.esiEmployeePaise + r.tdsDeductionPaise), 0))}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>EPF 12%, ESI 0.75%, TDS</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #b49662' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Staff on Payroll
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {activeRecords.length} / {state.employees.filter(e => e.status === 'Active').length}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Active faculty & support staff</small>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        {/* Period Selector & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pay Period:</span>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', backgroundColor: 'var(--bg-card)' }}
            >
              <option value="2026-11">November 2026</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '280px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search faculty or department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Employee Name & ID</th>
                <th>Department</th>
                <th style={{ textAlign: 'right' }}>Gross Pay</th>
                <th style={{ textAlign: 'right' }}>LOP & Deductions</th>
                <th style={{ textAlign: 'right' }}>Net Payable</th>
                <th>Approval Stage</th>
                <th style={{ textAlign: 'right' }}>Workflow Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No payroll records computed for {selectedPeriod}. Click <strong>Compute Month Drafts</strong> to generate.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td data-label="Employee">
                      <strong>{r.employeeName}</strong>
                      <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {r.employeeId} · Present: {r.presentDays}d / Unpaid: {r.unpaidLeaveDays}d
                      </span>
                    </td>
                    <td data-label="Department">{r.department}</td>
                    <td data-label="Gross" style={{ textAlign: 'right' }} className="tabular-nums">
                      {formatINR(r.grossPaise)}
                    </td>
                    <td data-label="Deductions" style={{ textAlign: 'right', color: 'var(--crimson)' }} className="tabular-nums">
                      -{formatINR(r.totalDeductionsPaise)}
                    </td>
                    <td data-label="Net Pay" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }} className="tabular-nums">
                      {formatINR(r.netSalaryPaise)}
                    </td>
                    <td data-label="Stage">
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor:
                            r.status === 'Paid'
                              ? 'var(--green-light)'
                              : r.status === 'Approved'
                              ? 'var(--navy-light)'
                              : r.status === 'On Hold'
                              ? 'var(--crimson-light)'
                              : 'var(--gold-light)',
                          color:
                            r.status === 'Paid'
                              ? 'var(--green)'
                              : r.status === 'Approved'
                              ? 'var(--navy)'
                              : r.status === 'On Hold'
                              ? 'var(--crimson)'
                              : 'var(--gold)',
                        }}
                      >
                        {r.status}
                      </span>
                      {r.paymentReference && (
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          UTR: {r.paymentReference}
                        </span>
                      )}
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {r.status === 'Draft' && (
                          <button
                            onClick={() => handleTransitionStatus(r, 'Pending HOD Review')}
                            style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--navy-light)', color: 'var(--navy)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Submit HOD
                          </button>
                        )}
                        {r.status === 'Pending HOD Review' && (
                          <button
                            onClick={() => handleTransitionStatus(r, 'Approved')}
                            style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            title="Direct HOD approval and sanction"
                          >
                            ✓ HOD Approve
                          </button>
                        )}
                        {r.status === 'Pending HR Approval' && (
                          <button
                            onClick={() => handleTransitionStatus(r, 'Approved')}
                            style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            title="Direct HR approval and sanction"
                          >
                            ✓ HR Approve
                          </button>
                        )}
                        {r.status === 'Pending Accounts Approval' && (
                          <button
                            onClick={() => handleTransitionStatus(r, 'Approved')}
                            style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            title="Direct Accounts approval"
                          >
                            ✓ Accounts Approve
                          </button>
                        )}
                        {r.status === 'Approved' && (
                          <button
                            onClick={() => {
                              setActiveRecordForSettle(r);
                              setUtrInput(`UTR-SAL-${r.period.replace('-', '')}-${r.employeeId}`);
                              setSettleModalOpen(true);
                            }}
                            style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--navy)', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Settle Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadPayslip(r)}
                          title="Download PDF Payslip"
                          style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Payslip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Settle Payment with UTR */}
      <Dialog open={settleModalOpen} onClose={() => setSettleModalOpen(false)} title="Record Salary Disbursement">
        {activeRecordForSettle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Settling take-home salary of <strong>{formatINR(activeRecordForSettle.netSalaryPaise)}</strong> for{' '}
              <strong>{activeRecordForSettle.employeeName}</strong> ({activeRecordForSettle.employeeId}) for {activeRecordForSettle.period}.
            </p>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Bank Transaction Reference / Unique UTR*
              </label>
              <input
                type="text"
                value={utrInput}
                onChange={e => setUtrInput(e.target.value.toUpperCase())}
                placeholder="UTR-202611-EMP001"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setSettleModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSettlePayment}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Disbursement
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL: Add Manual Payroll Record */}
      <Dialog
        open={addPayrollOpen}
        onClose={() => setAddPayrollOpen(false)}
        title="Add Employee Payroll Entry"
        subtitle={`Generate a monthly salary calculation & payslip entry for ${selectedPeriod}.`}
        maxWidth="720px"
      >
        <form onSubmit={handleSaveManualPayroll} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Employee & Period Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Select Employee / Staff Member*
              </label>
              <select
                value={entryEmployeeId}
                onChange={e => handleSelectEmployee(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
              >
                {state.employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.id} — {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Payroll Period (YYYY-MM)
              </label>
              <input
                type="text"
                value={selectedPeriod}
                disabled
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: '12px', opacity: 0.8 }}
              />
            </div>
          </div>

          {/* Attendance & LOP Days */}
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--navy)', display: 'block', marginBottom: '8px' }}>
              Attendance & Working Days
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>Working Days</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={entryWorkingDays}
                  onChange={e => setEntryWorkingDays(parseInt(e.target.value) || 30)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>Present Days</label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  step="0.5"
                  value={entryPresentDays}
                  onChange={e => setEntryPresentDays(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>Paid Leave</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={entryPaidLeaveDays}
                  onChange={e => setEntryPaidLeaveDays(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--crimson)' }}>Unpaid (LOP)</label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  step="0.5"
                  value={entryUnpaidLeaveDays}
                  onChange={e => handleUnpaidDaysChange(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--navy)', display: 'block', marginBottom: '6px' }}>
              Earnings Breakdown (INR)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>Basic Salary*</label>
                <input
                  type="number"
                  min="0"
                  value={entryBaseSalary}
                  onChange={e => setEntryBaseSalary(e.target.value)}
                  required
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>HRA</label>
                <input
                  type="number"
                  min="0"
                  value={entryHra}
                  onChange={e => setEntryHra(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>DA</label>
                <input
                  type="number"
                  min="0"
                  value={entryDa}
                  onChange={e => setEntryDa(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>Special Allw.</label>
                <input
                  type="number"
                  min="0"
                  value={entrySpecial}
                  onChange={e => setEntrySpecial(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>Conveyance</label>
                <input
                  type="number"
                  min="0"
                  value={entryConveyance}
                  onChange={e => setEntryConveyance(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Deductions Breakdown */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--crimson)', display: 'block', marginBottom: '6px' }}>
              Statutory & Other Deductions (INR)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>LOP Deduction</label>
                <input
                  type="number"
                  min="0"
                  value={entryLopDeduction}
                  onChange={e => setEntryLopDeduction(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>PF (Emp)</label>
                <input
                  type="number"
                  min="0"
                  value={entryPfDeduction}
                  onChange={e => setEntryPfDeduction(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>ESI (Emp)</label>
                <input
                  type="number"
                  min="0"
                  value={entryEsiDeduction}
                  onChange={e => setEntryEsiDeduction(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>TDS (Tax)</label>
                <input
                  type="number"
                  min="0"
                  value={entryTds}
                  onChange={e => setEntryTds(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: 'var(--text-muted)' }}>Loan/Advance</label>
                <input
                  type="number"
                  min="0"
                  value={entryLoanRecovery}
                  onChange={e => setEntryLoanRecovery(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Live Net Pay Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(11, 29, 58, 0.04)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>TOTAL GROSS EARNINGS</span>
              <strong style={{ fontSize: '15px', color: 'var(--navy)' }}>₹{calcGrossRupees.toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--crimson)', display: 'block' }}>TOTAL DEDUCTIONS</span>
              <strong style={{ fontSize: '15px', color: 'var(--crimson)' }}>-₹{calcDeductionsRupees.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#047857', display: 'block', fontWeight: 600 }}>NET TAKE-HOME SALARY</span>
              <strong style={{ fontSize: '18px', color: '#047857' }}>₹{calcNetRupees.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Initial Status Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Initial Workflow Status
              </label>
              <select
                value={entryInitialStatus}
                onChange={e => setEntryInitialStatus(e.target.value as PayrollStatus)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '12px' }}
              >
                <option value="Draft">Draft (Editable)</option>
                <option value="Pending HOD Review">Pending HOD Review</option>
                <option value="Approved">Approved (Sanctioned for Disbursement)</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setAddPayrollOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(11,29,58,0.2)' }}
            >
              Save Payroll Entry
            </button>
          </div>
        </form>
      </Dialog>

      {/* CONFIRM: Bulk Compute */}
      <ConfirmDialog
        open={bulkComputeOpen}
        onClose={() => setBulkComputeOpen(false)}
        onConfirm={handleBulkComputeDrafts}
        title="Compute Month Payroll"
        description={`This will generate initial draft payroll records for all active employees for ${selectedPeriod} using the configured ${state.settings.statutory.dailyDivisorMode} divisor policy. Existing records will be preserved.`}
        confirmLabel="Compute Drafts"
      />
    </div>
  );
}

