'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkspaceSwitcher from './workspace-switcher';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck,
  Wallet,
  Banknote,
  CalendarDays,
  BookOpen,
  Bus,
  LibraryBig,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  Download,
  Check,
  X,
  Menu,
  Building2,
  CircleHelp,
  FileText,
  CheckCircle2,
  Landmark,
  Shield,
  ShieldCheck,
  Clock,
  UserCheck,
  MessageSquare,
  Layers,
  ChevronRight,
  LogOut,
  Sliders,
  PanelLeftOpen,
  PanelLeftClose,
  User,
} from 'lucide-react';
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
import PoddarBrandLogo from './brand-logo';
import {
  AS_OF,
  createCollegeFinance,
  createFinance,
  studentLedger,
  salaryBreakdown,
  type SchoolFinance,
} from '@/lib/school-finance';
import { money } from '@/lib/finance';

// 9 CATEGORIZED NAVIGATION STRUCTURE
const navigationCategories = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'PEOPLE',
    items: [
      { name: 'Students', icon: GraduationCap },
      { name: 'Parents & Guardians', icon: Users },
      { name: 'Faculty & Staff', icon: Users },
      { name: 'Lecture Attendance', icon: CalendarCheck },
    ],
  },
  {
    title: 'ACADEMICS',
    items: [
      { name: 'Courses & Batches', icon: Layers },
      { name: 'Lecture Timetable', icon: BookOpen },
      { name: 'Examinations & Results', icon: FileText },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { name: 'Fees & Payments', icon: Wallet },
      { name: 'Fee Structures & Adjustments', icon: Wallet },
      { name: 'Bank Reconciliation', icon: Landmark },
      { name: 'Accounting & Ledgers', icon: Wallet },
    ],
  },
  {
    title: 'HR & PAYROLL',
    items: [
      { name: 'Staff Attendance', icon: CalendarCheck },
      { name: 'Faculty Leave Management', icon: CalendarDays },
      { name: 'Payroll & Salary', icon: Banknote },
    ],
  },
  {
    title: 'CAMPUS SERVICES',
    items: [
      { name: 'Transport Fleet', icon: Bus },
      { name: 'Central Library', icon: LibraryBig },
      { name: 'Support Desk', icon: CircleHelp },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { name: 'Announcements & Notices', icon: MessageSquare },
      { name: 'Notification Center', icon: Bell },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { name: 'Student Reports', icon: FileText },
      { name: 'Financial Reports', icon: FileText },
      { name: 'Payroll Reports', icon: FileText },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { name: 'Role & Permission Management', icon: Shield },
      { name: 'Audit Trail / System Logs', icon: Clock },
      { name: 'College Settings', icon: Settings },
    ],
  },
];

type Modal = 'notifications' | null;

