// Poddar International College ERP - Enterprise RBAC + ABAC Authorization Engine
// Unified, multi-tenant authorization framework separating:
// 1. Role Resource Permissions
// 2. Action-Level Capabilities
// 3. Multi-Tenant ABAC Data-Level Scopes (campus, department, section, student)
// 4. Server-Side Execution Guards & Identity-based Maker-Checker
// 5. Sensitive Field Protection (PII Sanitization)
// 6. Examination Lifecycle Control & Immutable Security Auditing

export type BaselineRole =
  | 'Super Admin'
  | 'Director'
  | 'Principal'
  | 'Management'
  | 'HR Admin'
  | 'Accounts Admin'
  | 'Accountant'
  | 'Cashier'
  | 'HOD'
  | 'Faculty'
  | 'Teacher'
  | 'Non-teaching Staff'
  | 'Student'
  | 'Parent';

export type SpecialistRole =
  | 'Registrar'
  | 'Examination Controller'
  | 'Librarian'
  | 'Hostel Warden'
  | 'Transport Manager'
  | 'Admissions Officer'
  | 'Internal Auditor';

export type InstitutionalRole = BaselineRole | SpecialistRole;

export type AccessLevel = 'full' | 'scoped_view' | 'self' | 'none';

// -------------------------------------------------------------
// 1. ACTION KEYS (Granular Capabilities)
// -------------------------------------------------------------
export type ActionKey =
  // Fees & Collections
  | 'fee.collect'
  | 'fee.receipt.print'
  | 'fee.concession.create'
  | 'fee.concession.approve'
  | 'fee.refund.request'
  | 'fee.refund.approve'
  | 'fee.late_fee.edit'
  | 'fee.structure.manage'
  // Banking & Accounting
  | 'bank.reconcile'
  | 'accounting.ledger.view'
  | 'accounting.ledger.post'
  | 'accounting.year_end_close'
  // Payroll & Staff
  | 'payroll.batch.create'
  | 'payroll.hod.verify'
  | 'payroll.hr.verify'
  | 'payroll.accounts.approve'
  | 'payroll.disburse'
  | 'payroll.salary_revision.approve'
  | 'staff.directory.view'
  | 'staff.leave.apply'
  | 'staff.leave.approve'
  // Academics & Examination Lifecycle
  | 'academics.timetable.manage'
  | 'attendance.student.mark'
  | 'marks.entry'
  | 'marks.moderate'
  | 'marks.lock'
  | 'results.publish'
  // Campus Services
  | 'library.catalogue.manage'
  | 'library.circulation.issue'
  | 'transport.fleet.manage'
  | 'hostel.allocation.manage'
  | 'admissions.verify'
  // Governance & Security
  | 'reports.view'
  | 'audit.view'
  | 'settings.manage'
  | 'security.role.assign'
  | 'security.role.revoke'
  | 'security.session.invalidate';

// -------------------------------------------------------------
// 2. PRINCIPAL & RESOURCE DEFINITIONS (ABAC)
// -------------------------------------------------------------
export interface TemporaryPermissionGrant {
  permission: ActionKey;
  grantedBy: string;
  grantedAt: string; // ISO
  expiresAt: string; // ISO
  reason: string;
}

export interface SecurityPrincipal {
  userId: string;
  fullName: string;
  role: InstitutionalRole;
  campusId: string; // Multi-campus isolation
  departmentId?: string; // Academic/Operational department
  assignedSectionIds?: string[]; // Timetable cohorts for faculty
  studentId?: string; // Student self-service identity
  verifiedChildStudentIds?: string[]; // Parent-ward verification
  temporaryGrants?: TemporaryPermissionGrant[];
  sessionToken: string;
  sessionIssuedAt: number; // Unix ms
  revokedBefore?: number; // Unix ms - invalidation cutoff
}

