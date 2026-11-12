// Finance Workspace - Topbar
// Global role switcher, demo date pill, backup JSON export, reset demo state, and quick navigation.

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  ChevronDown,
  RefreshCw,
  Download,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { ALL_ROLES } from '@/lib/finance-portal/security/rbac';
import type { Role } from '@/lib/finance-portal/types/finance';

const ROUTE_NAMES: Record<string, string> = {
  '/finance/dashboard': 'Dashboard',
  '/finance/fees': 'Fees & Collections',
  '/finance/dues': 'Defaulters & Dues',
  '/finance/scholarships': 'Scholarships',
  '/finance/income': 'Other Income',
  '/finance/payroll': 'Payroll & Salaries',
  '/finance/guest-faculty': 'Guest Faculty',
  '/finance/employees': 'Employee Directory',
  '/finance/expenses': 'Operating Expenses',
  '/finance/vendors': 'Vendor Directory',
  '/finance/petty-cash': 'Petty Cash (Imprest)',
  '/finance/budgets': 'Department Budgets',
  '/finance/events': 'Campus Events',
  '/finance/cashbook': 'Cash & Bank Book',
  '/finance/reports': 'Financial Reports',
  '/finance/audit': 'Audit Trail',
  '/finance/settings': 'System Settings',
};

export default function FinanceTopbar({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const { state, switchRole, currentDate, resetDemoData, exportBackupJSON } = useFinance();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  // Track scroll position to elevate the topbar smoothly
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModuleName = ROUTE_NAMES[pathname] || 'Finance';

  return (
    <header className={`topbar finance-topbar ${scrolled ? 'scrolled' : ''}`}>
      {/* Left: Mobile Toggle & Institutional Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="mobile-only-btn"
          style={{
            background: 'none',
            border: 'none',
            padding: '6px',
            color: '#475569',
            cursor: 'pointer',
            display: 'none',
          }}
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumbs Navigation */}
        <nav
          aria-label="Breadcrumb navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#83909d',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Poddar Connect
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <Link
            href="/finance/dashboard"
            style={{
              color: '#83909d',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Finance
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <strong
            style={{
              color: '#102d47',
              fontWeight: 700,
              fontSize: '12.5px',
            }}
          >
            {currentModuleName}
          </strong>
        </nav>

        {/* Campus & FY Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#102d47',
              backgroundColor: '#e8f1fa',
              padding: '3px 8px',
              borderRadius: '5px',
              border: '1px solid #d2e4f5',
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
            }}
          >
            FY {state.settings.academicYear}
          </span>
          <span style={{ fontSize: '12px', color: '#83909d' }}>·</span>
          <span
            style={{
              fontSize: '11.5px',
              color: '#64748b',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {state.settings.campusAddress}
          </span>
        </div>
      </div>

      {/* Right: Date, Role Switcher, Quick Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* Date Display Pill */}
        <div
          title={state.settings.demoDateOverride ? 'Demo date override active' : 'Live system date'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            color: state.settings.demoDateOverride ? '#ad211d' : '#475569',
            backgroundColor: state.settings.demoDateOverride ? '#fbeeed' : '#f5f5f2',
            border: `1px solid ${state.settings.demoDateOverride ? '#f2d5d4' : '#e7e9e7'}`,
            padding: '6px 11px',
            borderRadius: '6px',
          }}
        >
          <Clock size={13} style={{ color: state.settings.demoDateOverride ? '#ad211d' : '#b49662' }} />
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 550 }}>
            {currentDate}
          </span>
          {state.settings.demoDateOverride && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#ad211d',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}
            >
              Demo Override
            </span>
          )}
        </div>

        {/* Role Switcher Persona Dropdown */}
        <div ref={roleDropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setRoleMenuOpen(prev => !prev)}
            aria-expanded={roleMenuOpen}
            aria-label="Switch active persona role"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '6px 12px',
              backgroundColor: '#f5f5f2',
              border: '1px solid #e7e9e7',
              borderRadius: '6px',
              color: '#182e46',
              fontSize: '12px',
              fontWeight: 550,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Shield size={14} style={{ color: '#b49662' }} />
            <span>{state.settings.currentRole}</span>
            <ChevronDown size={14} style={{ color: '#83909d', transform: roleMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {roleMenuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                width: '230px',
                backgroundColor: '#ffffff',
                border: '1px solid #e7e9e7',
                borderRadius: '8px',
                boxShadow: '0 12px 30px rgba(16, 45, 71, 0.15)',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: '#83909d',
                  padding: '6px 10px 4px',
                  borderBottom: '1px solid #f0f2f5',
                  marginBottom: '4px',
                }}
              >
                Switch Persona (Simulated RBAC)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '280px', overflowY: 'auto' }}>
                {ALL_ROLES.map(role => {
                  const isCurrent = state.settings.currentRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        switchRole(role as Role);
                        setRoleMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: 'none',
                        background: isCurrent ? '#f5f5f2' : 'transparent',
                        color: isCurrent ? '#102d47' : '#475569',
                        fontWeight: isCurrent ? 600 : 450,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>{role}</span>
                      {isCurrent && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#b49662' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Tools Dropdown */}
        <div ref={actionsDropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setActionsMenuOpen(prev => !prev)}
            aria-expanded={actionsMenuOpen}
            aria-label="Demo actions & backup options"
            title="Demo actions & backup options"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              backgroundColor: '#f5f5f2',
              border: '1px solid #e7e9e7',
              borderRadius: '6px',
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={15} style={{ color: '#b49662' }} />
          </button>

          {actionsMenuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                width: '210px',
                backgroundColor: '#ffffff',
                border: '1px solid #e7e9e7',
                borderRadius: '8px',
                boxShadow: '0 12px 30px rgba(16, 45, 71, 0.15)',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  exportBackupJSON();
                  setActionsMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '5px',
                  border: 'none',
                  background: 'none',
                  color: '#182e46',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Download size={14} style={{ color: '#b49662' }} />
                <span>Export Backup (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset all finance data to standard factory seed data?')) {
                    resetDemoData();
                  }
                  setActionsMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '5px',
                  border: 'none',
                  background: 'none',
                  color: '#ad211d',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <RefreshCw size={14} style={{ color: '#ad211d' }} />
                <span>Reset Demo State</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
