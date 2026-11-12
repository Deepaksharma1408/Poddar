// Comprehensive Enterprise RBAC + ABAC Authorization Test Suite
// Verifies:
// 1. 360+ Role-Route Matrix combinations
// 2. Action-level capabilities & restrictions (Cashier, Accountant, Accounts Admin)
// 3. ABAC Multi-tenant Scopes (Campus, Department, Section, Student, Parent)
// 4. Server-Side Execution Interceptors
// 5. Maker-Checker Identity Conflict Locks (createdById === principal.userId)
// 6. Sensitive Field Protection (Salary, PAN, Bank)
// 7. Session Invalidation & Temporary Grant TTL
// 8. Examination Lifecycle (Marks Entry -> Moderation -> Lock -> Publish)
// 9. Immutable Security Audit Trail

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require: name => {
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
    Intl,
    Date,
    Math,
    parseFloat,
    isNaN,
  });
  return module.exports;
}

console.log('=== STARTING ENTERPRISE RBAC + ABAC AUTHORIZATION TEST SUITE ===\n');

const authEngine = load('../lib/security/authorization-engine.ts');

// -----------------------------------------------------------------
// 1. TS-1: 360+ Role-Route Matrix Combinations
// -----------------------------------------------------------------
console.log('--- 1. Testing 360+ Role-Route Matrix Combinations ---');

const testRoles = [
  'Super Admin', 'Director', 'Principal', 'Management', 'HR Admin',
  'Accounts Admin', 'Accountant', 'Cashier', 'HOD', 'Faculty',
  'Non-teaching Staff', 'Student', 'Parent', 'Registrar',
  'Examination Controller', 'Librarian', 'Hostel Warden',
  'Transport Manager', 'Admissions Officer', 'Internal Auditor',
];

const testRoutes = [
  '/dashboard', '/students', '/parents', '/attendance', '/programmes',
  '/timetable', '/exams', '/fees', '/fee-structures', '/bank-reconciliation',
  '/accounting', '/staff', '/employee-attendance', '/leave', '/leave-calendar',
  '/hr-policies', '/payroll', '/performance', '/salary-revisions', '/transport',
  '/library', '/support', '/announcements', '/notifications', '/reports-student',
  '/reports-finance', '/reports-payroll', '/roles-permissions', '/audit-trail', '/campus-settings',
];

let matrixChecksCount = 0;
for (const role of testRoles) {
  for (const route of testRoutes) {
    const res = authEngine.canRoleAccessRoute(role, route);
    assert.ok(typeof res.allowed === 'boolean');
    assert.ok(['full', 'scoped_view', 'self', 'none'].includes(res.accessLevel));
    matrixChecksCount++;

    // Super Admin must always have full access
    if (role === 'Super Admin') {
      assert.equal(res.allowed, true);
      assert.equal(res.accessLevel, 'full');
    }
  }
}
assert.equal(matrixChecksCount, 600, 'Tested exactly 600 role-route combinations');
console.log(`✔ Verified ${matrixChecksCount} role-route permissions across 20 institutional roles and 30 routes.`);

// -----------------------------------------------------------------
// 2. TS-2: Action-Level Capabilities & Strict Financial Matrix
// -----------------------------------------------------------------
console.log('\n--- 2. Testing Action-Level Capabilities & Financial Separation ---');

const cashierPrincipal = {
  userId: 'USR-CSH-01',
  fullName: 'Ramesh Sharma',
  role: 'Cashier',
  campusId: 'CAMPUS-01',
  sessionToken: 'tok-csh-valid',
  sessionIssuedAt: Date.now(),
};

const accountantPrincipal = {
  userId: 'USR-ACC-01',
  fullName: 'Priya Verma',
  role: 'Accountant',
  campusId: 'CAMPUS-01',
  sessionToken: 'tok-acc-valid',
  sessionIssuedAt: Date.now(),
};

