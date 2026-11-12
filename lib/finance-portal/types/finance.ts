// College Finance Portal - Core TypeScript Domain Definitions
// Strict Integer Paise money model (1 Rupee = 100 Paise)

export type Role =
  | 'Super Admin'
  | 'Management'
  | 'Accounts Admin'
  | 'Accountant'
  | 'Cashier'
  | 'HR Admin'
  | 'Director'
  | 'HOD';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  role: Role;
  actorName: string;
  action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'PAY' | 'REFUND' | 'VOID' | 'ROLE_SWITCH';
  entity: string; // e.g. 'PAYROLL', 'EXPENSE', 'FEE_PAYMENT', 'SCHOLARSHIP'
  entityId: string;
  summary: string;
  details?: Record<string, unknown>;
}

// ---------------------------
// 1. STUDENTS & FEES
// ---------------------------
export type FeeHead = 'Tuition' | 'Examination' | 'Laboratory' | 'Hostel' | 'Transport' | 'Caution Deposit' | 'Other';

export interface FeePlan {
  kind: 'Full payment' | 'Semester' | 'EMI';
  feePaise: number;
  downPaymentPaise: number;
  months: number;
  interestRatePct: number; // e.g. 10 for 10%
  interestType: 'Flat interest' | 'Reducing balance';
  startDate: string; // YYYY-MM-DD
  preferredMethod: 'NEFT' | 'UPI' | 'Bank transfer' | 'Cheque' | 'Cash' | 'Demand Draft';
}

export interface FeeAdjustment {
  id: string;
  category: 'Concession' | 'Scholarship' | 'Waiver' | 'Late fee' | 'Special Charge';
  label: string;
  amountPaise: number;
  date: string;
  createdBy: Role;
  approvedBy?: Role;
  reason?: string;
}

export interface Student {
  id: string; // e.g. 'PIC26001'
  rollNo: string;
  name: string;
  email: string;
  phone: string;
  programme: 'BCA' | 'BBA' | 'B.Com' | 'B.Sc' | 'MBA';
  semester: number;
  batch: string; // e.g. '2024-27'
  guardianName: string;
  guardianPhone: string;
  category: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';
  hostelResident: boolean;
  busTransport: boolean;
  plan: FeePlan;
  adjustments: FeeAdjustment[];
  status: 'Active' | 'Defaulter' | 'Alumni' | 'Suspended';
}

export interface FeePayment {
  id: string;
  studentId: string;
  amountPaise: number;
  date: string;
  method: 'NEFT' | 'UPI' | 'Bank transfer' | 'Cheque' | 'Cash' | 'Demand Draft';
  reference: string; // Unique UTR / Cheque / Txn No
  receiptNo: string;
  verified: boolean;
  status: 'Verified' | 'Pending Verification' | 'Bounced' | 'Refunded';
  refundedPaise?: number;
  refundReason?: string;
  createdBy: Role;
  notes?: string;
}

export interface DefaulterReminder {
  id: string;
  studentId: string;
  sentDate: string;
  channel: 'SMS' | 'WhatsApp' | 'Email';
  duePaise: number;
  overdueDays: number;
  status: 'Delivered' | 'Pending';
  messagePreview: string;
}

// ---------------------------
// 2. EMPLOYEES & PAYROLL
// ---------------------------
export type EmployeeCategory = 'Teaching' | 'Non-teaching' | 'Support';
export type EmploymentType = 'Permanent' | 'Contractual' | 'Probation';

export interface Employee {
  id: string; // e.g. 'EMP001'
  name: string;
  designation: string;
  department: string;
  category: EmployeeCategory;
  employmentType: EmploymentType;
  joiningDate: string;
  email: string;
  phone: string;
  panMasked: string; // e.g. 'ABCDE••••F'
  aadhaarLastFour: string; // '1234'
  bankName: string;
  accountLastFour: string; // '4102'
  ifsc: string;
  baseSalaryPaise: number;
  hraPaise: number;
  daPaise: number;
  specialAllowancePaise: number;
  conveyancePaise: number;
  // Deductions
  pfOpted: boolean;
  esiOpted: boolean;
  status: 'Active' | 'Resigned' | 'Retired';
}

