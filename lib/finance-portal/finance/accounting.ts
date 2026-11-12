// College Finance Portal - Triple Cash Book & Bank Statement Reconciliation
// Strict Integer Paise with Fiscal Year (1 April - 31 March) Lock.

import type { CashBookEntry, FeePayment, OpExBill, PettyCashVoucher, OtherIncome } from '../types/finance';

export interface BankStatementRow {
  date: string;
  reference: string;
  description: string;
  amountPaise: number; // positive = credit/deposit, negative = debit/withdrawal
}

/**
 * Reconciles bank statement items against internal ledger payments.
 */
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

/**
 * Parses bank statement CSV text safely in the browser.
 */
export function parseBankStatementCSV(csvContent: string): BankStatementRow[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const rows: BankStatementRow[] = [];

  // Assuming header: Date, Reference, Description, Amount (INR)
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