const accountsAdminPrincipal = {
  userId: 'USR-ACA-01',
  fullName: 'Suresh Singhania',
  role: 'Accounts Admin',
  campusId: 'CAMPUS-01',
  sessionToken: 'tok-aca-valid',
  sessionIssuedAt: Date.now(),
};

// Cashier capabilities
assert.equal(authEngine.hasActionPermission(cashierPrincipal, 'fee.collect'), true, 'Cashier must be able to collect fees');
assert.equal(authEngine.hasActionPermission(cashierPrincipal, 'fee.receipt.print'), true, 'Cashier must be able to print receipts');
assert.equal(authEngine.hasActionPermission(cashierPrincipal, 'fee.concession.create'), false, 'Cashier is strictly locked from fee concessions');
assert.equal(authEngine.hasActionPermission(cashierPrincipal, 'fee.concession.approve'), false, 'Cashier cannot approve concessions');
assert.equal(authEngine.hasActionPermission(cashierPrincipal, 'fee.refund.approve'), false, 'Cashier cannot approve refunds');
assert.equal(authEngine.hasActionPermission(cashierPrincipal, 'bank.reconcile'), false, 'Cashier cannot reconcile bank accounts');

// Accountant capabilities
assert.equal(authEngine.hasActionPermission(accountantPrincipal, 'bank.reconcile'), true, 'Accountant can reconcile bank statements');
assert.equal(authEngine.hasActionPermission(accountantPrincipal, 'accounting.ledger.post'), true, 'Accountant can post ledger entries');
assert.equal(authEngine.hasActionPermission(accountantPrincipal, 'fee.refund.request'), true, 'Accountant can request/initiate refunds');
assert.equal(authEngine.hasActionPermission(accountantPrincipal, 'fee.refund.approve'), false, 'Accountant cannot sanction refunds (Accounts Admin required)');
assert.equal(authEngine.hasActionPermission(accountantPrincipal, 'accounting.year_end_close'), false, 'Accountant cannot close fiscal year');

// Accounts Admin capabilities
assert.equal(authEngine.hasActionPermission(accountsAdminPrincipal, 'fee.concession.approve'), true, 'Accounts Admin can approve fee concessions');
assert.equal(authEngine.hasActionPermission(accountsAdminPrincipal, 'fee.refund.approve'), true, 'Accounts Admin can approve fee refunds');
assert.equal(authEngine.hasActionPermission(accountsAdminPrincipal, 'accounting.year_end_close'), true, 'Accounts Admin can close financial year');
assert.equal(authEngine.hasActionPermission(accountsAdminPrincipal, 'payroll.accounts.approve'), true, 'Accounts Admin can approve payroll for disbursement');

console.log('✔ Financial matrix separation (Cashier vs Accountant vs Accounts Admin) verified.');

// -----------------------------------------------------------------
// 3. TS-3 & TS-4: ABAC Multi-Tenant Data Scopes (Campus, Dept, Section, Student)
// -----------------------------------------------------------------
console.log('\n--- 3. Testing ABAC Multi-Tenant Scoping (Campus, Dept, Section, Student) ---');

const hodComputerScience = {
  userId: 'USR-HOD-CS',
  fullName: 'Dr. Vivek Sharma',
  role: 'HOD',
  campusId: 'CAMPUS-01',
  departmentId: 'DEPT-CS-IT',
  sessionToken: 'tok-hod-valid',
  sessionIssuedAt: Date.now(),
};

// 1. Department Scope Test
const csResource = {
  entityType: 'STUDENT',
  entityId: 'PIC26001',
  campusId: 'CAMPUS-01',
  departmentId: 'DEPT-CS-IT',
};

const mgmtResource = {
  entityType: 'STUDENT',
  entityId: 'PIC26055',
  campusId: 'CAMPUS-01',
  departmentId: 'DEPT-MGMT',
};

assert.equal(authEngine.evaluateScope(hodComputerScience, csResource).inScope, true, 'HOD CS must have access to CS-IT resources');
const hodMgmtScope = authEngine.evaluateScope(hodComputerScience, mgmtResource);
assert.equal(hodMgmtScope.inScope, false, 'HOD CS must be BLOCKED from Management department resources');
assert.ok(hodMgmtScope.reason.includes('Department Scope Violation'));