export type PayrollStatus =
  | 'Draft'
  | 'Pending HOD Review'
  | 'Pending HR Approval'
  | 'Pending Accounts Approval'
  | 'Pending Director Approval'
  | 'Approved'
  | 'On Hold'
  | 'Processing'
  | 'Paid'
  | 'Failed';

export interface PayrollRecord {
  id: string; // '2026-11/EMP001'
  period: string; // '2026-11'
  employeeId: string;
  employeeName: string;
  department: string;
  grossPaise: number;
  earnedBasicPaise: number;
  earnedHraPaise: number;
  earnedDaPaise: number;
  earnedSpecialPaise: number;
  earnedConveyancePaise: number;
  // Attendance & LOP
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lopDeductionPaise: number;
  // Statutory deductions
  pfEmployeePaise: number;
  pfEmployerPaise: number;
  esiEmployeePaise: number;
  esiEmployerPaise: number;
  tdsDeductionPaise: number;
  loanRecoveryPaise: number;
  totalDeductionsPaise: number;
  netSalaryPaise: number;
  status: PayrollStatus;
  holdReason?: string;
  paymentMode?: string;
  paymentReference?: string; // UTR
  disbursedOn?: string;
  history: {
    event: string;
    timestamp: string;
    actor: Role;
    remarks?: string;
  }[];
  createdBy: Role;
}

export interface GuestFacultyLog {
  id: string;
  facultyName: string;
  department: string;
  courseTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  hourlyRatePaise: number;
  totalPaise: number;
  tdsSection: '194J' | 'None';
  tdsRatePct: number;
  tdsDeductionPaise: number;
  netPayablePaise: number;
  status: 'Submitted' | 'Approved by HOD' | 'Approved by Accounts' | 'Paid';
  paymentReference?: string;
  createdBy: Role;
}

export interface EmployeeLoan {
  id: string;
  employeeId: string;
  employeeName: string;
  principalPaise: number;
  installmentPaise: number;
  recoveredPaise: number;
  firstPeriod: string; // '2026-08'
  reason: string;
  status: 'Active' | 'Settled' | 'Rejected';
  createdBy: Role;
  approvedBy?: Role;
}

export interface ExtraPayRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  category: 'Festival Bonus' | 'Performance Bonus' | 'Overtime' | 'Honorarium' | 'Arrears' | 'Reimbursement';
  amountPaise: number;
  taxable: boolean;
  period: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Paid';
  paymentReference?: string;
  createdBy: Role;
  approvedBy?: Role;
}

// ---------------------------
// 3. VENDORS & OPEX BILLS
// ---------------------------
export interface Vendor {
  id: string; // 'VEN001'
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: 'IT & Hardware' | 'Stationery & Printing' | 'Laboratory Consumables' | 'Security & Facility' | 'Electricity & Utilities' | 'Library Books' | 'Legal & Professional';
  gstin: string; // 15 characters
  pan: string; // 10 characters
  bankName: string;
  accountLastFour: string;
  ifsc: string;
  paymentTermsDays: number;
  status: 'Active' | 'Blocked';
}

export interface OpExBill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  department: string;
  category: string;
  invoiceDate: string;
  dueDate: string;
  baseAmountPaise: number;
  gstRatePct: number; // 0, 5, 12, 18, 28
  gstAmountPaise: number;
  totalAmountPaise: number;
  tdsSection?: '194C' | '194J' | '194I' | 'None';
  tdsRatePct?: number;
  tdsDeductionPaise?: number;
  netPayablePaise: number;
  paidAmountPaise: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Partially Paid' | 'Paid' | 'Void';
  paymentReference?: string;
  simulatedInvoiceFile?: string;
  createdBy: Role;
  approvedBy?: Role;
  notes?: string;
}

