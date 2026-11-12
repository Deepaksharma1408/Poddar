// College Finance Portal - Realistic Fictional Seed Data
// Poddar Institute · College, Mansarovar, Jaipur (Rajasthan)
// 150+ Students, 25 Staff, 5 Guest Faculty, 12-Month OpEx, Budgets, Events

import type {
  Student,
  Employee,
  GuestFacultyLog,
  Vendor,
  OpExBill,
  PettyCashVoucher,
  DepartmentBudget,
  ScholarshipRecord,
  OtherIncome,
  CollegeEvent,
  FeePayment,
  CashBookEntry,
  SettingsConfig,
  AuditLogEntry,
  PayrollRecord,
} from '../types/finance';
import { toPaise } from '../finance/money';

export const INITIAL_SETTINGS: SettingsConfig = {
  institutionName: 'Poddar Institute · College',
  campusAddress: 'Sector 7, Mansarovar, Jaipur, Rajasthan 302020',
  academicYear: '2026-27',
  theme: 'light',
  currentRole: 'Accounts Admin',
  currentUser: {
    name: 'Suresh Singhania',
    email: 'suresh.accounts@poddarinstitute.org',
  },
  statutory: {
    pfEmployeeRatePct: 12,
    pfEmployerRatePct: 12,
    esiEmployeeRatePct: 0.75,
    esiEmployerRatePct: 3.25,
    esiGrossCeilingPaise: toPaise(21000), // ₹21,000 ceiling
    dailyDivisorMode: 'Fixed 30',
    pettyCashFloatPaise: toPaise(50000), // ₹50,000 float
    pettyCashVoucherLimitPaise: toPaise(5000), // ₹5,000 max single voucher
    cashTransactionWarningLimitPaise: toPaise(10000), // ₹10,000 limit
    tdsThresholds: [
      { section: '194C', label: 'Contractor & Maintenance', ratePct: 2, panMissingRatePct: 20 },
      { section: '194J', label: 'Professional & Tech Fees', ratePct: 10, panMissingRatePct: 20 },
      { section: '194I', label: 'Rent on Land/Building', ratePct: 10, panMissingRatePct: 20 },
    ],
  },
  approvalLimits: {
    billAccountsAdminPaise: toPaise(50000),
    billManagementPaise: toPaise(200000),
    overrunAllowedPct: 10,
  },
  fiscalYearClosed: false,
};

