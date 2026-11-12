// Finance Workspace - Shell Component
// Wraps the FinanceProvider, manages responsive drawer state, and renders sidebar & topbar.

'use client';

import React, { useState, useEffect } from 'react';
import { FinanceProvider } from '@/lib/finance-portal/store/finance-store';
import { ToastProvider } from '@/components/finance-portal/ui/toast';
import FinanceSidebar from './finance-sidebar';
import FinanceTopbar from './finance-topbar';

export default function FinanceShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  // Close mobile drawer on route changes or resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <FinanceProvider>
      <ToastProvider>
        <div className="finance-app-shell" style={{ minHeight: '100vh', backgroundColor: 'var(--surface, #f5f5f2)' }}>
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="sidebar-backdrop open"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(16, 45, 71, 0.45)',
              zIndex: 35,
              backdropFilter: 'blur(3px)',
            }}
          />
        )}

        {/* Finance Sidebar */}
        <FinanceSidebar
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          compact={compact}
        />

        {/* Main Content Area */}
        <div
          className="main-shell finance-main-shell"
          style={{
            marginLeft: compact ? '78px' : '260px',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            transition: 'margin-left 0.2s ease',
          }}
        >
          <FinanceTopbar onToggleSidebar={() => setMobileOpen(prev => !prev)} />

          <main
            style={{
              flex: 1,
              maxWidth: '1740px',
              width: '100%',
              margin: '0 auto',
              padding: '28px 36px 40px',
            }}
          >
            {children}
          </main>

          {/* Institutional Footer */}
          <footer
            style={{
              borderTop: '1px solid var(--border, #e7e9e7)',
              padding: '18px 36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#83909d',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#25866b' }} />
              <span>Poddar International College · Finance & Accounts Division</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span>Indian Rupee (INR · ₹) Only</span>
              <span>·</span>
              <span>Financial Year 1 April to 31 March</span>
            </div>
          </footer>
        </div>
      </div>
    </ToastProvider>
  </FinanceProvider>
  );
}
