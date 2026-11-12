// College Finance Portal - System Settings, Statutory Parameters & Data Management
// Configurable PF, ESI, TDS, GST, Approval Ceilings, Demo Date Override & Backup/Restore

'use client';

import React, { useState } from 'react';
import {
  Settings,
  ShieldAlert,
  Calendar,
  Save,
  Download,
  Upload,
  RefreshCw,
  Building2,
  Lock,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise, toRupees } from '@/lib/finance-portal/finance/money';
import { ConfirmDialog } from '@/components/finance-portal/ui/confirm-dialog';
import { useToast } from '@/components/finance-portal/ui/toast';

export default function SettingsPage() {
  const { state, dispatch, currentDate, resetDemoData, exportBackupJSON, importBackupJSON } = useFinance();
  const { showToast } = useToast();

  const [institutionName, setInstitutionName] = useState(state.settings.institutionName);
  const [campusAddress, setCampusAddress] = useState(state.settings.campusAddress);
  const [academicYear, setAcademicYear] = useState(state.settings.academicYear);
  const [demoDate, setDemoDate] = useState(state.settings.demoDateOverride || '');
  const [divisorMode, setDivisorMode] = useState(state.settings.statutory.dailyDivisorMode);

  // Statutory Rates
  const [pfRate, setPfRate] = useState(String(state.settings.statutory.pfEmployeeRatePct));
  const [esiRate, setEsiRate] = useState(String(state.settings.statutory.esiEmployeeRatePct));
  const [pettyFloatRupees, setPettyFloatRupees] = useState(String(state.settings.statutory.pettyCashFloatPaise / 100));
  const [cashLimitRupees, setCashLimitRupees] = useState(String(state.settings.statutory.cashTransactionWarningLimitPaise / 100));

  // Reset confirmation
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleSaveSettings = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        institutionName,
        campusAddress,
        academicYear,
        demoDateOverride: demoDate.trim() || undefined,
        statutory: {
          ...state.settings.statutory,
          dailyDivisorMode: divisorMode,
          pfEmployeeRatePct: parseFloat(pfRate) || 12,
          pfEmployerRatePct: parseFloat(pfRate) || 12,
          esiEmployeeRatePct: parseFloat(esiRate) || 0.75,
          pettyCashFloatPaise: toPaise(pettyFloatRupees),
          cashTransactionWarningLimitPaise: toPaise(cashLimitRupees),
        },
      },
    });

    showToast('Settings Saved', 'System parameters updated successfully.', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const success = importBackupJSON(content);
      if (success) {
        showToast('Backup Restored', 'Institutional data successfully restored from JSON backup.', 'success');
      } else {
        showToast('Restore Failed', 'Invalid or corrupt backup JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>System Settings & Statutory Configuration</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Institution profile, statutory deductions (PF/ESI/TDS/GST), divisor policies, demo date override, and backups.
        </p>
      </div>

      {/* MANDATORY CA STATUTORY ADVISORY */}
      <div
        style={{
          padding: '14px 18px',
          backgroundColor: 'var(--gold-light)',
          border: '1px solid var(--gold)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
        }}
      >
        <ShieldAlert size={18} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ display: 'block', color: 'var(--navy)', marginBottom: '2px' }}>
            Statutory Compliance Advisory
          </strong>
          Provident Fund (PF), Employee State Insurance (ESI), Professional Tax, Tax Deducted at Source (TDS), and Goods & Services Tax (GST) parameters below are configurable defaults for demonstration. <strong>Always confirm with the college’s Chartered Accountant (CA) or statutory tax auditor.</strong> These configurations do not constitute legal or tax advice.
        </div>
      </div>

      {/* 1. Institution Profile */}
      <div className="card-surface" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)', marginBottom: '14px' }}>
          Institution Profile
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>College Name</label>
            <input
              type="text"
              value={institutionName}
              onChange={e => setInstitutionName(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Academic Financial Year</label>
            <input
              type="text"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Campus Address</label>
            <input
              type="text"
              value={campusAddress}
              onChange={e => setCampusAddress(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>

      {/* 2. Statutory Parameters & Divisor Policy */}
      <div className="card-surface" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)', marginBottom: '14px' }}>
          Statutory Deductions & Payroll Policies
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Loss of Pay (LOP) Divisor</label>
            <select
              value={divisorMode}
              onChange={e => setDivisorMode(e.target.value as any)}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
            >
              <option value="Fixed 30">Fixed 30 Days</option>
              <option value="Calendar Days">Actual Calendar Days</option>
              <option value="Working Days">Actual Working Days</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee PF Rate (%)</label>
            <input
              type="number"
              value={pfRate}
              onChange={e => setPfRate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee ESI Rate (%)</label>
            <input
              type="number"
              value={esiRate}
              onChange={e => setEsiRate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Petty Cash Float (INR)</label>
            <input
              type="number"
              value={pettyFloatRupees}
              onChange={e => setPettyFloatRupees(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Cash Warning Threshold (INR)</label>
            <input
              type="number"
              value={cashLimitRupees}
              onChange={e => setCashLimitRupees(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>

      {/* 3. Demo Date Override & System Control */}
      <div className="card-surface" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)', marginBottom: '14px' }}>
          Simulation Date Override
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Override Current System Date (Leave blank to use actual real-world date)
            </label>
            <input
              type="date"
              value={demoDate}
              onChange={e => setDemoDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <button
            onClick={() => setDemoDate('')}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11.5px',
              cursor: 'pointer',
              marginTop: '18px',
            }}
          >
            Clear (Use Real Date)
          </button>
        </div>
      </div>

      {/* 4. Backup & Factory Reset */}
      <div className="card-surface" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)', marginBottom: '14px' }}>
          Data Backup & Factory Demo Reset
        </h3>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={exportBackupJSON}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--navy)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={14} />
            <span>Export Backup JSON</span>
          </button>

          <label
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--navy)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Upload size={14} />
            <span>Restore Backup JSON</span>
            <input type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
          </label>

          <button
            onClick={() => setResetConfirmOpen(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--crimson-light)',
              color: 'var(--crimson)',
              border: '1px solid var(--crimson)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
            }}
          >
            <RefreshCw size={14} />
            <span>Reset Demo to Factory Seed</span>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSaveSettings}
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--navy)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          Save System Configuration
        </button>
      </div>

      {/* CONFIRM: Reset Demo Data */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={resetDemoData}
        title="Reset Demo Data"
        description="Are you sure you want to reset all students, fee ledgers, payroll records, bills, and settings to the factory seed data? This action will overwrite any local browser modifications."
        confirmLabel="Reset to Factory State"
        isDestructive={true}
      />
    </div>
  );
}