// Seed 10 Vendors
export const SEED_VENDORS: Vendor[] = [
  {
    id: 'VEN001',
    name: 'Apex Infotech Solutions',
    contactPerson: 'Manish Chawla',
    phone: '+91-98291-11223',
    email: 'billing@apexinfotech.in',
    category: 'IT & Hardware',
    gstin: '08AAAAA1234A1Z5',
    pan: 'AAAAA1234A',
    bankName: 'HDFC Bank',
    accountLastFour: '9102',
    ifsc: 'HDFC0000123',
    paymentTermsDays: 30,
    status: 'Active',
  },
  {
    id: 'VEN002',
    name: 'Jaipur Scientific & Lab Supplies',
    contactPerson: 'Rajendra Joshi',
    phone: '+91-98292-22334',
    email: 'sales@jaipurlabs.com',
    category: 'Laboratory Consumables',
    gstin: '08BBBBB2345B1Z4',
    pan: 'BBBBB2345B',
    bankName: 'State Bank of India',
    accountLastFour: '4511',
    ifsc: 'SBIN0004123',
    paymentTermsDays: 15,
    status: 'Active',
  },
  {
    id: 'VEN003',
    name: 'Rajasthan Academic Press',
    contactPerson: 'Sunil Mathur',
    phone: '+91-98293-33445',
    email: 'info@rajasthanpress.org',
    category: 'Stationery & Printing',
    gstin: '08CCCCC3456C1Z3',
    pan: 'CCCCC3456C',
    bankName: 'ICICI Bank',
    accountLastFour: '8834',
    ifsc: 'ICIC0000245',
    paymentTermsDays: 30,
    status: 'Active',
  },
  {
    id: 'VEN004',
    name: 'Suraksha Facility & Security Services',
    contactPerson: 'Col. K.S. Rathore',
    phone: '+91-98294-44556',
    email: 'contact@suraksha-guards.com',
    category: 'Security & Facility',
    gstin: '08DDDDD4567D1Z2',
    pan: 'DDDDD4567D',
    bankName: 'Punjab National Bank',
    accountLastFour: '1209',
    ifsc: 'PUNB0001234',
    paymentTermsDays: 7,
    status: 'Active',
  },
  {
    id: 'VEN005',
    name: 'Jaipur Vidyut Vitran Nigam Ltd (JVVNL)',
    contactPerson: 'Divisional Accounts Officer',
    phone: '+91-141-220011',
    email: 'billing@jvvnl.rajasthan.gov.in',
    category: 'Electricity & Utilities',
    gstin: '08EEEEE5678E1Z1',
    pan: 'EEEEE5678E',
    bankName: 'Bank of Baroda',
    accountLastFour: '6677',
    ifsc: 'BARB0JAIPUR',
    paymentTermsDays: 15,
    status: 'Active',
  },
  {
    id: 'VEN006',
    name: 'Oxford & Pearson Book Distributors',
    contactPerson: 'Vikram Mehta',
    phone: '+91-98295-55667',
    email: 'books@oxfordpearson.in',
    category: 'Library Books',
    gstin: '08FFFFF6789F1Z0',
    pan: 'FFFFF6789F',
    bankName: 'Axis Bank',
    accountLastFour: '3341',
    ifsc: 'UTIB0000312',
    paymentTermsDays: 45,
    status: 'Active',
  },
  {
    id: 'VEN007',
    name: 'Verma & Associates Legal Counsel',
    contactPerson: 'Adv. R.K. Verma',
    phone: '+91-98296-66778',
    email: 'advocate.verma@legal.in',
    category: 'Legal & Professional',
    gstin: '08GGGGG7890G1Z9',
    pan: 'GGGGG7890G',
    bankName: 'State Bank of India',
    accountLastFour: '5012',
    ifsc: 'SBIN0004123',
    paymentTermsDays: 15,
    status: 'Active',
  },
];

// Seed 5 Department Budgets
export const SEED_BUDGETS: DepartmentBudget[] = [
  {
    department: 'Computer Science & IT',
    annualAllocationPaise: toPaise(1200000), // ₹12 Lakh
    spentPaise: toPaise(780000),
    committedPaise: toPaise(150000),
  },
  {
    department: 'Management & Business Studies',
    annualAllocationPaise: toPaise(1000000), // ₹10 Lakh
    spentPaise: toPaise(610000),
    committedPaise: toPaise(85000),
  },
  {
    department: 'Commerce & Accounting',
    annualAllocationPaise: toPaise(800000), // ₹8 Lakh
    spentPaise: toPaise(420000),
    committedPaise: toPaise(50000),
  },
  {
    department: 'Basic Sciences & Research Lab',
    annualAllocationPaise: toPaise(1500000), // ₹15 Lakh
    spentPaise: toPaise(1150000),
    committedPaise: toPaise(210000),
  },
  {
    department: 'Campus Administration & Maintenance',
    annualAllocationPaise: toPaise(2500000), // ₹25 Lakh
    spentPaise: toPaise(1890000),
    committedPaise: toPaise(320000),
  },
];