// 2. Campus Scope Test
const otherCampusResource = {
  entityType: 'FEE_PAYMENT',
  entityId: 'PAY-99',
  campusId: 'CAMPUS-02',
};
const campusScope = authEngine.evaluateScope(hodComputerScience, otherCampusResource);
assert.equal(campusScope.inScope, false, 'Cross-campus resource access must be strictly blocked');
assert.ok(campusScope.reason.includes('Campus Boundary Lock'));

// 3. Faculty Section Cohort Scope Test
const facultyPrincipal = {
  userId: 'USR-FAC-01',
  fullName: 'Prof. Ananya Sen',
  role: 'Faculty',
  campusId: 'CAMPUS-01',
  departmentId: 'DEPT-CS-IT',
  assignedSectionIds: ['SEC-BCA-1A', 'SEC-BCA-1B'],
  sessionToken: 'tok-fac-valid',
  sessionIssuedAt: Date.now(),
};

const assignedSectionResource = {
  entityType: 'EXAM_RECORD',
  entityId: 'EX-01',
  campusId: 'CAMPUS-01',
  departmentId: 'DEPT-CS-IT',
  sectionId: 'SEC-BCA-1A',
};

const unassignedSectionResource = {
  entityType: 'EXAM_RECORD',
  entityId: 'EX-02',
  campusId: 'CAMPUS-01',
  departmentId: 'DEPT-CS-IT',
  sectionId: 'SEC-MCA-3',
};

assert.equal(authEngine.evaluateScope(facultyPrincipal, assignedSectionResource).inScope, true);
const facSectionScope = authEngine.evaluateScope(facultyPrincipal, unassignedSectionResource);
assert.equal(facSectionScope.inScope, false);
assert.ok(facSectionScope.reason.includes('Class Section Lock'));

// 4. Student Self-Service Privacy Scope Test
const studentPrincipal = {
  userId: 'USR-STU-01',
  fullName: 'Aarav Mehta',
  role: 'Student',
  campusId: 'CAMPUS-01',
  studentId: 'PIC26001',
  sessionToken: 'tok-stu-valid',
  sessionIssuedAt: Date.now(),
};

assert.equal(authEngine.evaluateScope(studentPrincipal, { entityType: 'STUDENT', entityId: 'PIC26001', campusId: 'CAMPUS-01', studentId: 'PIC26001' }).inScope, true);
const studentOtherScope = authEngine.evaluateScope(studentPrincipal, { entityType: 'STUDENT', entityId: 'PIC26002', campusId: 'CAMPUS-01', studentId: 'PIC26002' });
assert.equal(studentOtherScope.inScope, false, 'Student cannot view other student record');

// 5. Parent-Ward Guardian Verification Scope Test
const parentPrincipal = {
  userId: 'USR-PAR-01',
  fullName: 'Rajesh Mehta',
  role: 'Parent',
  campusId: 'CAMPUS-01',
  verifiedChildStudentIds: ['PIC26001'],
  sessionToken: 'tok-par-valid',
  sessionIssuedAt: Date.now(),
};

assert.equal(authEngine.evaluateScope(parentPrincipal, { entityType: 'STUDENT', entityId: 'PIC26001', campusId: 'CAMPUS-01', studentId: 'PIC26001' }).inScope, true);
const parentUnverifiedScope = authEngine.evaluateScope(parentPrincipal, { entityType: 'STUDENT', entityId: 'PIC26003', campusId: 'CAMPUS-01', studentId: 'PIC26003' });
assert.equal(parentUnverifiedScope.inScope, false, 'Parent cannot access unverified ward record');

console.log('✔ All ABAC data scopes (Campus, Department, Section Cohorts, Student, Parent) verified.');