export interface TargetResource {
  entityType: 'STUDENT' | 'PAYROLL' | 'FEE_PAYMENT' | 'BILL' | 'EXAM_RECORD' | 'LEAVE' | 'LIBRARY' | 'GENERAL';
  entityId: string;
  campusId: string;
  departmentId?: string;
  programmeId?: string;
  sectionId?: string;
  studentId?: string;
  ownerId?: string;
  createdById?: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  status: 200 | 401 | 403;
  code:
    | 'AUTHORIZED'
    | 'SESSION_EXPIRED'
    | 'SESSION_REVOKED'
    | 'ROLE_FORBIDDEN'
    | 'ACTION_FORBIDDEN'
    | 'CAMPUS_SCOPE_VIOLATION'
    | 'DEPARTMENT_SCOPE_VIOLATION'
    | 'SECTION_SCOPE_VIOLATION'
    | 'STUDENT_SCOPE_VIOLATION'
    | 'MAKER_CHECKER_VIOLATION';
  reason?: string;
}

// -------------------------------------------------------------
// 3. TIER 1: ROUTE & PAGE ACCESS MATRIX (30 Standard Pages)
// -------------------------------------------------------------
export const ROUTE_MATRIX: Record<string, Partial<Record<InstitutionalRole, AccessLevel>>> = {
  '/dashboard': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'HR Admin': 'scoped_view', 'Accounts Admin': 'scoped_view', Accountant: 'scoped_view', Cashier: 'scoped_view',
    HOD: 'scoped_view', Faculty: 'self', Teacher: 'self', 'Non-teaching Staff': 'self', Student: 'self', Parent: 'self',
    Registrar: 'scoped_view', 'Examination Controller': 'scoped_view', Librarian: 'scoped_view',
    'Hostel Warden': 'scoped_view', 'Transport Manager': 'scoped_view', 'Admissions Officer': 'scoped_view', 'Internal Auditor': 'scoped_view',
  },
  '/students': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'Accounts Admin': 'scoped_view', Accountant: 'scoped_view', Cashier: 'scoped_view',
    HOD: 'scoped_view', Faculty: 'scoped_view', Teacher: 'scoped_view', Student: 'self', Parent: 'self',
    Registrar: 'full', 'Admissions Officer': 'full', 'Examination Controller': 'scoped_view',
  },
  '/parents': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    HOD: 'scoped_view', Faculty: 'scoped_view', Teacher: 'scoped_view', Parent: 'self',
    Registrar: 'scoped_view', 'Admissions Officer': 'full',
  },
  '/attendance': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    HOD: 'full', Faculty: 'full', Teacher: 'full', Student: 'self', Parent: 'self',
    Registrar: 'scoped_view',
  },
  '/programmes': {
    'Super Admin': 'full', Director: 'full', Principal: 'full', Management: 'scoped_view',
    HOD: 'full', Faculty: 'scoped_view', Teacher: 'scoped_view', Student: 'self', Parent: 'self',
    Registrar: 'full', 'Examination Controller': 'full',
  },
  '/timetable': {
    'Super Admin': 'full', Director: 'full', Principal: 'full', Management: 'scoped_view',
    HOD: 'full', Faculty: 'scoped_view', Teacher: 'scoped_view', Student: 'self', Parent: 'self',
  },
  '/exams': {
    'Super Admin': 'full', Director: 'full', Principal: 'full', Management: 'scoped_view',
    HOD: 'full', Faculty: 'full', Teacher: 'full', Student: 'self', Parent: 'self',
    'Examination Controller': 'full', Registrar: 'full',
  },
  '/fees': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'Accounts Admin': 'full', Accountant: 'full', Cashier: 'full', Student: 'self', Parent: 'self',
    'Internal Auditor': 'scoped_view',
  },
  '/fee-structures': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'Accounts Admin': 'full', Accountant: 'scoped_view', 'Internal Auditor': 'scoped_view',
  },
  '/bank-reconciliation': {
    'Super Admin': 'full', Management: 'scoped_view',
    'Accounts Admin': 'full', Accountant: 'full', 'Internal Auditor': 'scoped_view',
  },
  '/accounting': {
    'Super Admin': 'full', Management: 'scoped_view',
    'Accounts Admin': 'full', Accountant: 'scoped_view', 'Internal Auditor': 'scoped_view',
  },
  '/staff': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'HR Admin': 'full', 'Accounts Admin': 'scoped_view', HOD: 'scoped_view',
    Faculty: 'self', Teacher: 'self', 'Non-teaching Staff': 'self',
  },
  '/employee-attendance': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'HR Admin': 'full', 'Accounts Admin': 'scoped_view', HOD: 'full',
    Faculty: 'self', Teacher: 'self', 'Non-teaching Staff': 'self',
  },
  '/leave': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'HR Admin': 'full', HOD: 'full', Faculty: 'self', Teacher: 'self', 'Non-teaching Staff': 'self',
  },
  '/leave-calendar': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'HR Admin': 'full', HOD: 'scoped_view', Faculty: 'scoped_view', Teacher: 'scoped_view', 'Non-teaching Staff': 'scoped_view',
  },
  '/hr-policies': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'HR Admin': 'full',
  },
  '/payroll': {
    'Super Admin': 'full', Management: 'scoped_view',
    'HR Admin': 'full', 'Accounts Admin': 'full', HOD: 'scoped_view',
    Faculty: 'self', Teacher: 'self', 'Non-teaching Staff': 'self', 'Internal Auditor': 'scoped_view',
  },
  '/performance': {
    'Super Admin': 'full', Director: 'full', Principal: 'full', Management: 'scoped_view',
    'HR Admin': 'scoped_view', HOD: 'full', Faculty: 'self', Teacher: 'self', 'Non-teaching Staff': 'self',
  },
  '/salary-revisions': {
    'Super Admin': 'full', Management: 'full', 'HR Admin': 'full', 'Accounts Admin': 'full',
  },
  '/transport': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'Transport Manager': 'full', 'Non-teaching Staff': 'full', Student: 'self', Parent: 'self',
  },
  '/library': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    Librarian: 'full', HOD: 'scoped_view', Faculty: 'scoped_view', Teacher: 'scoped_view',
    'Non-teaching Staff': 'scoped_view', Student: 'self',
  },
  '/support': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'HR Admin': 'scoped_view', Faculty: 'self', Teacher: 'self', 'Non-teaching Staff': 'full', Student: 'self', Parent: 'self',
  },
  '/announcements': {
    'Super Admin': 'full', Director: 'full', Principal: 'full', Management: 'full',
    'HR Admin': 'scoped_view', 'Accounts Admin': 'scoped_view', Accountant: 'scoped_view', Cashier: 'scoped_view',
    HOD: 'full', Faculty: 'scoped_view', Teacher: 'scoped_view', 'Non-teaching Staff': 'scoped_view',
    Student: 'scoped_view', Parent: 'scoped_view', Registrar: 'full',
  },
  '/notifications': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    'HR Admin': 'scoped_view', 'Accounts Admin': 'full', Accountant: 'full',
  },
  '/reports-student': {
    'Super Admin': 'full', Director: 'scoped_view', Principal: 'scoped_view', Management: 'scoped_view',
    HOD: 'scoped_view', Registrar: 'full', 'Examination Controller': 'full',
  },
  '/reports-finance': {
    'Super Admin': 'full', Management: 'scoped_view', 'Accounts Admin': 'full', Accountant: 'scoped_view',
    'Internal Auditor': 'full',
  },
  '/reports-payroll': {
    'Super Admin': 'full', Management: 'scoped_view', 'HR Admin': 'full', 'Accounts Admin': 'full',
    'Internal Auditor': 'full',
  },
  '/roles-permissions': {
    'Super Admin': 'full',
  },
  '/audit-trail': {
    'Super Admin': 'full', Management: 'scoped_view', 'Internal Auditor': 'full',
  },
  '/campus-settings': {
    'Super Admin': 'full',
  },
};

