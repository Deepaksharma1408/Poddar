'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { canOpenPage, roles, type DemoRole } from '@/lib/erp-management';
import type { SchoolFinance } from '@/lib/school-finance';
import {
  BookOpen,
  Check,
  CheckCircle2,
  GraduationCap,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Dialog } from './finance-ui';

interface ModuleDef {
  id: string;
  name: string;
  description: string;
  icon: typeof Shield;
  permissions: {
    key: string;
    name: string;
    description: string;
    page: string;
  }[];
}

const MODULES: ModuleDef[] = [
  {
    id: 'students',
    name: 'Student Management',
    description: 'Admissions, student records, guardians, and academic profiles',
    icon: GraduationCap,
    permissions: [
      { key: 'view_students', name: 'View Student Directory', description: 'Browse and search student records', page: 'Students' },
      { key: 'edit_students', name: 'Manage Student Profiles', description: 'Modify student information and documentation', page: 'Students' },
      { key: 'mark_student_attendance', name: 'Mark Student Attendance', description: 'Record daily attendance registers', page: 'Attendance' },
      { key: 'parents_guardians', name: 'Manage Parents & Guardians', description: 'Access guardian contact information', page: 'Parents & Guardians' },
    ],
  },
  {
    id: 'academics',
    name: 'Academics & Curriculum',
    description: 'Classes, sections, teaching schedules, and examinations',
    icon: BookOpen,
    permissions: [
      { key: 'view_academics', name: 'View Teaching Timetable', description: 'Access daily schedules and periods', page: 'Academics' },
      { key: 'manage_classes', name: 'Classes & Sections', description: 'Configure classroom cohorts and teachers', page: 'Classes & Sections' },
      { key: 'exam_results', name: 'Examinations & Results', description: 'Manage exam schedules and grading records', page: 'Examinations & Results' },
    ],
  },
  {
    id: 'finance',
    name: 'Fee & Billing Administration',
    description: 'Fee collection, plans, concessions, and accounting ledgers',
    icon: Wallet,
    permissions: [
      { key: 'collect_fees', name: 'Collect Fees & Issue Receipts', description: 'Process payments and print receipts', page: 'Fees & payments' },
      { key: 'fee_admin', name: 'Fee Structures & Adjustments', description: 'Manage templates, waivers, and late fees', page: 'Fee administration' },
      { key: 'bank_rec', name: 'Bank Reconciliation', description: 'Reconcile NEFT statements and deposits', page: 'Bank reconciliation' },
      { key: 'accounting', name: 'Accounting & General Ledgers', description: 'Access balance sheets and trial balances', page: 'Accounting' },
    ],
  },
  {
    id: 'payroll',
    name: 'Payroll & Salary Management',
    description: 'Faculty salary calculations, multi-tier approvals, and NEFT transfers',
    icon: Wallet,
    permissions: [
      { key: 'view_payroll', name: 'Review Monthly Payroll', description: 'Inspect attendance-adjusted salary calculations', page: 'Payroll' },
      { key: 'approve_payroll', name: 'Disburse & Approve Salary', description: 'Authorize NEFT transfers and lock runs', page: 'Payroll' },
    ],
  },
  {
    id: 'hr',
    name: 'HR & Faculty Leave Management',
    description: 'Staff directory, biometric attendance, and leave workflows',
    icon: Users,
    permissions: [
      { key: 'staff_directory', name: 'Teachers & Staff Directory', description: 'View faculty profiles and designations', page: 'Teachers' },
      { key: 'leave_approvals', name: 'Review Leave Requests', description: 'Approve or reject paid/unpaid leaves', page: 'Leave requests' },
      { key: 'leave_calendar', name: 'Campus Leave Calendar', description: 'Inspect institutional leave schedules', page: 'Leave calendar' },
      { key: 'emp_attendance', name: 'Staff Attendance Register', description: 'Manage employee daily check-ins', page: 'Employee attendance' },
      { key: 'hr_policies', name: 'HR Entitlement Policies', description: 'Configure leave quotas and carryovers', page: 'HR policies' },
    ],
  },
  {
    id: 'campus',
    name: 'Campus Services & Support',
    description: 'Transport fleet, library circulation, and helpdesk tickets',
    icon: BookOpen,
    permissions: [
      { key: 'transport', name: 'Campus Transport Fleet', description: 'Manage bus routes and student allocations', page: 'Transport' },
      { key: 'library', name: 'Library Management', description: 'Track book circulation and borrowings', page: 'Library' },
      { key: 'support', name: 'Campus Support Desk', description: 'Respond to queries and support tickets', page: 'Support desk' },
    ],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Institutional statements, fee reports, and audit logs',
    icon: BookOpen,
    permissions: [
      { key: 'view_reports', name: 'Institutional Reports', description: 'Export fee statements and enrollment metrics', page: 'Reports' },
      { key: 'notifications', name: 'Notification Center', description: 'Review system dispatches and SMS alerts', page: 'Notifications' },
    ],
  },
  {
    id: 'admin',
    name: 'System Administration',
    description: 'Platform settings, permissions, and security audit logs',
    icon: Settings,
    permissions: [
      { key: 'campus_settings', name: 'Campus Profile & Settings', description: 'Configure college profile, academic sessions, and branding', page: 'Settings' },
      { key: 'audit_logs', name: 'Audit Trail & Logs', description: 'Review administrator activity logs', page: 'Audit Trail / System Logs' },
    ],
  },
];

