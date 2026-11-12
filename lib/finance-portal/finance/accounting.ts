// College Finance Portal - Enterprise Double-Entry Accounting Core
// Chart of Accounts, Journal Vouchers (Balanced enforcement), General Ledger,
// Trial Balance, Income & Expenditure Statement, and Balance Sheet.
// Strict Integer Paise money model (1 INR = 100 Paise).

import type {
  AccountHead,
  JournalVoucher,
  JournalEntryLine,
  AccountGroup,
  CashBookEntry,
  FeePayment,
  OpExBill,
  FixedAsset,
} from '../types/finance';

export interface BankStatementRow {
  date: string;
  reference: string;
  description: string;
  amountPaise: number; // positive = credit/deposit, negative = debit/withdrawal
}

// -------------------------------------------------------------
// 1. DEFAULT INSTITUTIONAL CHART OF ACCOUNTS (Baseline Seed)
// -------------------------------------------------------------
export const DEFAULT_CHART_OF_ACCOUNTS: AccountHead[] = [
  // 1000 - CURRENT ASSETS
  { id: 'ACC-1010', code: '1010', name: 'State Bank of India (Main Current A/c)', group: 'Asset', balancePaise: 428050000, isActive: true, description: 'Institutional operating bank account' },
  { id: 'ACC-1020', code: '1020', name: 'HDFC Bank (Fee Collection Escrow A/c)', group: 'Asset', balancePaise: 295000000, isActive: true, description: 'Online gateway and POS collection account' },
  { id: 'ACC-1030', code: '1030', name: 'Punjab National Bank (Project & Grants A/c)', group: 'Asset', balancePaise: 94000000, isActive: true, description: 'Government & research grants' },
  { id: 'ACC-1040', code: '1040', name: 'Cash in Hand (Main Vault)', group: 'Asset', balancePaise: 1850000, isActive: true, description: 'Campus main safe' },
  { id: 'ACC-1050', code: '1050', name: 'Petty Cash Imprest (Accounts Custodian)', group: 'Asset', balancePaise: 5000000, isActive: true, description: 'Daily imprest float' },
  { id: 'ACC-1060', code: '1060', name: 'Student Tuition Fees Receivable (Dues)', group: 'Asset', balancePaise: 470302100, isActive: true, description: 'Outstanding student fee balances' },

  // 1500 - FIXED ASSETS
  { id: 'ACC-1510', code: '1510', name: 'Campus Infrastructure & Buildings', group: 'Asset', balancePaise: 1540000000, isActive: true, description: 'Academic blocks & auditoriums' },
  { id: 'ACC-1520', code: '1520', name: 'Computer & IT Infrastructure', group: 'Asset', balancePaise: 125000000, isActive: true, description: 'Servers, labs and network hardware' },
  { id: 'ACC-1530', code: '1530', name: 'Laboratory & Research Equipment', group: 'Asset', balancePaise: 88000000, isActive: true, description: 'Science & electronics labs' },
  { id: 'ACC-1540', code: '1540', name: 'Furniture & Campus Fixtures', group: 'Asset', balancePaise: 45000000, isActive: true, description: 'Desks, smartboards, library racks' },
  { id: 'ACC-1590', code: '1590', name: 'Less: Accumulated Depreciation', group: 'Asset', balancePaise: -185000000, isActive: true, description: 'Contra asset - accumulated depreciation' },

  // 2000 - CURRENT LIABILITIES
  { id: 'ACC-2010', code: '2010', name: 'Caution Deposits (Refundable to Students)', group: 'Liability', balancePaise: 68500000, isActive: true, description: 'Non-revenue refundable student caution deposits' },
  { id: 'ACC-2020', code: '2020', name: 'Sundry Creditors / Vendor Payables', group: 'Liability', balancePaise: 41800000, isActive: true, description: 'Pending operating invoices' },
  { id: 'ACC-2030', code: '2030', name: 'Statutory Dues Payable (PF, ESI & TDS)', group: 'Liability', balancePaise: 14200000, isActive: true, description: 'Monthly payroll tax and provident fund liabilities' },
  { id: 'ACC-2040', code: '2040', name: 'Staff Salary & Wages Payable', group: 'Liability', balancePaise: 54600000, isActive: true, description: 'Accrued staff compensation' },

  // 3000 - CAPITAL & RESERVES
  { id: 'ACC-3010', code: '3010', name: 'Poddar Trust Endowment & Capital Fund', group: 'Equity', balancePaise: 2000000000, isActive: true, description: 'Institutional foundation equity' },
  { id: 'ACC-3020', code: '3020', name: 'Accumulated General Operating Surplus', group: 'Equity', balancePaise: 429622100, isActive: true, description: 'Retained operating reserves' },

  // 4000 - REVENUES & INSTITUTIONAL INCOMES
  { id: 'ACC-4010', code: '4010', name: 'Tuition & Academic Fees', group: 'Revenue', balancePaise: 845125000, isActive: true, description: 'Primary student academic tuition revenue' },
  { id: 'ACC-4020', code: '4020', name: 'Examination & Evaluation Fees', group: 'Revenue', balancePaise: 14500000, isActive: true, description: 'Semester university exam registration' },
  { id: 'ACC-4030', code: '4030', name: 'Hostel & Mess Boarding Fees', group: 'Revenue', balancePaise: 38200000, isActive: true, description: 'Residential accommodation revenue' },
  { id: 'ACC-4040', code: '4040', name: 'Campus Events & Corporate Sponsorships', group: 'Revenue', balancePaise: 7300000, isActive: true, description: 'Symposia, fest & tech expo sponsorships' },
  { id: 'ACC-4050', code: '4050', name: 'Interest on Bank Fixed Deposits', group: 'Revenue', balancePaise: 12400000, isActive: true, description: 'Bank sweep & FD yields' },

  // 5000 - OPERATING EXPENDITURES
  { id: 'ACC-5010', code: '5010', name: 'Teaching Faculty & Staff Salaries', group: 'Expense', balancePaise: 442500000, isActive: true, description: 'Regular staff compensation' },
  { id: 'ACC-5020', code: '5020', name: 'Guest Faculty & Visiting Expert Honorarium', group: 'Expense', balancePaise: 24800000, isActive: true, description: 'Specialized subject faculty sessions' },
  { id: 'ACC-5030', code: '5030', name: 'Laboratory Consumables & Research Supplies', group: 'Expense', balancePaise: 18500000, isActive: true, description: 'Chemicals, electronic kits and lab supplies' },
  { id: 'ACC-5040', code: '5040', name: 'Campus Utilities, Electricity & Power', group: 'Expense', balancePaise: 34200000, isActive: true, description: 'Power backup, electricity & water' },
  { id: 'ACC-5050', code: '5050', name: 'IT Infrastructure, Cloud & Software Licenses', group: 'Expense', balancePaise: 21500000, isActive: true, description: 'ERP, AWS and campus fiber internet' },
  { id: 'ACC-5060', code: '5060', name: 'Campus Events & Cultural Fest Expenditure', group: 'Expense', balancePaise: 7550000, isActive: true, description: 'Logistics, stage, audio and prizes' },
  { id: 'ACC-5070', code: '5070', name: 'Scholarships & Merit Fee Concessions', group: 'Expense', balancePaise: 16500000, isActive: true, description: 'Institutionally funded fee concessions' },
  { id: 'ACC-5080', code: '5080', name: 'Depreciation of Fixed Assets', group: 'Expense', balancePaise: 18500000, isActive: true, description: 'Non-cash annual asset wear & tear' },
];

