// College Finance Portal - Vendor Master & Directory
// GSTIN (15 chars), PAN (10 chars), IFSC, Payment Terms, Active/Blocked status, and Outstanding Aging

'use client';

import React, { useState } from 'react';
import {
  Truck,
  PlusCircle,
  Search,
  CheckCircle2,
  Ban,
  Building2,
  Mail,
  Phone,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import type { Vendor } from '@/lib/finance-portal/types/finance';

export default function VendorsPage() {
  const { state, dispatch } = useFinance();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [vendorModalOpen, setVendorModalOpen] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCategory, setFormCategory] = useState<Vendor['category']>('IT & Hardware');
  const [formGstin, setFormGstin] = useState('');
  const [formPan, setFormPan] = useState('');
  const [formBank, setFormBank] = useState('HDFC Bank');
  const [formAccountLast4, setFormAccountLast4] = useState('');
  const [formIfsc, setFormIfsc] = useState('HDFC0000123');
  const [formTermsDays, setFormTermsDays] = useState('30');

  // Validation
  const validateGstin = (gstin: string) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());

  const handleCreateVendor = () => {
    if (!formName.trim() || !formContact.trim()) {
      showToast('Validation Error', 'Company name and contact person are required.', 'error');
      return;
    }

    if (formGstin && !validateGstin(formGstin)) {
      showToast('Invalid GSTIN', 'GSTIN must be 15 alphanumeric characters (e.g. 08AAAAA1234A1Z5).', 'error');
      return;
    }

    const newVendor: Vendor = {
      id: `VEN00${state.vendors.length + 1}`,
      name: formName.trim(),
      contactPerson: formContact.trim(),
      phone: formPhone.trim() || '+91-98290-00123',
      email: formEmail.trim() || 'billing@vendor.in',
      category: formCategory,
      gstin: formGstin.toUpperCase() || '08AAAAA0000A1Z1',
      pan: formPan.toUpperCase() || 'AAAAA0000A',
      bankName: formBank,
      accountLastFour: formAccountLast4 || '9901',
      ifsc: formIfsc.toUpperCase(),
      paymentTermsDays: parseInt(formTermsDays) || 30,
      status: 'Active',
    };

    dispatch({
      type: 'RESTORE_BACKUP',
      state: {
        ...state,
        vendors: [newVendor, ...state.vendors],
      },
    });

    showToast('Vendor Enrolled', `${newVendor.name} added to approved vendor list.`, 'success');
    setVendorModalOpen(false);
  };

  const handleToggleBlock = (vendor: Vendor) => {
    const nextStatus = vendor.status === 'Active' ? 'Blocked' : 'Active';
    dispatch({
      type: 'RESTORE_BACKUP',
      state: {
        ...state,
        vendors: state.vendors.map(v => (v.id === vendor.id ? { ...v, status: nextStatus } : v)),
      },
    });
    showToast('Status Updated', `Vendor ${vendor.name} is now ${nextStatus}.`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Approved Vendor Directory</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Institutional suppliers, GSTIN/PAN compliance, bank settlement mandates, and active liabilities.
          </p>
        </div>

        <button
          onClick={() => setVendorModalOpen(true)}
          style={{
            padding: '8px 14px',
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
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <PlusCircle size={15} />
          <span>Add New Vendor</span>
        </button>
      </div>

      {/* Vendor Table */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '320px', marginBottom: '16px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search vendor name, GSTIN, category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
          />
        </div>

        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Vendor ID & Company Name</th>
                <th>Category</th>
                <th>GSTIN & PAN</th>
                <th>Bank & IFSC</th>
                <th>Terms</th>
                <th style={{ textAlign: 'right' }}>Active Outstanding</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.vendors
                .filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(v => {
                  const outstandingPaise = state.opExBills
                    .filter(b => b.vendorId === v.id && b.status === 'Approved')
                    .reduce((sum, b) => sum + (b.netPayablePaise - b.paidAmountPaise), 0);

                  return (
                    <tr key={v.id}>
                      <td data-label="Vendor">
                        <strong>{v.name}</strong>
                        <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {v.id} · Contact: {v.contactPerson} ({v.phone})
                        </span>
                      </td>
                      <td data-label="Category">{v.category}</td>
                      <td data-label="GSTIN & PAN" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                        <div>GSTIN: {v.gstin}</div>
                        <div style={{ color: 'var(--text-muted)' }}>PAN: {v.pan}</div>
                      </td>
                      <td data-label="Bank" style={{ fontSize: '11px' }}>
                        <div>•••• {v.accountLastFour} ({v.bankName})</div>
                        <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v.ifsc}</div>
                      </td>
                      <td data-label="Terms">Net {v.paymentTermsDays} Days</td>
                      <td data-label="Outstanding" style={{ textAlign: 'right', fontWeight: 600, color: outstandingPaise > 0 ? 'var(--crimson)' : 'var(--text-muted)' }} className="tabular-nums">
                        {formatINR(outstandingPaise)}
                      </td>
                      <td data-label="Status">
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            backgroundColor: v.status === 'Active' ? 'var(--green-light)' : 'var(--crimson-light)',
                            color: v.status === 'Active' ? 'var(--green)' : 'var(--crimson)',
                          }}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleBlock(v)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            backgroundColor: v.status === 'Active' ? 'var(--crimson-light)' : 'var(--green-light)',
                            color: v.status === 'Active' ? 'var(--crimson)' : 'var(--green)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          {v.status === 'Active' ? 'Block Vendor' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add Vendor */}
      <Dialog open={vendorModalOpen} onClose={() => setVendorModalOpen(false)} title="Register Approved Vendor" maxWidth="580px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Vendor Legal / Company Name*</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Apex Infotech Solutions"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Contact Person*</label>
              <input
                type="text"
                value={formContact}
                onChange={e => setFormContact(e.target.value)}
                placeholder="Manager / Billing Contact"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value as Vendor['category'])}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="IT & Hardware">IT & Hardware</option>
                <option value="Stationery & Printing">Stationery & Printing</option>
                <option value="Laboratory Consumables">Laboratory Consumables</option>
                <option value="Security & Facility">Security & Facility</option>
                <option value="Electricity & Utilities">Electricity & Utilities</option>
                <option value="Library Books">Library Books</option>
                <option value="Legal & Professional">Legal & Professional</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>GSTIN (15 chars)*</label>
              <input
                type="text"
                value={formGstin}
                onChange={e => setFormGstin(e.target.value.toUpperCase())}
                placeholder="08AAAAA1234A1Z5"
                maxLength={15}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>PAN (10 chars)*</label>
              <input
                type="text"
                value={formPan}
                onChange={e => setFormPan(e.target.value.toUpperCase())}
                placeholder="AAAAA1234A"
                maxLength={10}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bank Name</label>
              <input
                type="text"
                value={formBank}
                onChange={e => setFormBank(e.target.value)}
                placeholder="HDFC Bank"
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Account Last 4</label>
              <input
                type="text"
                value={formAccountLast4}
                onChange={e => setFormAccountLast4(e.target.value.slice(0, 4))}
                placeholder="9102"
                maxLength={4}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>IFSC</label>
              <input
                type="text"
                value={formIfsc}
                onChange={e => setFormIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0000123"
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => setVendorModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateVendor}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Save Vendor Profile
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