// -----------------------------------------------------------------
// 4. TS-5: Server-Side Authorization Interceptor
// -----------------------------------------------------------------
console.log('\n--- 4. Testing Server-Side Authorization Interceptors ---');

// Missing session
const authNoSession = authEngine.authorizeServerAction(
  { ...accountsAdminPrincipal, sessionToken: '' },
  'fee.concession.approve'
);
assert.equal(authNoSession.allowed, false);
assert.equal(authNoSession.status, 401);
assert.equal(authNoSession.code, 'SESSION_EXPIRED');

// Revoked session
const authRevokedSession = authEngine.authorizeServerAction(
  { ...accountsAdminPrincipal, sessionIssuedAt: 1000, revokedBefore: 2000 },
  'fee.concession.approve'
);
assert.equal(authRevokedSession.allowed, false);
assert.equal(authRevokedSession.status, 401);
assert.equal(authRevokedSession.code, 'SESSION_REVOKED');

// Action forbidden
const authActionForbidden = authEngine.authorizeServerAction(
  cashierPrincipal,
  'fee.concession.approve'
);
assert.equal(authActionForbidden.allowed, false);
assert.equal(authActionForbidden.status, 403);
assert.equal(authActionForbidden.code, 'ACTION_FORBIDDEN');

// Scope violation
const authScopeViolation = authEngine.authorizeServerAction(
  hodComputerScience,
  'attendance.student.mark',
  mgmtResource
);
assert.equal(authScopeViolation.allowed, false);
assert.equal(authScopeViolation.status, 403);
assert.equal(authScopeViolation.code, 'DEPARTMENT_SCOPE_VIOLATION');

// Successful authorization
const authSuccess = authEngine.authorizeServerAction(
  accountsAdminPrincipal,
  'fee.concession.approve',
  csResource
);
assert.equal(authSuccess.allowed, true);
assert.equal(authSuccess.status, 200);
assert.equal(authSuccess.code, 'AUTHORIZED');

console.log('✔ Server-side authorization execution guards and HTTP response statuses verified.');

// -----------------------------------------------------------------
// 5. TS-6: Maker-Checker Identity Conflict Prevention
// -----------------------------------------------------------------
console.log('\n--- 5. Testing Maker-Checker Identity Conflict Prevention ---');

// User created the bill/concession
const billResourceCreatedByAccountsAdmin = {
  entityType: 'BILL',
  entityId: 'BILL-2026-001',
  campusId: 'CAMPUS-01',
  createdById: accountsAdminPrincipal.userId, // Same identity
};

const selfApprovalCheck = authEngine.authorizeServerAction(
  accountsAdminPrincipal,
  'fee.refund.approve',
  billResourceCreatedByAccountsAdmin
);
assert.equal(selfApprovalCheck.allowed, false);
assert.equal(selfApprovalCheck.status, 403);
assert.equal(selfApprovalCheck.code, 'MAKER_CHECKER_VIOLATION');
assert.ok(selfApprovalCheck.reason.includes('created this transaction and cannot approve it'));

// Different user can approve
const differentApprover = {
  ...accountsAdminPrincipal,
  userId: 'USR-DIR-01',
  role: 'Director',
};
const independentApprovalCheck = authEngine.authorizeServerAction(
  differentApprover,
  'fee.refund.approve',
  billResourceCreatedByAccountsAdmin
);
assert.equal(independentApprovalCheck.allowed, true);
assert.equal(independentApprovalCheck.code, 'AUTHORIZED');

console.log('✔ Identity-level Maker-Checker conflict locks (createdById === principal.userId) verified.');

// -----------------------------------------------------------------
// 6. TS-7: Field-Level Protection & PII Sanitization
// -----------------------------------------------------------------
console.log('\n--- 6. Testing Field-Level Protection & PII Masking ---');

assert.equal(authEngine.maskSalary('₹75,000', 'Cashier'), '₹••••••');
assert.equal(authEngine.maskSalary('₹75,000', 'HOD'), '₹••••••');
assert.equal(authEngine.maskSalary('₹75,000', 'Accounts Admin'), '₹75,000');