// -------------------------------------------------------------
// 2. JOURNAL VOUCHER VALIDATION (Strict Dual-Entry Enforcement)
// -------------------------------------------------------------
export function validateJournalVoucherLines(lines: JournalEntryLine[]): {
  valid: boolean;
  totalDebitPaise: number;
  totalCreditPaise: number;
  differencePaise: number;
  error?: string;
} {
  if (!lines || lines.length < 2) {
    return {
      valid: false,
      totalDebitPaise: 0,
      totalCreditPaise: 0,
      differencePaise: 0,
      error: 'A journal voucher must contain at least one Debit and one Credit line.',
    };
  }

  const totalDebitPaise = lines.reduce((sum, line) => sum + (line.debitPaise || 0), 0);
  const totalCreditPaise = lines.reduce((sum, line) => sum + (line.creditPaise || 0), 0);
  const differencePaise = Math.abs(totalDebitPaise - totalCreditPaise);

  if (totalDebitPaise <= 0 || totalCreditPaise <= 0) {
    return {
      valid: false,
      totalDebitPaise,
      totalCreditPaise,
      differencePaise,
      error: 'Total debits and credits must be positive amounts.',
    };
  }

  if (differencePaise !== 0) {
    return {
      valid: false,
      totalDebitPaise,
      totalCreditPaise,
      differencePaise,
      error: `Unbalanced voucher: Total Debits (₹${(totalDebitPaise / 100).toLocaleString('en-IN')}) do not equal Total Credits (₹${(totalCreditPaise / 100).toLocaleString('en-IN')}). Discrepancy: ₹${(differencePaise / 100).toLocaleString('en-IN')}.`,
    };
  }

  return { valid: true, totalDebitPaise, totalCreditPaise, differencePaise: 0 };
}