// Seed 25 Employees across all categories
export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    name: 'Dr. Alok K. Sen',
    designation: 'Principal & Professor of Management',
    department: 'Management & Business Studies',
    category: 'Teaching',
    employmentType: 'Permanent',
    joiningDate: '2018-07-01',
    email: 'alok.sen@poddarinstitute.org',
    phone: '+91-98290-00101',
    panMasked: 'ABCDE••••F',
    aadhaarLastFour: '4190',
    bankName: 'State Bank of India',
    accountLastFour: '4102',
    ifsc: 'SBIN0004123',
    baseSalaryPaise: toPaise(65000),
    hraPaise: toPaise(20000),
    daPaise: toPaise(15000),
    specialAllowancePaise: toPaise(10000),
    conveyancePaise: toPaise(5000),
    pfOpted: true,
    esiOpted: false,
    status: 'Active',
  },
  {
    id: 'EMP002',
    name: 'Dr. Meenakshi Sharma',
    designation: 'Head of Department, Computer Science',
    department: 'Computer Science & IT',
    category: 'Teaching',
    employmentType: 'Permanent',
    joiningDate: '2019-08-16',
    email: 'meenakshi.cs@poddarinstitute.org',
    phone: '+91-98290-00102',
    panMasked: 'BCDEF••••G',
    aadhaarLastFour: '8821',
    bankName: 'HDFC Bank',
    accountLastFour: '7821',
    ifsc: 'HDFC0001234',
    baseSalaryPaise: toPaise(55000),
    hraPaise: toPaise(18000),
    daPaise: toPaise(12000),
    specialAllowancePaise: toPaise(8000),
    conveyancePaise: toPaise(4000),
    pfOpted: true,
    esiOpted: false,
    status: 'Active',
  },
  {
    id: 'EMP003',
    name: 'Dr. Rajesh Bhargava',
    designation: 'Associate Professor, Commerce',
    department: 'Commerce & Accounting',
    category: 'Teaching',
    employmentType: 'Permanent',
    joiningDate: '2020-09-01',
    email: 'rajesh.com@poddarinstitute.org',
    phone: '+91-98290-00103',
    panMasked: 'CDEFG••••H',
    aadhaarLastFour: '3045',
    bankName: 'ICICI Bank',
    accountLastFour: '1190',
    ifsc: 'ICIC0000245',
    baseSalaryPaise: toPaise(48000),
    hraPaise: toPaise(15000),
    daPaise: toPaise(10000),
    specialAllowancePaise: toPaise(5000),
    conveyancePaise: toPaise(3000),
    pfOpted: true,
    esiOpted: false,
    status: 'Active',
  },
  {
    id: 'EMP004',
    name: 'Pooja Agarwal',
    designation: 'Assistant Professor, IT',
    department: 'Computer Science & IT',
    category: 'Teaching',
    employmentType: 'Permanent',
    joiningDate: '2021-07-15',
    email: 'pooja.it@poddarinstitute.org',
    phone: '+91-98290-00104',
    panMasked: 'DEFGH••••I',
    aadhaarLastFour: '9120',
    bankName: 'State Bank of India',
    accountLastFour: '3340',
    ifsc: 'SBIN0004123',
    baseSalaryPaise: toPaise(38000),
    hraPaise: toPaise(12000),
    daPaise: toPaise(8000),
    specialAllowancePaise: toPaise(4000),
    conveyancePaise: toPaise(3000),
    pfOpted: true,
    esiOpted: false,
    status: 'Active',
  },
  {
    id: 'EMP005',
    name: 'Virendra Singh Chundawat',
    designation: 'Assistant Professor, Physics & Basic Sciences',
    department: 'Basic Sciences & Research Lab',
    category: 'Teaching',
    employmentType: 'Permanent',
    joiningDate: '2022-01-10',
    email: 'virendra.sci@poddarinstitute.org',
    phone: '+91-98290-00105',
    panMasked: 'EFGHI••••J',
    aadhaarLastFour: '5561',
    bankName: 'Punjab National Bank',
    accountLastFour: '8912',
    ifsc: 'PUNB0001234',
    baseSalaryPaise: toPaise(36000),
    hraPaise: toPaise(11000),
    daPaise: toPaise(7000),
    specialAllowancePaise: toPaise(3500),
    conveyancePaise: toPaise(2500),
    pfOpted: true,
    esiOpted: false,
    status: 'Active',
  },
  {
    id: 'EMP006',
    name: 'Suresh Singhania',
    designation: 'Chief Accounts Officer',
    department: 'Campus Administration & Maintenance',
    category: 'Non-teaching',
    employmentType: 'Permanent',
    joiningDate: '2017-04-01',
    email: 'suresh.accounts@poddarinstitute.org',
    phone: '+91-98290-00106',
    panMasked: 'FGHIJ••••K',
    aadhaarLastFour: '7732',
    bankName: 'State Bank of India',
    accountLastFour: '5421',
    ifsc: 'SBIN0004123',
    baseSalaryPaise: toPaise(50000),
    hraPaise: toPaise(15000),
    daPaise: toPaise(10000),
    specialAllowancePaise: toPaise(6000),
    conveyancePaise: toPaise(3000),
    pfOpted: true,
    esiOpted: false,
    status: 'Active',
  },
  {
    id: 'EMP007',
    name: 'Anjali Saxena',
    designation: 'Senior Accountant',
    department: 'Campus Administration & Maintenance',
    category: 'Non-teaching',
    employmentType: 'Permanent',
    joiningDate: '2020-11-01',
    email: 'anjali.tax@poddarinstitute.org',
    phone: '+91-98290-00107',
    panMasked: 'GHIJK••••L',
    aadhaarLastFour: '1290',
    bankName: 'HDFC Bank',
    accountLastFour: '6019',
    ifsc: 'HDFC0001234',
    baseSalaryPaise: toPaise(32000),
    hraPaise: toPaise(10000),
    daPaise: toPaise(6000),
    specialAllowancePaise: toPaise(3000),
    conveyancePaise: toPaise(2000),
    pfOpted: true,
    esiOpted: false,
    status: 'Active',
  },
  {
    id: 'EMP008',
    name: 'Mukesh Gehlot',
    designation: 'Head Librarian',
    department: 'Campus Administration & Maintenance',
    category: 'Non-teaching',
    employmentType: 'Permanent',
    joiningDate: '2019-03-01',
    email: 'mukesh.lib@poddarinstitute.org',
    phone: '+91-98290-00108',
    panMasked: 'HIJKL••••M',
    aadhaarLastFour: '6612',
    bankName: 'Bank of Baroda',
    accountLastFour: '3819',
    ifsc: 'BARB0JAIPUR',
    baseSalaryPaise: toPaise(28000),
    hraPaise: toPaise(9000),
    daPaise: toPaise(5500),
    specialAllowancePaise: toPaise(2500),
    conveyancePaise: toPaise(2000),
    pfOpted: true,
    esiOpted: false,
    status: 'Active',
  },
  {
    id: 'EMP009',
    name: 'Kavita Dave',
    designation: 'Computer Lab Administrator',
    department: 'Computer Science & IT',
    category: 'Non-teaching',
    employmentType: 'Contractual',
    joiningDate: '2023-08-01',
    email: 'kavita.lab@poddarinstitute.org',
    phone: '+91-98290-00109',
    panMasked: 'IJKLM••••N',
    aadhaarLastFour: '4031',
    bankName: 'State Bank of India',
    accountLastFour: '1288',
    ifsc: 'SBIN0004123',
    baseSalaryPaise: toPaise(22000),
    hraPaise: toPaise(6000),
    daPaise: toPaise(3500),
    specialAllowancePaise: toPaise(1500),
    conveyancePaise: toPaise(1500),
    pfOpted: true,
    esiOpted: true, // Eligible for ESI
    status: 'Active',
  },
  {
    id: 'EMP010',
    name: 'Rameshwar Lal',
    designation: 'Campus Electrician & Generator Operator',
    department: 'Campus Administration & Maintenance',
    category: 'Support',
    employmentType: 'Permanent',
    joiningDate: '2018-09-01',
    email: 'rameshwar.maint@poddarinstitute.org',
    phone: '+91-98290-00110',
    panMasked: 'JKLMN••••O',
    aadhaarLastFour: '9901',
    bankName: 'Punjab National Bank',
    accountLastFour: '7021',
    ifsc: 'PUNB0001234',
    baseSalaryPaise: toPaise(16000),
    hraPaise: toPaise(4000),
    daPaise: toPaise(2000),
    specialAllowancePaise: toPaise(1000),
    conveyancePaise: toPaise(1000),
    pfOpted: true,
    esiOpted: true, // Eligible for ESI
    status: 'Active',
  },
  // Add 15 more realistic employees
  ...Array.from({ length: 15 }, (_, i) => {
    const idx = i + 11;
    const isTeaching = idx <= 18;
    const isSupport = idx >= 23;
    const cat = isTeaching ? 'Teaching' : isSupport ? 'Support' : 'Non-teaching';
    const dept = isTeaching
      ? (['Computer Science & IT', 'Management & Business Studies', 'Commerce & Accounting', 'Basic Sciences & Research Lab'][i % 4])
      : 'Campus Administration & Maintenance';
    const base = isTeaching ? 32000 + (i * 1000) : isSupport ? 15000 + (i * 300) : 24000 + (i * 800);

    return {
      id: `EMP0${idx}`,
      name: [
        'Dr. Hemant Pareek', 'Nitin Khandelwal', 'Dr. Shweta Choudhary', 'Gopal Krishan Sharma',
        'Dr. Vandana Goyal', 'Tarun Verma', 'Neeta Kulshrestha', 'Deepak Tiwari',
        'Sunita Meena', 'Pawan Kumawat', 'Hari Shankar', 'Mohan Singh',
        'Bablu Ram', 'Bhawani Shankar', 'Ram Gopal'
      ][i],
      designation: isTeaching ? 'Assistant Professor' : isSupport ? 'Multi-Tasking Staff' : 'Executive Assistant',
      department: dept,
      category: cat as Employee['category'],
      employmentType: (i % 3 === 0 ? 'Contractual' : 'Permanent') as Employee['employmentType'],
      joiningDate: `202${(i % 4) + 1}-0${(i % 8) + 1}-15`,
      email: `emp${idx}@poddarinstitute.org`,
      phone: `+91-98290-001${idx}`,
      panMasked: `PAN0${idx}••••A`,
      aadhaarLastFour: `${1000 + idx * 77}`.slice(-4),
      bankName: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Punjab National Bank'][i % 4],
      accountLastFour: `${3000 + idx * 19}`.slice(-4),
      ifsc: 'SBIN0004123',
      baseSalaryPaise: toPaise(base),
      hraPaise: toPaise(Math.round(base * 0.3)),
      daPaise: toPaise(Math.round(base * 0.2)),
      specialAllowancePaise: toPaise(2500),
      conveyancePaise: toPaise(1500),
      pfOpted: true,
      esiOpted: base < 21000,
      status: 'Active' as const,
    };
  }),
];