// Aliases matching friendly UI labels to normalized routes
const PAGE_ALIASES: Record<string, string> = {
  Overview: '/dashboard',
  Dashboard: '/dashboard',
  Students: '/students',
  'Student profiles': '/students',
  'Parents & Guardians': '/parents',
  Attendance: '/attendance',
  'Student Attendance': '/attendance',
  'Lecture Attendance': '/attendance',
  Academics: '/programmes',
  'Programmes & Semesters': '/programmes',
  'Classes & Sections': '/programmes',
  'Courses & Batches': '/programmes',
  Timetable: '/timetable',
  'Lecture Timetable': '/timetable',
  'Exams & Results': '/exams',
  'Examinations & Results': '/exams',
  'Fees & Payments': '/fees',
  'Fees & payments': '/fees',
  'Fee Structures & Adjustments': '/fee-structures',
  'Fee administration': '/fee-structures',
  'Bank Reconciliation': '/bank-reconciliation',
  'Bank reconciliation': '/bank-reconciliation',
  'Accounting & Ledgers': '/accounting',
  Accounting: '/accounting',
  'Faculty & Staff': '/staff',
  'Faculty & Staff directory': '/staff',
  'Staff directory': '/staff',
  Teachers: '/staff',
  'Teachers & Staff': '/staff',
  Employees: '/staff',
  'Employee Attendance': '/employee-attendance',
  'Staff Attendance': '/employee-attendance',
  'Leave Management': '/leave',
  'Leave requests': '/leave',
  'Leave Calendar': '/leave-calendar',
  'Leave calendar': '/leave-calendar',
  'HR Policies': '/hr-policies',
  'HR policies': '/hr-policies',
  'Payroll & Salary': '/payroll',
  Payroll: '/payroll',
  'Performance Reviews': '/performance',
  'Loans, Advances, Salary Revisions': '/salary-revisions',
  Transport: '/transport',
  'Transport Fleet': '/transport',
  Library: '/library',
  'Central Library': '/library',
  'Support Desk': '/support',
  'Announcements & Notices': '/announcements',
  'Notification Center': '/notifications',
  Notifications: '/notifications',
  Reports: '/reports-student',
  'Student Reports': '/reports-student',
  'Reports: Student': '/reports-student',
  'Reports: Financial': '/reports-finance',
  'Financial Reports': '/reports-finance',
  'Reports: Payroll/HR': '/reports-payroll',
  'Payroll Reports': '/reports-payroll',
  'Role & Permission Management': '/roles-permissions',
  Permissions: '/roles-permissions',
  'Audit Trail': '/audit-trail',
  'Audit Trail / System Logs': '/audit-trail',
  'Campus Settings': '/campus-settings',
  Settings: '/campus-settings',
  'College Settings': '/campus-settings',
};

