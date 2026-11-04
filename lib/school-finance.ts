import { installment } from './finance';

export const AS_OF = '2026-11-04';
export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export type FeePlan = { kind: 'EMI' | 'Full payment' | 'Quarterly'; fee: number; down: number; months: number; rate: number; interest: 'Reducing balance' | 'Flat interest'; start: string; preferred: string };
export type FeeStudent = { id: string; name: string; class: string; guardian: string; color: string; plan: FeePlan };
export type FeePayment = { id: string; studentId: string; amount: number; date: string; method: string; reference: string; verified: boolean };
export type Staff = { id: string; name: string; subject: string; salary: number; allowance: number; priorUsed: number; paidDays: number; unpaidDays: number; color: string };
export type Leave = { id: string; staffId: string; kind: 'Paid' | 'Unpaid'; category: string; from: string; days: number; reason: string; status: 'Pending' | 'Approved' | 'Rejected' };
export type Policy = { divisor: number; paidCoverage: number };
export type SalaryPayment = { staffId: string; amount: number; reference: string; method: string; date: string };
export type SchoolFinance = { students: FeeStudent[]; payments: FeePayment[]; staff: Staff[]; leaves: Leave[]; policy: Policy; salaryPayments: SalaryPayment[] };
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
  const schedule = feeSchedule(student.plan).map(c=>{const applied=round(Math.min(credit,c.amount));credit=round(Math.max(0,credit-c.amount));const outstanding=round(c.amount-applied);return {...c,paid:applied,outstanding,status:outstanding===0?'Paid':c.date<AS_OF?'Overdue':c.date===AS_OF?'Due today':'Upcoming'};});
  const total=round(schedule.reduce((a,c)=>a+c.amount,0)); const due=round(schedule.filter(c=>c.date<=AS_OF).reduce((a,c)=>a+c.outstanding,0)); const remaining=round(Math.max(0,total-paid));
  return {schedule,total,paid,due,remaining,upcoming:round(remaining-due),interest:round(total-student.plan.fee),pending:round(entries.filter(p=>!p.verified).reduce((a,p)=>a+p.amount,0)),entries,progress:total?Math.min(100,paid/total*100):0,next:schedule.find(c=>c.outstanding>0),status:remaining===0?'Paid in full':due>0?'Payment due':'On track'};
}
export function salaryBreakdown(staff: Staff, leaves: Leave[], policy: Policy) {
  const approved=leaves.filter(l=>l.staffId===staff.id&&l.status==='Approved');
  const requestedPaid=staff.paidDays+approved.filter(l=>l.kind==='Paid').reduce((a,l)=>a+l.days,0);
  const available=Math.max(0,staff.allowance-staff.priorUsed); const paidDays=Math.min(available,requestedPaid); const excess=Math.max(0,requestedPaid-available);
  const unpaidDays=staff.unpaidDays+excess+approved.filter(l=>l.kind==='Unpaid').reduce((a,l)=>a+l.days,0);
  const daily=staff.salary/policy.divisor; const unpaidDeduction=round(Math.min(staff.salary,daily*unpaidDays));
  const paidDeduction=round(Math.min(staff.salary-unpaidDeduction,daily*paidDays*(1-policy.paidCoverage/100)));
  const deduction=round(unpaidDeduction+paidDeduction);
  return {paidDays,unpaidDays,excess,balance:Math.max(0,available-requestedPaid),daily:round(daily),unpaidDeduction,paidDeduction,deduction,net:round(staff.salary-deduction),protected:round(daily*paidDays*policy.paidCoverage/100)};
}
const plan = (fee:number, kind:FeePlan['kind']='EMI',preferred='NEFT'):FeePlan=>({kind,fee,down:kind==='EMI'?10000:0,months:10,rate:kind==='EMI'?12:0,interest:'Reducing balance',start:'2026-07-01',preferred});
export function createFinance(): SchoolFinance {
  const students:FeeStudent[]=[{id:'PIS26001',name:'Aarav Sharma',class:'X · A',guardian:'Rajesh Sharma',color:'blue',plan:plan(60000)}, {id:'PIS26002',name:'Ananya Gupta',class:'IX · B',guardian:'Vikram Gupta',color:'pink',plan:plan(54000,'Quarterly','UPI')}, {id:'PIS26003',name:'Vihaan Singh',class:'VIII · A',guardian:'Amit Singh',color:'gold',plan:plan(50000,'EMI','Bank transfer')}, {id:'PIS26004',name:'Diya Mehta',class:'X · B',guardian:'Sanjay Mehta',color:'purple',plan:plan(65000,'Full payment','NEFT')}, {id:'PIS26005',name:'Arjun Verma',class:'XI · A',guardian:'Deepak Verma',color:'green',plan:plan(72000,'EMI','UPI')}];
  const paidAmounts=[25837.3,27000,18447.6,65000,36184.98];
  return {students,payments:students.map((s,i)=>({id:`opening-${i}`,studentId:s.id,amount:paidAmounts[i],date:'2026-10-01',method:s.plan.preferred,reference:`PIS-OPEN-${1001+i}`,verified:true})),staff:[{id:'T001',name:'Priya Sharma',subject:'Mathematics',salary:42000,allowance:12,priorUsed:7,paidDays:2,unpaidDays:1,color:'purple'},{id:'T002',name:'Rahul Joshi',subject:'Science',salary:38000,allowance:12,priorUsed:9,paidDays:1,unpaidDays:0,color:'blue'},{id:'T003',name:'Neha Agarwal',subject:'English',salary:40000,allowance:12,priorUsed:8,paidDays:1,unpaidDays:2,color:'pink'},{id:'T004',name:'Amit Kumar',subject:'Social Science',salary:36000,allowance:12,priorUsed:11,paidDays:0,unpaidDays:0,color:'green'}],leaves:[{id:'L001',staffId:'T001',kind:'Paid',category:'Casual leave',from:'2026-11-05',days:2,reason:'Family commitment',status:'Pending'},{id:'L002',staffId:'T002',kind:'Unpaid',category:'Personal leave',from:'2026-11-07',days:1,reason:'Personal appointment',status:'Pending'}],policy:{divisor:30,paidCoverage:100},salaryPayments:[]};
}