// Seed 5 Guest Faculty
export const SEED_GUEST_FACULTY: GuestFacultyLog[] = [
  {
    id: 'GF001',
    facultyName: 'Dr. C.P. Srivastava (Ex-IIT Roorkee)',
    department: 'Computer Science & IT',
    courseTitle: 'Advanced Cloud Architecture & Distributed Computing',
    date: '2026-11-02',
    startTime: '10:00',
    endTime: '13:00',
    durationHours: 3,
    hourlyRatePaise: toPaise(2500), // ₹2,500/hr
    totalPaise: toPaise(7500),
    tdsSection: '194J',
    tdsRatePct: 10,
    tdsDeductionPaise: toPaise(750),
    netPayablePaise: toPaise(6750),
    status: 'Approved by Accounts',
    createdBy: 'HOD',
  },
  {
    id: 'GF002',
    facultyName: 'CA Naveen Jindal',
    department: 'Commerce & Accounting',
    courseTitle: 'Corporate Direct Tax Planning & GST Audits',
    date: '2026-11-03',
    startTime: '14:00',
    endTime: '17:00',
    durationHours: 3,
    hourlyRatePaise: toPaise(2000),
    totalPaise: toPaise(6000),
    tdsSection: '194J',
    tdsRatePct: 10,
    tdsDeductionPaise: toPaise(600),
    netPayablePaise: toPaise(5400),
    status: 'Submitted',
    createdBy: 'HOD',
  },
  {
    id: 'GF003',
    facultyName: 'Sunita Narain (Cybersecurity Specialist)',
    department: 'Computer Science & IT',
    courseTitle: 'Ethical Hacking & Network Defense Workshop',
    date: '2026-11-04',
    startTime: '11:00',
    endTime: '15:00',
    durationHours: 4,
    hourlyRatePaise: toPaise(2500),
    totalPaise: toPaise(10000),
    tdsSection: '194J',
    tdsRatePct: 10,
    tdsDeductionPaise: toPaise(1000),
    netPayablePaise: toPaise(9000),
    status: 'Approved by HOD',
    createdBy: 'HOD',
  },
  {
    id: 'GF004',
    facultyName: 'Dr. Amitabh Roy (IIM Lucknow Alum)',
    department: 'Management & Business Studies',
    courseTitle: 'Strategic Financial Management & M&A',
    date: '2026-10-28',
    startTime: '09:30',
    endTime: '12:30',
    durationHours: 3,
    hourlyRatePaise: toPaise(3000),
    totalPaise: toPaise(9000),
    tdsSection: '194J',
    tdsRatePct: 10,
    tdsDeductionPaise: toPaise(900),
    netPayablePaise: toPaise(8100),
    status: 'Paid',
    paymentReference: 'UTR-GF-2610-ROY',
    createdBy: 'HOD',
  },
  {
    id: 'GF005',
    facultyName: 'Prof. L.N. Sharma',
    department: 'Basic Sciences & Research Lab',
    courseTitle: 'Quantum Mechanics Applications in Materials Science',
    date: '2026-11-05',
    startTime: '10:00',
    endTime: '12:00',
    durationHours: 2,
    hourlyRatePaise: toPaise(1800),
    totalPaise: toPaise(3600),
    tdsSection: '194J',
    tdsRatePct: 10,
    tdsDeductionPaise: toPaise(360),
    netPayablePaise: toPaise(3240),
    status: 'Submitted',
    createdBy: 'HOD',
  },
];

