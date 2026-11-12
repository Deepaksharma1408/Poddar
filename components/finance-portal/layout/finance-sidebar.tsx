// Finance Workspace - Navigation Sidebar
// Seamless integration with Poddar Connect: shared PoddarBrandLogo, shared WorkspaceSwitcher,
// 17 real Next.js App Router routes under /finance/..., RBAC route gating.

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  AlertCircle,
  Award,
  Wallet,
  Banknote,
  BookOpen,
  Users,
  Receipt,
  Truck,
  Coins,
  PieChart,
  CalendarDays,
  Landmark,
  FileSpreadsheet,
  History,
  Settings,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';
import PoddarBrandLogo from '@/components/brand-logo';
import WorkspaceSwitcher from '@/components/workspace-switcher';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { canAccessRoute } from '@/lib/finance-portal/security/rbac';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/finance/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'REVENUE & FEES',
    items: [
      { name: 'Fees & Collections', href: '/finance/fees', icon: GraduationCap },
      { name: 'Defaulters & Dues', href: '/finance/dues', icon: AlertCircle },
      { name: 'Scholarships', href: '/finance/scholarships', icon: Award },
      { name: 'Other Income', href: '/finance/income', icon: Wallet },
    ],
  },
  {
    title: 'HUMAN RESOURCES',
    items: [
      { name: 'Payroll & Salaries', href: '/finance/payroll', icon: Banknote },
      { name: 'Guest Faculty', href: '/finance/guest-faculty', icon: BookOpen },
      { name: 'Employee Directory', href: '/finance/employees', icon: Users },
    ],
  },
  {
    title: 'EXPENDITURE',
    items: [
      { name: 'Operating Expenses', href: '/finance/expenses', icon: Receipt },
      { name: 'Vendor Directory', href: '/finance/vendors', icon: Truck },
      { name: 'Petty Cash (Imprest)', href: '/finance/petty-cash', icon: Coins },
      { name: 'Department Budgets', href: '/finance/budgets', icon: PieChart },
    ],
  },
  {
    title: 'OPERATIONS & CASH',
    items: [
      { name: 'Campus Events', href: '/finance/events', icon: CalendarDays },
      { name: 'Cash & Bank Book', href: '/finance/cashbook', icon: Landmark },
      { name: 'Financial Reports', href: '/finance/reports', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'GOVERNANCE',
    items: [
      { name: 'Audit Trail', href: '/finance/audit', icon: History },
      { name: 'System Settings', href: '/finance/settings', icon: Settings },
    ],
  },
];

export default function FinanceSidebar({
  isOpen,
  onClose,
  compact = false,
}: {
  isOpen?: boolean;
  onClose?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const { state } = useFinance();
  const currentRole = state.settings.currentRole;

  return (
    <aside
      className={`sidebar finance-sidebar ${isOpen ? 'open' : ''} ${compact ? 'compact' : ''}`}
      aria-label="Poddar Finance Navigation"
      style={{
        width: compact ? '78px' : '260px',
        backgroundColor: '#102d47',
        color: '#ffffff',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        inset: '0 auto 0 0',
        zIndex: 40,
        padding: compact ? '20px 10px 0' : '20px 16px 0',
        transition: 'width 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Mobile close button */}
      <button
        type="button"
        className="drawer-close icon-button mobile-only-close"
        aria-label="Close navigation"
        onClick={onClose}
        style={{
          display: 'none',
          position: 'absolute',
          right: '12px',
          top: '12px',
          color: '#ffffff',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <X size={20} />
      </button>

      {/* Shared Brand Logo */}
      <div className="brand" style={{ textAlign: 'center', padding: '0 8px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <PoddarBrandLogo
          variant="light"
          showTagline={!compact}
          iconOnly={compact}
          size={compact ? 36 : 42}
        />
      </div>

      {/* Top Shared Workspace Switcher */}
      <div style={{ marginTop: '16px' }}>
        <WorkspaceSwitcher current="finance" compact={compact} />
      </div>

      {/* Navigation Groups */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 0 20px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.12) transparent',
        }}
      >
        {NAV_GROUPS.map(group => {
          // Check route access permissions (handling both /route and /finance/route)
          const accessibleItems = group.items.filter(item => {
            const barePath = item.href.replace(/^\/finance/, '');
            return canAccessRoute(currentRole, barePath) || canAccessRoute(currentRole, item.href);
          });

          if (accessibleItems.length === 0) return null;

          return (
            <div key={group.title} style={{ marginBottom: '16px' }}>
              {!compact && (
                <div
                  style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    letterSpacing: '1.6px',
                    textTransform: 'uppercase',
                    color: '#708ca2',
                    padding: '4px 10px 6px',
                  }}
                >
                  {group.title}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {accessibleItems.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/finance/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      data-tooltip={compact ? item.name : undefined}
                      title={compact ? item.name : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: compact ? 'center' : 'flex-start',
                        gap: '11px',
                        padding: compact ? '10px 0' : '9px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: isActive ? 600 : 450,
                        color: isActive ? '#eadbc0' : '#a0b1c0',
                        background: isActive ? 'linear-gradient(100deg, rgba(168, 139, 81, 0.22), rgba(255, 255, 255, 0.05))' : 'transparent',
                        boxShadow: isActive ? 'inset 0 0 0 1px rgba(191, 165, 115, 0.25)' : 'none',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon
                        size={17}
                        style={{
                          color: isActive ? '#c4ab77' : '#8299ac',
                          flexShrink: 0,
                        }}
                      />
                      {!compact && (
                        <>
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </span>
                          {isActive && <ChevronRight size={13} style={{ color: '#c4ab77', flexShrink: 0 }} />}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Role Indicator Footer */}
      {!compact && (
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            fontSize: '11px',
            borderRadius: '6px',
            margin: '0 0 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={14} style={{ color: '#c4ab77', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: '#7893a9', display: 'block', fontSize: '9px', letterSpacing: '0.5px' }}>
                ACTIVE PERSONA:
              </span>
              <strong
                style={{
                  color: '#e0cfac',
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentRole}
              </strong>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
