// College Finance Portal - Central Typed Store (Context + Reducer)
// Persistent localStorage with versioning, debounced auto-save, and error-guarded I/O.

'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import type {
  Role,
  Student,
  FeePayment,
  DefaulterReminder,
  Employee,
  PayrollRecord,
  GuestFacultyLog,
  EmployeeLoan,
  ExtraPayRecord,
  Vendor,
  OpExBill,
  PettyCashVoucher,
  DepartmentBudget,
  ScholarshipRecord,
  OtherIncome,
  CollegeEvent,
  CashBookEntry,
  SettingsConfig,
  AuditLogEntry,
} from '../types/finance';
import {
  INITIAL_SETTINGS,
  SEED_VENDORS,
  SEED_BUDGETS,
  SEED_EMPLOYEES,
  SEED_GUEST_FACULTY,
  generateSeedStudents,
  SEED_EVENTS,
  SEED_AUDIT_LOG,
} from '../seed/seed-data';
import { toPaise } from '../finance/money';
import { syncWorkspaces } from '../adapter';

export const STORAGE_KEY = 'poddar-finance-portal-v1';

export interface FinanceState {
  settings: SettingsConfig;
  students: Student[];
  feePayments: FeePayment[];
  defaulterReminders: DefaulterReminder[];
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  guestFacultyLogs: GuestFacultyLog[];
  employeeLoans: EmployeeLoan[];
  extraPayRecords: ExtraPayRecord[];
  vendors: Vendor[];
  opExBills: OpExBill[];
  pettyCashVouchers: PettyCashVoucher[];
  budgets: DepartmentBudget[];
  scholarships: ScholarshipRecord[];
  otherIncome: OtherIncome[];
  events: CollegeEvent[];
  cashBookEntries: CashBookEntry[];
  auditLogs: AuditLogEntry[];
  lastSavedAt?: string;
}

