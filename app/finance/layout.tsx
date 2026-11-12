import type { Metadata } from 'next';
import './finance.css';
import FinanceShell from '@/components/finance-portal/layout/finance-shell';

export const metadata: Metadata = {
  title: 'Finance & Accounts | Poddar International College',
  description: 'Poddar International College Finance Management Workspace — Accounts, payroll, fees, and expenditure.',
};

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="finance-app">
      <FinanceShell>{children}</FinanceShell>
    </div>
  );
}