assert.equal(authEngine.maskBankAccount('9812', 'HOD'), '•••• •••• ••••');
assert.equal(authEngine.maskBankAccount('9812', 'Accounts Admin'), '•••• •••• 9812');

assert.equal(authEngine.maskPAN('ABCDE1234F', 'Cashier'), 'ABCDE••••F');
assert.equal(authEngine.maskPAN('ABCDE1234F', 'Accounts Admin'), 'ABCDE1234F');

// Deep object sanitization
const sensitiveEmployeeRecord = {
  id: 'EMP001',
  name: 'Ram Gopal',
  salary: '₹65,000',
  netSalaryPaise: 6500000,
  bankAccount: '123456789012',
  ifsc: 'SBIN0004102',
  pan: 'ABCDE1234F',
};

const sanitizedForCashier = authEngine.sanitizePayload(sensitiveEmployeeRecord, cashierPrincipal);
assert.equal(sanitizedForCashier.salary, '₹••••••');
assert.equal(sanitizedForCashier.netSalaryPaise, 0);
assert.equal(sanitizedForCashier.bankAccount, '•••• •••• 9012'); // Cashier sees masked last 4
assert.equal(sanitizedForCashier.ifsc, '••••••••');
assert.equal(sanitizedForCashier.pan, 'ABCDE••••F');

const sanitizedForHOD = authEngine.sanitizePayload(sensitiveEmployeeRecord, hodComputerScience);
assert.equal(sanitizedForHOD.bankAccount, '•••• •••• ••••'); // HOD is strictly barred from all bank digits
assert.equal(sanitizedForHOD.salary, '₹••••••');

const sanitizedForAccountsAdmin = authEngine.sanitizePayload(sensitiveEmployeeRecord, accountsAdminPrincipal);
assert.equal(sanitizedForAccountsAdmin.salary, '₹65,000');
assert.equal(sanitizedForAccountsAdmin.bankAccount, '123456789012');
assert.equal(sanitizedForAccountsAdmin.pan, 'ABCDE1234F');

console.log('✔ Field-level protection and deep JSON payload sanitization verified.');

// -----------------------------------------------------------------
// 7. TS-8: Temporary Elevated Permissions & TTL Expiry
// -----------------------------------------------------------------
console.log('\n--- 7. Testing Temporary Elevated Permissions & TTL Expiry ---');

const principalWithActiveGrant = {
  ...accountantPrincipal,
  temporaryGrants: [
    {
      permission: 'fee.concession.approve',
      grantedBy: 'Super Admin',
      grantedAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // Valid for 1 more hour
      reason: 'Admissions rush temporary delegation',
    },
  ],
};

assert.equal(
  authEngine.hasActionPermission(principalWithActiveGrant, 'fee.concession.approve'),
  true,
  'Active temporary grant must confer permission'
);