// -------------------------------------------------------------
// 3. TRIAL BALANCE COMPUTATION
// -------------------------------------------------------------
export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  group: AccountGroup;
  debitPaise: number;
  creditPaise: number;
}

export function computeTrialBalance(
  accounts: AccountHead[],
  vouchers: JournalVoucher[]
): {
  rows: TrialBalanceRow[];
  totalDebitPaise: number;
  totalCreditPaise: number;
  isBalanced: boolean;
} {
  const accountMap = new Map<string, { debit: number; credit: number; head: AccountHead }>();

  accounts.forEach(acc => {
    // Determine normal balance side based on group
    let debit = 0;
    let credit = 0;
    if (acc.group === 'Asset' || acc.group === 'Expense') {
      if (acc.balancePaise >= 0) {
        debit = acc.balancePaise;
      } else {
        credit = Math.abs(acc.balancePaise);
      }
    } else {
      if (acc.balancePaise >= 0) {
        credit = acc.balancePaise;
      } else {
        debit = Math.abs(acc.balancePaise);
      }
    }
    accountMap.set(acc.code, { debit, credit, head: acc });
  });

  // Apply posted journal vouchers
  vouchers
    .filter(v => v.status === 'Posted')
    .forEach(v => {
      v.lines.forEach(line => {
        const entry = accountMap.get(line.accountCode);
        if (entry) {
          entry.debit += line.debitPaise || 0;
          entry.credit += line.creditPaise || 0;
        }
      });
    });

  const rows: TrialBalanceRow[] = [];
  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  accountMap.forEach((val, code) => {
    const net = val.debit - val.credit;
    let finalDebit = 0;
    let finalCredit = 0;

    if (val.head.group === 'Asset' || val.head.group === 'Expense') {
      if (net >= 0) {
        finalDebit = net;
      } else {
        finalCredit = Math.abs(net);
      }
    } else {
      const netCredit = val.credit - val.debit;
      if (netCredit >= 0) {
        finalCredit = netCredit;
      } else {
        finalDebit = Math.abs(netCredit);
      }
    }

    if (finalDebit > 0 || finalCredit > 0) {
      rows.push({
        accountCode: code,
        accountName: val.head.name,
        group: val.head.group,
        debitPaise: finalDebit,
        creditPaise: finalCredit,
      });
      totalDebitPaise += finalDebit;
      totalCreditPaise += finalCredit;
    }
  });

  rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  return {
    rows,
    totalDebitPaise,
    totalCreditPaise,
    isBalanced: totalDebitPaise === totalCreditPaise,
  };
}

// -------------------------------------------------------------
// 4. INCOME & EXPENDITURE STATEMENT (Surplus / Deficit)
// -------------------------------------------------------------
export interface FinancialStatementItem {
  code: string;
  name: string;
  amountPaise: number;
}

export function computeIncomeAndExpenditure(
  accounts: AccountHead[],
  vouchers: JournalVoucher[]
): {
  revenues: FinancialStatementItem[];
  expenses: FinancialStatementItem[];
  totalRevenuePaise: number;
  totalExpensePaise: number;
  surplusPaise: number;
  isSurplus: boolean;
} {
  const tb = computeTrialBalance(accounts, vouchers);

  const revenues: FinancialStatementItem[] = [];
  const expenses: FinancialStatementItem[] = [];
  let totalRevenuePaise = 0;
  let totalExpensePaise = 0;

  tb.rows.forEach(r => {
    if (r.group === 'Revenue') {
      revenues.push({ code: r.accountCode, name: r.accountName, amountPaise: r.creditPaise });
      totalRevenuePaise += r.creditPaise;
    } else if (r.group === 'Expense') {
      expenses.push({ code: r.accountCode, name: r.accountName, amountPaise: r.debitPaise });
      totalExpensePaise += r.debitPaise;
    }
  });

  const surplusPaise = totalRevenuePaise - totalExpensePaise;

  return {
    revenues,
    expenses,
    totalRevenuePaise,
    totalExpensePaise,
    surplusPaise,
    isSurplus: surplusPaise >= 0,
  };
}