export function canRoleAccessRoute(
  role: InstitutionalRole,
  routeOrPage: string
): { allowed: boolean; accessLevel: AccessLevel } {
  if (role === 'Super Admin') return { allowed: true, accessLevel: 'full' };

  const normPath = PAGE_ALIASES[routeOrPage] ?? (routeOrPage.startsWith('/') ? routeOrPage : `/${routeOrPage.toLowerCase().replace(/\s+/g, '-')}`);
  const pageMap = ROUTE_MATRIX[normPath];
  if (!pageMap) {
    // If not in matrix, default to denied
    return { allowed: false, accessLevel: 'none' };
  }

  const level = pageMap[role] ?? 'none';
  return {
    allowed: level !== 'none',
    accessLevel: level,
  };
}

// -------------------------------------------------------------
// 4. TIER 2: ACTION-LEVEL CAPABILITY MATRIX
// -------------------------------------------------------------
const ACTION_PERMISSIONS: Record<ActionKey, InstitutionalRole[]> = {
  // Cashier: strictly collect & receipt
  'fee.collect': ['Super Admin', 'Accounts Admin', 'Accountant', 'Cashier'],
  'fee.receipt.print': ['Super Admin', 'Accounts Admin', 'Accountant', 'Cashier', 'Student', 'Parent'],
  // Concession / Waiver: Accounts Admin required
  'fee.concession.create': ['Super Admin', 'Accounts Admin', 'Accountant', 'Admissions Officer'],
  'fee.concession.approve': ['Super Admin', 'Accounts Admin', 'Management'],
  'fee.refund.request': ['Super Admin', 'Accounts Admin', 'Accountant', 'Student', 'Parent'],
  'fee.refund.approve': ['Super Admin', 'Accounts Admin', 'Director', 'Principal'],
  'fee.late_fee.edit': ['Super Admin', 'Accounts Admin'],
  'fee.structure.manage': ['Super Admin', 'Accounts Admin', 'Management'],
  // Accounting & Banking
  'bank.reconcile': ['Super Admin', 'Accounts Admin', 'Accountant'],
  'accounting.ledger.view': ['Super Admin', 'Accounts Admin', 'Accountant', 'Management', 'Internal Auditor'],
  'accounting.ledger.post': ['Super Admin', 'Accounts Admin', 'Accountant'],
  'accounting.year_end_close': ['Super Admin', 'Accounts Admin'],
  // Payroll Chain
  'payroll.batch.create': ['Super Admin', 'HR Admin'],
  'payroll.hod.verify': ['Super Admin', 'HOD'],
  'payroll.hr.verify': ['Super Admin', 'HR Admin'],
  'payroll.accounts.approve': ['Super Admin', 'Accounts Admin'],
  'payroll.disburse': ['Super Admin', 'Accounts Admin'],
  'payroll.salary_revision.approve': ['Super Admin', 'Management'],
  // Staff & Leave
  'staff.directory.view': ['Super Admin', 'Director', 'Principal', 'Management', 'HR Admin', 'Accounts Admin', 'HOD'],
  'staff.leave.apply': ['Super Admin', 'HR Admin', 'HOD', 'Faculty', 'Teacher', 'Non-teaching Staff'],
  'staff.leave.approve': ['Super Admin', 'HR Admin', 'HOD', 'Director', 'Principal'],
  // Academics & Exams
  'academics.timetable.manage': ['Super Admin', 'Director', 'Principal', 'HOD'],
  'attendance.student.mark': ['Super Admin', 'HOD', 'Faculty', 'Teacher'],
  'marks.entry': ['Super Admin', 'Faculty', 'Teacher'],
  'marks.moderate': ['Super Admin', 'HOD', 'Examination Controller'],
  'marks.lock': ['Super Admin', 'Examination Controller'],
  'results.publish': ['Super Admin', 'Examination Controller', 'Registrar', 'Director', 'Principal'],
  // Campus Ops
  'library.catalogue.manage': ['Super Admin', 'Librarian'],
  'library.circulation.issue': ['Super Admin', 'Librarian'],
  'transport.fleet.manage': ['Super Admin', 'Transport Manager'],
  'hostel.allocation.manage': ['Super Admin', 'Hostel Warden'],
  'admissions.verify': ['Super Admin', 'Admissions Officer', 'Registrar'],
  // Governance
  'reports.view': ['Super Admin', 'Director', 'Principal', 'Management', 'Accounts Admin', 'HR Admin', 'Internal Auditor', 'Registrar'],
  'audit.view': ['Super Admin', 'Management', 'Internal Auditor'],
  'settings.manage': ['Super Admin'],
  'security.role.assign': ['Super Admin'],
  'security.role.revoke': ['Super Admin'],
  'security.session.invalidate': ['Super Admin'],
};

