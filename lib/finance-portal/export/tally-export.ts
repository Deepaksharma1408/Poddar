// College Finance Portal - Tally & QuickBooks ERP Integration Export
// Maps operational expenses, fee receipts, and payroll into Tally-compliant CSV ledgers.

import { generateSafeCSV } from '../security/csv-sanitizer';
import type { OpExBill, FeePayment, PayrollRecord } from '../types/finance';
import { formatPlainINR } from '../finance/money';

export interface TallyVoucherRow {
  date: string;
  voucherType: 'Payment' | 'Receipt' | 'Journal';
  voucherNo: string;
  debitLedger: string;
  creditLedger: string;
  amountINR: string;
  narration: string;
  gstLedger?: string;
  gstAmountINR?: string;
  tdsLedger?: string;
  tdsAmountINR?: string;
}

/**
 * Maps OpEx category to standard Tally Chart of Accounts head.
 */
export const CATEGORY_LEDGER_MAP: Record<string, string> = {
  'IT & Hardware': 'Computer & Software Expenses',
  'Laboratory Consumables': 'Lab Chemical & Equipment Expenses',
  'Stationery & Printing': 'Printing & Stationery Account',
  'Security & Facility': 'Campus Security & Housekeeping Charges',
  'Electricity & Utilities': 'Power & Electricity Charges',
  'Library Books': 'Library Books & Periodicals',
  'Legal & Professional': 'Legal & Professional Consultancy Fees',
  'Default': 'General College Operating Expenses',
};

/**
 * Generates Tally-compatible CSV export for OpEx bills.
 */
export function generateTallyOpExCSV(bills: OpExBill[]): string {
  const headers = [
    'Date',
    'Voucher Type',
    'Voucher No',
    'Expense Head (Debit)',
    'Vendor / Bank (Credit)',
    'Base Amount (INR)',
    'GST Ledger',
    'GST Amount (INR)',
    'TDS Ledger',
    'TDS Amount (INR)',
    'Net Payable (INR)',
    'Narration',
  ];

  const rows = bills.map(b => {
    const expenseLedger = CATEGORY_LEDGER_MAP[b.category] || CATEGORY_LEDGER_MAP.Default;
    const gstLedger = b.gstAmountPaise > 0 ? `Input GST @ ${b.gstRatePct}%` : 'N/A';
    const tdsLedger = b.tdsDeductionPaise && b.tdsDeductionPaise > 0 ? `TDS Payable u/s ${b.tdsSection || '194C'}` : 'N/A';

    return [
      b.invoiceDate,
      'Payment',
      b.billNumber,
      expenseLedger,
      b.vendorName,
      formatPlainINR(b.baseAmountPaise, true),
      gstLedger,
      formatPlainINR(b.gstAmountPaise, true),
      tdsLedger,
      formatPlainINR(b.tdsDeductionPaise || 0, true),
      formatPlainINR(b.netPayablePaise, true),
      `Bill ${b.billNumber} from ${b.vendorName} for ${b.category}. ${b.paymentReference ? 'UTR: ' + b.paymentReference : ''}`,
    ];
  });

  return generateSafeCSV([headers, ...rows]);
}

/**
 * Generates Tally-compatible CSV export for student fee receipts.
 */
export function generateTallyFeeReceiptsCSV(payments: FeePayment[]): string {
  const headers = [
    'Date',
    'Voucher Type',
    'Receipt No',
    'Bank / Cash (Debit)',
    'Student Tuition Income (Credit)',
    'Amount (INR)',
    'Mode',
    'Reference / UTR',
    'Narration',
  ];

  const rows = payments.filter(p => p.verified).map(p => [
    p.date,
    'Receipt',
    p.receiptNo,
    p.method === 'Cash' ? 'Cash-in-Hand' : 'HDFC College Collection Account',
    'Student Academic Fee Revenue',
    formatPlainINR(p.amountPaise, true),
    p.method,
    p.reference,
    `Tuition fee collection for student ${p.studentId}. Mode: ${p.method}, Ref: ${p.reference}`,
  ]);

  return generateSafeCSV([headers, ...rows]);
}

