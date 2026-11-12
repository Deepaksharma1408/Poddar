// College Finance Portal - Enterprise Double-Entry Accounting & Ledgers Module
// Chart of Accounts, General Ledger, Balanced Journal Vouchers, Trial Balance,
// Income & Expenditure Statement, Balance Sheet, and Fiscal Year Lock.

'use client';

import React, { useState, useMemo } from 'react';
import {
  Scale,
  BookOpen,
  Plus,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Shield,
  Search,
  Lock,
  Unlock,
  ChevronRight,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import {
  computeTrialBalance,
  computeIncomeAndExpenditure,
  computeBalanceSheet,
  validateJournalVoucherLines,
} from '@/lib/finance-portal/finance/accounting';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import type {
  AccountHead,
  JournalVoucher,
  JournalEntryLine,
  AccountGroup,
} from '@/lib/finance-portal/types/finance';

type Tab = 'coa' | 'ledger' | 'journals' | 'trial-balance' | 'statements' | 'year-close';

export default function AccountingPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('coa');
  const [selectedLedgerAccountCode, setSelectedLedgerAccountCode] = useState<string>('1010');
  const [coaSearch, setCoaSearch] = useState('');
  const [coaGroupFilter, setCoaGroupFilter] = useState<string>('ALL');

  // Modal: New Journal Voucher
  const [jvModalOpen, setJvModalOpen] = useState(false);
  const [jvNarration, setJvNarration] = useState('');
  const [jvType, setJvType] = useState<JournalVoucher['voucherType']>('Journal');
  const [jvReference, setJvReference] = useState('');
  const [jvLines, setJvLines] = useState<
    { accountCode: string; debitRupees: string; creditRupees: string; narration: string }[]
  >([
    { accountCode: '5010', debitRupees: '', creditRupees: '0', narration: '' },
    { accountCode: '1010', debitRupees: '0', creditRupees: '', narration: '' },
  ]);

  // Modal: New Account Head
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [accCode, setAccCode] = useState('');
  const [accName, setAccName] = useState('');
  const [accGroup, setAccGroup] = useState<AccountGroup>('Expense');
  const [accDesc, setAccDesc] = useState('');

  // Calculations
  const trialBalance = useMemo(() => {
    return computeTrialBalance(state.chartOfAccounts, state.journalVouchers);
  }, [state.chartOfAccounts, state.journalVouchers]);

  const incomeExpenditure = useMemo(() => {
    return computeIncomeAndExpenditure(state.chartOfAccounts, state.journalVouchers);
  }, [state.chartOfAccounts, state.journalVouchers]);

  const balanceSheet = useMemo(() => {
    return computeBalanceSheet(state.chartOfAccounts, state.journalVouchers);
  }, [state.chartOfAccounts, state.journalVouchers]);

  // General Ledger selected entries
  const selectedAccount = state.chartOfAccounts.find(a => a.code === selectedLedgerAccountCode) || state.chartOfAccounts[0];

  const ledgerTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    const entries: {
      date: string;
      voucherNumber: string;
      narration: string;
      debitPaise: number;
      creditPaise: number;
    }[] = [];

    state.journalVouchers
      .filter(v => v.status === 'Posted')
      .forEach(v => {
        v.lines.forEach(line => {
          if (line.accountCode === selectedAccount.code) {
            entries.push({
              date: v.date,
              voucherNumber: v.voucherNumber,
              narration: line.narration || v.narration,
              debitPaise: line.debitPaise,
              creditPaise: line.creditPaise,
            });
          }
        });
      });

    return entries;
  }, [state.journalVouchers, selectedAccount]);

  // JV validation state
  const currentJvValidation = useMemo(() => {
    const formattedLines: JournalEntryLine[] = jvLines.map((l, i) => {
      const acc = state.chartOfAccounts.find(a => a.code === l.accountCode);
      return {
        id: `JVL-${i}`,
        accountId: acc?.id || '',
        accountCode: l.accountCode,
        accountName: acc?.name || '',
        debitPaise: toPaise(l.debitRupees || '0'),
        creditPaise: toPaise(l.creditRupees || '0'),
        narration: l.narration,
      };
    });
    return validateJournalVoucherLines(formattedLines);
  }, [jvLines, state.chartOfAccounts]);

  // Handle Save Journal Voucher
  const handleSaveJournalVoucher = () => {
    if (!jvNarration.trim()) {
      showToast('Validation Error', 'Journal voucher narration is required.', 'error');
      return;
    }

    if (!currentJvValidation.valid) {
      showToast('Unbalanced Voucher', currentJvValidation.error || 'Debits must equal Credits.', 'error');
      return;
    }

    const formattedLines: JournalEntryLine[] = jvLines.map((l, i) => {
      const acc = state.chartOfAccounts.find(a => a.code === l.accountCode);
      return {
        id: `JVL-${Date.now()}-${i}`,
        accountId: acc?.id || '',
        accountCode: l.accountCode,
        accountName: acc?.name || '',
        debitPaise: toPaise(l.debitRupees || '0'),
        creditPaise: toPaise(l.creditRupees || '0'),
        narration: l.narration,
      };
    });

    const vNum = `JV-${new Date().getFullYear()}-${String(state.journalVouchers.length + 1).padStart(3, '0')}`;
    const newVoucher: JournalVoucher = {
      id: `JV-${Date.now()}`,
      voucherNumber: vNum,
      date: currentDate,
      voucherType: jvType,
      lines: formattedLines,
      totalPaise: currentJvValidation.totalDebitPaise,
      narration: jvNarration.trim(),
      status: 'Posted',
      reference: jvReference.trim() || undefined,
      createdBy: state.settings.currentRole,
      postedAt: new Date().toISOString(),
    };

    dispatch({ type: 'RECORD_JOURNAL_VOUCHER', voucher: newVoucher });
    showToast('Voucher Posted', `Journal Voucher ${vNum} posted successfully.`, 'success');

    setJvModalOpen(false);
    setJvNarration('');
    setJvReference('');
    setJvLines([
      { accountCode: '5010', debitRupees: '', creditRupees: '0', narration: '' },
      { accountCode: '1010', debitRupees: '0', creditRupees: '', narration: '' },
    ]);
  };

  // Handle Create Account Head
  const handleCreateAccount = () => {
    if (!accCode.trim() || !accName.trim()) {
      showToast('Validation Error', 'Account code and name are required.', 'error');
      return;
    }

    const exists = state.chartOfAccounts.some(a => a.code === accCode.trim());
    if (exists) {
      showToast('Account Exists', `Account code ${accCode} is already assigned.`, 'error');
      return;
    }

    const newAcc: AccountHead = {
      id: `ACC-${Date.now()}`,
      code: accCode.trim(),
      name: accName.trim(),
      group: accGroup,
      balancePaise: 0,
      description: accDesc.trim() || undefined,
      isActive: true,
    };

    dispatch({ type: 'ADD_ACCOUNT_HEAD', account: newAcc });
    showToast('Account Created', `Account ${newAcc.code} - ${newAcc.name} added to Chart of Accounts.`, 'success');

    setAccModalOpen(false);
    setAccCode('');
    setAccName('');
    setAccDesc('');
  };

  const filteredCOA = state.chartOfAccounts.filter(a => {
    const matchesSearch = `${a.code} ${a.name} ${a.description || ''}`.toLowerCase().includes(coaSearch.toLowerCase());
    const matchesGroup = coaGroupFilter === 'ALL' || a.group === coaGroupFilter;
    return matchesSearch && matchesGroup;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b49662', marginBottom: '4px' }}>
            DOUBLE-ENTRY FINANCIAL ACCOUNTING
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 750, color: '#102d47', margin: 0 }}>
            Accounting & General Ledgers
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Official institutional Chart of Accounts, balanced Journal Vouchers, Trial Balance and Financial Statements.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setAccModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#102d47',
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            <span>New Account Head</span>
          </button>

          <button
            onClick={() => setJvModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#102d47',
              border: 'none',
              borderRadius: '7px',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 45, 71, 0.1)',
            }}
          >
            <Scale size={13} />
            <span>New Journal Voucher</span>
          </button>
        </div>
      </div>

      {/* 2. Tab Navigation Bar */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', overflowX: 'auto' }}>
        {[
          { id: 'coa', label: 'Chart of Accounts', icon: BookOpen },
          { id: 'ledger', label: 'General Ledger', icon: Scale },
          { id: 'journals', label: 'Journal Vouchers', icon: FileSpreadsheet },
          { id: 'trial-balance', label: 'Trial Balance', icon: CheckCircle2 },
          { id: 'statements', label: 'Balance Sheet & P&L', icon: Download },
          { id: 'year-close', label: 'Fiscal Year Closing', icon: Lock },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                border: 'none',
                borderBottom: isActive ? '2.5px solid #102d47' : '2.5px solid transparent',
                background: 'transparent',
                color: isActive ? '#102d47' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} style={{ color: isActive ? '#b49662' : '#83909d' }} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CHART OF ACCOUNTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'coa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search & Filter Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '6px 12px', width: '320px' }}>
              <Search size={14} style={{ color: '#83909d' }} />
              <input
                placeholder="Search by code, account name or head..."
                value={coaSearch}
                onChange={e => setCoaSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%', background: 'transparent' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(grp => (
                <button
                  key={grp}
                  onClick={() => setCoaGroupFilter(grp)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: coaGroupFilter === grp ? '#102d47' : '#e2e8f0',
                    background: coaGroupFilter === grp ? '#102d47' : '#ffffff',
                    color: coaGroupFilter === grp ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>

          {/* COA Table */}
          <div className="card-surface" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>CODE</th>
                    <th>ACCOUNT HEAD NAME</th>
                    <th>ACCOUNT GROUP</th>
                    <th>DESCRIPTION</th>
                    <th style={{ textAlign: 'right' }}>BALANCE (INR)</th>
                    <th style={{ textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCOA.map(acc => (
                    <tr key={acc.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', fontSize: '12px', color: '#102d47' }}>
                          {acc.code}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: '#1e293b' }}>{acc.name}</strong>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background:
                              acc.group === 'Asset'
                                ? '#e8f1fa'
                                : acc.group === 'Liability'
                                ? '#fbeeed'
                                : acc.group === 'Revenue'
                                ? '#edf7f1'
                                : acc.group === 'Expense'
                                ? '#fbf6eb'
                                : '#f0f2f5',
                            color:
                              acc.group === 'Asset'
                                ? '#102d47'
                                : acc.group === 'Liability'
                                ? '#ad211d'
                                : acc.group === 'Revenue'
                                ? '#25866b'
                                : acc.group === 'Expense'
                                ? '#8c6d32'
                                : '#475569',
                          }}
                        >
                          {acc.group}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '11.5px' }}>{acc.description || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#102d47' }} className="tabular-nums">
                        {formatINR(Math.abs(acc.balancePaise))}
                        <small style={{ fontSize: '10px', color: '#83909d', marginLeft: '4px' }}>
                          {acc.balancePaise >= 0 ? (acc.group === 'Asset' || acc.group === 'Expense' ? 'Dr' : 'Cr') : (acc.group === 'Asset' || acc.group === 'Expense' ? 'Cr' : 'Dr')}
                        </small>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedLedgerAccountCode(acc.code);
                            setActiveTab('ledger');
                          }}
                          style={{
                            border: 'none',
                            background: '#f0f4fa',
                            color: '#102d47',
                            padding: '4px 10px',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: GENERAL LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Account Selector Bar */}
          <div className="card-surface" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Select Account Head:</span>
              <select
                value={selectedLedgerAccountCode}
                onChange={e => setSelectedLedgerAccountCode(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#102d47',
                  background: '#ffffff',
                  outline: 'none',
                }}
              >
                {state.chartOfAccounts.map(a => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name} ({a.group})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#83909d', textTransform: 'uppercase', fontWeight: 600 }}>Net Account Balance</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#102d47' }} className="tabular-nums">
                  {selectedAccount ? formatINR(Math.abs(selectedAccount.balancePaise)) : '₹0'}
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Entries Table */}
          <div className="card-surface" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>VOUCHER NUMBER</th>
                    <th>TRANSACTION NARRATION</th>
                    <th style={{ textAlign: 'right' }}>DEBIT (INR)</th>
                    <th style={{ textAlign: 'right' }}>CREDIT (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerTransactions.length > 0 ? (
                    ledgerTransactions.map((tx, idx) => (
                      <tr key={idx}>
                        <td style={{ color: '#64748b' }}>{tx.date}</td>
                        <td>
                          <strong style={{ fontFamily: 'monospace', color: '#102d47' }}>{tx.voucherNumber}</strong>
                        </td>
                        <td>
                          <span style={{ color: '#1e293b' }}>{tx.narration}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: tx.debitPaise > 0 ? '#102d47' : '#83909d' }} className="tabular-nums">
                          {tx.debitPaise > 0 ? formatINR(tx.debitPaise) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: tx.creditPaise > 0 ? '#102d47' : '#83909d' }} className="tabular-nums">
                          {tx.creditPaise > 0 ? formatINR(tx.creditPaise) : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#83909d' }}>
                        No transactions posted for this account in the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: JOURNAL VOUCHERS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'journals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#102d47', margin: 0 }}>
                Posted Journal Vouchers Register
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
                Balanced dual-entry vouchers enforcing Debits = Credits
              </p>
            </div>
            <button
              onClick={() => setJvModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: '#102d47',
                border: 'none',
                borderRadius: '7px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              <span>Record New Journal Entry</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {state.journalVouchers.map(jv => (
              <div
                key={jv.id}
                className="card-surface"
                style={{ padding: '18px 20px', borderLeft: '4px solid #102d47' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#102d47', fontFamily: 'monospace' }}>
                        {jv.voucherNumber}
                      </strong>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#e8f1fa', color: '#102d47' }}>
                        {jv.voucherType} Voucher
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>· {jv.date}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#1e293b', marginTop: '4px', fontWeight: 500 }}>
                      {jv.narration}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#102d47' }} className="tabular-nums">
                      {formatINR(jv.totalPaise)}
                    </div>
                    <small style={{ fontSize: '10px', color: '#25866b', fontWeight: 600 }}>
                      Status: {jv.status}
                    </small>
                  </div>
                </div>

                {/* Sub-table with individual debits and credits */}
                <div style={{ background: '#f8faf7', borderRadius: '6px', padding: '8px 12px', border: '1px solid #edf0e9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1.8fr 1fr 1fr', fontSize: '10px', fontWeight: 700, color: '#83909d', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                    <span>CODE</span>
                    <span>ACCOUNT HEAD</span>
                    <span style={{ textAlign: 'right' }}>DEBIT</span>
                    <span style={{ textAlign: 'right' }}>CREDIT</span>
                  </div>
                  {jv.lines.map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1.8fr 1fr 1fr',
                        fontSize: '11.5px',
                        padding: '6px 0',
                        borderBottom: idx < jv.lines.length - 1 ? '1px dashed #e2e8f0' : 'none',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{line.accountCode}</span>
                      <span style={{ color: '#102d47', fontWeight: 500 }}>{line.accountName}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: line.debitPaise > 0 ? '#102d47' : '#83909d' }}>
                        {line.debitPaise > 0 ? formatINR(line.debitPaise) : '—'}
                      </span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: line.creditPaise > 0 ? '#102d47' : '#83909d' }}>
                        {line.creditPaise > 0 ? formatINR(line.creditPaise) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: TRIAL BALANCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'trial-balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Banner */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              background: trialBalance.isBalanced ? '#edf7f1' : '#fbeeed',
              border: `1px solid ${trialBalance.isBalanced ? '#25866b' : '#ad211d'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {trialBalance.isBalanced ? (
                <CheckCircle2 size={18} style={{ color: '#25866b' }} />
              ) : (
                <AlertCircle size={18} style={{ color: '#ad211d' }} />
              )}
              <div>
                <strong style={{ fontSize: '13px', color: trialBalance.isBalanced ? '#25866b' : '#ad211d' }}>
                  {trialBalance.isBalanced
                    ? 'Trial Balance is Mathematically Balanced'
                    : 'Discrepancy Detected in Trial Balance'}
                </strong>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                  Total Debits match Total Credits across all Chart of Accounts heads.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#83909d', textTransform: 'uppercase', fontWeight: 600 }}>Total Debits</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#102d47' }} className="tabular-nums">
                  {formatINR(trialBalance.totalDebitPaise)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#83909d', textTransform: 'uppercase', fontWeight: 600 }}>Total Credits</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#102d47' }} className="tabular-nums">
                  {formatINR(trialBalance.totalCreditPaise)}
                </div>
              </div>
            </div>
          </div>

          {/* Trial Balance Table */}
          <div className="card-surface" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ACCOUNT CODE</th>
                    <th>ACCOUNT HEAD</th>
                    <th>CLASSIFICATION</th>
                    <th style={{ textAlign: 'right' }}>DEBIT BALANCE (INR)</th>
                    <th style={{ textAlign: 'right' }}>CREDIT BALANCE (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.rows.map(r => (
                    <tr key={r.accountCode}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#102d47' }}>{r.accountCode}</strong>
                      </td>
                      <td>
                        <span style={{ color: '#1e293b', fontWeight: 500 }}>{r.accountName}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>{r.group}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: r.debitPaise > 0 ? '#102d47' : '#83909d' }} className="tabular-nums">
                        {r.debitPaise > 0 ? formatINR(r.debitPaise) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: r.creditPaise > 0 ? '#102d47' : '#83909d' }} className="tabular-nums">
                        {r.creditPaise > 0 ? formatINR(r.creditPaise) : '—'}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr style={{ background: '#f8faf7', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={3}>
                      <strong style={{ color: '#102d47', fontSize: '12.5px' }}>GRAND TOTAL</strong>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#102d47', fontSize: '13px' }} className="tabular-nums">
                      {formatINR(trialBalance.totalDebitPaise)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#102d47', fontSize: '13px' }} className="tabular-nums">
                      {formatINR(trialBalance.totalCreditPaise)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: FINANCIAL STATEMENTS (Balance Sheet & Income Statement) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'statements' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Income & Expenditure Statement */}
          <div className="card-surface" style={{ padding: '20px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#b49662', textTransform: 'uppercase' }}>
                STATEMENT OF OPERATING ACTIVITIES
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#102d47', margin: '2px 0 0' }}>
                Income & Expenditure Account
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                Academic Year 2026-27 (Caution deposits excluded as liability)
              </p>
            </div>

            {/* Revenues */}
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '11px', color: '#25866b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                A. Earned Institutional Revenues
              </strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {incomeExpenditure.revenues.map(rev => (
                  <div key={rev.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#334155' }}>{rev.name}</span>
                    <strong style={{ color: '#102d47' }} className="tabular-nums">{formatINR(rev.amountPaise)}</strong>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ color: '#102d47' }}>Total Revenue (A)</span>
                  <span style={{ color: '#25866b' }}>{formatINR(incomeExpenditure.totalRevenuePaise)}</span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '11px', color: '#ad211d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                B. Operating Expenditures
              </strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {incomeExpenditure.expenses.map(exp => (
                  <div key={exp.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#334155' }}>{exp.name}</span>
                    <strong style={{ color: '#102d47' }} className="tabular-nums">{formatINR(exp.amountPaise)}</strong>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ color: '#102d47' }}>Total Expenditure (B)</span>
                  <span style={{ color: '#ad211d' }}>{formatINR(incomeExpenditure.totalExpensePaise)}</span>
                </div>
              </div>
            </div>

            {/* Net Surplus / Deficit */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                background: incomeExpenditure.isSurplus ? '#edf7f1' : '#fbeeed',
                border: `1px solid ${incomeExpenditure.isSurplus ? '#25866b' : '#ad211d'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: '12.5px', color: incomeExpenditure.isSurplus ? '#25866b' : '#ad211d' }}>
                  NET OPERATING {incomeExpenditure.isSurplus ? 'SURPLUS' : 'DEFICIT'} (A - B)
                </strong>
                <p style={{ fontSize: '10.5px', color: '#64748b', margin: '2px 0 0' }}>
                  Transferred to Capital Fund Reserves
                </p>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: incomeExpenditure.isSurplus ? '#25866b' : '#ad211d' }}>
                {formatINR(Math.abs(incomeExpenditure.surplusPaise))}
              </div>
            </div>
          </div>

          {/* Balance Sheet */}
          <div className="card-surface" style={{ padding: '20px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#b49662', textTransform: 'uppercase' }}>
                STATEMENT OF FINANCIAL POSITION
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#102d47', margin: '2px 0 0' }}>
                Institutional Balance Sheet
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                As of {currentDate} (Capital Fund & Liabilities vs Assets)
              </p>
            </div>

            {/* Assets */}
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '11px', color: '#102d47', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                I. Assets & Liquid Holdings
              </strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {balanceSheet.assets.map(ast => (
                  <div key={ast.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#334155' }}>{ast.name}</span>
                    <strong style={{ color: '#102d47' }} className="tabular-nums">{formatINR(ast.amountPaise)}</strong>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ color: '#102d47' }}>Total Assets</span>
                  <span style={{ color: '#102d47' }}>{formatINR(balanceSheet.totalAssetsPaise)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities & Capital Fund */}
            <div>
              <strong style={{ fontSize: '11px', color: '#102d47', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                II. Capital Fund & Liabilities
              </strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {balanceSheet.capitalAndSurplus.map(cap => (
                  <div key={cap.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#334155' }}>{cap.name}</span>
                    <strong style={{ color: '#102d47' }} className="tabular-nums">{formatINR(cap.amountPaise)}</strong>
                  </div>
                ))}
                {balanceSheet.liabilities.map(liab => (
                  <div key={liab.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#334155' }}>{liab.name}</span>
                    <strong style={{ color: '#102d47' }} className="tabular-nums">{formatINR(liab.amountPaise)}</strong>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ color: '#102d47' }}>Total Capital & Liabilities</span>
                  <span style={{ color: '#102d47' }}>{formatINR(balanceSheet.totalLiabilitiesAndEquityPaise)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: FISCAL YEAR CLOSING */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'year-close' && (
        <div className="card-surface" style={{ padding: '24px', maxWidth: '700px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <Lock size={20} style={{ color: '#b49662' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 750, color: '#102d47', margin: 0 }}>
                Financial Year Closing & Ledger Lock
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                Finalize accounts for Indian Financial Year (1 April – 31 March)
              </p>
            </div>
          </div>

          <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', marginBottom: '18px' }}>
            Closing the fiscal year archives all posted journal vouchers, generates closing Trial Balance, rolls forward
            retained operating surplus into the Poddar Trust Capital Endowment Fund, and sets next year opening ledger balances.
          </p>

          <div style={{ padding: '14px', background: '#fafbf9', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Active Accounting Period:</span>
              <strong style={{ color: '#102d47' }}>1 April 2026 to 31 March 2027</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Year Status:</span>
              <strong style={{ color: state.settings.fiscalYearClosed ? '#ad211d' : '#25866b' }}>
                {state.settings.fiscalYearClosed ? 'Closed & Locked' : 'Open for Posting'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#64748b' }}>Trial Balance State:</span>
              <strong style={{ color: trialBalance.isBalanced ? '#25866b' : '#ad211d' }}>
                {trialBalance.isBalanced ? 'Balanced (Ready for audit)' : 'Discrepancy must be resolved first'}
              </strong>
            </div>
          </div>

          {state.settings.fiscalYearClosed ? (
            <button
              onClick={() => dispatch({ type: 'REOPEN_FISCAL_YEAR', reason: 'Administrative audit amendment' })}
              style={{
                padding: '10px 18px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#102d47',
                cursor: 'pointer',
              }}
            >
              <Unlock size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Reopen Fiscal Year 2026-27
            </button>
          ) : (
            <button
              onClick={() => {
                if (!trialBalance.isBalanced) {
                  showToast('Cannot Close', 'Trial balance must be mathematically balanced before year closing.', 'error');
                  return;
                }
                dispatch({ type: 'CLOSE_FISCAL_YEAR', reason: 'End of fiscal year closing' });
                showToast('Fiscal Year Closed', 'FY 2026-27 ledgers closed and locked.', 'success');
              }}
              style={{
                padding: '10px 18px',
                background: '#102d47',
                color: '#ffffff',
                border: 'none',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Close & Lock FY 2026-27 Ledgers
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: NEW JOURNAL VOUCHER */}
      {/* ------------------------------------------------------------- */}
      {jvModalOpen && (
        <Dialog open={jvModalOpen} title="Record Balanced Journal Voucher" subtitle="Double-Entry Financial Accounting" onClose={() => setJvModalOpen(false)} maxWidth="780px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Every journal voucher must have equal Debits and Credits. Unbalanced entries are strictly blocked.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Voucher Type
                </label>
                <select
                  value={jvType}
                  onChange={e => setJvType(e.target.value as JournalVoucher['voucherType'])}
                  style={{ width: '100%' }}
                >
                  <option value="Journal">General Journal (JV)</option>
                  <option value="Payment">Bank Payment (BPV)</option>
                  <option value="Receipt">Bank Receipt (BRV)</option>
                  <option value="Contra">Contra (Bank-to-Cash)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Posting Date
                </label>
                <input type="date" defaultValue={currentDate} disabled style={{ width: '100%', background: '#f5f5f2' }} />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  External Ref / UTR
                </label>
                <input
                  placeholder="e.g. UTR-2026-9901"
                  value={jvReference}
                  onChange={e => setJvReference(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Narration / Transaction Summary *
              </label>
              <input
                placeholder="Clear accounting explanation of the transaction..."
                value={jvNarration}
                onChange={e => setJvNarration(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>

            {/* Voucher Line Items */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#f8faf7', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 30px', gap: '8px', fontSize: '10.5px', fontWeight: 700, color: '#64748b' }}>
                <span>ACCOUNT HEAD</span>
                <span>DEBIT (₹)</span>
                <span>CREDIT (₹)</span>
                <span />
              </div>

              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {jvLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 30px', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={line.accountCode}
                      onChange={e => {
                        const next = [...jvLines];
                        next[idx].accountCode = e.target.value;
                        setJvLines(next);
                      }}
                      style={{ fontSize: '12px' }}
                    >
                      {state.chartOfAccounts.map(a => (
                        <option key={a.code} value={a.code}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="0.00"
                      value={line.debitRupees}
                      onChange={e => {
                        const next = [...jvLines];
                        next[idx].debitRupees = e.target.value;
                        if (e.target.value && Number(e.target.value) > 0) {
                          next[idx].creditRupees = '0';
                        }
                        setJvLines(next);
                      }}
                      style={{ textAlign: 'right', fontSize: '12px' }}
                    />

                    <input
                      type="number"
                      placeholder="0.00"
                      value={line.creditRupees}
                      onChange={e => {
                        const next = [...jvLines];
                        next[idx].creditRupees = e.target.value;
                        if (e.target.value && Number(e.target.value) > 0) {
                          next[idx].debitRupees = '0';
                        }
                        setJvLines(next);
                      }}
                      style={{ textAlign: 'right', fontSize: '12px' }}
                    />

                    {jvLines.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => setJvLines(jvLines.filter((_, i) => i !== idx))}
                        style={{ border: 'none', background: 'transparent', color: '#ad211d', cursor: 'pointer', fontSize: '16px' }}
                      >
                        ×
                      </button>
                    ) : <span />}
                  </div>
                ))}
              </div>

              <div style={{ padding: '8px 12px', background: '#fafbf9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setJvLines([...jvLines, { accountCode: '1010', debitRupees: '0', creditRupees: '0', narration: '' }])}
                  style={{ border: 'none', background: 'transparent', color: '#102d47', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Line
                </button>

                <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
                  <span>Total Debit: <strong>₹{(currentJvValidation.totalDebitPaise / 100).toLocaleString('en-IN')}</strong></span>
                  <span>Total Credit: <strong>₹{(currentJvValidation.totalCreditPaise / 100).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>

            {/* Discrepancy warning */}
            {!currentJvValidation.valid && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fbeeed', border: '1px solid #ad211d', fontSize: '11.5px', color: '#ad211d' }}>
                {currentJvValidation.error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setJvModalOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveJournalVoucher}
                disabled={!currentJvValidation.valid}
                style={{
                  padding: '8px 18px',
                  background: currentJvValidation.valid ? '#102d47' : '#94a3b8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentJvValidation.valid ? 'pointer' : 'not-allowed',
                }}
              >
                Post Journal Voucher
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: NEW ACCOUNT HEAD */}
      {/* ------------------------------------------------------------- */}
      {accModalOpen && (
        <Dialog open={accModalOpen} title="Create New Account Head" subtitle="Institutional Chart of Accounts" onClose={() => setAccModalOpen(false)} maxWidth="520px">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleCreateAccount();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Account Code (4-digit recommended) *
              </label>
              <input
                placeholder="e.g. 5090"
                value={accCode}
                onChange={e => setAccCode(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Account Head Name *
              </label>
              <input
                placeholder="e.g. Campus Solar Power & Sustainability Expense"
                value={accName}
                onChange={e => setAccName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Classification Group *
              </label>
              <select
                value={accGroup}
                onChange={e => setAccGroup(e.target.value as AccountGroup)}
                style={{ width: '100%' }}
              >
                <option value="Asset">Asset (Current / Fixed Assets)</option>
                <option value="Liability">Liability (Current / Long-Term Liabilities)</option>
                <option value="Equity">Equity / Capital Fund</option>
                <option value="Revenue">Revenue / Incomes</option>
                <option value="Expense">Operating Expenditure</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Description / Purpose
              </label>
              <input
                placeholder="Operational purpose of this ledger account..."
                value={accDesc}
                onChange={e => setAccDesc(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setAccModalOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', background: '#102d47', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save Account Head
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