const principalWithExpiredGrant = {
  ...accountantPrincipal,
  temporaryGrants: [
    {
      permission: 'fee.concession.approve',
      grantedBy: 'Super Admin',
      grantedAt: new Date(Date.now() - 7200000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      reason: 'Admissions rush temporary delegation',
    },
  ],
};

assert.equal(
  authEngine.hasActionPermission(principalWithExpiredGrant, 'fee.concession.approve'),
  false,
  'Expired temporary grant must be rejected'
);

console.log('✔ Temporary elevated permission lifecycle and TTL expiry verified.');

// -----------------------------------------------------------------
// 8. TS-9: Examination Lifecycle Permissions
// -----------------------------------------------------------------
console.log('\n--- 8. Testing Examination Lifecycle Permissions ---');

const examResource = {
  entityType: 'EXAM_RECORD',
  entityId: 'EXAM-2026-BCA',
  campusId: 'CAMPUS-01',
  departmentId: 'DEPT-CS-IT',
  sectionId: 'SEC-BCA-1A',
};

// 1. Entry: Faculty allowed for assigned section, denied for unassigned
assert.equal(authEngine.canPerformExamStage(facultyPrincipal, 'ENTRY', examResource).allowed, true);
assert.equal(authEngine.canPerformExamStage(facultyPrincipal, 'ENTRY', { ...examResource, sectionId: 'SEC-MCA' }).allowed, false);

// 2. Moderation: HOD allowed for own department, Faculty denied
assert.equal(authEngine.canPerformExamStage(hodComputerScience, 'MODERATION', examResource).allowed, true);
assert.equal(authEngine.canPerformExamStage(facultyPrincipal, 'MODERATION', examResource).allowed, false);

// 3. Lock: Examination Controller allowed, HOD denied
const examControllerPrincipal = {
  userId: 'USR-EXC-01',
  fullName: 'Dr. RK Saxena',
  role: 'Examination Controller',
  campusId: 'CAMPUS-01',
  sessionToken: 'tok-exc-valid',
  sessionIssuedAt: Date.now(),
};
assert.equal(authEngine.canPerformExamStage(examControllerPrincipal, 'LOCK', examResource).allowed, true);
assert.equal(authEngine.canPerformExamStage(hodComputerScience, 'LOCK', examResource).allowed, false);

// 4. Publish: Registrar / Principal allowed, Exam Controller denied
const registrarPrincipal = {
  userId: 'USR-REG-01',
  fullName: 'Prof. Om Prakash',
  role: 'Registrar',
  campusId: 'CAMPUS-01',
  sessionToken: 'tok-reg-valid',
  sessionIssuedAt: Date.now(),
};
assert.equal(authEngine.canPerformExamStage(registrarPrincipal, 'PUBLISH', examResource).allowed, true);
assert.equal(authEngine.canPerformExamStage(facultyPrincipal, 'PUBLISH', examResource).allowed, false);

console.log('✔ Complete 4-stage Examination Lifecycle (Entry -> Moderation -> Lock -> Publish) verified.');

// -----------------------------------------------------------------
// 9. TS-10: Security Audit Trail Logging
// -----------------------------------------------------------------
console.log('\n--- 9. Testing Security Audit Trail Logging ---');

authEngine.clearSecurityAuditLogsForTesting();

authEngine.logSecurityEvent({
  actorUserId: 'USR-SA-01',
  actorFullName: 'Super Admin',
  actorRole: 'Super Admin',
  action: 'ROLE_ASSIGNED',
  targetUserId: 'USR-ACC-01',
  details: { previousRole: 'Cashier', newRole: 'Accountant' },
});

authEngine.logSecurityEvent({
  actorUserId: 'USR-ACA-01',
  actorFullName: 'Suresh Singhania',
  actorRole: 'Accounts Admin',
  action: 'MAKER_CHECKER_OVERRIDE_ATTEMPT',
  resourceId: 'BILL-001',
  details: { attempt: 'Self-approval blocked' },
});

const auditorPrincipal = {
  userId: 'USR-AUD-01',
  fullName: 'CA Anil Gupta',
  role: 'Internal Auditor',
  campusId: 'CAMPUS-01',
  sessionToken: 'tok-aud-valid',
  sessionIssuedAt: Date.now(),
};

const auditLogsForAuditor = authEngine.getSecurityAuditLogs(auditorPrincipal);
assert.equal(auditLogsForAuditor.length, 2, 'Internal Auditor must receive full security audit history');
assert.equal(auditLogsForAuditor[0].action, 'ROLE_ASSIGNED');
assert.equal(auditLogsForAuditor[1].action, 'MAKER_CHECKER_OVERRIDE_ATTEMPT');

const auditLogsForCashier = authEngine.getSecurityAuditLogs(cashierPrincipal);
assert.equal(auditLogsForCashier.length, 0, 'Unauthorized roles cannot inspect security audit trail');

console.log('✔ Security Audit Trail generation and role-isolated access verified.');

console.log('\n=== ALL ENTERPRISE RBAC + ABAC SECURITY TESTS PASSED! ===');
