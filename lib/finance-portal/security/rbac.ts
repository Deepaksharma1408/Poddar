// College Finance Portal - Role-Based Access Control (RBAC) & Maker-Checker Rule
// Enforces role segregation, maker-checker authorization, and sensitive PII masking.

import type { Role } from '../types/finance';

export const ALL_ROLES: Role[] = [
  'Super Admin',
  'Management',
  'Accounts Admin',
  'Accountant',
  'Cashier',
  'HR Admin',
  'Director',
  'HOD',
];

export interface PagePermission {
  path: string;
  label: string;
  allowedRoles: Role[];
}

export const ROUTE_PERMISSIONS: PagePermission[] = [
  { path: '/dashboard', label: 'Dashboard', allowedRoles: ALL_ROLES },
  { path: '/approvals', label: 'Approval Inbox', allowedRoles: ALL_ROLES },
  { path: '/fees', label: 'Student Fees', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Cashier', 'Director'] },
  { path: '/dues', label: 'Defaulters & Dues', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Cashier', 'Director'] },
  { path: '/scholarships', label: 'Scholarships', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Director'] },
  { path: '/income', label: 'Other Income', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Cashier', 'Director'] },
  { path: '/payroll', label: 'Payroll & Salaries', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'HR Admin', 'Director'] },
  { path: '/guest-faculty', label: 'Guest Faculty', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'HR Admin', 'Director', 'HOD'] },
  { path: '/employees', label: 'Employee Directory', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'HR Admin', 'Director', 'HOD'] },
  { path: '/expenses', label: 'Operating Expenses', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Director'] },
  { path: '/vendors', label: 'Vendor Directory', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Director'] },
  { path: '/petty-cash', label: 'Petty Cash', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Cashier'] },
  { path: '/budgets', label: 'Department Budgets', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Director', 'HOD'] },
  { path: '/events', label: 'Campus Events', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Director', 'HOD'] },
  { path: '/cashbook', label: 'Cash & Bank Book', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Director'] },
  { path: '/accounting', label: 'Accounting & Ledgers', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Director'] },
  { path: '/assets', label: 'Fixed Asset Register', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Director'] },
  { path: '/purchase-orders', label: 'Purchase Orders', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Director', 'HOD'] },
  { path: '/reports', label: 'Financial Reports', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Accountant', 'Director'] },
  { path: '/audit', label: 'Audit Trail', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin', 'Director'] },
  { path: '/settings', label: 'System Settings', allowedRoles: ['Super Admin', 'Management', 'Accounts Admin'] },
];

export function canAccessRoute(role: Role, path: string): boolean {
  if (role === 'Super Admin') return true;
  const permission = ROUTE_PERMISSIONS.find(p => p.path === path || path.startsWith(p.path + '/'));
  if (!permission) return true;
  return permission.allowedRoles.includes(role);
}

/**
 * Maker-Checker Enforcement Rule:
 * Whoever creates a payment, bill, bonus, refund, waiver, or payroll adjustment
 * can NEVER approve it, regardless of their role privileges.
 */
export function canApproveRecord(
  currentRole: Role,
  createdByRole: Role,
  actionType: 'BILL' | 'PAYROLL' | 'REFUND' | 'WAIVER' | 'BONUS'
): { allowed: boolean; reason?: string } {
  if (currentRole === createdByRole) {
    return {
      allowed: false,
      reason: `Maker-Checker Violation: A record created by ${createdByRole} cannot be approved by ${currentRole}. Another authorized role must review it.`,
    };
  }

  switch (actionType) {
    case 'BILL':
      if (['Accounts Admin', 'Management', 'Director', 'Super Admin'].includes(currentRole)) {
        return { allowed: true };
      }
      return { allowed: false, reason: `${currentRole} is not authorized to approve operating expense bills.` };

    case 'PAYROLL':
      if (['HR Admin', 'Accounts Admin', 'Director', 'Management', 'Super Admin'].includes(currentRole)) {
        return { allowed: true };
      }
      return { allowed: false, reason: `${currentRole} cannot approve payroll records.` };

    case 'REFUND':
    case 'WAIVER':
      if (['Accounts Admin', 'Management', 'Director', 'Super Admin'].includes(currentRole)) {
        return { allowed: true };
      }
      return { allowed: false, reason: `${currentRole} cannot approve fee refunds or waivers.` };

    case 'BONUS':
      if (['Management', 'Director', 'Super Admin'].includes(currentRole)) {
        return { allowed: true };
      }
      return { allowed: false, reason: `Bonus approvals require Management or Director authorization.` };

    default:
      return { allowed: false, reason: 'Unauthorized action.' };
  }
}

/**
 * Field Masking Utilities for Sensitive PII
 */
export function maskSalary(salaryFormatted: string, role: Role): string {
  const allowedRoles: Role[] = ['Super Admin', 'Management', 'Accounts Admin', 'HR Admin', 'Director'];
  if (allowedRoles.includes(role)) return salaryFormatted;
  return '₹••••••';
}

export function maskBankAccount(lastFour: string, role: Role): string {
  const allowedRoles: Role[] = ['Super Admin', 'Accounts Admin', 'Accountant', 'Cashier', 'HR Admin'];
  if (allowedRoles.includes(role)) return `•••• •••• ${lastFour}`;
  return '•••• •••• ••••';
}

export function maskPAN(pan: string, role: Role): string {
  if (!pan || pan.length < 10) return '••••••••••';
  const allowedRoles: Role[] = ['Super Admin', 'Accounts Admin', 'Accountant', 'HR Admin'];
  if (allowedRoles.includes(role)) return pan;
  return `${pan.slice(0, 5)}••••${pan.slice(9)}`;
}

