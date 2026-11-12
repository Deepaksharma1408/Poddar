// College Finance Portal - Fixed Asset Register & Depreciation Management
// Asset code, category, purchase cost, straight-line depreciation, net book value, and asset disposal.

'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
  RotateCcw,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import type { FixedAsset } from '@/lib/finance-portal/types/finance';

export default function FixedAssetsPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [depModalOpen, setDepModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FixedAsset['category']>('Computer & IT Equipment');
  const [purchaseDate, setPurchaseDate] = useState(currentDate);
  const [purchaseCostRupees, setPurchaseCostRupees] = useState('');
  const [depRate, setDepRate] = useState('15');
  const [location, setLocation] = useState('');
  const [custodian, setCustodian] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');

  // Totals
  const totalCostPaise = state.fixedAssets.reduce((sum, a) => sum + (a.status !== 'Disposed' ? a.purchaseCostPaise : 0), 0);
  const totalAccumulatedDepPaise = state.fixedAssets.reduce((sum, a) => sum + (a.status !== 'Disposed' ? a.accumulatedDepreciationPaise : 0), 0);
  const totalNetBookValuePaise = state.fixedAssets.reduce((sum, a) => sum + (a.status !== 'Disposed' ? a.netBookValuePaise : 0), 0);

  // Handle Create Asset
  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Validation Error', 'Asset name is required.', 'error');
      return;
    }

    const costPaise = toPaise(purchaseCostRupees);
    if (costPaise <= 0) {
      showToast('Validation Error', 'Purchase cost must be a positive amount.', 'error');
      return;
    }

    const codePrefix = category === 'Computer & IT Equipment' ? 'FA-IT' : category === 'Laboratory Apparatus' ? 'FA-LAB' : category === 'Campus Infrastructure & Buildings' ? 'FA-INF' : category === 'Institutional Vehicles' ? 'FA-VHC' : 'FA-FURN';
    const assetCode = `${codePrefix}-${String(state.fixedAssets.length + 1).padStart(3, '0')}`;

    const newAsset: FixedAsset = {
      id: `AST-${Date.now()}`,
      assetCode,
      name: name.trim(),
      category,
      purchaseDate,
      purchaseCostPaise: costPaise,
      depreciationMethod: 'Straight-line',
      depreciationRatePct: Number(depRate) || 10,
      accumulatedDepreciationPaise: 0,
      netBookValuePaise: costPaise,
      location: location.trim() || 'Main Campus',
      custodian: custodian.trim() || 'Estate Officer',
      status: 'Active',
      invoiceRef: invoiceRef.trim() || undefined,
    };

    dispatch({ type: 'ADD_FIXED_ASSET', asset: newAsset });
    showToast('Asset Registered', `Registered ${newAsset.assetCode} (${newAsset.name}) into Fixed Asset Register.`, 'success');

    setModalOpen(false);
    setName('');
    setPurchaseCostRupees('');
    setLocation('');
    setCustodian('');
    setInvoiceRef('');
  };

  // Run Annual Straight-Line Depreciation
  const handleRunDepreciation = (asset: FixedAsset) => {
    const annualDepPaise = Math.round((asset.purchaseCostPaise * (asset.depreciationRatePct / 100)));
    const maxDepPaise = asset.netBookValuePaise;
    const finalDepPaise = Math.min(annualDepPaise, maxDepPaise);

    if (finalDepPaise <= 0) {
      showToast('Asset Depreciated', `${asset.name} is already depreciated to zero residual value.`, 'info');
      return;
    }

    dispatch({
      type: 'RUN_ASSET_DEPRECIATION',
      assetId: asset.id,
      depreciationPaise: finalDepPaise,
    });

    showToast('Depreciation Recorded', `Recorded depreciation of ${formatINR(finalDepPaise)} for ${asset.name}.`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b49662', marginBottom: '4px' }}>
            CAPITAL ASSET ACCOUNTING
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 750, color: '#102d47', margin: 0 }}>
            Fixed Asset Register & Depreciation
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Physical asset tracking, straight-line depreciation schedules, net book values, and location audit.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: '#102d47',
            border: 'none',
            borderRadius: '7px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(16, 45, 71, 0.1)',
          }}
        >
          <Plus size={14} />
          <span>Register New Fixed Asset</span>
        </button>
      </div>

      {/* 2. Executive Asset KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #102d47' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Gross Fixed Assets (Cost)
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(totalCostPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Original capital purchase cost</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #ad211d' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Accumulated Depreciation
          </span>
          <div className="headline-number" style={{ color: '#ad211d', margin: '6px 0 2px' }}>
            {formatINR(totalAccumulatedDepPaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Written-off via straight-line method</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #25866b' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Net Book Value (Carrying)
          </span>
          <div className="headline-number" style={{ color: '#25866b', margin: '6px 0 2px' }}>
            {formatINR(totalNetBookValuePaise)}
          </div>
          <small style={{ fontSize: '11px', color: '#25866b', fontWeight: 550 }}>Active balance sheet value</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #b49662' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Active Physical Assets
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {state.fixedAssets.filter(a => a.status === 'Active').length}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Across 5 campus departments</small>
        </div>
      </div>

      {/* 3. Asset Register Table */}
      <div className="card-surface" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ASSET CODE & DESCRIPTION</th>
                <th>CATEGORY</th>
                <th>PURCHASE DATE</th>
                <th style={{ textAlign: 'right' }}>ORIGINAL COST</th>
                <th style={{ textAlign: 'center' }}>DEP RATE</th>
                <th style={{ textAlign: 'right' }}>ACCUMULATED DEP</th>
                <th style={{ textAlign: 'right' }}>NET BOOK VALUE</th>
                <th>LOCATION / CUSTODIAN</th>
                <th style={{ textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {state.fixedAssets.map(asset => (
                <tr key={asset.id}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#102d47', fontSize: '12px' }}>
                      {asset.assetCode}
                    </strong>
                    <div style={{ color: '#1e293b', fontWeight: 600 }}>{asset.name}</div>
                    {asset.invoiceRef && <small style={{ color: '#83909d' }}>Invoice: {asset.invoiceRef}</small>}
                  </td>
                  <td>
                    <span style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '4px', background: '#f0f4fa', color: '#102d47', fontWeight: 600 }}>
                      {asset.category}
                    </span>
                  </td>
                  <td style={{ color: '#64748b' }}>{asset.purchaseDate}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#102d47' }} className="tabular-nums">
                    {formatINR(asset.purchaseCostPaise)}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                    {asset.depreciationRatePct}% p.a.
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#ad211d' }} className="tabular-nums">
                    {formatINR(asset.accumulatedDepreciationPaise)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#25866b' }} className="tabular-nums">
                    {formatINR(asset.netBookValuePaise)}
                  </td>
                  <td>
                    <div style={{ fontSize: '11.5px', color: '#1e293b', fontWeight: 500 }}>{asset.location}</div>
                    <small style={{ fontSize: '10.5px', color: '#64748b' }}>{asset.custodian}</small>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {asset.status === 'Active' ? (
                      <button
                        onClick={() => handleRunDepreciation(asset)}
                        disabled={asset.netBookValuePaise <= 0}
                        style={{
                          padding: '4px 9px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#102d47',
                          cursor: asset.netBookValuePaise > 0 ? 'pointer' : 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <TrendingDown size={12} style={{ color: '#b49662' }} />
                        <span>Run SLM Dep</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '10px', color: '#83909d', fontStyle: 'italic' }}>Disposed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal: Register New Fixed Asset */}
      {modalOpen && (
        <Dialog open={modalOpen} title="Register Capital Fixed Asset" subtitle="Institutional Fixed Asset Register" onClose={() => setModalOpen(false)} maxWidth="560px">
          <form onSubmit={handleCreateAsset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Asset Description / Name *
              </label>
              <input
                placeholder="e.g. 50kW Rooftop Solar Photovoltaic Grid Array"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Asset Category *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as FixedAsset['category'])}
                  style={{ width: '100%' }}
                >
                  <option value="Computer & IT Equipment">Computer & IT Equipment</option>
                  <option value="Laboratory Apparatus">Laboratory Apparatus</option>
                  <option value="Campus Infrastructure & Buildings">Campus Infrastructure & Buildings</option>
                  <option value="Furniture & Fixtures">Furniture & Fixtures</option>
                  <option value="Institutional Vehicles">Institutional Vehicles</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Purchase Date *
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Purchase Cost (INR ₹) *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={purchaseCostRupees}
                  onChange={e => setPurchaseCostRupees(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Annual Depreciation Rate (% SLM) *
                </label>
                <input
                  type="number"
                  value={depRate}
                  onChange={e => setDepRate(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Campus Physical Location
                </label>
                <input
                  placeholder="e.g. Science Block Room 204"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Designated Custodian
                </label>
                <input
                  placeholder="e.g. Dr. H.S. Sharma"
                  value={custodian}
                  onChange={e => setCustodian(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Vendor Bill / Invoice Reference
              </label>
              <input
                placeholder="e.g. INV-2026-901"
                value={invoiceRef}
                onChange={e => setInvoiceRef(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', background: '#102d47', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Register Asset
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
