// College Finance Portal - Student Ledger & Payment Waterfall Allocation
// Strict Integer Paise with Oldest-Charge-First Accounting

import type { Student, FeePayment, FeeAdjustment } from '../types/finance';
import { generateFeeSchedule, ScheduledCharge } from './amortization';

export interface LedgerCharge extends ScheduledCharge {
  paidPaise: number;
  outstandingPaise: number;
  status: 'Paid' | 'Overdue' | 'Due today' | 'Upcoming';
}

export interface StudentLedgerSummary {
  schedule: LedgerCharge[];
  totalPaise: number;
  paidPaise: number;
  dueNowPaise: number;
  upcomingPaise: number;
  remainingPaise: number;
  pendingVerificationPaise: number;
  bouncedPaise: number;
  refundedPaise: number;
  progressPct: number;
  status: 'Paid in full' | 'Payment due' | 'On track';
  nextInstallment?: LedgerCharge;
}

/**
 * Merges standard fee plan schedule with any custom adjustments (Late fees, concessions, etc.)
 */
export function getAdjustedSchedule(student: Student): ScheduledCharge[] {
  const baseSchedule = generateFeeSchedule(student.plan);
  const adjustments = student.adjustments || [];

  const positiveCharges: ScheduledCharge[] = adjustments
    .filter(a => a.category === 'Late fee' || a.category === 'Special Charge')
    .map(a => ({
      id: a.id,
      label: a.label,
      date: a.date,
      amountPaise: a.amountPaise,
    }));

  const credits = adjustments
    .filter(a => ['Concession', 'Scholarship', 'Waiver'].includes(a.category))
    .reduce((sum, a) => sum + a.amountPaise, 0);

  // Apply concessions/scholarships against base charges starting from the last future charges backwards
  let remainingCredit = credits;
  const combined = [...baseSchedule, ...positiveCharges];

  // If there are credits, reduce from installments
  if (remainingCredit > 0) {
    for (let i = combined.length - 1; i >= 0 && remainingCredit > 0; i--) {
      const deduction = Math.min(combined[i].amountPaise, remainingCredit);
      combined[i].amountPaise -= deduction;
      remainingCredit -= deduction;
    }
  }

  return combined.filter(c => c.amountPaise > 0);
}

/**
 * Computes exact ledger state by applying verified payments oldest-charge-first.
 */
export function computeStudentLedger(
  student: Student,
  payments: FeePayment[],
  asOfDate: string
): StudentLedgerSummary {
  const studentPayments = payments.filter(p => p.studentId === student.id);

  // Verified receipts (excluding refunded portions)
  const verifiedPayments = studentPayments.filter(p => p.status === 'Verified');
  const paidPaise = verifiedPayments.reduce(
    (sum, p) => sum + (p.amountPaise - (p.refundedPaise || 0)),
    0
  );

  const pendingVerificationPaise = studentPayments
    .filter(p => p.status === 'Pending Verification')
    .reduce((sum, p) => sum + p.amountPaise, 0);

  const bouncedPaise = studentPayments
    .filter(p => p.status === 'Bounced')
    .reduce((sum, p) => sum + p.amountPaise, 0);

  const refundedPaise = studentPayments.reduce(
    (sum, p) => sum + (p.refundedPaise || 0),
    0
  );

  const rawSchedule = getAdjustedSchedule(student);

  // Waterfall allocation: apply verified paid credit to oldest charges first
  let availableCredit = paidPaise;
  const schedule: LedgerCharge[] = rawSchedule.map(charge => {
    const applied = Math.min(availableCredit, charge.amountPaise);
    availableCredit = Math.max(0, availableCredit - charge.amountPaise);
    const outstanding = charge.amountPaise - applied;

    let status: LedgerCharge['status'] = 'Upcoming';
    if (outstanding === 0) {
      status = 'Paid';
    } else if (charge.date < asOfDate) {
      status = 'Overdue';
    } else if (charge.date === asOfDate) {
      status = 'Due today';
    }

    return {
      ...charge,
      paidPaise: applied,
      outstandingPaise: outstanding,
      status,
    };
  });

  const totalPaise = schedule.reduce((sum, c) => sum + c.amountPaise, 0);
  const dueNowPaise = schedule
    .filter(c => c.date <= asOfDate)
    .reduce((sum, c) => sum + c.outstandingPaise, 0);

  const remainingPaise = Math.max(0, totalPaise - paidPaise);
  const upcomingPaise = Math.max(0, remainingPaise - dueNowPaise);

  const progressPct = totalPaise > 0 ? Math.min(100, Math.round((paidPaise / totalPaise) * 100)) : 100;
  const status: StudentLedgerSummary['status'] =
    remainingPaise === 0 ? 'Paid in full' : dueNowPaise > 0 ? 'Payment due' : 'On track';

  const nextInstallment = schedule.find(c => c.outstandingPaise > 0);

  return {
    schedule,
    totalPaise,
    paidPaise,
    dueNowPaise,
    upcomingPaise,
    remainingPaise,
    pendingVerificationPaise,
    bouncedPaise,
    refundedPaise,
    progressPct,
    status,
    nextInstallment,
  };
}

/**
 * Assesses late fees idempotently. If an overdue charge exists and grace days have passed,
 * adds a single late fee adjustment if not already added.
 */
export function assessLateFee(
  student: Student,
  payments: FeePayment[],
  lateFeeAmountPaise: number,
  graceDays: number,
  asOfDate: string,
  createdBy: Student['adjustments'][0]['createdBy']
): FeeAdjustment | null {
  if (lateFeeAmountPaise <= 0) return null;

  const ledger = computeStudentLedger(student, payments, asOfDate);
  const cutoffTime = Date.parse(asOfDate) - graceDays * 86400000;

  const overdueCharge = ledger.schedule.find(
    c => c.outstandingPaise > 0 && Date.parse(c.date) < cutoffTime && !c.label.startsWith('Late fee')
  );

  if (!overdueCharge) return null;

  const lateFeeId = `LF-${overdueCharge.date}-${student.id}`;
  const alreadyAssessed = (student.adjustments || []).some(a => a.id === lateFeeId);
  if (alreadyAssessed) return null;

  return {
    id: lateFeeId,
    category: 'Late fee',
    label: `Late fee for overdue ${overdueCharge.label}`,
    amountPaise: lateFeeAmountPaise,
    date: asOfDate,
    createdBy,
  };
}

/**
 * Processes a fee refund. Strict rule: refund cannot exceed previously verified paid amount.
 */
export function validateAndRefundFee(
  payment: FeePayment,
  refundAmountPaise: number,
  reason: string
): { valid: boolean; error?: string; updatedPayment?: FeePayment } {
  if (payment.status !== 'Verified') {
    return { valid: false, error: 'Only verified payments can be refunded' };
  }

  const existingRefunded = payment.refundedPaise || 0;
  const maxAvailable = payment.amountPaise - existingRefunded;

  if (refundAmountPaise <= 0 || refundAmountPaise > maxAvailable) {
    return {
      valid: false,
      error: `Refund amount exceeds available verified balance of ₹${(maxAvailable / 100).toLocaleString('en-IN')}`,
    };
  }

  if (!reason.trim()) {
    return { valid: false, error: 'Mandatory reason required for refund' };
  }

  const updatedPayment: FeePayment = {
    ...payment,
    refundedPaise: existingRefunded + refundAmountPaise,
    refundReason: reason,
    status: existingRefunded + refundAmountPaise >= payment.amountPaise ? 'Refunded' : 'Verified',
  };

  return { valid: true, updatedPayment };
}

