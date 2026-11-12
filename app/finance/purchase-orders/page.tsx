// College Finance Portal - Purchase Orders & Procurement Module
// PO lifecycle (Draft -> Submitted -> Approved -> Fulfilled -> Completed),
// itemized requisitions, GST calculation, vendor directory integration, and bill conversion.

'use client';

import React, { useState } from 'react';
import {
  FileCheck,
  Plus,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Building,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import { useApprovalNotice } from '@/components/finance-portal/ui/approval-notice';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/finance-portal/types/finance';

export default function PurchaseOrdersPage() {
  const { state, dispatch, currentDate } = useFinance();
  const { showToast } = useToast();
  const { showApprovalNotice } = useApprovalNotice();

  const [modalOpen, setModalOpen] = useState(false);
  const [viewPo, setViewPo] = useState<PurchaseOrder | null>(null);

  // Form State
  const [vendorId, setVendorId] = useState(state.vendors[0]?.id || 'VEN001');
  const [expectedDate, setExpectedDate] = useState(currentDate);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    { description: string; quantity: number; unit: string; unitPriceRupees: string }[]
  >([{ description: '', quantity: 1, unit: 'Units', unitPriceRupees: '' }]);
  const [gstRate, setGstRate] = useState('18');

  // Computed subtotal & GST
  const subtotalPaise = items.reduce((sum, item) => {
    return sum + item.quantity * toPaise(item.unitPriceRupees || '0');
  }, 0);
  const gstPaise = Math.round(subtotalPaise * (Number(gstRate) / 100));
  const totalAmountPaise = subtotalPaise + gstPaise;

  // Handle Create PO
  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.some(i => !i.description.trim() || !i.unitPriceRupees)) {
      showToast('Validation Error', 'All PO items must have description and unit price.', 'error');
      return;
    }

    const vendor = state.vendors.find(v => v.id === vendorId);
    const poNumber = `PO-${new Date().getFullYear()}-${String(state.purchaseOrders.length + 1).padStart(3, '0')}`;

    const formattedItems: PurchaseOrderItem[] = items.map((it, idx) => ({
      id: `POI-${Date.now()}-${idx}`,
      description: it.description.trim(),
      quantity: Number(it.quantity) || 1,
      unit: it.unit,
      unitPricePaise: toPaise(it.unitPriceRupees),
      totalPaise: (Number(it.quantity) || 1) * toPaise(it.unitPriceRupees),
    }));

    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      poNumber,
      vendorId,
      vendorName: vendor?.name || 'Selected Vendor',
      orderDate: currentDate,
      expectedDeliveryDate: expectedDate,
      items: formattedItems,
      subtotalPaise,
      gstRatePct: Number(gstRate),
      gstPaise,
      totalAmountPaise,
      status: 'Submitted',
      notes: notes.trim() || undefined,
    };

    dispatch({ type: 'CREATE_PURCHASE_ORDER', po: newPO });
    showToast('PO Created', `Purchase Order ${poNumber} created and submitted for approval.`, 'success');
    showApprovalNotice({
      itemTitle: `${newPO.vendorName} — PO Procurement`,
      category: 'Purchase Order',
      amountPaise: newPO.totalAmountPaise,
      reference: newPO.poNumber,
      nextApproverTier: 'Director / Management',
      notes: 'Purchase order requisition submitted for institutional approval.',
    });

    setModalOpen(false);
    setNotes('');
    setItems([{ description: '', quantity: 1, unit: 'Units', unitPriceRupees: '' }]);
  };

  // Quick Status Transition
  const handleStatusChange = (poId: string, status: PurchaseOrder['status']) => {
    dispatch({ type: 'UPDATE_PO_STATUS', poId, status });
    showToast('PO Updated', `Purchase order updated to ${status}.`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b49662', marginBottom: '4px' }}>
            PROCUREMENT & VENDOR ORDERS
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 750, color: '#102d47', margin: 0 }}>
            Purchase Orders & Requisitions
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Formal institutional procurement orders, items specification, GST reconciliation, and vendor commitments.
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
          <span>Raise New Purchase Order</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #102d47' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Total PO Commitments
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {formatINR(state.purchaseOrders.reduce((sum, p) => sum + p.totalAmountPaise, 0))}
          </div>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Across all active purchase requisitions</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #b49662' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Pending Approval / Delivery
          </span>
          <div className="headline-number" style={{ color: '#102d47', margin: '6px 0 2px' }}>
            {state.purchaseOrders.filter(p => ['Submitted', 'Approved', 'Partially Fulfilled'].includes(p.status)).length}
          </div>
          <small style={{ fontSize: '11px', color: '#b49662', fontWeight: 550 }}>Orders awaiting fulfillment</small>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '4px solid #25866b' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' }}>
            Completed Orders
          </span>
          <div className="headline-number" style={{ color: '#25866b', margin: '6px 0 2px' }}>
            {state.purchaseOrders.filter(p => p.status === 'Completed').length}
          </div>
          <small style={{ fontSize: '11px', color: '#25866b' }}>Goods inspected & bills cleared</small>
        </div>
      </div>

      {/* 3. Purchase Orders Directory Table */}
      <div className="card-surface" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO NUMBER & DETAILS</th>
                <th>VENDOR NAME</th>
                <th>ORDER DATE</th>
                <th>EXPECTED DELIVERY</th>
                <th style={{ textAlign: 'right' }}>ITEMS</th>
                <th style={{ textAlign: 'right' }}>TOTAL AMOUNT</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {state.purchaseOrders.map(po => (
                <tr key={po.id}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#102d47', fontSize: '12px' }}>
                      {po.poNumber}
                    </strong>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{po.notes || 'Institutional procurement'}</div>
                  </td>
                  <td>
                    <strong style={{ color: '#1e293b' }}>{po.vendorName}</strong>
                  </td>
                  <td style={{ color: '#64748b' }}>{po.orderDate}</td>
                  <td style={{ color: '#64748b' }}>{po.expectedDeliveryDate}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#64748b' }}>
                    {po.items.length} {po.items.length === 1 ? 'item' : 'items'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#102d47' }} className="tabular-nums">
                    {formatINR(po.totalAmountPaise)}
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        po.status === 'Completed' || po.status === 'Approved'
                          ? 'good'
                          : po.status === 'Submitted' || po.status === 'Partially Fulfilled'
                          ? 'neutral'
                          : 'bad'
                      }`}
                    >
                      <i />
                      {po.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => setViewPo(po)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          background: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#102d47',
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>

                      {po.status === 'Submitted' && (
                        <button
                          onClick={() => handleStatusChange(po.id, 'Approved')}
                          style={{
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '5px',
                            background: '#25866b',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          Approve
                        </button>
                      )}

                      {po.status === 'Approved' && (
                        <button
                          onClick={() => handleStatusChange(po.id, 'Completed')}
                          style={{
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '5px',
                            background: '#102d47',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          Mark Fulfilled
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal: Raise New Purchase Order */}
      {modalOpen && (
        <Dialog open={modalOpen} title="Raise Purchase Order (PO)" subtitle="Institutional Procurement Requisition" onClose={() => setModalOpen(false)} maxWidth="740px">
          <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Select Vendor *
                </label>
                <select
                  value={vendorId}
                  onChange={e => setVendorId(e.target.value)}
                  style={{ width: '100%' }}
                  required
                >
                  {state.vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.category}) — GSTIN: {v.gstin || 'Unregistered'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Expected Delivery Date *
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Requisition Purpose / Notes
              </label>
              <input
                placeholder="e.g. Science lab equipment expansion for B.Sc Batch 2026-29"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {/* Line items table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#f8faf7', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '2fr 70px 70px 1fr 30px', gap: '8px', fontSize: '10.5px', fontWeight: 700, color: '#64748b' }}>
                <span>ITEM DESCRIPTION</span>
                <span>QTY</span>
                <span>UNIT</span>
                <span style={{ textAlign: 'right' }}>RATE (₹)</span>
                <span />
              </div>

              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 70px 1fr 30px', gap: '8px', alignItems: 'center' }}>
                    <input
                      placeholder="Item name & specification"
                      value={it.description}
                      onChange={e => {
                        const next = [...items];
                        next[idx].description = e.target.value;
                        setItems(next);
                      }}
                      required
                      style={{ fontSize: '12px' }}
                    />
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={e => {
                        const next = [...items];
                        next[idx].quantity = Number(e.target.value) || 1;
                        setItems(next);
                      }}
                      required
                      style={{ fontSize: '12px', textAlign: 'center' }}
                    />
                    <select
                      value={it.unit}
                      onChange={e => {
                        const next = [...items];
                        next[idx].unit = e.target.value;
                        setItems(next);
                      }}
                      style={{ fontSize: '11.5px' }}
                    >
                      <option value="Units">Units</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Sets">Sets</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Copies">Copies</option>
                    </select>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={it.unitPriceRupees}
                      onChange={e => {
                        const next = [...items];
                        next[idx].unitPriceRupees = e.target.value;
                        setItems(next);
                      }}
                      required
                      style={{ fontSize: '12px', textAlign: 'right' }}
                    />
                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
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
                  onClick={() => setItems([...items, { description: '', quantity: 1, unit: 'Units', unitPriceRupees: '' }])}
                  style={{ border: 'none', background: 'transparent', color: '#102d47', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Item Line
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>
                    GST Rate:
                    <select
                      value={gstRate}
                      onChange={e => setGstRate(e.target.value)}
                      style={{ marginLeft: '6px', fontSize: '11px', padding: '3px 6px' }}
                    >
                      <option value="0">0% (Exempt)</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </label>
                  <span style={{ fontSize: '12px' }}>
                    Total: <strong>{formatINR(totalAmountPaise)}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
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
                Submit Purchase Order
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* 5. Modal: View PO Details */}
      {viewPo && (
        <Dialog open={!!viewPo} title={`Purchase Order: ${viewPo.poNumber}`} subtitle={viewPo.vendorName} onClose={() => setViewPo(null)} maxWidth="650px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8faf7', padding: '12px', borderRadius: '6px', fontSize: '11.5px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Order Date:</span> <strong>{viewPo.orderDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Delivery Target:</span> <strong>{viewPo.expectedDeliveryDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Status:</span> <strong>{viewPo.status}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Approved By:</span> <strong>{viewPo.approvedBy || 'Pending'}</strong>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '12px', color: '#102d47', display: 'block', marginBottom: '6px' }}>Itemized Requisition</strong>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table className="data-table" style={{ fontSize: '11.5px' }}>
                  <thead>
                    <tr>
                      <th>ITEM</th>
                      <th style={{ textAlign: 'center' }}>QTY</th>
                      <th style={{ textAlign: 'right' }}>UNIT RATE</th>
                      <th style={{ textAlign: 'right' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewPo.items.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.description}</td>
                        <td style={{ textAlign: 'center' }}>{it.quantity} {it.unit}</td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">{formatINR(it.unitPricePaise)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{formatINR(it.totalPaise)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#fafbf9' }}>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Subtotal</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(viewPo.subtotalPaise)}</td>
                    </tr>
                    <tr style={{ background: '#fafbf9' }}>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>GST ({viewPo.gstRatePct}%)</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(viewPo.gstPaise)}</td>
                    </tr>
                    <tr style={{ background: '#f0f4fa', borderTop: '2px solid #cbd5e1' }}>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 800 }}>Grand Total</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#102d47' }}>{formatINR(viewPo.totalAmountPaise)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setViewPo(null)}
                style={{ padding: '8px 18px', background: '#102d47', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

