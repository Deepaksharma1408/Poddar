'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutDashboard, GraduationCap, Users, CalendarCheck, Wallet, Banknote, CalendarDays, BookOpen, Bus, LibraryBig, Settings, Search, Bell, ChevronDown, ArrowUpRight, ArrowRight, Download, Check, X, Menu, Building2, CircleHelp, FileText, CheckCircle2, Landmark } from 'lucide-react';
import { InstitutionContext, institutions, type Institution } from './institution';
import { Dialog } from './finance-ui';
import { canOpenPage, roles, type DemoRole } from '@/lib/erp-management';
import Permissions from './permissions';
import ReportCenter from './report-center';
import RecordProfiles from './record-profiles';
import FeeAdministration from './fee-administration';
import Compensation from './compensation';
import PeopleCalendar from './people-calendar';
import HrPolicies from './hr-policies';
import NotificationCenter from './notification-center';
import SupportDesk from './support-desk';
import SelfService from './self-service';
import ErpRegisters from './erp-registers';
import ErpOperations from './erp-operations';
import FeesWorkspace from './fees-workspace';
import PayrollRegister from './payroll-register';
import StaffWorkspace from './staff-workspace';
import PremiumOverview from './premium-overview';
import StudentDirectory from './student-directory';
import { AS_OF, createCollegeFinance, createFinance, studentLedger, salaryBreakdown, type SchoolFinance } from '@/lib/school-finance';