export function createInitialSeedState(): FinanceState {
  const { students, payments } = generateSeedStudents();

  // Create initial OpEx bills
  const initialBills: OpExBill[] = [
    {
      id: 'BILL-JVVNL-OCT26',
      billNumber: 'JVVNL/2026/1092',
      vendorId: 'VEN005',
      vendorName: 'Jaipur Vidyut Vitran Nigam Ltd (JVVNL)',
      department: 'Campus Administration & Maintenance',
      category: 'Electricity & Utilities',
      invoiceDate: '2026-10-25',
      dueDate: '2026-11-10',
      baseAmountPaise: toPaise(80000),
      gstRatePct: 0,
      gstAmountPaise: 0,
      totalAmountPaise: toPaise(80000),
      tdsSection: '194C',
      tdsRatePct: 2,
      tdsDeductionPaise: toPaise(1600),
      netPayablePaise: toPaise(78400),
      paidAmountPaise: toPaise(78400),
      status: 'Paid',
      paymentReference: 'UTR-JVVNL-OCT26-991',
      createdBy: 'Accountant',
      approvedBy: 'Accounts Admin',
      notes: 'Main campus substation bill',
    },
    {
      id: 'BILL-APEX-NOV26',
      billNumber: 'APX/INV/4491',
      vendorId: 'VEN001',
      vendorName: 'Apex Infotech Solutions',
      department: 'Computer Science & IT',
      category: 'IT & Hardware',
      invoiceDate: '2026-11-01',
      dueDate: '2026-12-01',
      baseAmountPaise: toPaise(120000),
      gstRatePct: 18,
      gstAmountPaise: toPaise(21600),
      totalAmountPaise: toPaise(141600),
      tdsSection: '194J',
      tdsRatePct: 10,
      tdsDeductionPaise: toPaise(12000), // Calculated on base amount
      netPayablePaise: toPaise(129600),
      paidAmountPaise: 0,
      status: 'Approved',
      createdBy: 'Accountant',
      approvedBy: 'Management',
      notes: 'Annual campus fiber lease and core switch AMC',
    },
  ];

  // Initial Petty Cash Vouchers
  const initialVouchers: PettyCashVoucher[] = [
    {
      id: 'PC-2026-001',
      voucherNumber: 'PC-2026-001',
      date: '2026-11-02',
      payee: 'Sharma Tea & Refreshments',
      department: 'Campus Administration & Maintenance',
      purpose: 'Hospitality & refreshments for NAAC preparatory meeting',
      amountPaise: toPaise(1450),
      approvedByRole: 'Accounts Admin',
      status: 'Approved',
    },
    {
      id: 'PC-2026-002',
      voucherNumber: 'PC-2026-002',
      date: '2026-11-03',
      payee: 'Speed Post / Indian Postal Services',
      department: 'Computer Science & IT',
      purpose: 'Despatch of university examination moderation packets',
      amountPaise: toPaise(890),
      approvedByRole: 'Accounts Admin',
      status: 'Approved',
    },
  ];

  // Initial Scholarships
  const initialScholarships: ScholarshipRecord[] = [
    {
      id: 'SCH-001',
      studentId: 'PIC26005',
      studentName: 'Aryan Singh',
      schemeName: 'Rajasthan Post-Matric Merit Scholarship',
      providerType: 'Government Body',
      sanctionedPaise: toPaise(40000),
      receivedPaise: toPaise(20000),
      disbursedToStudentLedgerPaise: toPaise(20000),
      pendingSource: 'Pending from Body',
      status: 'Partially Received',
      updatedAt: '2026-10-15',
    },
    {
      id: 'SCH-002',
      studentId: 'PIC26012',
      studentName: 'Divya Joshi',
      schemeName: 'Poddar Trust Merit-cum-Means Grant',
      providerType: 'Institutional Trust',
      sanctionedPaise: toPaise(30000),
      receivedPaise: toPaise(30000),
      disbursedToStudentLedgerPaise: toPaise(30000),
      pendingSource: 'Settled',
      status: 'Disbursed',
      updatedAt: '2026-09-01',
    },
  ];

  // Initial Other Income
  const initialOtherIncome: OtherIncome[] = [
    {
      id: 'INC-001',
      source: 'Campus Space Rent',
      payerName: 'Rajasthan State Open Board Examination Center',
      amountPaise: toPaise(125000),
      date: '2026-10-18',
      mode: 'NEFT',
      reference: 'UTR-EXAM-CTR-RENT',
      receiptNumber: 'RENT-2026-01',
      isRefundableDeposit: false,
      status: 'Collected',
    },
    {
      id: 'INC-002',
      source: 'Caution Deposit',
      payerName: 'Kanishka Pareek (PIC26016)',
      amountPaise: toPaise(10000),
      date: '2026-07-28',
      mode: 'UPI',
      reference: 'UPI-DEP-26016',
      receiptNumber: 'DEP-2026-16',
      isRefundableDeposit: true,
      status: 'Collected',
    },
  ];

  return {
    settings: INITIAL_SETTINGS,
    students,
    feePayments: payments,
    defaulterReminders: [],
    employees: SEED_EMPLOYEES,
    payrollRecords: [],
    guestFacultyLogs: SEED_GUEST_FACULTY,
    employeeLoans: [],
    extraPayRecords: [],
    vendors: SEED_VENDORS,
    opExBills: initialBills,
    pettyCashVouchers: initialVouchers,
    budgets: SEED_BUDGETS,
    scholarships: initialScholarships,
    otherIncome: initialOtherIncome,
    events: SEED_EVENTS,
    cashBookEntries: [],
    auditLogs: SEED_AUDIT_LOG,
  };
}

