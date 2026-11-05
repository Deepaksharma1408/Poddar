import type { CashEntry, FinancialClose } from './accounting';
export type NotificationDispatch = { id: string; subject: string; recipient: string; channel: string; date: string };
export type RecordProfile = {
  email?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  emergencyContact?: string;
  parentNames?: string;
  enrollment?: string;
  joiningDate?: string;
  qualification?: string;
  specialization?: string;
  assignedSubjects?: string;
  assignedGroups?: string;
  bank?: string;
  holder?: string;
  accountLastFour?: string;
  ifsc?: string;
  status?: string;
  documents?: string[];
  history?: { date: string; note: string }[];
};
import type { SalaryRevision, EmployeeLoan, LeaveRule, Encashment, PerformanceReview, EvaluationCriteria } from './hr';
import type { DemoRole, FeeAdjustment, FeeTemplate } from './erp-management';
import type { PayrollRecord } from './payroll';
import { installment } from './finance';

export const AS_OF = '2026-11-04';
export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export type FeePlan = { kind: 'EMI' | 'Full payment' | 'Quarterly'; fee: number; down: number; months: number; rate: number; interest: 'Reducing balance' | 'Flat interest'; start: string; preferred: string };
export type FeeStudent = { profile?: RecordProfile; adjustments?: FeeAdjustment[]; department?: string; batch?: string; specialization?: string; id: string; name: string; class: string; guardian: string; color: string; plan: FeePlan };
export type FeePayment = { inactiveStatus?: 'Failed' | 'Cancelled'; statusReason?: string; refundFor?: string; id: string; studentId: string; amount: number; date: string; method: string; reference: string; verified: boolean };
export type Staff = { profile?: RecordProfile; designation?: string; employment?: string; id: string; name: string; subject: string; salary: number; allowance: number; priorUsed: number; paidDays: number; unpaidDays: number; color: string };
export type Leave = { document?: string; clarificationReply?: string; chargedDays?: number; coveredDates?: string[]; approvalRemarks?: string; reviewedAt?: string; id: string; staffId: string; kind: 'Paid' | 'Unpaid'; category: string; from: string; days: number; reason: string; status: 'Pending' | 'Approved' | 'Rejected' | 'Clarification' | 'Cancelled' };
export type Policy = { divisorMode?: 'Fixed' | 'Calendar days' | 'Working days'; divisor: number; paidCoverage: number };
export type SalaryPayment = { staffId: string; amount: number; reference: string; method: string; date: string };
export type EmployeeAttendance = { employeeId: string; date: string; status: string };
export type SchoolFinance = {
  expenses?: CashEntry[];
  financialCloses?: FinancialClose[];
  supportTickets?: { id: string; ownerId: string; subject: string; detail: string; status: 'Open' | 'Resolved'; reply?: string }[];
  roleAccess?: Partial<Record<DemoRole, string[]>>;
  bankAccounts?: { id: string; bank: string; holder: string; lastFour: string; ifsc: string }[];
  encashments?: Encashment[];
  finalizedAttendance?: string[];
  attendanceCorrections?: { id: string; employeeId: string; date: string; mark: string; reason: string; status: 'Pending' | 'Approved' | 'Rejected' }[];
  holidays?: { date: string; title: string }[];
  feeTemplates?: FeeTemplate[];
  notificationDispatches?: NotificationDispatch[];
  leaveRules?: LeaveRule[];
  salaryRevisions?: SalaryRevision[];
  employeeLoans?: EmployeeLoan[];
  employeeAttendance?: EmployeeAttendance[];
  payroll?: PayrollRecord[];
  performanceReviews?: PerformanceReview[];
  evaluationCriteria?: EvaluationCriteria[];
  reconciliations?: { reference: string; amount: number; date: string }[];
  students: FeeStudent[];
  payments: FeePayment[];
  staff: Staff[];
  leaves: Leave[];
  policy: Policy;
  salaryPayments: SalaryPayment[];
};
export type FeeCharge = { label: string; date: string; amount: number };
function monthDate(start: string, offset: number) { const [y,m,d] = start.split('-').map(Number); const date = new Date(Date.UTC(y,m-1+offset,1)); const max = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate(); return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,max)).padStart(2,'0')}`; }
export function feeSchedule(plan: FeePlan): FeeCharge[] {
  if (plan.kind === 'Full payment') return [{label:'Annual school fee',date:plan.start,amount:round(plan.fee)}];
  const charges: FeeCharge[] = plan.down > 0 ? [{label:'Down payment',date:plan.start,amount:round(plan.down)}] : [];
  const count = plan.kind === 'Quarterly' ? 4 : plan.months;
  const financed = Math.max(0,plan.fee-plan.down);
  const result = installment(financed,plan.kind === 'EMI' ? plan.rate : 0,count,plan.interest);
  const total = round(result.total); const monthly = round(result.monthly);
  for (let i=0;i<count;i++) charges.push({label:`${plan.kind === 'EMI' ? 'EMI' : 'Quarter'} ${i+1} of ${count}`,date:monthDate(plan.start,i*(plan.kind === 'Quarterly' ? 3 : 1)),amount:i===count-1 ? round(total-monthly*(count-1)) : monthly});
  return charges;
}
export function studentLedger(student: FeeStudent, payments: FeePayment[]) {
  const entries = payments.filter(p=>p.studentId===student.id); const paid = round(entries.filter(p=>p.verified).reduce((a,p)=>a+p.amount,0));
  let credit = paid;
  const schedule = adjustedSchedule(student).map(c=>{const applied=round(Math.min(credit,c.amount));credit=round(Math.max(0,credit-c.amount));const outstanding=round(c.amount-applied);return {...c,paid:applied,outstanding,status:outstanding===0?'Paid':c.date<AS_OF?'Overdue':c.date===AS_OF?'Due today':'Upcoming'};});
  const total=round(schedule.reduce((a,c)=>a+c.amount,0)); const due=round(schedule.filter(c=>c.date<=AS_OF).reduce((a,c)=>a+c.outstanding,0)); const remaining=round(Math.max(0,total-paid));
  return {schedule,total,paid,due,remaining,credit:round(Math.max(0,paid-total)),upcoming:round(remaining-due),interest:round(total-student.plan.fee),pending:round(entries.filter(p=>!p.verified&&!p.inactiveStatus).reduce((a,p)=>a+p.amount,0)),entries,progress:total?Math.min(100,paid/total*100):0,next:schedule.find(c=>c.outstanding>0),status:remaining===0?'Paid in full':due>0?'Payment due':'On track'};
}
export function salaryBreakdown(staff: Staff, leaves: Leave[], policy: Policy) {
  const approved=leaves.filter(l=>l.staffId===staff.id&&l.status==='Approved');
  const requestedPaid=staff.paidDays+approved.filter(l=>l.kind==='Paid').reduce((a,l)=>a+(l.chargedDays??l.days),0);
  const available=Math.max(0,staff.allowance-staff.priorUsed); const paidDays=Math.min(available,requestedPaid); const excess=Math.max(0,requestedPaid-available);
  const unpaidDays=staff.unpaidDays+excess+approved.filter(l=>l.kind==='Unpaid').reduce((a,l)=>a+(l.chargedDays??l.days),0);
  const daily=staff.salary/policy.divisor; const unpaidDeduction=round(Math.min(staff.salary,daily*unpaidDays));
  const paidDeduction=round(Math.min(staff.salary-unpaidDeduction,daily*paidDays*(1-policy.paidCoverage/100)));
  const deduction=round(unpaidDeduction+paidDeduction);
  return {paidDays,unpaidDays,excess,balance:Math.max(0,available-requestedPaid),daily:round(daily),unpaidDeduction,paidDeduction,deduction,net:round(staff.salary-deduction),protected:round(daily*paidDays*policy.paidCoverage/100)};
}
const plan = (fee:number, kind:FeePlan['kind']='EMI',preferred='NEFT'):FeePlan=>({kind,fee,down:kind==='EMI'?10000:0,months:10,rate:kind==='EMI'?12:0,interest:'Reducing balance',start:'2026-07-01',preferred});

export function createFinance(): SchoolFinance {
  const students:FeeStudent[]=[{id:'PIS26001',name:'Aarav Sharma',class:'X · A',guardian:'Rajesh Sharma',color:'blue',plan:plan(60000)}, {id:'PIS26002',name:'Ananya Gupta',class:'IX · B',guardian:'Vikram Gupta',color:'pink',plan:plan(54000,'Quarterly','UPI')}, {id:'PIS26003',name:'Vihaan Singh',class:'VIII · A',guardian:'Amit Singh',color:'gold',plan:plan(50000,'EMI','Bank transfer')}, {id:'PIS26004',name:'Diya Mehta',class:'X · B',guardian:'Sanjay Mehta',color:'purple',plan:plan(65000,'Full payment','NEFT')}, {id:'PIS26005',name:'Arjun Verma',class:'XI · A',guardian:'Deepak Verma',color:'green',plan:plan(72000,'EMI','UPI')}];
  const paidAmounts=[25837.3,27000,18447.6,65000,36184.98];
  const staff: Staff[] = [
    {
      id: 'T001', name: 'Priya Sharma', subject: 'Mathematics', salary: 42000, allowance: 12, priorUsed: 7, paidDays: 2, unpaidDays: 1, color: 'purple',
      designation: 'Senior Faculty', employment: 'Permanent',
      profile: {
        email: 'priya.sharma@poddarinstitute.org', phone: '+91-9829012345', address: 'Plot 45, Mansarovar, Jaipur',
        birthDate: '1988-06-15', joiningDate: '2021-07-01', qualification: 'M.Sc. Mathematics, B.Ed.', specialization: 'Algebra & Calculus',
        assignedSubjects: 'Mathematics Class IX, X', assignedGroups: 'Class X-A, IX-B',
        bank: 'State Bank of India', holder: 'Priya Sharma', accountLastFour: '4102', ifsc: 'SBIN0004123', status: 'Active',
        documents: ['Degree-MSc-Math.pdf', 'BEd-Certification.pdf', 'Appointment-Letter.pdf'],
        history: [{ date: '2021-07-01', note: 'Appointed as Mathematics Faculty' }, { date: '2024-04-01', note: 'Promoted to Senior Faculty' }],
      },
    },
    {
      id: 'T002', name: 'Rahul Joshi', subject: 'Science', salary: 38000, allowance: 12, priorUsed: 9, paidDays: 1, unpaidDays: 0, color: 'blue',
      designation: 'Faculty', employment: 'Permanent',
      profile: {
        email: 'rahul.joshi@poddarinstitute.org', phone: '+91-9829023456', address: 'B-12, Malviya Nagar, Jaipur',
        birthDate: '1990-09-22', joiningDate: '2022-08-16', qualification: 'M.Sc. Physics', specialization: 'Experimental Physics & Lab',
        assignedSubjects: 'Science & Physics', assignedGroups: 'Class IX-A, X-B',
        bank: 'HDFC Bank', holder: 'Rahul Joshi', accountLastFour: '7821', ifsc: 'HDFC0001234', status: 'Active',
        documents: ['MSc-Physics-Degree.pdf', 'Police-Verification.pdf'],
        history: [{ date: '2022-08-16', note: 'Joined as Science Faculty' }],
      },
    },
    {
      id: 'T003', name: 'Neha Agarwal', subject: 'English', salary: 40000, allowance: 12, priorUsed: 8, paidDays: 1, unpaidDays: 2, color: 'pink',
      designation: 'Faculty & Cultural Coordinator', employment: 'Permanent',
      profile: {
        email: 'neha.agarwal@poddarinstitute.org', phone: '+91-9829034567', address: '12-C, Vaishali Nagar, Jaipur',
        birthDate: '1989-11-04', joiningDate: '2020-09-01', qualification: 'M.A. English Literature, B.Ed.', specialization: 'Language & Phonetics',
        assignedSubjects: 'English Core & Elective', assignedGroups: 'Class VIII-A, X-B',
        bank: 'ICICI Bank', holder: 'Neha Agarwal', accountLastFour: '9034', ifsc: 'ICIC0000245', status: 'Active',
        documents: ['MA-English.pdf', 'Experience-Certificate.pdf'],
        history: [{ date: '2020-09-01', note: 'Joined Poddar International School' }],
      },
    },
    {
      id: 'T004', name: 'Amit Kumar', subject: 'Social Science', salary: 36000, allowance: 12, priorUsed: 11, paidDays: 0, unpaidDays: 0, color: 'green',
      designation: 'Assistant Faculty', employment: 'Probation',
      profile: {
        email: 'amit.kumar@poddarinstitute.org', phone: '+91-9829045678', address: 'Sector-5, Pratap Nagar, Jaipur',
        birthDate: '1993-03-12', joiningDate: '2026-01-15', qualification: 'M.A. History, B.Ed.', specialization: 'Indian History & Civics',
        assignedSubjects: 'Social Science', assignedGroups: 'Class VIII-A, IX-B',
        bank: 'Punjab National Bank', holder: 'Amit Kumar', accountLastFour: '5561', ifsc: 'PUNB0123400', status: 'Active',
        documents: ['MA-History.pdf', 'Aadhaar-Verification.pdf'],
        history: [{ date: '2026-01-15', note: 'Joined on probation period' }],
      },
    },
  ];

  const performanceReviews: PerformanceReview[] = [
    {
      id: 'PR-2026-H1-T001',
      employeeId: 'T001',
      period: '2026-H1',
      reviewDate: '2026-10-15',
      reviewer: 'Dr. Anita Saxena (Principal)',
      department: 'Mathematics',
      teachingPerformance: 'Exemplary concept delivery in high school algebra. Student pass rate exceeded 96%.',
      attendancePerformance: 'High punctuality and consistent presence throughout term.',
      responsibilities: 'Head of Olympiad Training Committee and Secondary Exam Superintendent.',
      achievements: 'Mentored 3 state-level mathematics Olympiad finalists.',
      areasForImprovement: 'Incorporate more interactive dynamic graphing tools in classroom smartboards.',
      ratings: { teaching: 5, punctuality: 4.8, studentFeedback: 4.7, administrativeSupport: 5, overall: 4.9 },
      remarks: 'Outstanding faculty member with exceptional dedication to academic rigor.',
      status: 'Finalized',
      history: [{ event: 'Review finalized by Principal', at: '2026-10-15T10:00:00Z', actor: 'Principal' }],
    },
    {
      id: 'PR-2026-H1-T002',
      employeeId: 'T002',
      period: '2026-H1',
      reviewDate: '2026-10-16',
      reviewer: 'Dr. Anita Saxena (Principal)',
      department: 'Science',
      teachingPerformance: 'Hands-on practical demonstrations in physics laboratory well received by students.',
      attendancePerformance: 'Regular attendance with zero unannounced absences.',
      responsibilities: 'Physics laboratory in-charge and Science Exhibition coordinator.',
      achievements: 'Organized the annual inter-school Poddar Science Fest 2026.',
      areasForImprovement: 'Ensure timely correction of weekly laboratory journals.',
      ratings: { teaching: 4.5, punctuality: 4.6, studentFeedback: 4.5, administrativeSupport: 4.3, overall: 4.5 },
      remarks: 'Very dependable educator and passionate laboratory mentor.',
      status: 'Finalized',
      history: [{ event: 'Review finalized by Principal', at: '2026-10-16T11:30:00Z', actor: 'Principal' }],
    },
  ];

  return {
    students,
    payments: students.map((s,i)=>({id:`opening-${i}`,studentId:s.id,amount:paidAmounts[i],date:'2026-10-01',method:s.plan.preferred,reference:`PIS-OPEN-${1001+i}`,verified:true})),
    staff,
    leaves: [
      {id:'L001',staffId:'T001',kind:'Paid',category:'Casual leave',from:'2026-11-05',days:2,reason:'Family commitment',status:'Pending'},
      {id:'L002',staffId:'T002',kind:'Unpaid',category:'Personal leave',from:'2026-11-07',days:1,reason:'Personal appointment',status:'Pending'}
    ],
    policy: {divisor:30,paidCoverage:100},
    salaryPayments: [],
    performanceReviews,
  };
}

export function createCollegeFinance(): SchoolFinance {
  const finance = createFinance();
  const groups = [
    ['BCA', '2', 'Computer Applications', '2026', 'Software Development'],
    ['BBA', '4', 'Management', '2025', 'Finance'],
    ['B.Com', '2', 'Commerce', '2026', 'Accounting'],
    ['B.Sc', '6', 'Science', '2024', 'Mathematics'],
    ['BCA', '4', 'Computer Applications', '2025', 'Data Analytics'],
  ];
  const subjects = ['Computer Applications', 'Management', 'Commerce', 'Science'];
  const staff = finance.staff.map((person, index) => ({
    ...person,
    id: person.id.replace('T', 'C'),
    subject: subjects[index],
    name: ['Ritika Joshi', 'Karan Mehta', 'Ishita Jain', 'Saurabh Gupta'][index],
    designation: ['Associate Professor', 'Assistant Professor', 'Lecturer', 'Assistant Professor'][index],
  }));

  const performanceReviews: PerformanceReview[] = [
    {
      id: 'PR-2026-H1-C001',
      employeeId: 'C001',
      period: '2026-H1',
      reviewDate: '2026-10-20',
      reviewer: 'Dr. Praveen Sharma (College Director)',
      department: 'Computer Applications',
      teachingPerformance: 'Advanced Java and Full Stack web curriculum delivered thoroughly. Superb lab projects.',
      attendancePerformance: 'Punctual with 100% lecture delivery record.',
      responsibilities: 'HOD Computer Applications and Campus Hackathon Convener.',
      achievements: 'Guided 4 final-year MCA/BCA industry placement projects.',
      areasForImprovement: 'Publish peer-reviewed conference papers in UGC Care journals.',
      ratings: { teaching: 4.9, punctuality: 4.8, studentFeedback: 4.9, administrativeSupport: 4.8, overall: 4.85 },
      remarks: 'Key academic pillar of the Department of Computer Applications.',
      status: 'Finalized',
      history: [{ event: 'Review finalized by Director', at: '2026-10-20T14:00:00Z', actor: 'Director' }],
    },
  ];

  return {
    ...finance,
    students: finance.students.map((student, index) => {
      const [programme, semester, department, batch, specialization] = groups[index];
      return {
        ...student,
        id: student.id.replace('PIS', 'PIC'),
        name: ['Meera Jain', 'Rohan Verma', 'Isha Mehta', 'Kunal Joshi', 'Sana Gupta'][index],
        guardian: ['Amit Jain', 'Ravi Verma', 'Nisha Mehta', 'Mohan Joshi', 'Farah Gupta'][index],
        class: programme + ' · Semester ' + semester,
        department, batch, specialization,
        plan: { ...student.plan, fee: student.plan.fee + 10000 },
      };
    }),
    staff,
    leaves: finance.leaves.map(leave => ({ ...leave, staffId: leave.staffId.replace('T', 'C') })),
    payments: finance.payments.map(payment => ({
      ...payment,
      studentId: payment.studentId.replace('PIS', 'PIC'),
      reference: payment.reference.replace('PIS', 'PIC'),
    })),
    performanceReviews,
  };
}

export function adjustedSchedule(student: FeeStudent) {
  const adjustments = student.adjustments ?? [];
  const charges = [...feeSchedule(student.plan), ...adjustments.filter(item => item.amount > 0)]
    .sort((a, b) => a.date.localeCompare(b.date));
  let credit = -adjustments.filter(item => item.amount < 0).reduce((sum, item) => sum + item.amount, 0);
  return charges.map(charge => {
    const discount = Math.min(credit, charge.amount);
    credit = round(credit - discount);
    return { ...charge, amount: round(charge.amount - discount) };
  });
}