// Generate 155 Students across BCA, BBA, B.Com, B.Sc, MBA
const firstNames = [
  'Aarav', 'Aditya', 'Ananya', 'Aryan', 'Ayush', 'Bhavya', 'Chirag', 'Deepak', 'Devanshi', 'Divya',
  'Gaurav', 'Harsh', 'Isha', 'Ishaan', 'Jatin', 'Kanishka', 'Kartik', 'Khushi', 'Lakshya', 'Manan',
  'Megha', 'Mohit', 'Nandini', 'Naveen', 'Nidhi', 'Parth', 'Pranav', 'Priya', 'Rahul', 'Rhea',
  'Rishi', 'Riya', 'Rohan', 'Sakshi', 'Sameer', 'Sarthak', 'Shivam', 'Shreya', 'Sneha', 'Soham',
  'Tanmay', 'Tanya', 'Utkarsh', 'Vaibhav', 'Varun', 'Vidhi', 'Vihaan', 'Yash', 'Yukta', 'Zara'
];
const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Mehta', 'Singh', 'Joshi', 'Agarwal', 'Choudhary', 'Rathore', 'Mathur',
  'Saxena', 'Bhatt', 'Mishra', 'Pandey', 'Tiwari', 'Khandelwal', 'Pareek', 'Jain', 'Goyal', 'Singhal'
];