export function hasActionPermission(
  principal: SecurityPrincipal,
  action: ActionKey
): boolean {
  if (principal.role === 'Super Admin') return true;

  // Check temporary elevated grants first
  if (principal.temporaryGrants && principal.temporaryGrants.length > 0) {
    const now = new Date().toISOString();
    const activeGrant = principal.temporaryGrants.find(
      g => g.permission === action && g.expiresAt > now
    );
    if (activeGrant) return true;
  }

  const allowedRoles = ACTION_PERMISSIONS[action] || [];
  return allowedRoles.includes(principal.role);
}

// -------------------------------------------------------------
// 5. TIER 3: ABAC DATA-LEVEL SCOPE EVALUATION
// -------------------------------------------------------------
export function evaluateScope(
  principal: SecurityPrincipal,
  resource?: TargetResource
): { inScope: boolean; reason?: string } {
  if (principal.role === 'Super Admin') return { inScope: true };
  if (!resource) return { inScope: true };

  // 1. Campus Isolation
  if (resource.campusId && principal.campusId && resource.campusId !== principal.campusId) {
    return {
      inScope: false,
      reason: `Campus Boundary Lock: Resource belongs to campus '${resource.campusId}', caller is bounded to '${principal.campusId}'.`,
    };
  }

  // 2. Department Scoping (for HOD and Faculty)
  if (principal.role === 'HOD') {
    if (resource.departmentId && principal.departmentId && resource.departmentId !== principal.departmentId) {
      return {
        inScope: false,
        reason: `Department Scope Violation: HOD of '${principal.departmentId}' cannot manage resources of department '${resource.departmentId}'.`,
      };
    }
  }

  // 3. Section / Class Cohort Scoping (for Faculty)
  if (['Faculty', 'Teacher'].includes(principal.role)) {
    if (resource.sectionId && principal.assignedSectionIds && !principal.assignedSectionIds.includes(resource.sectionId)) {
      return {
        inScope: false,
        reason: `Class Section Lock: Faculty is not assigned to lecture section '${resource.sectionId}'.`,
      };
    }
  }

  // 4. Student Self-Service Scoping
  if (principal.role === 'Student') {
    if (resource.studentId && principal.studentId && resource.studentId !== principal.studentId) {
      return {
        inScope: false,
        reason: `Student Privacy Isolation: You cannot view records of student '${resource.studentId}'.`,
      };
    }
  }

  // 5. Parent-Child Relationship Scoping
  if (principal.role === 'Parent') {
    if (resource.studentId && principal.verifiedChildStudentIds) {
      if (!principal.verifiedChildStudentIds.includes(resource.studentId)) {
        return {
          inScope: false,
          reason: `Guardian Scope Violation: Student '${resource.studentId}' is not an authorized ward of this guardian.`,
        };
      }
    }
  }

  return { inScope: true };
}

