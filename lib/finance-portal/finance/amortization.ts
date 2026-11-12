// College Finance Portal - Amortization & Installment Schedule Engine
// Works strictly in Integer Paise with final-installment penny balancing.

import type { FeePlan } from '../types/finance';

export interface InstallmentCalculation {
  monthlyPaise: number;
  totalInterestPaise: number;
  totalPayablePaise: number;
}

/**
 * Calculates EMI installment in integer paise.
 * Supports:
 * 1. 'Flat interest': (Principal + Principal * Rate * (Months / 12)) / Months
 * 2. 'Reducing balance': Standard financial amortization: P * r * (1+r)^n / ((1+r)^n - 1)
 */
export function installmentPaise(
  principalPaise: number,
  annualRatePct: number,
  months: number,
  method: 'Flat interest' | 'Reducing balance' = 'Reducing balance'
): InstallmentCalculation {
  if (principalPaise <= 0 || months <= 0) {
    return { monthlyPaise: 0, totalInterestPaise: 0, totalPayablePaise: 0 };
  }

  if (annualRatePct <= 0) {
    const monthly = Math.round(principalPaise / months);
    return {
      monthlyPaise: monthly,
      totalInterestPaise: 0,
      totalPayablePaise: principalPaise,
    };
  }

  if (method === 'Flat interest') {
    const totalInterest = Math.round(principalPaise * (annualRatePct / 100) * (months / 12));
    const totalPayable = principalPaise + totalInterest;
    const monthly = Math.round(totalPayable / months);
    return {
      monthlyPaise: monthly,
      totalInterestPaise: totalInterest,
      totalPayablePaise: totalPayable,
    };
  }

  // Reducing balance amortization
  const monthlyRate = annualRatePct / 1200; // annual percentage to monthly fraction
  const factor = Math.pow(1 + monthlyRate, months);
  const emiFloat = (principalPaise * monthlyRate * factor) / (factor - 1);
  const monthly = Math.round(emiFloat);
  const totalPayable = monthly * months;
  const totalInterest = Math.max(0, totalPayable - principalPaise);

  return {
    monthlyPaise: monthly,
    totalInterestPaise: totalInterest,
    totalPayablePaise: totalPayable,
  };
}

/**
 * Clamps date to valid month day (e.g. 2027-01-31 + 1 month -> 2027-02-28).
 */
export function addClampedMonths(startDateStr: string, offsetMonths: number): string {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1 + offsetMonths, 1));
  const maxDaysInTargetMonth = new Date(
    Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const day = Math.min(d, maxDaysInTargetMonth);
  const yearStr = targetDate.getUTCFullYear();
  const monthStr = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');

  return `${yearStr}-${monthStr}-${dayStr}`;
}

export interface ScheduledCharge {
  id: string;
  label: string;
  date: string;
  amountPaise: number;
}

/**
 * Generates an itemized schedule of charges for a student's fee plan.
 * Applies final-installment penny-balancing to ensure total matches exact payable paise.
 */
export function generateFeeSchedule(plan: FeePlan): ScheduledCharge[] {
  if (plan.kind === 'Full payment') {
    return [
      {
        id: 'full-fee',
        label: 'Annual College Academic Fee',
        date: plan.startDate,
        amountPaise: plan.feePaise,
      },
    ];
  }

  const charges: ScheduledCharge[] = [];

  // Down payment if applicable
  if (plan.downPaymentPaise > 0) {
    charges.push({
      id: 'down-payment',
      label: 'Initial Down Payment',
      date: plan.startDate,
      amountPaise: plan.downPaymentPaise,
    });
  }

  const financedPaise = Math.max(0, plan.feePaise - plan.downPaymentPaise);
  const count = plan.kind === 'Semester' ? 2 : plan.months;
  const monthsInterval = plan.kind === 'Semester' ? 6 : 1;

  const calculation = installmentPaise(
    financedPaise,
    plan.kind === 'EMI' ? plan.interestRatePct : 0,
    count,
    plan.interestType
  );

  const regularMonthly = calculation.monthlyPaise;
  const totalPayable = calculation.totalPayablePaise;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    // Final installment carries adjustment
    const amount = isLast
      ? totalPayable - regularMonthly * (count - 1)
      : regularMonthly;

    charges.push({
      id: `installment-${i + 1}`,
      label: plan.kind === 'Semester' ? `Semester ${i + 1} Fee` : `EMI ${i + 1} of ${count}`,
      date: addClampedMonths(plan.startDate, i * monthsInterval),
      amountPaise: amount,
    });
  }

  return charges;
}