export function generateSeedStudents(): { students: Student[]; payments: FeePayment[] } {
  const programmes: Student['programme'][] = ['BCA', 'BBA', 'B.Com', 'B.Sc', 'MBA'];
  const baseFees: Record<Student['programme'], number> = {
    BCA: 75000,
    BBA: 80000,
    'B.Com': 55000,
    'B.Sc': 65000,
    MBA: 140000,
  };

  const students: Student[] = [];
  const payments: FeePayment[] = [];

  for (let i = 1; i <= 155; i++) {
    const fn = firstNames[(i - 1) % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const prog = programmes[(i - 1) % programmes.length];
    const sem = ((i % 6) + 1);
    const batchYear = 2026 - Math.floor((sem - 1) / 2);
    const batch = `${batchYear}-${batchYear + (prog === 'MBA' ? 2 : 3)}`;
    const id = `PIC26${String(i).padStart(3, '0')}`;
    const feeRupees = baseFees[prog];

    // Distribute plans: 50% EMI, 30% Semester, 20% Full payment
    let kind: Student['plan']['kind'] = 'EMI';
    if (i % 5 === 0) kind = 'Full payment';
    else if (i % 3 === 0) kind = 'Semester';

    const interestType: Student['plan']['interestType'] = i % 2 === 0 ? 'Reducing balance' : 'Flat interest';
    const downPaise = kind === 'EMI' ? toPaise(15000) : 0;
    const months = kind === 'EMI' ? 10 : kind === 'Semester' ? 2 : 1;
    const ratePct = kind === 'EMI' ? 10 : 0;

    const plan: Student['plan'] = {
      kind,
      feePaise: toPaise(feeRupees),
      downPaymentPaise: downPaise,
      months,
      interestRatePct: ratePct,
      interestType,
      startDate: '2026-07-15',
      preferredMethod: (['NEFT', 'UPI', 'Bank transfer', 'Cheque'] as const)[i % 4],
    };

    // Realistic state breakdown:
    // 35% Paid in full
    // 40% On track (partial paid)
    // 15% Overdue / Defaulter
    // 5% Scholarship pending
    // 5% Cheque bounced
    let studentStatus: Student['status'] = 'Active';
    const totalPaise = plan.feePaise;

    if (i % 7 === 0) {
      studentStatus = 'Defaulter';
    }

    students.push({
      id,
      rollNo: `${prog}/26/${String(i).padStart(3, '0')}`,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@student.poddarinstitute.org`,
      phone: `+91-98${String(10000000 + i * 291).slice(0, 8)}`,
      programme: prog,
      semester: sem,
      batch,
      guardianName: `Rajesh ${ln}`,
      guardianPhone: `+91-97${String(20000000 + i * 413).slice(0, 8)}`,
      category: (['General', 'OBC', 'SC', 'ST', 'EWS'] as const)[i % 5],
      hostelResident: i % 4 === 0,
      busTransport: i % 3 === 0,
      plan,
      adjustments: [],
      status: studentStatus,
    });

    // Create realistic payments
    if (i % 3 === 0) {
      // Full settlement
      payments.push({
        id: `PAY-${id}-FULL`,
        studentId: id,
        amountPaise: totalPaise,
        date: '2026-07-20',
        method: plan.preferredMethod,
        reference: `UTR-PIS26-${id}-01`,
        receiptNo: `RCPT-2026-${String(i).padStart(4, '0')}`,
        verified: true,
        status: 'Verified',
        createdBy: 'Cashier',
      });
    } else if (i % 7 === 0) {
      // Bounced cheque test
      payments.push({
        id: `PAY-${id}-BOUNCE`,
        studentId: id,
        amountPaise: toPaise(25000),
        date: '2026-08-10',
        method: 'Cheque',
        reference: `CHQ-${100200 + i}`,
        receiptNo: `RCPT-BOUNCE-${i}`,
        verified: false,
        status: 'Bounced',
        createdBy: 'Cashier',
        notes: 'Cheque returned unpaid: Insufficient Funds',
      });
    } else {
      // Partial on-track payments
      const paidPart = Math.round(totalPaise * 0.45);
      payments.push({
        id: `PAY-${id}-P1`,
        studentId: id,
        amountPaise: paidPart,
        date: '2026-07-25',
        method: plan.preferredMethod,
        reference: `UTR-PIS26-${id}-01`,
        receiptNo: `RCPT-2026-${String(i).padStart(4, '0')}`,
        verified: true,
        status: 'Verified',
        createdBy: 'Cashier',
      });

      if (i % 2 === 0) {
        payments.push({
          id: `PAY-${id}-P2`,
          studentId: id,
          amountPaise: Math.round(totalPaise * 0.25),
          date: '2026-09-15',
          method: 'UPI',
          reference: `UPI-REF-${id}-02`,
          receiptNo: `RCPT-2026-${String(500 + i).padStart(4, '0')}`,
          verified: true,
          status: 'Verified',
          createdBy: 'Cashier',
        });
      }
    }
  }

  return { students, payments };
}

// Seed 4 Campus Events
export const SEED_EVENTS: CollegeEvent[] = [
  {
    id: 'EVT001',
    title: 'Manthan 2026 — Annual Inter-Collegiate Cultural Fest',
    date: '2026-10-15',
    organizingDepartment: 'Management & Business Studies',
    approvedBudgetPaise: toPaise(450000), // ₹4.5 Lakh
    sponsorIncomePaise: toPaise(320000), // ₹3.2 Lakh sponsorship
    actualSpendPaise: toPaise(410000),
    status: 'Completed',
    reportNotes: 'Net surplus generated with positive brand reception across 25 colleges.',
  },
  {
    id: 'EVT002',
    title: 'TechnoSpark 2026 — State Level Hackathon & Tech Expo',
    date: '2026-11-20',
    organizingDepartment: 'Computer Science & IT',
    approvedBudgetPaise: toPaise(300000),
    sponsorIncomePaise: toPaise(180000),
    actualSpendPaise: toPaise(120000),
    status: 'Ongoing',
    reportNotes: 'Keynote and cloud compute sponsorships confirmed by IT vendors.',
  },
  {
    id: 'EVT003',
    title: 'National Conference on Green Chemistry & Sustainable Energy',
    date: '2026-12-05',
    organizingDepartment: 'Basic Sciences & Research Lab',
    approvedBudgetPaise: toPaise(250000),
    sponsorIncomePaise: toPaise(150000),
    actualSpendPaise: toPaise(30000),
    status: 'Planned',
    reportNotes: 'CSIR & DST grant applications submitted.',
  },
  {
    id: 'EVT004',
    title: 'Poddar Premier League (PPL) Inter-Department Sports Meet',
    date: '2026-09-10',
    organizingDepartment: 'Campus Administration & Maintenance',
    approvedBudgetPaise: toPaise(200000),
    sponsorIncomePaise: toPaise(80000),
    actualSpendPaise: toPaise(195000),
    status: 'Completed',
    reportNotes: 'Cricket, Basketball, and Athletics championships successfully conducted.',
  },
];

// Seed Initial Audit Log Entries
export const SEED_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-11-01T09:30:00.000Z',
    role: 'Super Admin',
    actorName: 'System Administrator',
    action: 'CREATE',
    entity: 'SETTINGS',
    entityId: 'SYSTEM',
    summary: 'Initialized statutory tables and budget ceilings for Academic Year 2026-27.',
  },
  {
    id: 'AUD-002',
    timestamp: '2026-11-02T11:15:00.000Z',
    role: 'Cashier',
    actorName: 'Ramesh Cashier',
    action: 'PAY',
    entity: 'FEE_PAYMENT',
    entityId: 'PAY-PIC26001-P1',
    summary: 'Recorded fee installment receipt of ₹33,750 for student Aarav Sharma (PIC26001).',
  },
  {
    id: 'AUD-003',
    timestamp: '2026-11-03T14:45:00.000Z',
    role: 'Accounts Admin',
    actorName: 'Suresh Singhania',
    action: 'APPROVE',
    entity: 'EXPENSE_BILL',
    entityId: 'BILL-JVVNL-OCT26',
    summary: 'Approved campus electricity bill of ₹84,200 from JVVNL with TDS under Section 194C.',
  },
];

