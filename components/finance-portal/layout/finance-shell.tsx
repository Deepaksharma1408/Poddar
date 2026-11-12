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

  // Close mobile drawer on resize
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
        <div className="finance-app-shell">
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
                zIndex: 45,
                backdropFilter: 'blur(4px)',
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
          <div className={`main-shell finance-main-shell ${compact ? 'compact' : ''}`}>
            <FinanceTopbar onToggleSidebar={() => setMobileOpen(prev => !prev)} />

            <main>
              {children}
            </main>

            {/* Institutional Footer */}
            <footer
              style={{
                borderTop: '1px solid #e7e9e7',
                padding: '18px 36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#83909d',
                backgroundColor: '#ffffff',
                flexShrink: 0,
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
