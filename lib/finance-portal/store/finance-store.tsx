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
  AccountHead,
  JournalVoucher,
  BankAccount,
  FixedAsset,
  PurchaseOrder,
  DefaulterFollowUp,
  ReminderDispatchLog,
  ScholarshipApplication,
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
import { DEFAULT_CHART_OF_ACCOUNTS, validateJournalVoucherLines } from '../finance/accounting';
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
  chartOfAccounts: AccountHead[];
  journalVouchers: JournalVoucher[];
  bankAccounts: BankAccount[];
  fixedAssets: FixedAsset[];
  purchaseOrders: PurchaseOrder[];
  defaulterFollowUps: DefaulterFollowUp[];
  reminderDispatchLogs: ReminderDispatchLog[];
  scholarshipApplications: ScholarshipApplication[];
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

  // Initial Bank Accounts
  const initialBankAccounts: BankAccount[] = [
    {
      id: 'BANK-SBI-01',
      bankName: 'State Bank of India',
      branch: 'Mansarovar Sector 7, Jaipur',
      accountNumberMasked: '••••3892',
      accountType: 'Current Account',
      ifsc: 'SBIN0031122',
      openingBalancePaise: toPaise(3850000),
      currentBalancePaise: toPaise(4280500),
      lastReconciliationDate: '2026-11-01',
      status: 'Active',
    },
    {
      id: 'BANK-HDFC-02',
      bankName: 'HDFC Bank',
      branch: 'MI Road Central, Jaipur',
      accountNumberMasked: '••••5519',
      accountType: 'Collection Escrow',
      ifsc: 'HDFC0000123',
      openingBalancePaise: toPaise(2100000),
      currentBalancePaise: toPaise(2950000),
      lastReconciliationDate: '2026-11-04',
      status: 'Active',
    },
    {
      id: 'BANK-PNB-03',
      bankName: 'Punjab National Bank',
      branch: 'Tonk Road Branch, Jaipur',
      accountNumberMasked: '••••9011',
      accountType: 'Savings Account',
      ifsc: 'PUNB0123400',
      openingBalancePaise: toPaise(940000),
      currentBalancePaise: toPaise(940000),
      lastReconciliationDate: '2026-10-31',
      status: 'Active',
    },
  ];

  // Initial Fixed Assets
  const initialFixedAssets: FixedAsset[] = [
    {
      id: 'AST-001',
      assetCode: 'FA-IT-001',
      name: 'Campus Core Server & High-Performance Compute Cluster',
      category: 'Computer & IT Equipment',
      purchaseDate: '2024-06-15',
      purchaseCostPaise: toPaise(3500000),
      depreciationMethod: 'Straight-line',
      depreciationRatePct: 15,
      accumulatedDepreciationPaise: toPaise(700000),
      netBookValuePaise: toPaise(2800000),
      location: 'Central Server Room - Tech Block',
      custodian: 'Er. Naveen Agarwal (IT Incharge)',
      status: 'Active',
      invoiceRef: 'APX/INV/3102',
    },
    {
      id: 'AST-002',
      assetCode: 'FA-LAB-002',
      name: 'High-Resolution Spectrophotometer & Chromatography Unit',
      category: 'Laboratory Apparatus',
      purchaseDate: '2024-08-20',
      purchaseCostPaise: toPaise(1850000),
      depreciationMethod: 'Straight-line',
      depreciationRatePct: 10,
      accumulatedDepreciationPaise: toPaise(240000),
      netBookValuePaise: toPaise(1610000),
      location: 'Bio-Tech & Chemical Research Wing',
      custodian: 'Dr. Sunita Pareek (Lab Director)',
      status: 'Active',
      invoiceRef: 'JLS/2024/091',
    },
    {
      id: 'AST-003',
      assetCode: 'FA-INF-003',
      name: 'Main Auditorium Dolby Digital Surround & Cinema Projector',
      category: 'Campus Infrastructure & Buildings',
      purchaseDate: '2023-11-10',
      purchaseCostPaise: toPaise(2400000),
      depreciationMethod: 'Straight-line',
      depreciationRatePct: 10,
      accumulatedDepreciationPaise: toPaise(480000),
      netBookValuePaise: toPaise(1920000),
      location: 'Rabindranath Tagore Central Auditorium',
      custodian: 'Ashok Meena (Estate Officer)',
      status: 'Active',
      invoiceRef: 'CIN/2023/118',
    },
    {
      id: 'AST-004',
      assetCode: 'FA-VHC-004',
      name: 'Tata Starbus 40-Seater Campus Transport Coach (RJ-14-PA-4011)',
      category: 'Institutional Vehicles',
      purchaseDate: '2025-02-14',
      purchaseCostPaise: toPaise(2800000),
      depreciationMethod: 'Straight-line',
      depreciationRatePct: 20,
      accumulatedDepreciationPaise: toPaise(420000),
      netBookValuePaise: toPaise(2380000),
      location: 'Campus Fleet Garage',
      custodian: 'Ramcharan Driver (Transport Supt)',
      status: 'Active',
      invoiceRef: 'TATA/JP/491',
    },
  ];

  // Initial Purchase Orders
  const initialPurchaseOrders: PurchaseOrder[] = [
    {
      id: 'PO-2026-001',
      poNumber: 'PO-2026-001',
      vendorId: 'VEN001',
      vendorName: 'Apex Infotech Solutions',
      orderDate: '2026-10-20',
      expectedDeliveryDate: '2026-11-15',
      items: [
        {
          id: 'POI-1',
          description: 'Dell OptiPlex 7010 Micro Desktop Core i5 16GB RAM 512GB SSD',
          quantity: 25,
          unit: 'Units',
          unitPricePaise: toPaise(45000),
          totalPaise: toPaise(1125000),
        },
      ],
      subtotalPaise: toPaise(1125000),
      gstRatePct: 18,
      gstPaise: toPaise(202500),
      totalAmountPaise: toPaise(1327500),
      status: 'Approved',
      approvedBy: 'Director',
      approvedAt: '2026-10-22',
      notes: 'Hardware upgrade for MCA Software Engineering Laboratory',
    },
    {
      id: 'PO-2026-002',
      poNumber: 'PO-2026-002',
      vendorId: 'VEN002',
      vendorName: 'Jaipur Scientific & Lab Supplies',
      orderDate: '2026-10-28',
      expectedDeliveryDate: '2026-11-25',
      items: [
        {
          id: 'POI-2',
          description: 'Binocular Biological Research Microscopes 1000x Magnification',
          quantity: 10,
          unit: 'Units',
          unitPricePaise: toPaise(18000),
          totalPaise: toPaise(180000),
        },
      ],
      subtotalPaise: toPaise(180000),
      gstRatePct: 18,
      gstPaise: toPaise(32400),
      totalAmountPaise: toPaise(212400),
      status: 'Partially Fulfilled',
      approvedBy: 'Accounts Admin',
      approvedAt: '2026-10-30',
      notes: 'B.Sc Life Sciences practical equipment expansion',
    },
    {
      id: 'PO-2026-003',
      poNumber: 'PO-2026-003',
      vendorId: 'VEN004',
      vendorName: 'Rajasthan State Cooperative Printers',
      orderDate: '2026-10-15',
      expectedDeliveryDate: '2026-11-05',
      items: [
        {
          id: 'POI-3',
          description: 'Semester University Examination Answer Booklets 32-Page OMR Header',
          quantity: 15000,
          unit: 'Copies',
          unitPricePaise: toPaise(12),
          totalPaise: toPaise(180000),
        },
      ],
      subtotalPaise: toPaise(180000),
      gstRatePct: 12,
      gstPaise: toPaise(21600),
      totalAmountPaise: toPaise(201600),
      status: 'Completed',
      approvedBy: 'Accounts Admin',
      approvedAt: '2026-10-16',
      notes: 'Winter 2026 University Examination materials',
    },
  ];

  // Initial Balanced Journal Vouchers
  const initialJournalVouchers: JournalVoucher[] = [
    {
      id: 'JV-2026-001',
      voucherNumber: 'JV-2026-001',
      date: '2026-11-01',
      voucherType: 'Payment',
      narration: 'Staff salaries disbursement for October 2026 with statutory deductions',
      totalPaise: toPaise(4425000),
      status: 'Posted',
      reference: 'SBI-NEFT-OCT26-SAL',
      createdBy: 'Accounts Admin',
      postedAt: '2026-11-01T10:00:00Z',
      lines: [
        {
          id: 'JVL-1',
          accountId: 'ACC-5010',
          accountCode: '5010',
          accountName: 'Teaching Faculty & Staff Salaries',
          debitPaise: toPaise(4425000),
          creditPaise: 0,
          narration: 'Gross staff payroll expense',
        },
        {
          id: 'JVL-2',
          accountId: 'ACC-1010',
          accountCode: '1010',
          accountName: 'State Bank of India (Main Current A/c)',
          debitPaise: 0,
          creditPaise: toPaise(4283000),
          narration: 'Net salaries credited via NEFT bulk batch',
        },
        {
          id: 'JVL-3',
          accountId: 'ACC-2030',
          accountCode: '2030',
          accountName: 'Statutory Dues Payable (PF, ESI & TDS)',
          debitPaise: 0,
          creditPaise: toPaise(142000),
          narration: 'Statutory withholdings for remittance',
        },
      ],
    },
    {
      id: 'JV-2026-002',
      voucherNumber: 'JV-2026-002',
      date: '2026-11-04',
      voucherType: 'Receipt',
      narration: 'Aggregate student tuition fee collection for week ending Nov 4',
      totalPaise: toPaise(845000),
      status: 'Posted',
      reference: 'HDFC-SETTLE-WK44',
      createdBy: 'Cashier',
      postedAt: '2026-11-04T17:30:00Z',
      lines: [
        {
          id: 'JVL-4',
          accountId: 'ACC-1020',
          accountCode: '1020',
          accountName: 'HDFC Bank (Fee Collection Escrow A/c)',
          debitPaise: toPaise(845000),
          creditPaise: 0,
          narration: 'Inflow of verified student fee receipts',
        },
        {
          id: 'JVL-5',
          accountId: 'ACC-4010',
          accountCode: '4010',
          accountName: 'Tuition & Academic Fees',
          debitPaise: 0,
          creditPaise: toPaise(845000),
          narration: 'Earned tuition revenue recognition',
        },
      ],
    },
    {
      id: 'JV-2026-003',
      voucherNumber: 'JV-2026-003',
      date: '2026-11-05',
      voucherType: 'Journal',
      narration: 'Depreciation charge provision on campus IT equipment and laboratory apparatus for H1',
      totalPaise: toPaise(185000),
      status: 'Posted',
      reference: 'DEP-PROV-H1',
      createdBy: 'Accounts Admin',
      postedAt: '2026-11-05T12:00:00Z',
      lines: [
        {
          id: 'JVL-6',
          accountId: 'ACC-5080',
          accountCode: '5080',
          accountName: 'Depreciation of Fixed Assets',
          debitPaise: toPaise(185000),
          creditPaise: 0,
          narration: 'Non-cash wear and tear write-off',
        },
        {
          id: 'JVL-7',
          accountId: 'ACC-1590',
          accountCode: '1590',
          accountName: 'Less: Accumulated Depreciation',
          debitPaise: 0,
          creditPaise: toPaise(185000),
          narration: 'Contra-asset accumulation',
        },
      ],
    },
  ];

  // Initial Defaulter Follow-ups
  const initialFollowUps: DefaulterFollowUp[] = [
    {
      id: 'DFU-001',
      studentId: 'PIC26001',
      studentName: 'Aarav Mehta',
      date: '2026-11-05',
      channel: 'Phone Call',
      remarks: 'Spoke with father (Rajesh Mehta). Confirmed salary credit expected on 15th Nov, promised to pay installment.',
      commitmentDate: '2026-11-15',
      commitmentAmountPaise: toPaise(7250),
      status: 'Promise to Pay',
      recordedBy: 'Accounts Admin',
    },
    {
      id: 'DFU-002',
      studentId: 'PIC26005',
      studentName: 'Ayush Khandelwal',
      date: '2026-11-03',
      channel: 'In-Person Meeting',
      remarks: 'Student visited finance office. Requested waiver on late fine due to parent hospitalization.',
      commitmentDate: '2026-11-20',
      commitmentAmountPaise: toPaise(77000),
      status: 'Hardship Plea',
      recordedBy: 'Accounts Admin',
    },
  ];

  // Initial Reminder Dispatch Logs
  const initialReminderLogs: ReminderDispatchLog[] = [
    {
      id: 'RDL-001',
      studentId: 'PIC26001',
      studentName: 'Aarav Mehta',
      channel: 'WhatsApp',
      template: 'Fee Due Alert: ₹7,250 is overdue for BCA Sem 2. Kindly pay via Poddar portal.',
      timestamp: '2026-11-06T10:14:00Z',
      status: 'Read',
      recipientTarget: '+91-9720000413',
    },
    {
      id: 'RDL-002',
      studentId: 'PIC26005',
      studentName: 'Ayush Khandelwal',
      channel: 'SMS',
      template: 'Poddar College: Installment of ₹77,000 for MBA Sem 6 is pending. Avoid examination hall ticket hold.',
      timestamp: '2026-11-06T10:15:00Z',
      status: 'Delivered',
      recipientTarget: '+91-9720000417',
    },
  ];

  // Initial Scholarship Applications
  const initialScholarshipApps: ScholarshipApplication[] = [
    {
      id: 'SCH-APP-001',
      studentId: 'PIC26005',
      studentName: 'Aryan Singh',
      programme: 'B.Sc (Sem 5)',
      schemeName: 'Rajasthan Post-Matric Merit Scholarship',
      providerType: 'Government Body',
      appliedAmountPaise: toPaise(40000),
      sanctionedAmountPaise: toPaise(40000),
      disbursedAmountPaise: toPaise(20000),
      status: 'Approved',
      verificationChecklist: {
        incomeCertificate: true,
        domicileCertificate: true,
        previousMarksheet: true,
        bankPassbook: true,
        casteCertificate: true,
      },
      sanctionLetterNo: 'RAJ-SWD-2026-9921',
      sanctionedDate: '2026-09-15',
      disbursedDate: '2026-10-15',
      remarks: '50% disbursed, balance expected from state treasury in Q3.',
    },
    {
      id: 'SCH-APP-002',
      studentId: 'PIC26012',
      studentName: 'Divya Joshi',
      programme: 'BBA (Sem 3)',
      schemeName: 'Poddar Trust Merit-cum-Means Grant',
      providerType: 'Institutional Trust',
      appliedAmountPaise: toPaise(30000),
      sanctionedAmountPaise: toPaise(30000),
      disbursedAmountPaise: toPaise(30000),
      status: 'Disbursed',
      verificationChecklist: {
        incomeCertificate: true,
        domicileCertificate: true,
        previousMarksheet: true,
        bankPassbook: true,
      },
      sanctionLetterNo: 'PT-MCM-2026-042',
      sanctionedDate: '2026-08-20',
      disbursedDate: '2026-09-01',
      remarks: 'Fully credited against semester tuition fee ledger.',
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
    chartOfAccounts: DEFAULT_CHART_OF_ACCOUNTS,
    journalVouchers: initialJournalVouchers,
    bankAccounts: initialBankAccounts,
    fixedAssets: initialFixedAssets,
    purchaseOrders: initialPurchaseOrders,
    defaulterFollowUps: initialFollowUps,
    reminderDispatchLogs: initialReminderLogs,
    scholarshipApplications: initialScholarshipApps,
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
  | { type: 'RESTORE_BACKUP'; state: FinanceState }
  | { type: 'RECORD_JOURNAL_VOUCHER'; voucher: JournalVoucher }
  | { type: 'ADD_ACCOUNT_HEAD'; account: AccountHead }
  | { type: 'ADD_FIXED_ASSET'; asset: FixedAsset }
  | { type: 'RUN_ASSET_DEPRECIATION'; assetId: string; depreciationPaise: number }
  | { type: 'DISPOSE_FIXED_ASSET'; assetId: string; disposalProceedsPaise: number; disposalDate: string }
  | { type: 'CREATE_PURCHASE_ORDER'; po: PurchaseOrder }
  | { type: 'UPDATE_PO_STATUS'; poId: string; status: PurchaseOrder['status']; linkedBillId?: string }
  | { type: 'RECORD_DEFAULTER_FOLLOWUP'; followUp: DefaulterFollowUp }
  | { type: 'LOG_REMINDER_DISPATCH'; log: ReminderDispatchLog }
  | { type: 'SUBMIT_SCHOLARSHIP_APPLICATION'; application: ScholarshipApplication }
  | { type: 'VERIFY_SCHOLARSHIP_DOCUMENTS'; applicationId: string; checklist: ScholarshipApplication['verificationChecklist'] }
  | { type: 'APPROVE_SCHOLARSHIP'; applicationId: string; sanctionedPaise: number; sanctionLetterNo: string }
  | { type: 'DISBURSE_SCHOLARSHIP'; applicationId: string }
  | { type: 'RECONCILE_BANK_ACCOUNT'; accountId: string; reconciledDate: string; closingBalancePaise: number };

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

    case 'RECORD_JOURNAL_VOUCHER': {
      const validation = validateJournalVoucherLines(action.voucher.lines);
      if (!validation.valid) {
        console.error('Cannot post unbalanced journal voucher:', validation.error);
        return state;
      }

      // Update account balances
      const updatedAccounts = state.chartOfAccounts.map(acc => {
        let delta = 0;
        action.voucher.lines.forEach(line => {
          if (line.accountCode === acc.code) {
            if (acc.group === 'Asset' || acc.group === 'Expense') {
              delta += (line.debitPaise || 0) - (line.creditPaise || 0);
            } else {
              delta += (line.creditPaise || 0) - (line.debitPaise || 0);
            }
          }
        });
        return delta !== 0 ? { ...acc, balancePaise: acc.balancePaise + delta } : acc;
      });

      const audit = appendAudit(
        'CREATE',
        'JOURNAL_VOUCHER',
        action.voucher.id,
        `Posted journal voucher ${action.voucher.voucherNumber} totaling ₹${(action.voucher.totalPaise / 100).toLocaleString('en-IN')}: ${action.voucher.narration}`
      );

      return {
        ...state,
        journalVouchers: [action.voucher, ...state.journalVouchers],
        chartOfAccounts: updatedAccounts,
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'ADD_ACCOUNT_HEAD': {
      const audit = appendAudit('CREATE', 'CHART_OF_ACCOUNTS', action.account.code, `Created ledger account ${action.account.code} - ${action.account.name}`);
      return {
        ...state,
        chartOfAccounts: [...state.chartOfAccounts, action.account],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'ADD_FIXED_ASSET': {
      const audit = appendAudit('CREATE', 'FIXED_ASSET', action.asset.id, `Registered fixed asset ${action.asset.assetCode} (${action.asset.name}) at ₹${(action.asset.purchaseCostPaise / 100).toLocaleString('en-IN')}`);
      return {
        ...state,
        fixedAssets: [action.asset, ...state.fixedAssets],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'RUN_ASSET_DEPRECIATION': {
      const targetAsset = state.fixedAssets.find(a => a.id === action.assetId);
      if (!targetAsset) return state;

      const newAccumulated = targetAsset.accumulatedDepreciationPaise + action.depreciationPaise;
      const newNBV = Math.max(0, targetAsset.purchaseCostPaise - newAccumulated);

      const audit = appendAudit('UPDATE', 'FIXED_ASSET', action.assetId, `Recorded depreciation of ₹${(action.depreciationPaise / 100).toLocaleString('en-IN')} on ${targetAsset.name}.`);

      return {
        ...state,
        fixedAssets: state.fixedAssets.map(a =>
          a.id === action.assetId
            ? { ...a, accumulatedDepreciationPaise: newAccumulated, netBookValuePaise: newNBV }
            : a
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'DISPOSE_FIXED_ASSET': {
      const targetAsset = state.fixedAssets.find(a => a.id === action.assetId);
      if (!targetAsset) return state;

      const audit = appendAudit('VOID', 'FIXED_ASSET', action.assetId, `Disposed asset ${targetAsset.name} for proceeds ₹${(action.disposalProceedsPaise / 100).toLocaleString('en-IN')}.`);

      return {
        ...state,
        fixedAssets: state.fixedAssets.map(a =>
          a.id === action.assetId
            ? {
                ...a,
                status: 'Disposed' as const,
                disposalDate: action.disposalDate,
                disposalProceedsPaise: action.disposalProceedsPaise,
              }
            : a
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'CREATE_PURCHASE_ORDER': {
      const audit = appendAudit('CREATE', 'PURCHASE_ORDER', action.po.id, `Created Purchase Order ${action.po.poNumber} for vendor ${action.po.vendorName} of ₹${(action.po.totalAmountPaise / 100).toLocaleString('en-IN')}`);
      return {
        ...state,
        purchaseOrders: [action.po, ...state.purchaseOrders],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'UPDATE_PO_STATUS': {
      const audit = appendAudit('UPDATE', 'PURCHASE_ORDER', action.poId, `Updated status of PO ${action.poId} to ${action.status}`);
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.map(p =>
          p.id === action.poId
            ? { ...p, status: action.status, linkedBillId: action.linkedBillId || p.linkedBillId }
            : p
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'RECORD_DEFAULTER_FOLLOWUP': {
      const audit = appendAudit('CREATE', 'DEFAULTER_FOLLOWUP', action.followUp.id, `Recorded follow-up note for student ${action.followUp.studentName}: ${action.followUp.remarks}`);
      return {
        ...state,
        defaulterFollowUps: [action.followUp, ...state.defaulterFollowUps],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'LOG_REMINDER_DISPATCH': {
      return {
        ...state,
        reminderDispatchLogs: [action.log, ...state.reminderDispatchLogs],
      };
    }

    case 'SUBMIT_SCHOLARSHIP_APPLICATION': {
      const audit = appendAudit('CREATE', 'SCHOLARSHIP', action.application.id, `Submitted scholarship application for ${action.application.studentName} under ${action.application.schemeName}`);
      return {
        ...state,
        scholarshipApplications: [action.application, ...state.scholarshipApplications],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'VERIFY_SCHOLARSHIP_DOCUMENTS': {
      const audit = appendAudit('UPDATE', 'SCHOLARSHIP', action.applicationId, `Verified application documents for scholarship ${action.applicationId}`);
      return {
        ...state,
        scholarshipApplications: state.scholarshipApplications.map(app =>
          app.id === action.applicationId
            ? { ...app, status: 'Documents Verified' as const, verificationChecklist: action.checklist }
            : app
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'APPROVE_SCHOLARSHIP': {
      const audit = appendAudit('APPROVE', 'SCHOLARSHIP', action.applicationId, `Approved scholarship ${action.sanctionLetterNo} for ₹${(action.sanctionedPaise / 100).toLocaleString('en-IN')}`);
      return {
        ...state,
        scholarshipApplications: state.scholarshipApplications.map(app =>
          app.id === action.applicationId
            ? {
                ...app,
                status: 'Approved' as const,
                sanctionedAmountPaise: action.sanctionedPaise,
                sanctionLetterNo: action.sanctionLetterNo,
                sanctionedDate: new Date().toISOString().slice(0, 10),
              }
            : app
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'DISBURSE_SCHOLARSHIP': {
      const targetApp = state.scholarshipApplications.find(a => a.id === action.applicationId);
      if (!targetApp) return state;

      const audit = appendAudit('PAY', 'SCHOLARSHIP', action.applicationId, `Disbursed ₹${(targetApp.sanctionedAmountPaise / 100).toLocaleString('en-IN')} to student fee ledger for ${targetApp.studentName}`);

      return {
        ...state,
        scholarshipApplications: state.scholarshipApplications.map(app =>
          app.id === action.applicationId
            ? {
                ...app,
                status: 'Disbursed' as const,
                disbursedAmountPaise: app.sanctionedAmountPaise,
                disbursedDate: new Date().toISOString().slice(0, 10),
              }
            : app
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'RECONCILE_BANK_ACCOUNT': {
      const audit = appendAudit('APPROVE', 'BANK_ACCOUNT', action.accountId, `Reconciled bank account ${action.accountId} as of ${action.reconciledDate}`);
      return {
        ...state,
        bankAccounts: state.bankAccounts.map(b =>
          b.id === action.accountId
            ? { ...b, lastReconciliationDate: action.reconciledDate, currentBalancePaise: action.closingBalancePaise }
            : b
        ),
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
          const fresh = createInitialSeedState();
          return {
            ...fresh,
            ...parsed,
            chartOfAccounts: Array.isArray(parsed.chartOfAccounts) && parsed.chartOfAccounts.length > 0 ? parsed.chartOfAccounts : fresh.chartOfAccounts,
            journalVouchers: Array.isArray(parsed.journalVouchers) && parsed.journalVouchers.length > 0 ? parsed.journalVouchers : fresh.journalVouchers,
            bankAccounts: Array.isArray(parsed.bankAccounts) && parsed.bankAccounts.length > 0 ? parsed.bankAccounts : fresh.bankAccounts,
            fixedAssets: Array.isArray(parsed.fixedAssets) && parsed.fixedAssets.length > 0 ? parsed.fixedAssets : fresh.fixedAssets,
            purchaseOrders: Array.isArray(parsed.purchaseOrders) && parsed.purchaseOrders.length > 0 ? parsed.purchaseOrders : fresh.purchaseOrders,
            defaulterFollowUps: Array.isArray(parsed.defaulterFollowUps) && parsed.defaulterFollowUps.length > 0 ? parsed.defaulterFollowUps : fresh.defaulterFollowUps,
            reminderDispatchLogs: Array.isArray(parsed.reminderDispatchLogs) && parsed.reminderDispatchLogs.length > 0 ? parsed.reminderDispatchLogs : fresh.reminderDispatchLogs,
            scholarshipApplications: Array.isArray(parsed.scholarshipApplications) && parsed.scholarshipApplications.length > 0 ? parsed.scholarshipApplications : fresh.scholarshipApplications,
          } as FinanceState;
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