// -------------------------------------------------------------
// 6. MAKER-CHECKER IDENTITY CONFLICT PREVENTION
// -------------------------------------------------------------
export function evaluateMakerChecker(
  principal: SecurityPrincipal,
  resource?: TargetResource,
  action?: ActionKey
): { valid: boolean; reason?: string } {
  if (!resource || !resource.createdById) return { valid: true };

  // Approval actions strictly require distinct creator and approver identities
  const approvalActions: ActionKey[] = [
    'fee.concession.approve',
    'fee.refund.approve',
    'payroll.hod.verify',
    'payroll.hr.verify',
    'payroll.accounts.approve',
    'payroll.salary_revision.approve',
    'marks.moderate',
    'marks.lock',
  ];

  if (action && approvalActions.includes(action)) {
    if (principal.userId === resource.createdById) {
      return {
        valid: false,
        reason: `Maker-Checker Violation: User '${principal.fullName}' (${principal.userId}) created this transaction and cannot approve it. An independent checker is required.`,
      };
    }
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 7. SERVER-SIDE AUTHORIZATION INTERCEPTORS
// -------------------------------------------------------------
export function authorizeServerAction(
  principal: SecurityPrincipal,
  action: ActionKey,
  resource?: TargetResource
): AuthorizationResult {
  // Step 1: Session Token Validation & Revocation Check
  if (!principal || !principal.sessionToken) {
    return { allowed: false, status: 401, code: 'SESSION_EXPIRED', reason: 'Missing or expired session token.' };
  }

  if (principal.revokedBefore && principal.sessionIssuedAt < principal.revokedBefore) {
    return { allowed: false, status: 401, code: 'SESSION_REVOKED', reason: 'Session was revoked by system administrator.' };
  }

  // Step 2: Action Capability Check
  if (!hasActionPermission(principal, action)) {
    return {
      allowed: false,
      status: 403,
      code: 'ACTION_FORBIDDEN',
      reason: `Role '${principal.role}' does not hold capability '${action}'.`,
    };
  }

  // Step 3: ABAC Data Scope Evaluation
  const scopeResult = evaluateScope(principal, resource);
  if (!scopeResult.inScope) {
    return {
      allowed: false,
      status: 403,
      code: 'DEPARTMENT_SCOPE_VIOLATION',
      reason: scopeResult.reason,
    };
  }

  // Step 4: Maker-Checker Conflict Evaluation
  const makerCheckerResult = evaluateMakerChecker(principal, resource, action);
  if (!makerCheckerResult.valid) {
    return {
      allowed: false,
      status: 403,
      code: 'MAKER_CHECKER_VIOLATION',
      reason: makerCheckerResult.reason,
    };
  }

  return { allowed: true, status: 200, code: 'AUTHORIZED' };
}

// -------------------------------------------------------------
// 8. SENSITIVE FIELD-LEVEL PROTECTION & SANITIZATION
// -------------------------------------------------------------
export function maskSalary(salaryFormatted: string, role: InstitutionalRole): string {
  const allowedRoles: InstitutionalRole[] = [
    'Super Admin',
    'Management',
    'Accounts Admin',
    'HR Admin',
    'Director',
    'Principal',
  ];
  if (allowedRoles.includes(role)) return salaryFormatted;
  return '₹••••••';
}

export function maskBankAccount(lastFour: string, role: InstitutionalRole): string {
  const allowedRoles: InstitutionalRole[] = [
    'Super Admin',
    'Accounts Admin',
    'Accountant',
    'Cashier',
    'HR Admin',
  ];
  if (allowedRoles.includes(role)) return `•••• •••• ${lastFour}`;
  return '•••• •••• ••••';
}

export function maskPAN(pan: string, role: InstitutionalRole): string {
  if (!pan || pan.length < 10) return '••••••••••';
  const allowedRoles: InstitutionalRole[] = ['Super Admin', 'Accounts Admin', 'Accountant', 'HR Admin'];
  if (allowedRoles.includes(role)) return pan;
  return `${pan.slice(0, 5)}••••${pan.slice(9)}`;
}

export function maskPhone(phone: string, role: InstitutionalRole): string {
  if (!phone || phone.length < 10) return '••••••••••';
  const allowedRoles: InstitutionalRole[] = ['Super Admin', 'Director', 'Principal', 'HOD', 'Admissions Officer', 'Registrar'];
  if (allowedRoles.includes(role)) return phone;
  return `${phone.slice(0, 6)}••••`;
}

/**
 * Recursively sanitizes sensitive PII fields from a data object or array before
 * returning across an API response, PDF generation, or Tally/CSV export.
 */
export function sanitizePayload<T>(record: T, principal: SecurityPrincipal): T {
  if (!record || typeof record !== 'object') return record;

  if (Array.isArray(record)) {
    return record.map(item => sanitizePayload(item, principal)) as unknown as T;
  }

  const clone: Record<string, unknown> = { ...(record as Record<string, unknown>) };

  // Mask Salary fields if unauthorized
  const canSeeSalary = ['Super Admin', 'Management', 'Accounts Admin', 'HR Admin'].includes(principal.role);
  if (!canSeeSalary) {
    if ('salary' in clone) clone.salary = '₹••••••';
    if ('netSalaryPaise' in clone) clone.netSalaryPaise = 0;
    if ('basicPayPaise' in clone) clone.basicPayPaise = 0;
    if ('hraPaise' in clone) clone.hraPaise = 0;
  }

  // Mask Bank fields
  const canSeeBank = ['Super Admin', 'Accounts Admin', 'Accountant', 'HR Admin'].includes(principal.role);
  if (!canSeeBank) {
    if ('bankAccount' in clone && typeof clone.bankAccount === 'string') {
      clone.bankAccount = maskBankAccount(clone.bankAccount.slice(-4), principal.role);
    }
    if ('ifsc' in clone) clone.ifsc = '••••••••';
  }

  // Mask PAN
  const canSeePAN = ['Super Admin', 'Accounts Admin', 'HR Admin'].includes(principal.role);
  if (!canSeePAN && 'pan' in clone && typeof clone.pan === 'string') {
    clone.pan = maskPAN(clone.pan, principal.role);
  }

  return clone as T;
}

// -------------------------------------------------------------
// 9. EXAMINATION LIFECYCLE CONTROLLER
// -------------------------------------------------------------
export type ExamStage = 'ENTRY' | 'MODERATION' | 'LOCK' | 'PUBLISH';

export function canPerformExamStage(
  principal: SecurityPrincipal,
  stage: ExamStage,
  resource: TargetResource
): { allowed: boolean; reason?: string } {
  switch (stage) {
    case 'ENTRY': {
      if (!hasActionPermission(principal, 'marks.entry')) {
        return { allowed: false, reason: 'Marks entry requires Faculty or Teacher credentials.' };
      }
      const scope = evaluateScope(principal, resource);
      return { allowed: scope.inScope, reason: scope.reason };
    }
    case 'MODERATION': {
      if (!hasActionPermission(principal, 'marks.moderate')) {
        return { allowed: false, reason: 'Marks moderation requires HOD or Examination Controller authority.' };
      }
      const scope = evaluateScope(principal, resource);
      return { allowed: scope.inScope, reason: scope.reason };
    }
    case 'LOCK': {
      if (!hasActionPermission(principal, 'marks.lock')) {
        return { allowed: false, reason: 'Examination results locking is strictly restricted to Examination Controller.' };
      }
      return { allowed: true };
    }
    case 'PUBLISH': {
      if (!hasActionPermission(principal, 'results.publish')) {
        return { allowed: false, reason: 'Result publication requires Registrar or Principal sanction.' };
      }
      return { allowed: true };
    }
    default:
      return { allowed: false, reason: 'Unknown examination stage.' };
  }
}

// -------------------------------------------------------------
// 10. SECURITY AUDIT LOGGING & SESSION LIFECYCLE
// -------------------------------------------------------------
export interface SecurityAuditRecord {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorFullName: string;
  actorRole: InstitutionalRole;
  action:
    | 'ROLE_ASSIGNED'
    | 'ROLE_REVOKED'
    | 'TEMPORARY_GRANT'
    | 'SESSION_INVALIDATED'
    | 'SENSITIVE_FIELD_ACCESSED'
    | 'MAKER_CHECKER_OVERRIDE_ATTEMPT'
    | 'SCOPE_VIOLATION_BLOCKED'
    | 'EXAM_RESULT_LOCKED'
    | 'EXAM_RESULT_PUBLISHED';
  targetUserId?: string;
  resourceId?: string;
  details: Record<string, unknown>;
}

const auditLogStore: SecurityAuditRecord[] = [];

export function logSecurityEvent(entry: Omit<SecurityAuditRecord, 'id' | 'timestamp'>): SecurityAuditRecord {
  const record: SecurityAuditRecord = {
    ...entry,
    id: `SEC-AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };
  auditLogStore.push(record);
  return record;
}

export function getSecurityAuditLogs(principal: SecurityPrincipal): SecurityAuditRecord[] {
  if (!['Super Admin', 'Internal Auditor', 'Management'].includes(principal.role)) {
    return [];
  }
  return [...auditLogStore];
}

export function clearSecurityAuditLogsForTesting(): void {
  auditLogStore.length = 0;
}