// ---------------------------
// 4. PETTY CASH & BUDGETS
// ---------------------------
export interface PettyCashVoucher {
  id: string;
  voucherNumber: string; // 'PC-2026-001'
  date: string;
  payee: string;
  department: string;
  purpose: string;
  amountPaise: number;
  approvedByRole: Role;
  attachmentName?: string;
  status: 'Approved' | 'Rejected' | 'Void';
}

export interface DepartmentBudget {
  department: string;
  annualAllocationPaise: number;
  spentPaise: number;
  committedPaise: number; // Approved bills waiting payment
}

// ---------------------------
// 5. SCHOLARSHIPS, INCOME & EVENTS
// ---------------------------
export interface ScholarshipRecord {
  id: string;
  studentId: string;
  studentName: string;
  schemeName: string; // e.g. 'Post-Matric Govt Scholarship', 'Merit-cum-Means'
  providerType: 'Government Body' | 'Institutional Trust' | 'Corporate CSR';
  sanctionedPaise: number;
  receivedPaise: number;
  disbursedToStudentLedgerPaise: number;
  pendingSource: 'Pending from Body' | 'Pending from Student' | 'Settled';
  status: 'Sanctioned' | 'Disbursed' | 'Partially Received';
  updatedAt: string;
}

export interface OtherIncome {
  id: string;
  source: 'Admission Fees' | 'Exam Registration' | 'Hostel & Mess' | 'Library Fines' | 'Grants & Donations' | 'Campus Space Rent' | 'Caution Deposit';
  payerName: string;
  amountPaise: number;
  date: string;
  mode: 'NEFT' | 'UPI' | 'Bank transfer' | 'Cash' | 'Cheque';
  reference: string;
  receiptNumber: string;
  isRefundableDeposit: boolean;
  refundedPaise?: number;
  status: 'Collected' | 'Refunded';
}

export interface CollegeEvent {
  id: string;
  title: string;
  date: string;
  organizingDepartment: string;
  approvedBudgetPaise: number;
  sponsorIncomePaise: number;
  actualSpendPaise: number;
  status: 'Planned' | 'Ongoing' | 'Completed';
  reportNotes?: string;
}

// ---------------------------
// 6. CASH BOOK & RECONCILIATION
// ---------------------------
export interface CashBookEntry {
  id: string;
  date: string;
  bookType: 'Cash' | 'Bank' | 'Petty Cash';
  entryType: 'Receipt' | 'Payment';
  head: string;
  entityName: string;
  reference: string;
  debitPaise: number; // Inflow
  creditPaise: number; // Outflow
  balancePaise: number;
  reconciled: boolean;
  reconciledAt?: string;
}

// ---------------------------
// 7. SETTINGS & STATUTORY
// ---------------------------
export interface SettingsConfig {
  institutionName: string;
  campusAddress: string;
  academicYear: string; // '2026-27'
  demoDateOverride?: string; // If set, overrides real system date
  theme: 'light' | 'dark';
  currentRole: Role;
  currentUser: {
    name: string;
    email: string;
  };
  // Statutory Table Configs (With CA advisory)
  statutory: {
    pfEmployeeRatePct: number; // 12%
    pfEmployerRatePct: number; // 12%
    esiEmployeeRatePct: number; // 0.75%
    esiEmployerRatePct: number; // 3.25%
    esiGrossCeilingPaise: number; // 21,000 INR = 2100000 paise
    dailyDivisorMode: 'Fixed 30' | 'Calendar Days' | 'Working Days';
    pettyCashFloatPaise: number; // 50,000 INR
    pettyCashVoucherLimitPaise: number; // 5,000 INR
    cashTransactionWarningLimitPaise: number; // 10,000 INR
    tdsThresholds: {
      section: string;
      label: string;
      ratePct: number;
      panMissingRatePct: number;
    }[];
  };
  approvalLimits: {
    billAccountsAdminPaise: number; // 50,000 INR
    billManagementPaise: number; // 2,00,000 INR
    overrunAllowedPct: number; // 10%
  };
  fiscalYearClosed: boolean;
  closedYear?: string;
}