function Avatar({ name, color = 'blue' }: { name: string; color?: string }) {
  return (
    <span className={`avatar ${color}`}>
      {name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}

function exportCSV(filename: string, rows: (string | number)[][]) {
  const blob = new Blob(
    [rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')],
    { type: 'text/csv' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CollegePortal() {
  const router = useRouter();
  const [institution, setInstitution] = useState<Institution>('college');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('poddar-active-workspace');
      if (saved === 'finance') {
        router.push('/finance/dashboard');
        return;
      }
      localStorage.setItem('poddar-active-workspace', 'college');
      localStorage.setItem('poddar-institution', 'college');
    } catch {
      // Safe fallback
    }
    setInstitution('college');
  }, [router]);

  function switchInstitution(next: Institution) {
    setInstitution(next === 'finance' ? 'finance' : 'college');
  }

  return (
    <InstitutionContext.Provider value={institution}>
      <InstitutionPortal key={institution} institution={institution} switchInstitution={switchInstitution} />
    </InstitutionContext.Provider>
  );
}

function InstitutionPortal({
  institution,
  switchInstitution,
}: {
  institution: Institution;
  switchInstitution: (next: Institution) => void;
}) {
  const campus = institutions[institution] ?? institutions.college;
  const financeKey = 'poddar-college-finance-v1';
  const attendanceKey = 'poddar-college-attendance-v1';

  const [role, setRole] = useState<DemoRole>('Super Admin');
  const [demoUser, setDemoUser] = useState<{ role: 'Employee' | 'Student' | 'Parent'; id: string }>();
  const [campusMenu, setCampusMenu] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Category collapsed state
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const sidebarRef = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(false);
  const [finance, setFinance] = useState<SchoolFinance>(createCollegeFinance);

  const normalizePageName = (name: string): string => {
    const map: Record<string, string> = {
      'Fees & payments': 'Fees & Payments',
      'fees & payments': 'Fees & Payments',
      'Fees & Payments': 'Fees & Payments',
      'Overview': 'Dashboard',
      'Dashboard': 'Dashboard',
      'Faculty & Staff': 'Faculty & Staff',
      'Teachers & Staff': 'Faculty & Staff',
      'Teachers': 'Faculty & Staff',
      'Employees': 'Faculty & Staff',
      'Faculty Leave Management': 'Faculty Leave Management',
      'Leave Management': 'Faculty Leave Management',
      'Leave requests': 'Faculty Leave Management',
      'Payroll': 'Payroll & Salary',
      'Payroll & Salary': 'Payroll & Salary',
      'Lecture Attendance': 'Lecture Attendance',
      'Student Attendance': 'Lecture Attendance',
      'Attendance': 'Lecture Attendance',
      'Courses & Batches': 'Courses & Batches',
      'Classes & Sections': 'Courses & Batches',
      'Academics': 'Courses & Batches',
      'Lecture Timetable': 'Lecture Timetable',
      'Timetable': 'Lecture Timetable',
      'Examinations & Results': 'Examinations & Results',
      'Fee administration': 'Fee Structures & Adjustments',
      'Fee Structures & Adjustments': 'Fee Structures & Adjustments',
      'Bank reconciliation': 'Bank Reconciliation',
      'Bank Reconciliation': 'Bank Reconciliation',
      'Accounting': 'Accounting & Ledgers',
      'Accounting & Ledgers': 'Accounting & Ledgers',
      'Staff Attendance': 'Staff Attendance',
      'Employee Attendance': 'Staff Attendance',
      'Employee attendance': 'Staff Attendance',
      'Permissions': 'Role & Permission Management',
      'Role & Permission Management': 'Role & Permission Management',
      'College Settings': 'College Settings',
      'Campus Settings': 'College Settings',
      'Settings': 'College Settings',
      'Notifications': 'Notification Center',
      'Notification Center': 'Notification Center',
      'Reports': 'Student Reports',
      'Student Reports': 'Student Reports',
      'Financial Reports': 'Financial Reports',
      'Payroll Reports': 'Payroll Reports',
      'Parents & Guardians': 'Parents & Guardians',
      'Students': 'Students',
      'Student profiles': 'Students',
      'Transport Fleet': 'Transport Fleet',
      'Transport': 'Transport Fleet',
      'Central Library': 'Central Library',
      'Library': 'Central Library',
      'Support Desk': 'Support Desk',
      'Audit Trail / System Logs': 'Audit Trail / System Logs',
      'Announcements & Notices': 'Announcements & Notices',
    };
    return map[name] ?? name;
  };

  const roleAllows = (demoRole: DemoRole, name: string) =>
    demoRole === 'Super Admin' ||
    (name !== 'Role & Permission Management' &&
      name !== 'Permissions' &&
      (finance.roleAccess?.[demoRole]?.includes(name) ??
        finance.roleAccess?.[demoRole]?.includes(normalizePageName(name)) ??
        canOpenPage(demoRole, name)));

  const allowed = (name: string) => {
    const norm = normalizePageName(name);
    return roleAllows(role, name) || roleAllows(role, norm);
  };
  const [selectedAccount, setSelectedAccount] = useState('');
  const [financeReady, setFinanceReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(financeKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (
          Array.isArray(d.students) &&
          d.students.length &&
          Array.isArray(d.staff) &&
          d.staff.length &&
          Array.isArray(d.payments) &&
          Array.isArray(d.leaves) &&
          d.policy &&
          Array.isArray(d.salaryPayments)
        )
          setFinance(d);
      }
    } catch {}
    setFinanceReady(true);
  }, [financeKey]);

  useEffect(() => {
    if (financeReady) localStorage.setItem(financeKey, JSON.stringify(finance));
  }, [finance, financeReady, financeKey]);

  const [page, setPage] = useState('Dashboard');
  const [search, setSearch] = useState('');
  const [sidebar, setSidebar] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState('');

  const students = finance.students.map(s => ({
    ...s,
    fee: s.plan.fee,
    status: studentLedger(s, finance.payments).status,
  }));

  const [studentDate, setStudentDate] = useState(AS_OF);
  const attendanceIndex = (id: string) => (studentDate === AS_OF ? id : studentDate + '/' + id);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [attendanceReady, setAttendanceReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(attendanceKey);
      if (raw) setAttendance(JSON.parse(raw));
    } catch {}
    setAttendanceReady(true);
  }, [attendanceKey]);

  useEffect(() => {
    if (attendanceReady) localStorage.setItem(attendanceKey, JSON.stringify(attendance));
  }, [attendance, attendanceReady, attendanceKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobileSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setModal(null);
        setProfileMenuOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  // Track scroll position for subtle header elevation
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const currentCategory = navigationCategories.find(cat =>
    cat.items.some(item => item.name === page || (item.name === 'Dashboard' && page === 'Overview'))
  )?.title;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setSidebar(false);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const go = (name: string) => {
    const target = normalizePageName(name);
    if (!allowed(target) && !allowed(name)) return;
    setPage(target);
    setSearch('');
    setSidebar(false);
  };

  const toggleCategory = (catTitle: string) => {
    setCollapsedCategories(cur => ({ ...cur, [catTitle]: !cur[catTitle] }));
  };

  const downloadReport = () => {
    exportCSV('poddar-student-fee-ledger.csv', [
      ['Student', 'Admission ID', 'Class', 'Plan', 'Preferred method', 'Total payable', 'Paid', 'Due now', 'Remaining'],
      ...finance.students.map(s => {
        const l = studentLedger(s, finance.payments);
        return [s.name, s.id, s.class, s.plan.kind, s.plan.preferred, l.total, l.paid, l.due, l.remaining];
      }),
    ]);
    setToast('Student fee ledger downloaded');
  };

  const downloadPayroll = () => {
    exportCSV('poddar-payroll.csv', [
      ['Teacher', 'Gross', 'Paid leave', 'Unpaid leave', 'Leave balance', 'Deduction', 'Net salary', 'Distributed'],
      ...finance.staff.map(s => {
        const p = salaryBreakdown(s, finance.leaves, finance.policy);
        return [
          s.name,
          s.salary,
          p.paidDays,
          p.unpaidDays,
          p.balance,
          p.deduction,
          p.net,
          finance.salaryPayments.find(t => t.staffId === s.id)?.amount ?? 0,
        ];
      }),
    ]);
    setToast('Payroll downloaded');
  };

  // If a simulated user portal is open
  if (demoUser) {
    return (
      <div className="portal-page-wrapper">
        {/* Executive Dedicated Portal Topbar */}
        <header className="portal-topbar">
          <div className="portal-topbar-brand">
            <PoddarBrandLogo variant="dark" showTagline={false} size={36} />
            <div className="portal-topbar-divider" />
            <span className="portal-session-badge">
              <span className="live-dot" /> {campus.name}
            </span>
            <span className="portal-role-pill">
              {demoUser.role === 'Parent'
                ? 'Parent & Guardian Portal'
                : demoUser.role === 'Student'
                ? 'Student Self-Service Portal'
                : 'Faculty & Staff Portal'}
            </span>
          </div>

          <div className="portal-topbar-actions">
            <div className="portal-user-badge">
              <span className="portal-user-label">Simulated Account</span>
              <strong className="portal-user-id">{demoUser.id}</strong>
            </div>
            <button
              className="portal-return-btn"
              onClick={() => {
                setDemoUser(undefined);
                setRole('Super Admin');
                setPage('Dashboard');
              }}
              title="Return to Master Administrator Console"
            >
              <LogOut size={14} /> Exit Portal
            </button>
          </div>
        </header>

        {/* Main Portal Viewport */}
        <div className="portal-shell-container">
          <SelfService
            key={demoUser.id}
            data={finance}
            setData={setFinance}
            role={demoUser.role}
            id={demoUser.id}
            studentAttendance={attendance}
          />
          <SupportDesk data={finance} setData={setFinance} ownerId={demoUser.id} />
        </div>
      </div>
    );
  }

  // Pending leaves count
  const pendingLeavesCount = finance.leaves.filter(l => l.status === 'Pending').length;

  return (
    <div className="app-shell">
      {sidebar && <div className="sidebar-backdrop" onClick={() => setSidebar(false)} />}

      {/* Categorized Collapsible Sidebar */}
      <aside
        ref={sidebarRef}
        id="college-navigation"
        aria-label="Poddar collegiate navigation"
        className={`sidebar ${sidebar ? 'open' : ''} ${compactSidebar ? 'compact' : ''}`}
      >
        <button
          className="drawer-close icon-button"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        >
          <X size={21} />
        </button>

        {/* Brand Header */}
        <div className="brand">
          <PoddarBrandLogo
            variant="light"
            showTagline={!compactSidebar}
            iconOnly={compactSidebar}
            size={compactSidebar ? 38 : 42}
          />
        </div>

        {/* Shared Workspace Switcher (College Management vs Finance) */}
        <WorkspaceSwitcher current="college" compact={compactSidebar} />

        {/* Compact Mode Toggle (Desktop only) */}
        {!mobile && (
          <button
            className="sidebar-rail-toggle"
            onClick={() => setCompactSidebar(!compactSidebar)}
            title={compactSidebar ? 'Expand Sidebar' : 'Collapse to Rail'}
            data-tooltip={compactSidebar ? 'Expand Sidebar' : undefined}
            aria-label={compactSidebar ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {compactSidebar ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={15} />}
            {!compactSidebar && <span>Collapse Sidebar</span>}
          </button>
        )}

        {/* Categorized Navigation Groups */}
        <nav>
          {navigationCategories.map(cat => {
            const visibleItems = cat.items.filter(item => allowed(item.name));
            if (!visibleItems.length) return null;
            const isCollapsed = !!collapsedCategories[cat.title];

            return (
              <div className="nav-category" key={cat.title}>
                <button
                  className="nav-category-header"
                  onClick={() => toggleCategory(cat.title)}
                  aria-expanded={!isCollapsed}
                >
                  <span>{cat.title}</span>
                  <ChevronDown
                    size={13}
                    className={`category-chevron ${isCollapsed ? 'collapsed' : ''}`}
                  />
                </button>

                <div className={`nav-category-items ${isCollapsed ? 'collapsed' : ''}`}>
                  {visibleItems.map(item => {
                    const isActive = page === item.name || (item.name === 'Dashboard' && page === 'Overview');
                    return (
                      <button
                        key={item.name}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => go(item.name)}
                        data-tooltip={item.name}
                        title={compactSidebar ? item.name : undefined}
                      >
                        <item.icon size={17} />
                        <span>{item.name}</span>
                        {item.name === 'Leave Management' && pendingLeavesCount > 0 && (
                          <b>{pendingLeavesCount}</b>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Card Pinned at Sidebar Bottom */}
        <div className="sidebar-bottom">
          <div
            className="sidebar-user-card"
            data-tooltip={compactSidebar ? `Console (${role})` : undefined}
            title={compactSidebar ? `Console (${role})` : undefined}
          >
            <Avatar name="College Admin" color="gold" />
            {!compactSidebar && (
              <div className="sidebar-user-info">
                <strong>College Console</strong>
                <small>{role}</small>
              </div>
            )}
          </div>

          {!compactSidebar && (
            <>
              <label className="nav-label" htmlFor="demo-role" style={{ padding: '0 4px 6px' }}>
                Active Demo Role
              </label>
              <select
                id="demo-role"
                className="sidebar-select"
                value={role}
                onChange={event => {
                  const next = event.target.value as DemoRole;
                  if (next === 'Parent') {
                    setDemoUser({ role: 'Parent', id: finance.students[0]?.guardian ?? 'Priya Sharma' });
                    return;
                  }
                  if (next === 'Student') {
                    const s = finance.students[0];
                    if (s) setDemoUser({ role: 'Student', id: s.id });
                    return;
                  }
                  if (next === 'Teacher' || next === 'Non-teaching Staff') {
                    const staffMember = finance.staff.find(e =>
                      next === 'Teacher'
                        ? !e.designation || e.designation === 'Faculty'
                        : e.designation && e.designation !== 'Faculty'
                    );
                    if (staffMember) setDemoUser({ role: 'Employee', id: staffMember.id });
                    return;
                  }
                  setRole(next);
                  setModal(null);
                  setSearch('');
                  setSidebar(false);
                  setPage(next === 'Super Admin' ? 'Dashboard' : 'Dashboard');
                }}
              >
                {roles.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <label className="nav-label" style={{ padding: '10px 4px 6px' }}>
                Simulate Portal User
              </label>
            </>
          )}

          <button
            type="button"
            className="sidebar-identity-btn"
            onClick={() => setIdentityModalOpen(true)}
            aria-label="Choose simulated portal identity"
            data-tooltip={compactSidebar ? 'Choose Simulated Identity' : undefined}
            title={compactSidebar ? 'Choose Simulated Identity' : undefined}
          >
            <div className="identity-btn-content">
              <Users size={15} className="identity-btn-icon" />
              {!compactSidebar && <span>Choose identity...</span>}
            </div>
            {!compactSidebar && <ChevronDown size={14} className="identity-btn-arrow" />}
          </button>

          {!compactSidebar && (
            <div className="sidebar-foot">
              <span className="live-dot" /> Poddar College ERP <span>2026–27</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className={`main-shell ${compactSidebar ? 'compact' : ''} page-${page.toLowerCase().replaceAll(' ', '-')}`}>
            {/* Top Header Bar */}
            <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
              {/* Left: Breadcrumb Navigation */}
              <div className="topbar-left">
                <button
                  className="mobile-menu icon-button"
                  aria-label="Open navigation"
                  aria-controls="college-navigation"
                  aria-expanded={sidebar}
                  onClick={() => setSidebar(true)}
                >
                  <Menu size={20} />
                </button>
                <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
                  <button
                    type="button"
                    className="breadcrumb-root"
                    onClick={() => go('Dashboard')}
                    title="Go to Poddar Connect Dashboard"
                  >
                    Poddar Connect
                  </button>
                  <span className="breadcrumb-slash">/</span>
                  {currentCategory && currentCategory !== 'OVERVIEW' && (
                    <>
                      <span className="breadcrumb-category">
                        {currentCategory.charAt(0) + currentCategory.slice(1).toLowerCase()}
                      </span>
                      <span className="breadcrumb-slash">/</span>
                    </>
                  )}
                  <strong className="breadcrumb-current">{page}</strong>
                </nav>
              </div>

              {/* Center: Global Search */}
              <div className={`topbar-center ${mobileSearchOpen ? 'mobile-open' : ''}`}>
                <label className="global-search-container" htmlFor="topbar-global-search">
                  <Search size={16} className="search-icon" />
                  <input
                    id="topbar-global-search"
                    ref={searchInputRef}
                    aria-label="Search students, faculty, courses, fees, records"
                    placeholder="Search students, faculty, courses, fees, records..."
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      if (e.target.value && allowed('Students')) setPage('Students');
                    }}
                  />
                  <div className="search-shortcut" title="Press Ctrl + K to focus search">
                    <kbd className="search-kbd">Ctrl</kbd>
                    <span className="search-kbd-sep">+</span>
                    <kbd className="search-kbd">K</kbd>
                  </div>
                </label>
                {mobile && mobileSearchOpen && (
                  <button
                    type="button"
                    className="mobile-search-close"
                    onClick={() => setMobileSearchOpen(false)}
                    aria-label="Close search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Right: Administration Controls */}
              <div className="topbar-right">
                {mobile && !mobileSearchOpen && (
                  <button
                    type="button"
                    className="topbar-icon-btn mobile-search-toggle"
                    onClick={() => {
                      setMobileSearchOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    aria-label="Open search"
                    title="Search records"
                  >
                    <Search size={18} />
                  </button>
                )}

                <button
                  type="button"
                  className="topbar-icon-btn notification-btn"
                  aria-label="Notifications"
                  onClick={() => allowed('Notification Center') && setModal('notifications')}
                  title="Notifications & Dispatches"
                >
                  <Bell size={18} />
                  <span className="notification-pulse-dot" />
                </button>

                <div className="topbar-profile-container" ref={profileMenuRef}>
                  <button
                    type="button"
                    className={`topbar-profile-trigger ${profileMenuOpen ? 'open' : ''}`}
                    onClick={() => setProfileMenuOpen(prev => !prev)}
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                  >
                    <Avatar name="College Admin" color="gold" />
                    <div className="profile-meta">
                      <strong className="profile-name">College Admin</strong>
                      <small className="profile-role">{role}</small>
                    </div>
                    <ChevronDown size={14} className={`profile-chevron ${profileMenuOpen ? 'rotated' : ''}`} />
                  </button>

                  {profileMenuOpen && (
                    <div className="profile-dropdown-menu" role="menu">
                      <div className="dropdown-account-header">
                        <div className="dropdown-account-info">
                          <strong className="dropdown-admin-title">College Administrator</strong>
                          <span className="dropdown-campus-badge">{campus.shortName}</span>
                        </div>
                        <small className="dropdown-email">admin@college.poddar.edu</small>
                      </div>

                      <div className="dropdown-divider" />

                      <button
                        type="button"
                        className="dropdown-menu-item"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          if (allowed('Faculty & Staff')) go('Faculty & Staff');
                          else if (allowed('Teachers & Staff')) go('Teachers & Staff');
                          else go('Dashboard');
                        }}
                      >
                        <User size={15} className="dropdown-item-icon" />
                        <span>My Profile</span>
                      </button>

                      <button
                        type="button"
                        className="dropdown-menu-item"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          switchInstitution(institution === 'college' ? 'management' : 'college');
                        }}
                      >
                        <Building2 size={15} className="dropdown-item-icon" />
                        <span>Switch Campus ({institution === 'college' ? 'Management Campus' : 'International College'})</span>
                      </button>

                      <button
                        type="button"
                        className="dropdown-menu-item"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          if (allowed('College Settings')) go('College Settings');
                          else if (allowed('Campus Settings')) go('Campus Settings');
                          else if (allowed('Settings')) go('Settings');
                          else go('Role & Permission Management');
                        }}
                      >
                        <Settings size={15} className="dropdown-item-icon" />
                        <span>Settings</span>
                      </button>

                      <div className="dropdown-divider" />

                      <button
                        type="button"
                        className="dropdown-menu-item dropdown-logout-item"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setDemoUser(undefined);
                          setRole('Super Admin');
                          setPage('Dashboard');
                        }}
                      >
                        <LogOut size={15} className="dropdown-item-icon" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Page Main Content Area */}
            <main>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> ACADEMIC SESSION 2026–27
                  </div>
                  <h1>{page === 'Dashboard' || page === 'Overview' ? 'Good Afternoon, College Admin' : page}</h1>
                  <p>
                    {page === 'Dashboard' || page === 'Overview'
                      ? 'A thoughtful command centre for an exceptional college.'
                      : `Manage ${page.toLowerCase()} for ${campus.name}.`}
                  </p>
                </div>
            <div className="heading-actions">
              <span className="date-pill">
                <CalendarDays size={15} /> Wed, 04 Nov 2026
              </span>
              {allowed('Reports') && (
                <button
                  className="button secondary"
                  onClick={['Payroll & Salary', 'Teachers & Staff'].includes(page) ? downloadPayroll : downloadReport}
                >
                  <Download size={15} /> Export report
                </button>
              )}
            </div>
          </div>

          {/* ROUTE RENDERING */}
          {!allowed(page) ? (
            <p className="info-strip">This workspace is unavailable for the selected demo role.</p>
          ) : page === 'Dashboard' || page === 'Overview' ? (
            <PremiumOverview data={finance} go={go} />
          ) : page === 'Students' ? (
            <StudentDirectory
              data={finance}
              setData={setFinance}
              notify={setToast}
              search={search}
              setSearch={setSearch}
              openAccount={id => {
                setSelectedAccount(id);
                go('Fees & Payments');
              }}
              studentAttendance={attendance}
            />
          ) : page === 'Parents & Guardians' ? (
            <section className="card">
              <div className="premium-card-heading">
                <div>
                  <h3>Parents &amp; Guardians Directory <span className="count-chip">{finance.students.length} records</span></h3>
                  <p>Comprehensive guardian contact registry and family billing links.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>PRIMARY GUARDIAN</th>
                      <th>LINKED STUDENT</th>
                      <th>CLASS</th>
                      <th>CONTACT PHONE</th>
                      <th>PAYMENT PLAN</th>
                      <th>OUTSTANDING DUE</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.students.map(s => {
                      const l = studentLedger(s, finance.payments);
                      return (
                        <tr key={s.id}>
                          <td><strong>{s.guardian}</strong></td>
                          <td>{s.name} ({s.id})</td>
                          <td>{s.class}</td>
                          <td>{s.profile?.phone ?? '+91-9829012345'}</td>
                          <td><span className="plan-tag emi">{s.plan.kind}</span></td>
                          <td className={l.due > 0 ? 'negative' : 'positive'}><strong>{money(l.due)}</strong></td>
                          <td>
                            <button
                              className="button secondary small"
                              onClick={() => {
                                setSelectedAccount(s.id);
                                go('Fees & Payments');
                              }}
                            >
                              Fee Ledger
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'Teachers & Staff' || page === 'Teachers' ? (
            <StaffWorkspace
              data={finance}
              setData={setFinance}
              notify={setToast}
              view="Teachers"
              canManagePay={allowed('Payroll & Salary')}
              openPayroll={() => go('Payroll & Salary')}
            />
          ) : page === 'Student Attendance' || page === 'Attendance' ? (
            <section className="card">
              <div className="premium-card-heading">
                <div>
                  <h3>Daily Student Attendance Register</h3>
                  <p>Mark daily class attendance and synchronize with student portal records.</p>
                </div>
                <button
                  className="button primary"
                  disabled={!studentDate}
                  onClick={() => {
                    setAttendanceSaved(true);
                    setAttendance(current => ({
                      ...current,
                      ...Object.fromEntries(
                        students.map(student => [
                          attendanceIndex(student.id),
                          current[attendanceIndex(student.id)] ?? 'Present',
                        ])
                      ),
                    }));
                    setToast('Attendance saved for ' + studentDate);
                  }}
                >
                  <Check size={16} />
                  {attendanceSaved ? 'Attendance Saved' : 'Save Attendance'}
                </button>
              </div>

              <div className="premium-list-toolbar">
                <label>
                  Attendance Date:
                  <input
                    type="date"
                    value={studentDate}
                    onChange={event => {
                      setStudentDate(event.target.value);
                      setAttendanceSaved(false);
                    }}
                    style={{ marginLeft: 8 }}
                  />
                </label>
                <span className="positive">
                  {students.filter(s => (attendance[attendanceIndex(s.id)] ?? 'Present') === 'Present').length} /{' '}
                  {students.length} Present
                </span>
              </div>

              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>STUDENT</th>
                      <th>CLASS</th>
                      <th>ATTENDANCE STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td>
                          <div className="person">
                            <Avatar name={s.name} color={s.color} />
                            <strong>{s.name}</strong>
                          </div>
                        </td>
                        <td>{s.class}</td>
                        <td>
                          <div className="segmented attendance-toggle">
                            {['Present', 'Absent', 'Leave'].map(st => (
                              <button
                                key={st}
                                disabled={!studentDate}
                                className={(attendance[attendanceIndex(s.id)] ?? 'Present') === st ? 'selected' : ''}
                                onClick={() => {
                                  setAttendance(a => ({ ...a, [attendanceIndex(s.id)]: st }));
                                  setAttendanceSaved(false);
                                }}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'Courses & Batches' || page === 'Classes & Sections' ? (
            <div className="classes-grid">
              {[
                { title: 'BCA (Bachelor of Computer Applications)', sem: 'Semester II', teacher: 'Dr. Priya Sharma (HOD Comp. App.)', students: 48, room: 'Computing Lab 1' },
                { title: 'BBA (Bachelor of Business Admin)', sem: 'Semester IV', teacher: 'Prof. Rahul Joshi (Dean Mgmt.)', students: 52, room: 'Management Hall 202' },
                { title: 'B.Com (Honours in Accountancy)', sem: 'Semester II', teacher: 'Dr. Neha Agarwal (Commerce)', students: 45, room: 'Lecture Hall 105' },
                { title: 'B.Sc (Information Technology)', sem: 'Semester VI', teacher: 'Prof. Amit Kumar (Faculty IT)', students: 38, room: 'Software Lab 103' },
                { title: 'MCA (Master of Computer Applications)', sem: 'Semester I', teacher: 'Dr. Praveen Sharma (Director)', students: 30, room: 'PG Block Lab 3' },
                { title: 'MBA (Marketing & Finance)', sem: 'Semester III', teacher: 'Prof. Karan Mehta (Associate Professor)', students: 42, room: 'Executive Seminar Hall' },
              ].map(cohort => (
                <div key={cohort.title} className="class-box-card">
                  <div className="class-box-head">
                    <span className="identity-badge active">{cohort.sem}</span>
                    <span style={{ fontSize: 11, color: '#718096' }}>{cohort.room}</span>
                  </div>
                  <div className="class-box-title">{cohort.title}</div>
                  <div className="class-box-stats">
                    <div className="class-stat-item">
                      <span>Course Coordinator</span>
                      <strong>{cohort.teacher}</strong>
                    </div>
                    <div className="class-stat-item">
                      <span>Enrolled</span>
                      <strong>{cohort.students} Scholars</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : page === 'Lecture Timetable' || page === 'Timetable' || page === 'Academics' ? (
            <section className="card">
              <div className="premium-card-heading">
                <div>
                  <h3>Collegiate Lecture Timetable</h3>
                  <p>BCA &amp; BBA Department lecture and lab schedule · Academic Session 2026–27</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>PERIOD</th>
                      <th>TIME</th>
                      <th>SUBJECT</th>
                      <th>FACULTY</th>
                      <th>VENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Period 1', '08:00 – 08:45', 'Computer Architecture', 'Dr. Priya Sharma', 'Room 101'],
                      ['Period 2', '08:45 – 09:30', 'Data Structures & Algorithms', 'Prof. Rahul Joshi', 'Lab 2'],
                      ['Period 3', '09:45 – 10:30', 'Mathematics & Discrete Structure', 'Dr. Neha Agarwal', 'Room 101'],
                      ['Period 4', '10:30 – 11:15', 'Technical Communication', 'Prof. Amit Kumar', 'Room 101'],
                    ].map(r => (
                      <tr key={r[0]}>
                        <td><strong>{r[0]}</strong></td>
                        <td>{r[1]}</td>
                        <td>{r[2]}</td>
                        <td>{r[3]}</td>
                        <td><span className="status-pill neutral">{r[4]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'Examinations & Results' ? (
            <section className="card">
              <div className="premium-card-heading">
                <div>
                  <h3>Examinations &amp; Evaluation Schedule</h3>
                  <p>Semester and term assessment calendar for 2026–2027.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>EXAMINATION</th>
                      <th>TERM</th>
                      <th>START DATE</th>
                      <th>SUBJECTS</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Mid-Term Assessment 2026', 'Semester 1', '15 Nov 2026', '5 Papers', 'Scheduled'],
                      ['Practical & Lab Viva', 'Semester 1', '22 Nov 2026', '3 Labs', 'Scheduled'],
                      ['End-Semester University Exams', 'Final', '15 Dec 2026', '6 Papers', 'Upcoming'],
                    ].map(ex => (
                      <tr key={ex[0]}>
                        <td><strong>{ex[0]}</strong></td>
                        <td>{ex[1]}</td>
                        <td>{ex[2]}</td>
                        <td>{ex[3]}</td>
                        <td><span className="status-pill good">{ex[4]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'Fees & Payments' || page === 'Fees & payments' ? (
            <FeesWorkspace
              data={finance}
              setData={setFinance}
              notify={setToast}
              initialSelected={selectedAccount}
              canEditPlan={allowed('Fee Structures & Adjustments')}
              canVerify={allowed('Bank Reconciliation')}
            />
          ) : page === 'Fee Structures & Adjustments' || page === 'Fee administration' ? (
            <FeeAdministration data={finance} setData={setFinance} />
          ) : page === 'Bank Reconciliation' ? (
            <ErpOperations
              key={page}
              page="Bank reconciliation"
              data={finance}
              setData={setFinance}
              notify={setToast}
              canManagePay={allowed('Payroll & Salary')}
            />
          ) : page === 'Accounting & Ledgers' || page === 'Accounting' ? (
            <ErpRegisters key={page} page="Accounting" data={finance} setData={setFinance} />
          ) : page === 'Employee Attendance' ? (
            <ErpRegisters key={page} page="Employee attendance" data={finance} setData={setFinance} />
          ) : page === 'Leave Management' || page === 'Leave requests' ? (
            <StaffWorkspace
              data={finance}
              setData={setFinance}
              notify={setToast}
              view="Leave requests"
              key={page}
              canManagePay={allowed('Payroll & Salary')}
              openPayroll={() => go('Payroll & Salary')}
            />
          ) : page === 'Payroll & Salary' || page === 'Payroll' ? (
            <PayrollRegister data={finance} setData={setFinance} />
          ) : page === 'Transport' ? (
            <section className="card">
              <div className="premium-card-heading">
                <div>
                  <h3>Campus Transport Fleet</h3>
                  <p>Authorized bus routes, vehicle fleet, and registered student passengers.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>ROUTE</th>
                      <th>VEHICLE REGISTRATION</th>
                      <th>CAPACITY</th>
                      <th>DRIVER &amp; HELPLINE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Mansarovar Sector-7 · Route 01', 'RJ 14 PB 1024', '32 / 35 Students', 'Ramesh Singh (+91-9829011111)', 'Operational'],
                      ['Shipra Path · Route 02', 'RJ 14 PB 1025', '28 / 30 Students', 'Mukesh Kumar (+91-9829022222)', 'Operational'],
                      ['Pratap Nagar · Route 03', 'RJ 14 PB 1026', '30 / 35 Students', 'Dinesh Sharma (+91-9829033333)', 'Operational'],
                    ].map(r => (
                      <tr key={r[0]}>
                        <td><strong>{r[0]}</strong></td>
                        <td>{r[1]}</td>
                        <td>{r[2]}</td>
                        <td>{r[3]}</td>
                        <td><span className="status-pill good">{r[4]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'Library' ? (
            <section className="card">
              <div className="premium-card-heading">
                <div>
                  <h3>Institutional Library Catalog</h3>
                  <p>Textbooks, reference volumes, and active borrowings.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>BOOK TITLE</th>
                      <th>AUTHOR</th>
                      <th>AVAILABLE COPIES</th>
                      <th>SHELF LOCATION</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Data Communications and Networking', 'Behrouz A. Forouzan', '12 Available', 'Rack C-04', 'In Stock'],
                      ['Operating System Concepts', 'Silberschatz, Galvin, Gagne', '8 Available', 'Rack B-12', 'In Stock'],
                      ['Wings of Fire', 'Dr. A. P. J. Abdul Kalam', '5 Available', 'General Reference', 'In Stock'],
                    ].map(b => (
                      <tr key={b[0]}>
                        <td><strong>{b[0]}</strong></td>
                        <td>{b[1]}</td>
                        <td>{b[2]}</td>
                        <td>{b[3]}</td>
                        <td><span className="status-pill good">{b[4]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'Support Desk' ? (
            <SupportDesk data={finance} setData={setFinance} />
          ) : page === 'Announcements & Notices' ? (
            <div className="announcements-feed">
              {[
                {
                  target: 'All Students & Parents',
                  date: '02 Nov 2026',
                  title: 'Academic Session 2026–27 Mid-Term Examinations',
                  body: 'Assessments commence on 15 Nov 2026. Hall tickets and subject schedules are available in the student portal.',
                },
                {
                  target: 'Faculty & Staff',
                  date: '01 Nov 2026',
                  title: 'Monthly Payroll & Leave Attendance Verification',
                  body: 'All HODs are requested to review pending leave applications before November payroll calculations lock on 05 Nov 2026.',
                },
                {
                  target: 'Parents',
                  date: '25 Oct 2026',
                  title: 'Parent-Teacher Interaction Meeting (Mansarovar Campus)',
                  body: 'Interactive progress review meeting scheduled for Saturday, 08 Nov 2026 from 9:00 AM onwards.',
                },
              ].map((item, i) => (
                <div key={i} className="announcement-entry">
                  <div className="announcement-meta">
                    <span className="announcement-target-badge">{item.target}</span>
                    <span className="announcement-date">{item.date}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          ) : page === 'Notification Center' || page === 'Notifications' ? (
            <NotificationCenter data={finance} setData={setFinance} />
          ) : page === 'Student Reports' || page === 'Financial Reports' || page === 'Payroll Reports' || page === 'Reports' ? (
            <ReportCenter data={finance} canSeePayroll={allowed('Payroll & Salary')} />
          ) : page === 'Role & Permission Management' || page === 'Permissions' ? (
            <Permissions
              data={finance}
              setData={setFinance}
              pages={navigationCategories.flatMap(c => c.items.map(i => i.name))}
            />
          ) : page === 'Audit Trail / System Logs' ? (
            <section className="card">
              <div className="premium-card-heading">
                <div>
                  <h3>Institutional Audit Trail &amp; Logs</h3>
                  <p>Cryptographically sequenced record of all financial and administrative events.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>TIMESTAMP</th>
                      <th>USER</th>
                      <th>ACTION</th>
                      <th>MODULE</th>
                      <th>OUTCOME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['2026-11-04 11:22:10', 'College Admin', 'Reconciled Bank Statement', 'Bank Reconciliation', 'Success'],
                      ['2026-11-04 10:45:02', 'Accounts Admin', 'Approved Fee Waiver (₹5,000)', 'Fee Administration', 'Success'],
                      ['2026-11-04 09:30:15', 'Super Admin', 'Configured Role Permissions', 'Permissions Matrix', 'Success'],
                      ['2026-11-03 16:12:44', 'HR Admin', 'Approved Paid Leave Request', 'Leave Management', 'Success'],
                    ].map((log, i) => (
                      <tr key={i}>
                        <td>{log[0]}</td>
                        <td><strong>{log[1]}</strong></td>
                        <td>{log[2]}</td>
                        <td>{log[3]}</td>
                        <td><span className="status-pill good">{log[4]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'College Settings' || page === 'Campus Settings' || page === 'Settings' ? (
            <section className="card settings-card">
              <div className="premium-card-heading" style={{ paddingLeft: 0 }}>
                <div>
                  <h3>Collegiate Institutional Profile</h3>
                  <p>College campus registration, affiliation, and administration contact details.</p>
                </div>
              </div>
              <div className="settings-brand-wrap">
                <PoddarBrandLogo variant="dark" showTagline={false} size={48} />
              </div>
              <dl>
                <div><dt>Campus</dt><dd>{campus.name}</dd></div>
                <div><dt>Address</dt><dd>Sector-7, Near Shipra Path, Mansarovar, Jaipur (RJ) – 302020</dd></div>
                <div><dt>Email</dt><dd><a href="mailto:admission@poddarinstitute.org">admission@poddarinstitute.org</a></dd></div>
                <div><dt>Admission Helpline</dt><dd>+91-9694875297</dd></div>
                <div><dt>General Inquiries</dt><dd>+91-7023652996</dd></div>
                <div><dt>Affiliation</dt><dd>University of Rajasthan / AICTE Approved</dd></div>
                <div><dt>Prototype Storage</dt><dd>Interactive demo storage (persisted in browser)</dd></div>
              </dl>
              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <a
                  className="button secondary"
                  href="https://poddarcollege.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit Official College Website <ArrowUpRight size={15} />
                </a>
                <button
                  className="button secondary"
                  onClick={() => {
                    localStorage.removeItem(financeKey);
                    localStorage.removeItem(attendanceKey);
                    location.reload();
                  }}
                >
                  Reset Demo Data
                </button>
              </div>
            </section>
          ) : (
            <PremiumOverview data={finance} go={go} />
          )}

          {/* Footer */}
          <footer className="page-footer">
            <span>© 2026 {campus.name} <span className="footer-separator">·</span> Education with a purpose.</span>
            <span><span className="demo-dot" /> Interactive Prototype · Verified Institutional System</span>
          </footer>
        </main>
      </div>

      {/* Global Toast */}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Notifications Modal */}
      {modal && allowed('Notification Center') && (
        <Dialog title="A few things on your radar." kicker="YOUR CAMPUS UPDATES" onClose={() => setModal(null)}>
          <p className="dialog-description">Live operational summaries from your records.</p>
          {(finance.payroll ?? [])
            .filter(row => row.status !== 'Draft')
            .flatMap(row =>
              row.history.slice(-1).map(entry => (
                <div className="notification-row" key={row.id}>
                  <strong>{row.name} · {row.period}</strong>
                  <p>{entry.event}</p>
                </div>
              ))
            )}
          {[
            [`${pendingLeavesCount} leave requests to review`, 'Paid and unpaid leave requests awaiting a decision.', 'Leave Management'],
            [`${finance.payments.filter(p => !p.verified).length} payments to verify`, 'Reconcile bank receipts before crediting fee balances.', 'Fees & Payments'],
            [`${finance.staff.length - finance.salaryPayments.length} salary payments to record`, 'Review deductions and record salary distribution.', 'Payroll & Salary'],
          ].map(([t, d, target]) => (
            <div className="notification-row" key={t}>
              <strong>{t}</strong>
              <p>{d}</p>
              <button
                className="text-button"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setModal(null);
                  go(target);
                }}
              >
                Open workspace <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </Dialog>
      )}

      {/* Identity Picker Modal */}
      {identityModalOpen && (
        <Dialog
          title="Choose Simulated Portal Identity"
          kicker="TEST SELF-SERVICE PORTALS"
          onClose={() => setIdentityModalOpen(false)}
        >
          <p className="dialog-description">
            Experience the platform from the perspective of any student, parent, or faculty member.
          </p>

          <div className="identity-modal-grid">
            {/* Students */}
            <div className="identity-modal-group">
              <div className="identity-group-head">
                <span className="party-badge student">
                  <GraduationCap size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Students ({finance.students.length})
                </span>
              </div>
              <div className="identity-options-list">
                {finance.students.map(s => (
                  <button
                    key={s.id}
                    className="identity-option-card"
                    onClick={() => {
                      setIdentityModalOpen(false);
                      setSidebar(false);
                      setDemoUser({ role: 'Student', id: s.id });
                    }}
                  >
                    <div className="identity-card-avatar student">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="identity-card-info">
                      <strong>{s.name}</strong>
                      <small>{s.id} · {s.class}</small>
                    </div>
                    <ArrowRight size={14} className="identity-card-arrow" />
                  </button>
                ))}
              </div>
            </div>

            {/* Parents */}
            <div className="identity-modal-group">
              <div className="identity-group-head">
                <span className="party-badge parent">
                  <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Parents &amp; Guardians ({finance.students.length})
                </span>
              </div>
              <div className="identity-options-list">
                {finance.students.map(s => (
                  <button
                    key={s.id}
                    className="identity-option-card"
                    onClick={() => {
                      setIdentityModalOpen(false);
                      setSidebar(false);
                      setDemoUser({ role: 'Parent', id: s.guardian });
                    }}
                  >
                    <div className="identity-card-avatar parent">
                      {s.guardian.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="identity-card-info">
                      <strong>{s.guardian}</strong>
                      <small>Parent of {s.name} ({s.class})</small>
                    </div>
                    <ArrowRight size={14} className="identity-card-arrow" />
                  </button>
                ))}
              </div>
            </div>

            {/* Faculty & Staff */}
            <div className="identity-modal-group">
              <div className="identity-group-head">
                <span className="party-badge teacher">
                  <UserCheck size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Faculty &amp; Staff ({finance.staff.length})
                </span>
              </div>
              <div className="identity-options-list">
                {finance.staff.map(e => (
                  <button
                    key={e.id}
                    className="identity-option-card"
                    onClick={() => {
                      setIdentityModalOpen(false);
                      setSidebar(false);
                      setDemoUser({ role: 'Employee', id: e.id });
                    }}
                  >
                    <div className="identity-card-avatar teacher">
                      {e.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="identity-card-info">
                      <strong>{e.name}</strong>
                      <small>{e.id} · {e.subject} ({e.designation ?? 'Faculty'})</small>
                    </div>
                    <ArrowRight size={14} className="identity-card-arrow" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export { CollegePortal as SchoolPortal };