// -------------------------------------------------------------
// 5. BALANCE SHEET COMPUTATION
// -------------------------------------------------------------
export function computeBalanceSheet(
  accounts: AccountHead[],
  vouchers: JournalVoucher[]
): {
  assets: FinancialStatementItem[];
  liabilities: FinancialStatementItem[];
  capitalAndSurplus: FinancialStatementItem[];
  totalAssetsPaise: number;
  totalLiabilitiesAndEquityPaise: number;
  isBalanced: boolean;
} {
  const tb = computeTrialBalance(accounts, vouchers);
  const ine = computeIncomeAndExpenditure(accounts, vouchers);

  const assets: FinancialStatementItem[] = [];
  const liabilities: FinancialStatementItem[] = [];
  const capitalAndSurplus: FinancialStatementItem[] = [];

  let totalAssetsPaise = 0;
  let totalLiabilitiesPaise = 0;
  let totalCapitalPaise = 0;

  tb.rows.forEach(r => {
    if (r.group === 'Asset') {
      // If code is 1590 (contra depreciation), handle negative or net
      const amount = r.accountCode === '1590' ? -r.creditPaise : r.debitPaise;
      assets.push({ code: r.accountCode, name: r.accountName, amountPaise: amount });
      totalAssetsPaise += amount;
    } else if (r.group === 'Liability') {
      liabilities.push({ code: r.accountCode, name: r.accountName, amountPaise: r.creditPaise });
      totalLiabilitiesPaise += r.creditPaise;
    } else if (r.group === 'Equity') {
      capitalAndSurplus.push({ code: r.accountCode, name: r.accountName, amountPaise: r.creditPaise });
      totalCapitalPaise += r.creditPaise;
    }
  });

  // Include current fiscal year surplus/deficit in Equity
  capitalAndSurplus.push({
    code: '3099',
    name: 'Current FY Net Operating Surplus / (Deficit)',
    amountPaise: ine.surplusPaise,
  });
  totalCapitalPaise += ine.surplusPaise;

  const totalLiabilitiesAndEquityPaise = totalLiabilitiesPaise + totalCapitalPaise;

  return {
    assets,
    liabilities,
    capitalAndSurplus,
    totalAssetsPaise,
    totalLiabilitiesAndEquityPaise,
    isBalanced: Math.abs(totalAssetsPaise - totalLiabilitiesAndEquityPaise) < 100, // within 1 rupee rounding
  };
}

// -------------------------------------------------------------
// 6. BANK RECONCILIATION & CSV PARSER
// -------------------------------------------------------------
export function reconcileBankStatement(
  statementRows: BankStatementRow[],
  unreconciledPayments: FeePayment[],
  unreconciledBills: OpExBill[]
): {
  matchedPayments: FeePayment[];
  matchedBills: OpExBill[];
  unmatchedRows: BankStatementRow[];
} {
  const matchedPayments: FeePayment[] = [];
  const matchedBills: OpExBill[] = [];
  const unmatchedRows: BankStatementRow[] = [];

  for (const row of statementRows) {
    const cleanRef = row.reference.trim().toUpperCase();

    // Inflow match (Fee receipt)
    if (row.amountPaise > 0) {
      const match = unreconciledPayments.find(
        p => p.reference.trim().toUpperCase() === cleanRef && p.amountPaise === row.amountPaise
      );
      if (match) {
        matchedPayments.push({ ...match, verified: true, status: 'Verified' });
        continue;
      }
    }

    // Outflow match (OpEx bill settlement)
    if (row.amountPaise < 0) {
      const outflowPaise = Math.abs(row.amountPaise);
      const match = unreconciledBills.find(
        b => b.paymentReference?.trim().toUpperCase() === cleanRef && b.paidAmountPaise === outflowPaise
      );
      if (match) {
        matchedBills.push({ ...match, status: 'Paid' });
        continue;
      }
    }

    unmatchedRows.push(row);
  }

  return { matchedPayments, matchedBills, unmatchedRows };
}

export function parseBankStatementCSV(csvContent: string): BankStatementRow[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const rows: BankStatementRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length >= 4) {
      const date = cols[0];
      const reference = cols[1];
      const description = cols[2];
      const amountFloat = parseFloat(cols[3]);
      if (!isNaN(amountFloat)) {
        rows.push({
          date,
          reference,
          description,
          amountPaise: Math.round(amountFloat * 100),
        });
      }
    }
  }

  return rows;
}