const navigation = [{ title: 'WORKSPACE', items: [{ name: 'Overview', icon: LayoutDashboard }, { name: 'Students', icon: GraduationCap }, { name: 'Student profiles', icon: GraduationCap }, { name: 'Teachers', icon: Users }, { name: 'Employees', icon: Users }, { name: 'Employee profiles', icon: Users }, { name: 'Attendance', icon: CalendarCheck }, { name: 'Employee attendance', icon: CalendarCheck }, { name: 'HR policies', icon: Settings }, { name: 'Leave calendar', icon: CalendarDays }] }, { title: 'FINANCE', items: [{ name: 'Fees & payments', icon: Wallet }, { name: 'Payroll', icon: Banknote }, { name: 'Compensation', icon: Banknote }, { name: 'Fee administration', icon: Wallet }, { name: 'Bank reconciliation', icon: Landmark }, { name: 'Accounting', icon: Wallet }, { name: 'Leave requests', icon: CalendarDays }] }, { title: 'SCHOOL OPERATIONS', items: [{ name: 'Academics', icon: BookOpen }, { name: 'Transport', icon: Bus }, { name: 'Library', icon: LibraryBig }, { name: 'Reports', icon: FileText }, { name: 'Notifications', icon: Bell }, { name: 'Support desk', icon: CircleHelp }, { name: 'Permissions', icon: Settings }] }];
type Modal = 'notifications' | null;
function Avatar({ name, color = 'blue' }: { name: string; color?: string }) { return <span className={`avatar ${color}`}>{name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>; }
function Badge({ children }: { children: string }) { return <span className={`badge ${['Paid', 'Approved', 'Present', 'Reconciled', 'Available'].includes(children) ? 'success' : ['Overdue', 'Absent', 'Rejected'].includes(children) ? 'danger' : 'warning'}`}><i />{children}</span>; }
function CardHead({ title, sub, action, onClick }: { title: string; sub?: string; action?: string; onClick?: () => void }) { return <div className="card-head"><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>{action && <button className="text-button" onClick={onClick}>{action}<ArrowRight size={14}/></button>}</div>; }
function exportCSV(filename: string, rows: (string | number)[][]) { const blob = new Blob([rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }

export default function SchoolPortal() {
  const [institution, setInstitution] = useState<Institution>('school');

  useEffect(() => {
    if (localStorage.getItem('poddar-institution') === 'college') setInstitution('college');
  }, []);

  function switchInstitution(next: Institution) {
    localStorage.setItem('poddar-institution', next);
    setInstitution(next);
  }

  return <InstitutionContext.Provider value={institution}>
    <InstitutionPortal key={institution} institution={institution} switchInstitution={switchInstitution}/>
  </InstitutionContext.Provider>;
}

function InstitutionPortal({institution, switchInstitution}: {institution: Institution; switchInstitution: (next: Institution) => void}) {
  const campus = institutions[institution];
  const financeKey = institution === 'school' ? 'poddar-finance-v2' : 'poddar-college-finance-v1';
  const attendanceKey = institution === 'school' ? 'poddar-attendance-v2' : 'poddar-college-attendance-v1';
  const [role, setRole] = useState<DemoRole>('Super Admin');
  const [demoUser, setDemoUser] = useState<{ role: 'Employee' | 'Student'; id: string }>();
  const [campusMenu, setCampusMenu] = useState(false);

  const sidebarRef = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(false);
  const [finance, setFinance] = useState<SchoolFinance>(institution === 'school' ? createFinance : createCollegeFinance);
  const roleAllows = (demoRole: DemoRole, name: string) => demoRole === 'Super Admin'
    || (name !== 'Permissions' && (finance.roleAccess?.[demoRole]?.includes(name) ?? canOpenPage(demoRole, name)));
  const allowed = (name: string) => roleAllows(role, name);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [financeReady, setFinanceReady] = useState(false);
  useEffect(() => { try { const raw = localStorage.getItem(financeKey); if (raw) { const d = JSON.parse(raw); if (Array.isArray(d.students) && d.students.length && Array.isArray(d.staff) && d.staff.length && Array.isArray(d.payments) && Array.isArray(d.leaves) && d.policy && Array.isArray(d.salaryPayments)) setFinance(d); } } catch {} setFinanceReady(true); }, [financeKey]);
  useEffect(() => { if (financeReady) localStorage.setItem(financeKey, JSON.stringify(finance)); }, [finance, financeReady, financeKey]);
  const [page, setPage] = useState('Overview'); const [search, setSearch] = useState(''); const [sidebar, setSidebar] = useState(false); const [modal, setModal] = useState<Modal>(null); const [toast, setToast] = useState('');
  const students = finance.students.map(s => ({...s, fee: s.plan.fee, status: studentLedger(s, finance.payments).status}));
  const [studentDate, setStudentDate] = useState(AS_OF);
  const attendanceIndex = (id: string) => studentDate === AS_OF ? id : studentDate + '/' + id;
  const [attendance, setAttendance] = useState<Record<string, string>>({}); const [attendanceSaved, setAttendanceSaved] = useState(false); const [attendanceReady, setAttendanceReady] = useState(false);
  useEffect(() => { try { const raw=localStorage.getItem(attendanceKey); if(raw) setAttendance(JSON.parse(raw)); } catch {} setAttendanceReady(true); }, [attendanceKey]);
  useEffect(() => { if(attendanceReady) localStorage.setItem(attendanceKey,JSON.stringify(attendance)); }, [attendance,attendanceReady,attendanceKey]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  useEffect(() => { const media=window.matchMedia('(max-width: 900px)'); const update=()=>{setMobile(media.matches);if(!media.matches)setSidebar(false);};update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update); }, []);
  useLayoutEffect(() => { if(!sidebar || !mobile)return; const previous=document.activeElement as HTMLElement|null;const old=document.body.style.overflow;document.body.style.overflow='hidden';if(sidebarRef.current)sidebarRef.current.scrollTop=0;sidebarRef.current?.querySelector<HTMLElement>('.drawer-close')?.focus({preventScroll:true}); const handler=(e:KeyboardEvent)=>{if(e.key==='Escape'){setSidebar(false);return;}if(e.key!=='Tab')return;const controls=sidebarRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],select:not([disabled])');if(!controls?.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};document.addEventListener('keydown',handler);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',handler);previous?.focus({preventScroll:true});}; }, [sidebar,mobile]);
  useEffect(()=>{window.scrollTo(0,0);},[page]);
  const go = (name: string) => { if (!allowed(name)) return; setPage(name); setSearch(''); setSidebar(false); };
  const downloadReport = () => { exportCSV('poddar-student-fee-ledger.csv', [['Student', 'Admission ID', 'Class', 'Plan', 'Preferred method', 'Total payable', 'Paid', 'Due now', 'Remaining'], ...finance.students.map(s => {const l=studentLedger(s,finance.payments);return [s.name,s.id,s.class,s.plan.kind,s.plan.preferred,l.total,l.paid,l.due,l.remaining];})]); setToast('Student fee ledger downloaded'); };
  const downloadPayroll = () => { exportCSV('poddar-payroll.csv', [['Teacher','Gross','Paid leave','Unpaid leave','Leave balance','Deduction','Net salary','Distributed'], ...finance.staff.map(s=>{const p=salaryBreakdown(s,finance.leaves,finance.policy);return [s.name,s.salary,p.paidDays,p.unpaidDays,p.balance,p.deduction,p.net,finance.salaryPayments.find(t=>t.staffId===s.id)?.amount??0];})]);setToast('Payroll downloaded'); };

  if (demoUser) return <div className="main-shell" style={{marginLeft: 0}}>
    <main>
      <div className="page-heading"><div><h1>{demoUser.role} portal</h1><p>{campus.name} · Simulated identity</p></div>
        <button className="button secondary" onClick={() => { setDemoUser(undefined); setRole('Super Admin'); setPage('Overview'); }}>Return to administrator demo</button>
      </div>
      <SelfService key={demoUser.id} data={finance} setData={setFinance} role={demoUser.role} id={demoUser.id} studentAttendance={attendance}/>
      <SupportDesk data={finance} setData={setFinance} ownerId={demoUser.id}/>
    </main>
  </div>;

  return <div className="app-shell">
    {sidebar && <div className="sidebar-backdrop" onClick={() => setSidebar(false)}/>}
    <aside ref={sidebarRef} onTransitionEnd={e=>{if(e.target===e.currentTarget && e.propertyName==='transform' && sidebar && mobile)sidebarRef.current?.querySelector<HTMLElement>('.drawer-close')?.focus({preventScroll:true});}} id="school-navigation" aria-label="School navigation" inert={mobile && !sidebar} className={`sidebar ${sidebar ? 'open' : ''}`}><button className="drawer-close icon-button" aria-label="Close navigation" onClick={()=>setSidebar(false)}><X size={21}/></button><div className="brand"><img src="/poddar-logo.png" alt="Poddar Group of Institutions"/><span className="connect-label">CONNECT · CAMPUS EDITION</span></div><button className="campus-switch" aria-expanded={campusMenu} onClick={() => setCampusMenu(open => !open)}><span className="campus-icon"><Building2 size={18}/></span><span><strong>{campus.shortName}</strong><small>Mansarovar, Jaipur</small></span><ChevronDown size={14}/></button>{campusMenu && <div aria-label="Institution workspaces">{(Object.keys(institutions) as Institution[]).map(option => <button key={option} className={`nav-item ${option === institution ? 'active' : ''}`} aria-pressed={option === institution} onClick={() => { switchInstitution(option); setCampusMenu(false); }}>{institutions[option].shortName}</button>)}</div>}<nav>{navigation.map(group => <div className="nav-group" key={group.title}><span className="nav-label">{group.title === 'SCHOOL OPERATIONS' ? 'CAMPUS OPERATIONS' : group.title}</span>{group.items.filter(item => allowed(item.name)).map(item => <button key={item.name} className={`nav-item ${page === item.name ? 'active' : ''}`} aria-current={page===item.name?'page':undefined} onClick={() => go(item.name)}><item.icon size={18}/><span>{item.name}</span>{item.name === 'Leave requests' && <b>{finance.leaves.filter(l => l.status === 'Pending').length}</b>}</button>)}</div>)}</nav><div className="sidebar-bottom"><label className="nav-label" htmlFor="demo-role">Demo role</label><select id="demo-role" value={role} onChange={event => {
      const next = event.target.value as DemoRole;
      const selfService = next === 'Student' || next === 'Teacher' || next === 'Non-teaching Staff';
      if (selfService) {
        const id = next === 'Student' ? finance.students[0]?.id
          : finance.staff.find(employee => next === 'Teacher' ? !employee.designation || employee.designation === 'Faculty' : employee.designation && employee.designation !== 'Faculty')?.id;
        if (!id) { setToast('Create a matching demo profile first.'); return; }
        setDemoUser({ role: next === 'Student' ? 'Student' : 'Employee', id });
      }
      setRole(next);
      setModal(null);
      setSearch('');
      setSidebar(false);
      setPage(next === 'Super Admin' ? 'Overview' : navigation.flatMap(group => group.items).find(item => roleAllows(next, item.name))?.name ?? 'Overview');
    }}>{roles.map(option => <option key={option}>{option}</option>)}</select><label className="nav-label" htmlFor="demo-portal">Preview self-service</label><select id="demo-portal" value="" onChange={event => {
      const [role, id] = event.target.value.split('/');
      if (id && (role === 'Employee' || role === 'Student')) {
        setSidebar(false);
        setDemoUser({ role, id });
      }
    }}><option value="">Choose demo identity</option><optgroup label="Employees">{finance.staff.map(employee=><option key={employee.id} value={'Employee/'+employee.id}>{employee.name}</option>)}</optgroup><optgroup label="Students">{finance.students.map(student=><option key={student.id} value={'Student/'+student.id}>{student.name}</option>)}</optgroup></select><div className="help-card"><span className="help-symbol"><CircleHelp size={19}/></span><strong>A little help goes a long way.</strong><p>We’re here for your school.</p><a href="mailto:admission@poddarinstitute.org">Contact support <ArrowUpRight size={13}/></a></div>{allowed('Settings') && <button className={`nav-item ${page === 'Settings' ? 'active' : ''}`} onClick={() => go('Settings')}><Settings size={18}/>Settings</button>}<div className="sidebar-foot"><span className="live-dot"/> Your connected campus <span>02</span></div></div></aside>
    <div inert={mobile && sidebar} className={`main-shell page-${page.toLowerCase().replaceAll(' ', '-')}`}><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label="Open navigation" aria-controls="school-navigation" aria-expanded={sidebar} onClick={() => setSidebar(true)}><Menu size={20}/></button><span>Workspace</span><span className="slash">/</span><strong>{page}</strong></div><div className="topbar-actions"><label className="global-search"><Search size={16}/><input aria-label="Search students" placeholder="Search students, records..." value={search} onChange={e => { setSearch(e.target.value); if (e.target.value && allowed('Students')) setPage('Students'); }}/></label><button className="notification icon-button" aria-label="Notifications" onClick={() => allowed('Notifications') && setModal('notifications')} disabled={!allowed('Notifications')}><Bell size={19}/><i/></button><div className="profile"><Avatar name="School Admin" color="gold"/><span><strong>School Admin</strong><small>Administrator</small></span></div></div></header>
      <main><div className="page-heading"><div><div className="eyebrow"><span/> ACADEMIC SESSION 2026–27</div><h1>{page === 'Overview' ? 'Welcome to Poddar Connect.' : page}</h1><p>{page === 'Overview' ? 'A thoughtful space for an exceptional school.' : `Manage ${page.toLowerCase()} for ${campus.name}.`}</p></div><div className="heading-actions"><span className="date-pill"><CalendarDays size={15}/> Wed, 04 Nov 2026</span>{allowed('Reports') && <button className="button secondary" onClick={['Payroll','Teachers'].includes(page)?downloadPayroll:downloadReport}><Download size={15}/>Export report</button>}</div></div>
      {!allowed(page) ? <p className="info-strip">This workspace is unavailable for the selected demo role.</p>
    : page === 'Student profiles' || page === 'Employee profiles' ? <RecordProfiles key={page} employee={page==='Employee profiles'} showBank={allowed('Payroll')} data={finance} setData={setFinance}/>
    : page === 'Permissions' ? <Permissions data={finance} setData={setFinance} pages={[...navigation.flatMap(group=>group.items.map(item=>item.name)).filter(name=>name!=='Permissions'), 'Settings']}/>
    : page === 'Fee administration' ? <FeeAdministration data={finance} setData={setFinance}/>
    : page === 'Compensation' ? <Compensation data={finance} setData={setFinance}/>
    : page === 'Leave calendar' ? <PeopleCalendar data={finance} setData={setFinance} canEdit={allowed('Employee attendance')}/>
    : page === 'HR policies' ? <HrPolicies data={finance} setData={setFinance}/>
    : page === 'Support desk' ? <SupportDesk data={finance} setData={setFinance}/>
    : page === 'Notifications' ? <NotificationCenter data={finance} setData={setFinance}/>
    : page === 'Overview' ? <PremiumOverview data={finance} go={go}/> : page === 'Students' ? <StudentDirectory data={finance} setData={setFinance} notify={setToast} search={search} setSearch={setSearch} openAccount={id=>{setSelectedAccount(id);go('Fees & payments');}}/> : page === 'Employees' || page === 'Bank reconciliation' ? <ErpOperations key={page} page={page} data={finance} setData={setFinance} notify={setToast} canManagePay={allowed('Payroll')}/> : page === 'Teachers' ? <StaffWorkspace data={finance} setData={setFinance} notify={setToast} view={page} key={page} canManagePay={allowed('Payroll')} openPayroll={()=>go('Payroll')}/> : page === 'Attendance' ? <section className="card"><CardHead title="Daily attendance register" sub="Select a date and mark each student."/><div className="list-toolbar"><label>Attendance date<input type="date" value={studentDate} onChange={event => {setStudentDate(event.target.value);setAttendanceSaved(false);}}/></label><span className="positive">{students.filter(s => (attendance[attendanceIndex(s.id)] ?? 'Present') === 'Present').length} / {students.length} present</span><button className="button primary" disabled={!studentDate} onClick={() => { setAttendanceSaved(true); setAttendance(current=>({...current,...Object.fromEntries(students.map(student=>[attendanceIndex(student.id),current[attendanceIndex(student.id)] ?? 'Present']))})); setToast('Attendance saved for ' + studentDate); }}><Check size={16}/>{attendanceSaved ? 'Attendance saved' : 'Save attendance'}</button></div><div className="table-wrap mobile-scroll-table" role="region" aria-label="Scrollable school records" tabIndex={0}><table><thead><tr><th>Student</th><th>Class</th><th>Attendance status</th></tr></thead><tbody>{students.map(s => <tr key={s.id}><td><div className="person"><Avatar name={s.name} color={s.color}/><strong>{s.name}</strong></div></td><td>{s.class}</td><td><div className="segmented attendance-toggle">{['Present','Absent','Leave'].map(status => <button key={status} disabled={!studentDate} className={(attendance[attendanceIndex(s.id)] ?? 'Present') === status ? 'selected' : ''} onClick={() => { setAttendance(a => ({...a, [attendanceIndex(s.id)]: status})); setAttendanceSaved(false); }}>{status}</button>)}</div></td></tr>)}</tbody></table></div></section> : page === 'Fees & payments' ? <FeesWorkspace data={finance} setData={setFinance} notify={setToast} initialSelected={selectedAccount} canEditPlan={allowed('Fee administration')} canVerify={allowed('Bank reconciliation')}/> : page === 'Employee attendance' || page === 'Accounting' ? <ErpRegisters key={page} page={page} data={finance} setData={setFinance}/> : page === 'Payroll' ? <PayrollRegister data={finance} setData={setFinance}/> : page === 'Leave requests' ? <StaffWorkspace data={finance} setData={setFinance} notify={setToast} view={page} key={page} canManagePay={allowed('Payroll')} openPayroll={()=>go('Payroll')}/> : page === 'Academics' ? <><div className="info-strip"><BookOpen size={20}/><span>Sample academic timetable · Wednesday, 04 November 2026</span></div><section className="card"><CardHead title="Today’s teaching schedule" sub={institution === 'school' ? 'Class X · Section A' : 'BCA · Semester 2'}/><div className="table-wrap mobile-scroll-table" role="region" aria-label="Scrollable school records" tabIndex={0}><table><thead><tr><th>Period</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th></tr></thead><tbody>{[['1','08:00 – 08:45','Mathematics','Priya Sharma','101'],['2','08:45 – 09:30','Science','Rahul Joshi','Science lab'],['3','09:45 – 10:30','English','Neha Agarwal','101'],['4','10:30 – 11:15','Social Science','Amit Kumar','101']].map((r, i) => institution === 'college' ? [r[0], r[1], finance.staff[i]?.subject ?? r[2], finance.staff[i]?.name ?? r[3], r[4]] : r).map(r => <tr key={r[0]}>{r.map((c,i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div></section></> : page === 'Reports' ? <ReportCenter data={finance} canSeePayroll={allowed('Payroll')}/> : page === 'Settings' ? <section className="card settings-card"><CardHead title="School profile" sub="Public details sourced from the linked Poddar website"/><img src="/poddar-logo.png" alt="Poddar Group of Institutions"/><dl><div><dt>School</dt><dd>{campus.name}</dd></div><div><dt>Campus address</dt><dd>Sector-7, Near Shipra Path, Mansarovar, Jaipur (RJ) – 302020</dd></div><div><dt>Email</dt><dd><a href="mailto:admission@poddarinstitute.org">admission@poddarinstitute.org</a></dd></div><div><dt>Admission helpline</dt><dd>+91-9694875297</dd></div><div><dt>Other queries</dt><dd>+91-7023652996</dd></div><div><dt>Prototype storage</dt><dd>Demo records saved in this browser only</dd></div></dl><a className="button secondary" href="https://www.poddarinstitute.org/poddar-international-school" target="_blank" rel="noreferrer">Visit official website <ArrowUpRight size={15}/></a><button className="button secondary" onClick={() => { localStorage.removeItem(financeKey); localStorage.removeItem(attendanceKey); location.reload(); }}>Reset demo data</button></section> : <section className="card"><CardHead title={page === 'Transport' ? 'Campus transport' : 'School library'} sub="Sample operational records"/><div className="table-wrap mobile-scroll-table" role="region" aria-label="Scrollable school records" tabIndex={0}><table><thead><tr><th>{page === 'Transport' ? 'Route' : 'Book'}</th><th>{page === 'Transport' ? 'Vehicle' : 'Author'}</th><th>{page === 'Transport' ? 'Students' : 'Copies'}</th><th>Status</th></tr></thead><tbody>{(page === 'Transport' ? [['Mansarovar · Route 01','RJ 14 PB 1024','32','Available'],['Shipra Path · Route 02','RJ 14 PB 1025','28','Available'],['Pratap Nagar · Route 03','RJ 14 PB 1026','30','Available']] : [['Wings of Fire','A. P. J. Abdul Kalam','12','Available'],['The Story of My Life','Helen Keller','8','Available'],['A Brief History of Time','Stephen Hawking','5','Available']]).map(r => <tr key={r[0]}>{r.slice(0,3).map((c,i) => <td key={i}>{c}</td>)}<td><Badge>{r[3]}</Badge></td></tr>)}</tbody></table></div></section>}
      <footer className="page-footer"><span>© 2026 {campus.name} <span className="footer-separator">·</span> Education with a purpose.</span><span><span className="demo-dot"/> Interactive prototype · Sample operational data</span></footer></main>
    </div>
    {toast && <div className="toast" role="status"><CheckCircle2 size={19}/>{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={16}/></button></div>}
    {modal && allowed('Notifications') && <Dialog title="A few things on your radar." kicker="YOUR CAMPUS UPDATES" onClose={()=>setModal(null)}><p className="dialog-description">Live summaries from your demo records.</p>{(finance.payroll ?? []).filter(row=>row.status!=='Draft').flatMap(row=>row.history.slice(-1).map(entry=><div className="notification-row" key={row.id}><strong>{row.name} · {row.period}</strong><p>{entry.event}</p></div>))}{[[`${finance.leaves.filter(l=>l.status==='Pending').length} leave requests to review`,'Paid and unpaid leave requests awaiting a decision.','Leave requests'],[`${finance.payments.filter(p=>!p.verified).length} payments to verify`,'Reconcile bank receipts before crediting fee balances.','Fees & payments'],[`${finance.staff.length-finance.salaryPayments.length} salary payments to record`,'Review deductions and record salary distribution.','Payroll']].map(([t,d,target])=><div className="notification-row" key={t}><strong>{t}</strong><p>{d}</p><button className="text-button" style={{marginTop:12}} onClick={()=>{setModal(null);go(target);}}>Open workspace<ArrowRight size={14}/></button></div>)}</Dialog>}
  </div>;
}