export type FinanceAction =
  | { type: 'SWITCH_ROLE'; role: Role }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<SettingsConfig> }
  | { type: 'RECORD_FEE_PAYMENT'; payment: FeePayment }
  | { type: 'VERIFY_FEE_PAYMENT'; paymentId: string }
  | { type: 'BOUNCE_FEE_PAYMENT'; paymentId: string; reason: string }
  | { type: 'REFUND_FEE_PAYMENT'; paymentId: string; amountPaise: number; reason: string }
  | { type: 'RECORD_FEE_ADJUSTMENT'; studentId: string; adjustment: Student['adjustments'][0] }
  | { type: 'SEND_DEFAULTER_REMINDER'; reminder: DefaulterReminder }
  | { type: 'CREATE_OPEX_BILL'; bill: OpExBill }
  | { type: 'UPDATE_BILL_STATUS'; billId: string; status: OpExBill['status']; approvedBy?: Role }
  | { type: 'PAY_OPEX_BILL'; billId: string; amountPaise: number; reference: string }
  | { type: 'CREATE_PETTY_CASH_VOUCHER'; voucher: PettyCashVoucher }
  | { type: 'SAVE_PAYROLL_RECORD'; record: PayrollRecord }
  | { type: 'UPDATE_PAYROLL_STATUS'; recordId: string; status: PayrollRecord['status']; remarks?: string; utr?: string }
  | { type: 'LOG_GUEST_FACULTY'; log: GuestFacultyLog }
  | { type: 'UPDATE_GUEST_FACULTY_STATUS'; id: string; status: GuestFacultyLog['status']; utr?: string }
  | { type: 'ADD_OTHER_INCOME'; income: OtherIncome }
  | { type: 'ADD_SCHOLARSHIP'; scholarship: ScholarshipRecord }
  | { type: 'UPDATE_SCHOLARSHIP'; scholarshipId: string; receivedPaise: number; disbursedPaise: number }
  | { type: 'ADD_EVENT'; event: CollegeEvent }
  | { type: 'CLOSE_FISCAL_YEAR'; reason: string }
  | { type: 'REOPEN_FISCAL_YEAR'; reason: string }
  | { type: 'RESET_DEMO_DATA' }
  | { type: 'RESTORE_BACKUP'; state: FinanceState };

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  const currentRole = state.settings.currentRole;
  const now = new Date().toISOString();

  function appendAudit(actionType: AuditLogEntry['action'], entity: string, entityId: string, summary: string): AuditLogEntry {
    return {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      role: currentRole,
      actorName: state.settings.currentUser.name,
      action: actionType,
      entity,
      entityId,
      summary,
    };
  }

  switch (action.type) {
    case 'SWITCH_ROLE': {
      const audit = appendAudit('ROLE_SWITCH', 'ROLE', action.role, `Switched persona from ${currentRole} to ${action.role}`);
      return {
        ...state,
        settings: { ...state.settings, currentRole: action.role },
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'UPDATE_SETTINGS': {
      const audit = appendAudit('UPDATE', 'SETTINGS', 'SYSTEM', 'Updated system preferences and statutory parameters.');
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'RECORD_FEE_PAYMENT': {
      // Prevent duplicate reference across all payments
      const isDuplicate = state.feePayments.some(p => p.reference.trim().toUpperCase() === action.payment.reference.trim().toUpperCase());
      if (isDuplicate) return state;

      const audit = appendAudit(
        'CREATE',
        'FEE_PAYMENT',
        action.payment.id,
        `Recorded fee receipt ${action.payment.receiptNo} of ₹${(action.payment.amountPaise / 100).toLocaleString('en-IN')} for student ${action.payment.studentId}.`
      );
      return {
        ...state,
        feePayments: [action.payment, ...state.feePayments],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'VERIFY_FEE_PAYMENT': {
      const audit = appendAudit('APPROVE', 'FEE_PAYMENT', action.paymentId, `Verified bank receipt for payment ${action.paymentId}.`);
      return {
        ...state,
        feePayments: state.feePayments.map(p =>
          p.id === action.paymentId ? { ...p, verified: true, status: 'Verified' as const } : p
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'BOUNCE_FEE_PAYMENT': {
      const audit = appendAudit('UPDATE', 'FEE_PAYMENT', action.paymentId, `Marked payment as bounced. Reason: ${action.reason}`);
      return {
        ...state,
        feePayments: state.feePayments.map(p =>
          p.id === action.paymentId ? { ...p, verified: false, status: 'Bounced' as const, notes: action.reason } : p
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'REFUND_FEE_PAYMENT': {
      const audit = appendAudit(
        'REFUND',
        'FEE_PAYMENT',
        action.paymentId,
        `Processed refund of ₹${(action.amountPaise / 100).toLocaleString('en-IN')}. Reason: ${action.reason}`
      );
      return {
        ...state,
        feePayments: state.feePayments.map(p => {
          if (p.id !== action.paymentId) return p;
          const currentRefunded = p.refundedPaise || 0;
          const newRefunded = currentRefunded + action.amountPaise;
          return {
            ...p,
            refundedPaise: newRefunded,
            refundReason: action.reason,
            status: newRefunded >= p.amountPaise ? 'Refunded' : 'Verified',
          };
        }),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'RECORD_FEE_ADJUSTMENT': {
      const student = state.students.find(s => s.id === action.studentId);
      if (!student) return state;

      const audit = appendAudit(
        'CREATE',
        'FEE_ADJUSTMENT',
        action.adjustment.id,
        `Added fee adjustment '${action.adjustment.label}' of ₹${(action.adjustment.amountPaise / 100).toLocaleString('en-IN')} for student ${student.name}.`
      );

      return {
        ...state,
        students: state.students.map(s =>
          s.id === action.studentId ? { ...s, adjustments: [...(s.adjustments || []), action.adjustment] } : s
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'SEND_DEFAULTER_REMINDER': {
      const audit = appendAudit(
        'CREATE',
        'REMINDER',
        action.reminder.id,
        `Dispatched ${action.reminder.channel} reminder to student ${action.reminder.studentId} for due ₹${(action.reminder.duePaise / 100).toLocaleString('en-IN')}.`
      );
      return {
        ...state,
        defaulterReminders: [action.reminder, ...state.defaulterReminders],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'CREATE_OPEX_BILL': {
      const audit = appendAudit(
        'CREATE',
        'EXPENSE_BILL',
        action.bill.id,
        `Created OpEx invoice ${action.bill.billNumber} from ${action.bill.vendorName} for ₹${(action.bill.totalAmountPaise / 100).toLocaleString('en-IN')}.`
      );
      return {
        ...state,
        opExBills: [action.bill, ...state.opExBills],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'UPDATE_BILL_STATUS': {
      const audit = appendAudit('UPDATE', 'EXPENSE_BILL', action.billId, `Updated OpEx bill status to ${action.status}.`);
      return {
        ...state,
        opExBills: state.opExBills.map(b =>
          b.id === action.billId ? { ...b, status: action.status, approvedBy: action.approvedBy ?? b.approvedBy } : b
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'PAY_OPEX_BILL': {
      const audit = appendAudit(
        'PAY',
        'EXPENSE_BILL',
        action.billId,
        `Settled payment of ₹${(action.amountPaise / 100).toLocaleString('en-IN')} with UTR ${action.reference}.`
      );
      return {
        ...state,
        opExBills: state.opExBills.map(b =>
          b.id === action.billId
            ? {
                ...b,
                paidAmountPaise: b.paidAmountPaise + action.amountPaise,
                paymentReference: action.reference,
                status: b.paidAmountPaise + action.amountPaise >= b.netPayablePaise ? 'Paid' : 'Partially Paid',
              }
            : b
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'CREATE_PETTY_CASH_VOUCHER': {
      const audit = appendAudit(
        'CREATE',
        'PETTY_CASH',
        action.voucher.id,
        `Issued petty cash voucher ${action.voucher.voucherNumber} for ₹${(action.voucher.amountPaise / 100).toLocaleString('en-IN')} to ${action.voucher.payee}.`
      );
      return {
        ...state,
        pettyCashVouchers: [action.voucher, ...state.pettyCashVouchers],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'SAVE_PAYROLL_RECORD': {
      const existingIdx = state.payrollRecords.findIndex(r => r.id === action.record.id);
      let newRecords = [...state.payrollRecords];
      if (existingIdx >= 0) {
        newRecords[existingIdx] = action.record;
      } else {
        newRecords = [action.record, ...newRecords];
      }
      return { ...state, payrollRecords: newRecords };
    }

    case 'UPDATE_PAYROLL_STATUS': {
      const audit = appendAudit('UPDATE', 'PAYROLL', action.recordId, `Updated payroll stage to ${action.status}.`);
      return {
        ...state,
        payrollRecords: state.payrollRecords.map(r => {
          if (r.id !== action.recordId) return r;
          return {
            ...r,
            status: action.status,
            paymentReference: action.utr ?? r.paymentReference,
            disbursedOn: action.status === 'Paid' ? now.slice(0, 10) : r.disbursedOn,
            history: [
              ...r.history,
              {
                event: `Transitioned to ${action.status}`,
                timestamp: now,
                actor: currentRole,
                remarks: action.remarks,
              },
            ],
          };
        }),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'LOG_GUEST_FACULTY': {
      const audit = appendAudit(
        'CREATE',
        'GUEST_FACULTY',
        action.log.id,
        `Logged guest session by ${action.log.facultyName} (${action.log.durationHours} hrs). Net payable: ₹${(action.log.netPayablePaise / 100).toLocaleString('en-IN')}.`
      );
      return {
        ...state,
        guestFacultyLogs: [action.log, ...state.guestFacultyLogs],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'UPDATE_GUEST_FACULTY_STATUS': {
      return {
        ...state,
        guestFacultyLogs: state.guestFacultyLogs.map(l =>
          l.id === action.id ? { ...l, status: action.status, paymentReference: action.utr ?? l.paymentReference } : l
        ),
      };
    }

    case 'ADD_OTHER_INCOME': {
      const audit = appendAudit(
        'CREATE',
        'OTHER_INCOME',
        action.income.id,
        `Collected ${action.income.source} revenue of ₹${(action.income.amountPaise / 100).toLocaleString('en-IN')} from ${action.income.payerName}.`
      );
      return {
        ...state,
        otherIncome: [action.income, ...state.otherIncome],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'ADD_SCHOLARSHIP': {
      return { ...state, scholarships: [action.scholarship, ...state.scholarships] };
    }

    case 'UPDATE_SCHOLARSHIP': {
      return {
        ...state,
        scholarships: state.scholarships.map(s => {
          if (s.id !== action.scholarshipId) return s;
          const newReceived = s.receivedPaise + action.receivedPaise;
          const newDisbursed = s.disbursedToStudentLedgerPaise + action.disbursedPaise;
          const pending = s.sanctionedPaise - newReceived;
          return {
            ...s,
            receivedPaise: newReceived,
            disbursedToStudentLedgerPaise: newDisbursed,
            pendingSource: pending > 0 ? 'Pending from Body' : 'Settled',
            status: newReceived >= s.sanctionedPaise ? 'Disbursed' : 'Partially Received',
            updatedAt: now.slice(0, 10),
          };
        }),
      };
    }

    case 'ADD_EVENT': {
      return { ...state, events: [action.event, ...state.events] };
    }

    case 'CLOSE_FISCAL_YEAR': {
      const audit = appendAudit('APPROVE', 'FISCAL_YEAR', 'CLOSE', `Closed and locked fiscal year 2026-27. Reason: ${action.reason}`);
      return {
        ...state,
        settings: { ...state.settings, fiscalYearClosed: true, closedYear: '2026-27' },
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'REOPEN_FISCAL_YEAR': {
      const audit = appendAudit('UPDATE', 'FISCAL_YEAR', 'REOPEN', `Reopened fiscal year 2026-27 with justification: ${action.reason}`);
      return {
        ...state,
        settings: { ...state.settings, fiscalYearClosed: false },
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'RESET_DEMO_DATA': {
      const freshSeed = createInitialSeedState();
      return {
        ...freshSeed,
        auditLogs: [
          appendAudit('UPDATE', 'SYSTEM', 'RESET', 'Restored demo state to standard factory seed data.'),
          ...freshSeed.auditLogs,
        ],
      };
    }

    case 'RESTORE_BACKUP': {
      return { ...action.state };
    }

    default:
      return state;
  }
}

interface FinanceContextValue {
  state: FinanceState;
  dispatch: React.Dispatch<FinanceAction>;
  currentDate: string; // Real or Demo Date override
  switchRole: (role: Role) => void;
  resetDemoData: () => void;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonString: string) => boolean;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, null, () => {
    if (typeof window === 'undefined') return createInitialSeedState();
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('college_finance_portal_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Schema check
        if (parsed.settings && Array.isArray(parsed.students) && Array.isArray(parsed.feePayments)) {
          return parsed as FinanceState;
        }
      }
    } catch (e) {
      console.warn('Could not read existing finance store from localStorage, using initial seed data.', e);
    }
    return createInitialSeedState();
  });

  // Inter-workspace synchronization on mount
  useEffect(() => {
    syncWorkspaces();
  }, []);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-save to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Failed to write finance state to localStorage:', err);
      }
    }, 300);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state]);

  const currentDate = state.settings.demoDateOverride || new Date().toISOString().slice(0, 10);

  const switchRole = (role: Role) => dispatch({ type: 'SWITCH_ROLE', role });
  const resetDemoData = () => dispatch({ type: 'RESET_DEMO_DATA' });

  const exportBackupJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Poddar-College-Finance-Backup-${currentDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importBackupJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.settings && Array.isArray(parsed.students) && Array.isArray(parsed.feePayments)) {
        dispatch({ type: 'RESTORE_BACKUP', state: parsed });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Invalid backup file format:', err);
      return false;
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        state,
        dispatch,
        currentDate,
        switchRole,
        resetDemoData,
        exportBackupJSON,
        importBackupJSON,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}

