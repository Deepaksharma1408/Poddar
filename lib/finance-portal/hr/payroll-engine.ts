// College Finance Portal - HR & Payroll Calculation Engine
// Strict Integer Paise with Loss of Pay (LOP) divisor policies and statutory deductions.

import type { Employee, PayrollRecord, Role } from '../types/finance';
import { toPaise } from '../finance/money';

export interface LopCalculation {
  dailyRatePaise: number;
  unpaidDays: number;
  lopDeductionPaise: number;
}

/**
 * Calculates Loss of Pay (LOP) based on configured divisor policy:
 * 1. 'Fixed 30': Daily = Gross / 30
 * 2. 'Calendar Days': Daily = Gross / Days in Month (e.g. 30 in Nov, 31 in Dec, 28 in Feb)
 * 3. 'Working Days': Daily = Gross / (Calendar days - Weekends)
 * Deductions are strictly capped at gross pay (cannot generate negative salary).
 */
export function calculateLop(
  grossPaise: number,
  unpaidDays: number,
  period: string, // YYYY-MM
  divisorMode: 'Fixed 30' | 'Calendar Days' | 'Working Days' = 'Fixed 30'
): LopCalculation {
  if (grossPaise <= 0 || unpaidDays <= 0) {
    return { dailyRatePaise: 0, unpaidDays: 0, lopDeductionPaise: 0 };
  }

  const [year, month] = period.split('-').map(Number);
  const calendarDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  let divisor = 30;
  if (divisorMode === 'Calendar Days') {
    divisor = calendarDays;
  } else if (divisorMode === 'Working Days') {
    let workingDaysCount = 0;
    for (let day = 1; day <= calendarDays; day++) {
      const dt = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dt.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDaysCount++;
      }
    }
    divisor = Math.max(1, workingDaysCount);
  }

  const dailyRatePaise = Math.round(grossPaise / divisor);
  const rawLop = Math.round(dailyRatePaise * unpaidDays);
  const lopDeductionPaise = Math.min(grossPaise, rawLop); // Capped at gross

  return {
    dailyRatePaise,
    unpaidDays,
    lopDeductionPaise,
  };
}

export interface StatutoryDeductions {
  pfEmployeePaise: number;
  pfEmployerPaise: number;
  esiEmployeePaise: number;
  esiEmployerPaise: number;
  tdsDeductionPaise: number;
}

/**
 * Computes statutory deductions (PF, ESI, TDS) with configurable rates.
 */
export function calculateStatutory(
  earnedBasicPaise: number,
  earnedGrossPaise: number,
  employee: Employee,
  rates: {
    pfEmployeePct: number;
    pfEmployerPct: number;
    esiEmployeePct: number;
    esiEmployerPct: number;
    esiCeilingPaise: number;
  }
): StatutoryDeductions {
  let pfEmployeePaise = 0;
  let pfEmployerPaise = 0;

  if (employee.pfOpted) {
    pfEmployeePaise = Math.round(earnedBasicPaise * (rates.pfEmployeePct / 100));
    pfEmployerPaise = Math.round(earnedBasicPaise * (rates.pfEmployerPct / 100));
  }

  let esiEmployeePaise = 0;
  let esiEmployerPaise = 0;

  // ESI is applicable only if gross is at or below the statutory ceiling
  if (employee.esiOpted && earnedGrossPaise <= rates.esiCeilingPaise) {
    esiEmployeePaise = Math.round(earnedGrossPaise * (rates.esiEmployeePct / 100));
    esiEmployerPaise = Math.round(earnedGrossPaise * (rates.esiEmployerPct / 100));
  }

  // Placeholder estimated TDS (0 for basic tax slab simulations)
  const tdsDeductionPaise = earnedGrossPaise > toPaise(100000) ? Math.round(earnedGrossPaise * 0.1) : 0;

  return {
    pfEmployeePaise,
    pfEmployerPaise,
    esiEmployeePaise,
    esiEmployerPaise,
    tdsDeductionPaise,
  };
}

/**
 * Validates a payroll state transition and prevents illegal transitions or duplicate payments.
 */
export function validatePayrollTransition(
  record: PayrollRecord,
  targetStatus: PayrollRecord['status'],
  actorRole: Role
): { valid: boolean; reason?: string } {
  // Paid records are locked forever (correctable only via reversal)
  if (record.status === 'Paid') {
    return { valid: false, reason: 'Paid payroll records are locked and cannot be modified.' };
  }

  // Cannot disburse while On Hold or in pending review
  if (['Draft', 'Pending HOD Review', 'Pending HR Approval', 'Pending Accounts Approval', 'On Hold'].includes(record.status)) {
    if (targetStatus === 'Paid' || targetStatus === 'Processing') {
      return {
        valid: false,
        reason: `Disbursement lock: Record must be in 'Approved' state before batch processing or payout. Currently '${record.status}'.`,
      };
    }
  }

  return { valid: true };
}

