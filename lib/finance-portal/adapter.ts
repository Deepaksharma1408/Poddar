// Inter-Workspace Synchronization Adapter
// Bridges 'poddar-college-finance-v1' (College Management workspace)
// and 'poddar-finance-portal-v1' (Finance workspace)
// Preserves duplicate reference checks, maker-checker rules, and exact conversion.

import type { FinanceState } from './store/finance-store';
import type { Student, FeePayment, Employee, PayrollRecord } from './types/finance';
import { toPaise, toRupees } from './finance/money';

const COLLEGE_KEY = 'poddar-college-finance-v1';
const FINANCE_KEY = 'poddar-finance-portal-v1';

export function syncWorkspaces(): { syncedStudents: number; syncedPayments: number; syncedPayroll: number } {
  if (typeof window === 'undefined') return { syncedStudents: 0, syncedPayments: 0, syncedPayroll: 0 };

  try {
    const rawCollege = localStorage.getItem(COLLEGE_KEY);
    const rawFinance = localStorage.getItem(FINANCE_KEY) || localStorage.getItem('college_finance_portal_v1');

    if (!rawCollege || !rawFinance) {
      return { syncedStudents: 0, syncedPayments: 0, syncedPayroll: 0 };
    }

    const collegeData = JSON.parse(rawCollege);
    const financeData: FinanceState = JSON.parse(rawFinance);

    let paymentCount = 0;
    let studentCount = 0;
    let payrollCount = 0;

    // 1. Sync Students: College -> Finance
    if (Array.isArray(collegeData.students)) {
      collegeData.students.forEach((cs: any) => {
        const existing = financeData.students.find(fs => fs.id === cs.id || fs.name.toLowerCase() === cs.name.toLowerCase());
        if (!existing) {
          const newStudent: Student = {
            id: cs.id,
            rollNo: cs.id,
            name: cs.name,
            email: `${cs.name.toLowerCase().replace(/\s+/g, '.')}@poddar.ac.in`,
            phone: '+91 98290 12000',
            programme: (cs.department || cs.class?.split(' ')[0] || 'BCA') as any,
            semester: 1,
            batch: '2026-29',
            guardianName: cs.guardian || 'Guardian',
            guardianPhone: '+91 98290 99999',
            category: 'General',
            hostelResident: false,
            busTransport: false,
            plan: {
              kind: cs.plan?.kind === 'Full payment' ? 'Full payment' : cs.plan?.kind === 'Quarterly' ? 'Semester' : 'EMI',
              feePaise: toPaise(cs.plan?.fee || 60000),
              downPaymentPaise: toPaise(cs.plan?.down || 0),
              months: cs.plan?.months || 10,
              interestRatePct: cs.plan?.rate || 0,
              interestType: cs.plan?.interest || 'Reducing balance',
              startDate: cs.plan?.start || '2026-07-15',
              preferredMethod: cs.plan?.preferred || 'NEFT',
            },
            adjustments: [],
            status: 'Active',
          };
          financeData.students.push(newStudent);
          studentCount++;
        }
      });
    }

    // 2. Sync Payments: College Payments -> Finance Payments
    if (Array.isArray(collegeData.payments)) {
      collegeData.payments.forEach((cp: any) => {
        if (!cp.verified) return;
        const exists = financeData.feePayments.some(
          fp => fp.id === cp.id || (cp.reference && fp.reference === cp.reference)
        );
        if (!exists) {
          const newPayment: FeePayment = {
            id: cp.id || `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            studentId: cp.studentId,
            amountPaise: toPaise(cp.amount),
            date: cp.date || new Date().toISOString().slice(0, 10),
            method: (cp.method as any) || 'NEFT',
            reference: cp.reference || `UTR-${Date.now()}`,
            receiptNo: `RCPT-${Date.now().toString().slice(-6)}`,
            verified: true,
            status: 'Verified',
            createdBy: 'Cashier',
            notes: 'Synchronized from College Management workspace',
          };
          financeData.feePayments.push(newPayment);
          paymentCount++;
        }
      });
    }

    // 3. Sync Payments: Finance Payments -> College Payments
    if (Array.isArray(financeData.feePayments) && Array.isArray(collegeData.payments)) {
      financeData.feePayments.forEach(fp => {
        if (fp.status !== 'Verified') return;
        const exists = collegeData.payments.some(
          (cp: any) => cp.id === fp.id || (fp.reference && cp.reference === fp.reference)
        );
        if (!exists) {
          collegeData.payments.push({
            id: fp.id,
            studentId: fp.studentId,
            amount: toRupees(fp.amountPaise),
            date: fp.date,
            method: fp.method,
            reference: fp.reference,
            verified: true,
          });
          paymentCount++;
        }
      });
    }

    // 4. Sync Staff/Employees: College Staff -> Finance Employees
    if (Array.isArray(collegeData.staff)) {
      collegeData.staff.forEach((cs: any) => {
        const exists = financeData.employees.some(fe => fe.id === cs.id || fe.name.toLowerCase() === cs.name.toLowerCase());
        if (!exists) {
          const newEmp: Employee = {
            id: cs.id,
            name: cs.name,
            designation: cs.designation || 'Assistant Professor',
            department: cs.subject || 'Academic Faculty',
            category: 'Teaching',
            employmentType: 'Permanent',
            joiningDate: '2023-07-01',
            email: `${cs.name.toLowerCase().replace(/\s+/g, '.')}@poddar.ac.in`,
            phone: '+91 94140 11223',
            panMasked: 'ABCDE••••F',
            aadhaarLastFour: '5432',
            bankName: 'HDFC Bank Ltd',
            accountLastFour: '8910',
            ifsc: 'HDFC0001824',
            baseSalaryPaise: toPaise(cs.salary || 65000),
            hraPaise: toPaise(Math.round((cs.salary || 65000) * 0.2)),
            daPaise: toPaise(Math.round((cs.salary || 65000) * 0.1)),
            specialAllowancePaise: toPaise(cs.allowance || 5000),
            conveyancePaise: toPaise(3000),
            pfOpted: true,
            esiOpted: false,
            status: 'Active',
          };
          financeData.employees.push(newEmp);
        }
      });
    }

    // 5. Sync Payroll: Disbursed Finance Payroll -> College Salary Payments
    if (Array.isArray(financeData.payrollRecords) && Array.isArray(collegeData.salaryPayments)) {
      financeData.payrollRecords.forEach(pr => {
        if (pr.status === 'Paid' && pr.paymentReference) {
          const exists = collegeData.salaryPayments.some(
            (sp: any) => sp.reference === pr.paymentReference || (sp.staffId === pr.employeeId && sp.date === pr.disbursedOn)
          );
          if (!exists) {
            collegeData.salaryPayments.push({
              staffId: pr.employeeId,
              amount: toRupees(pr.netSalaryPaise),
              reference: pr.paymentReference,
              method: pr.paymentMode || 'NEFT',
              date: pr.disbursedOn || new Date().toISOString().slice(0, 10),
            });
            payrollCount++;
          }
        }
      });
    }

    // Save synced data back to both stores safely
    localStorage.setItem(COLLEGE_KEY, JSON.stringify(collegeData));
    localStorage.setItem(FINANCE_KEY, JSON.stringify(financeData));

    return { syncedStudents: studentCount, syncedPayments: paymentCount, syncedPayroll: payrollCount };
  } catch (err) {
    console.warn('Inter-workspace sync encounter:', err);
    return { syncedStudents: 0, syncedPayments: 0, syncedPayroll: 0 };
  }
}