const ROLE_DESCRIPTIONS: Record<DemoRole, string> = {
  'Super Admin': 'Unrestricted access to all institutional workspaces and settings',
  Principal: 'Executive academic head with student and staff oversight',
  Management: 'Board-level institutional governance and financial approvals',
  'HR Admin': 'Employee lifecycle, attendance, and faculty leave management',
  'Accounts Admin': 'Fee structures, payroll disbursements, and financial closes',
  Accountant: 'Daily collections, payment allocations, and reconciliation',
  Cashier: 'Front-desk fee collection and physical receipt issuance',
  HOD: 'Academic department head managing timetable and faculty leaves',
  Teacher: 'Classroom teaching staff with student attendance view',
  'Non-teaching Staff': 'Administrative, laboratory, and operational personnel',
  Student: 'Self-service portal for academics, timetable, and receipts',
  Parent: 'Guardian self-service portal for payments and progress tracking',
};

export default function Permissions({
  data,
  setData,
  pages,
}: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  pages: string[];
}) {
  const [selectedRole, setSelectedRole] = useState<DemoRole>('Accounts Admin');
  const [search, setSearch] = useState('');
  const [tempAccess, setTempAccess] = useState<Record<DemoRole, string[]>>(() => {
    const initial: Partial<Record<DemoRole, string[]>> = {};
    for (const r of roles) {
      initial[r] = data.roleAccess?.[r] ?? pages.filter(p => canOpenPage(r, p));
    }
    return initial as Record<DemoRole, string[]>;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [discardModal, setDiscardModal] = useState<DemoRole | null>(null);
  const [toast, setToast] = useState('');

  const currentRoleAccess = tempAccess[selectedRole] ?? [];

  // Toggle single permission page
  const handleTogglePage = (pageName: string, enabled: boolean) => {
    const current = tempAccess[selectedRole] ?? [];
    const next = enabled
      ? [...new Set([...current, pageName])]
      : current.filter(p => p !== pageName);
    setTempAccess(cur => ({ ...cur, [selectedRole]: next }));
    setHasChanges(true);
  };

  // Bulk module toggle
  const handleToggleModule = (module: ModuleDef, enable: boolean) => {
    const current = tempAccess[selectedRole] ?? [];
    const modulePages = module.permissions.map(p => p.page);
    const next = enable
      ? [...new Set([...current, ...modulePages])]
      : current.filter(p => !modulePages.includes(p));
    setTempAccess(cur => ({ ...cur, [selectedRole]: next }));
    setHasChanges(true);
  };

  // Quick Preset Templates
  const handleApplyPreset = (preset: 'auditor' | 'full' | 'head' | 'reset') => {
    let nextPages: string[] = [];
    if (preset === 'full') {
      nextPages = [...pages];
    } else if (preset === 'auditor') {
      nextPages = ['Overview', 'Students', 'Fees & payments', 'Accounting', 'Reports'];
    } else if (preset === 'head') {
      nextPages = ['Overview', 'Students', 'Attendance', 'Academics', 'Leave requests', 'Leave calendar', 'Employee attendance'];
    } else if (preset === 'reset') {
      nextPages = pages.filter(p => canOpenPage(selectedRole, p));
    }
    setTempAccess(cur => ({ ...cur, [selectedRole]: nextPages }));
    setHasChanges(true);
    setToast(`Applied preset for ${selectedRole}`);
  };

  // Commit changes to data.roleAccess
  const handleSave = () => {
    setData(cur => ({
      ...cur,
      roleAccess: { ...cur.roleAccess, ...tempAccess },
    }));
    setHasChanges(false);
    setToast('Role permissions updated successfully.');
  };

  // Revert changes
  const handleDiscard = () => {
    const initial: Partial<Record<DemoRole, string[]>> = {};
    for (const r of roles) {
      initial[r] = data.roleAccess?.[r] ?? pages.filter(p => canOpenPage(r, p));
    }
    setTempAccess(initial as Record<DemoRole, string[]>);
    setHasChanges(false);
    setToast('Unsaved changes discarded.');
  };

  // Role click with dirty check
  const handleSelectRole = (r: DemoRole) => {
    if (hasChanges && r !== selectedRole) {
      setDiscardModal(r);
      return;
    }
    setSelectedRole(r);
  };

  return (
    <>
      <div className="workspace-intro">
        <div>
          <span className="editorial-kicker">GOVERNANCE &amp; SECURITY / ROLE ACCESS</span>
          <h2>Role &amp; Permission Management.<br /><em>Granular institutional security.</em></h2>
          <p>Define precise workspace visibility and operational privileges across all 12 institutional roles.</p>
        </div>
      </div>

      {toast && (
        <div className="info-strip" style={{ marginBottom: 18 }}>
          <CheckCircle2 size={16} color="#059669" /> {toast}
        </div>
      )}

      <div className="permissions-two-panel">
        {/* Left Panel: 12 Institutional Roles */}
        <div className="roles-sidebar-panel">
          <div className="roles-sidebar-title">
            <span>Institutional Roles ({roles.length})</span>
            <Shield size={15} color="#234D70" />
          </div>

          {roles.map(r => {
            const isSelected = r === selectedRole;
            const count = (tempAccess[r] ?? []).length;
            return (
              <div
                key={r}
                className={`role-card-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectRole(r)}
              >
                <div>
                  <strong>{r}</strong>
                  <small>{ROLE_DESCRIPTIONS[r]}</small>
                </div>
                <span
                  className="identity-badge"
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.2)' : '#E2E8F0',
                    color: isSelected ? '#ffffff' : '#475569',
                    fontSize: 10,
                  }}
                >
                  {count} modules
                </span>
              </div>
            );
          })}
        </div>

        {/* Main Panel: Grouped Permissions Matrix */}
        <div className="permissions-main-panel">
          {/* Presets and Search Toolbar */}
          <div className="matrix-presets-strip">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
              Quick Presets:
            </span>
            <button className="preset-pill" onClick={() => handleApplyPreset('full')}>
              <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
              Full Administrator
            </button>
            <button className="preset-pill" onClick={() => handleApplyPreset('head')}>
              <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} />
              Department Head
            </button>
            <button className="preset-pill" onClick={() => handleApplyPreset('auditor')}>
              <Shield size={12} style={{ display: 'inline', marginRight: 4 }} />
              Read-Only Auditor
            </button>
            <button className="preset-pill" onClick={() => handleApplyPreset('reset')}>
              <RotateCcw size={12} style={{ display: 'inline', marginRight: 4 }} />
              Reset to Defaults
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="input-search" style={{ padding: '6px 12px' }}>
                <Search size={14} />
                <input
                  placeholder="Filter permissions..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: 160, fontSize: 11 }}
                />
              </label>
            </div>
          </div>

          {/* Module Cards */}
          {MODULES.map(mod => {
            const modPerms = mod.permissions.filter(
              p =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.description.toLowerCase().includes(search.toLowerCase())
            );
            if (!modPerms.length) return null;

            const allSelected = modPerms.every(p => currentRoleAccess.includes(p.page));
            const noneSelected = modPerms.every(p => !currentRoleAccess.includes(p.page));

            return (
              <section key={mod.id} className="matrix-module-card">
                <div className="matrix-module-head">
                  <div>
                    <h4>{mod.name}</h4>
                    <p style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{mod.description}</p>
                  </div>
                  <div className="matrix-module-actions">
                    <button
                      className="button secondary small"
                      onClick={() => handleToggleModule(mod, true)}
                      disabled={allSelected}
                    >
                      Select All
                    </button>
                    <button
                      className="button secondary small"
                      onClick={() => handleToggleModule(mod, false)}
                      disabled={noneSelected}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>CAPABILITY / WORKSPACE</th>
                        <th>DESCRIPTION</th>
                        <th style={{ textAlign: 'center', width: 120 }}>STATUS</th>
                        <th style={{ textAlign: 'center', width: 90 }}>ACCESS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modPerms.map(p => {
                        const isGranted = currentRoleAccess.includes(p.page);
                        return (
                          <tr key={p.key}>
                            <td>
                              <strong>{p.name}</strong>
                              <small className="block" style={{ color: '#718096' }}>Workspace: {p.page}</small>
                            </td>
                            <td>{p.description}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-pill ${isGranted ? 'good' : 'neutral'}`}>
                                {isGranted ? 'Granted' : 'Restricted'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={isGranted}
                                  onChange={e => handleTogglePage(p.page, e.target.checked)}
                                  disabled={selectedRole === 'Super Admin'}
                                  aria-label={`Allow ${p.name}`}
                                />
                                <span className="toggle-slider" />
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Sticky Unsaved Changes Bar */}
      {hasChanges && (
        <div className="sticky-unsaved-bar">
          <div>
            <strong>Unsaved Permission Changes Pending</strong>
            <p>Modifications for {selectedRole} have not yet been committed to this campus session.</p>
          </div>
          <div className="sticky-unsaved-actions">
            <button
              className="button secondary"
              style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={handleDiscard}
            >
              <X size={14} /> Discard Changes
            </button>
            <button className="button gold-button" onClick={handleSave}>
              <Check size={14} /> Save &amp; Apply Changes
            </button>
          </div>
        </div>
      )}

      {/* Discard Confirmation Dialog */}
      {discardModal && (
        <Dialog
          title="Unsaved Changes Warning"
          kicker="ROLE ACCESS"
          onClose={() => setDiscardModal(null)}
        >
          <p className="dialog-description">
            You have unsaved permission modifications for <strong>{selectedRole}</strong>. Switching roles without saving will revert these edits.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <button
              className="button secondary"
              onClick={() => {
                handleDiscard();
                setSelectedRole(discardModal);
                setDiscardModal(null);
              }}
            >
              Discard &amp; Switch
            </button>
            <button
              className="button primary"
              onClick={() => {
                handleSave();
                setSelectedRole(discardModal);
                setDiscardModal(null);
              }}
            >
              Save &amp; Switch
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
