'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { AS_OF, studentLedger, type SchoolFinance } from '@/lib/school-finance';
import { assessLateFees, assignAdjustment, refundFee, type FeeAdjustment } from '@/lib/erp-management';
import { Currency, downloadCSV, Status } from './finance-ui';
import { money } from '@/lib/finance';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Info,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Wallet,
} from 'lucide-react';

const categories = ['Waiver', 'Scholarship', 'Concession', 'Charge', 'Late fee'] as const;
const feeHeads = [
  'Tuition Fee',
  'Development Fee',
  'Registration & Admission',
  'Library & Digital Resources',
  'Laboratory & Practical Fee',
  'Examination Fee',
  'Campus Transport',
  'IT & Computer Lab Fee',
  'Sports & Cultural Activities',
  'Miscellaneous Charges',
];

type ComponentRow = {
  label: string;
  amount: number;
  frequency: 'Annual' | 'Semester' | 'Monthly';
};

export default function FeeAdministration({
  data,
  setData,
}: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
}) {
  const [message, setMessage] = useState('');
  const [group, setGroup] = useState('');
  const [batch, setBatch] = useState('');

  // 5-Step Guided Wizard State
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedHead, setSelectedHead] = useState('Tuition Fee');
  const [selectedCategory, setSelectedCategory] = useState<FeeAdjustment['category']>('Concession');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(5000);
  const [adjustmentReason, setAdjustmentReason] = useState('Merit Scholarship / Fee Concession');
  const [effectiveDate, setEffectiveDate] = useState(AS_OF);

  // Dynamic Fee Template Component Rows
  const [templateName, setTemplateName] = useState('Standard Academic Fee 2026-27');
  const [templateCycle, setTemplateCycle] = useState<'Annual' | 'Semester'>('Annual');
  const [components, setComponents] = useState<ComponentRow[]>([
    { label: 'Tuition Fee', amount: 45000, frequency: 'Annual' },
    { label: 'Development Fee', amount: 8000, frequency: 'Annual' },
    { label: 'Library & Digital Resources', amount: 3500, frequency: 'Annual' },
    { label: 'Laboratory Fee', amount: 3500, frequency: 'Annual' },
  ]);

  const students = data.students.filter(
    student => (!group || student.class === group) && (!batch || student.batch === batch)
  );

  const targetStudent = data.students.find(s => s.id === selectedStudentId);
  const targetLedger = targetStudent ? studentLedger(targetStudent, data.payments) : null;
  const isCredit = ['Concession', 'Scholarship', 'Waiver'].includes(selectedCategory);
  const projectedBalance = targetLedger
    ? isCredit
      ? Math.max(0, targetLedger.due - adjustmentAmount)
      : targetLedger.due + adjustmentAmount
    : 0;

  // Add component row
  const addComponentRow = () => {
    setComponents([
      ...components,
      { label: feeHeads[components.length % feeHeads.length], amount: 2500, frequency: 'Annual' },
    ]);
  };

  // Remove component row
  const removeComponentRow = (index: number) => {
    if (components.length <= 1) return;
    setComponents(components.filter((_, i) => i !== index));
  };

  // Update component row
  const updateComponent = (index: number, field: keyof ComponentRow, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    setComponents(updated);
  };

  // Post guided adjustment
  const handleApplyAdjustment = () => {
    const targetIds = selectedStudentId ? [selectedStudentId] : students.map(s => s.id);
    if (!targetIds.length) {
      setMessage('Please select at least one student or class group.');
      return;
    }
    const adjustment: FeeAdjustment = {
      id: crypto.randomUUID(),
      category: selectedCategory,
      label: `${selectedHead} · ${adjustmentReason}`.trim(),
      date: effectiveDate,
      amount: Number(adjustmentAmount),
    };

    const nextState = assignAdjustment(data, targetIds, adjustment);
    if (nextState === data) {
      setMessage('Adjustment could not be posted. Credits cannot exceed existing student balances.');
      return;
    }
    setData(nextState);
    setMessage(`Successfully posted ${selectedCategory} of ₹${adjustmentAmount} to ${targetIds.length} student account(s).`);
    setStep(1);
  };

  return (
    <>
      <div className="workspace-intro">
        <div>
          <span className="editorial-kicker">FINANCIAL WORKSPACE / FEE CONFIGURATION</span>
          <h2>Fee Structures &amp; Adjustments.<br /><em>Transparent institutional billing.</em></h2>
          <p>Guided adjustments, structured templates, automated late fees, and managed refunds.</p>
        </div>
      </div>

      {message && <div className="info-strip">{message}</div>}

      {/* 1. GUIDED 5-STEP ADJUSTMENT WORKSPACE */}
      <section className="card" style={{ marginBottom: 24 }}>
        <div className="premium-card-heading">
          <div>
            <h3>Guided Fee Adjustment Wizard</h3>
            <p>Post structured waivers, scholarships, concessions, or charges with live balance verification.</p>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {/* Stepper Progress Bar */}
          <div className="wizard-stepper-bar">
            <div className={`wizard-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">1</div>
              <span>Select Student</span>
            </div>
            <div className="wizard-step-divider" />
            <div className={`wizard-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">2</div>
              <span>Fee Head</span>
            </div>
            <div className="wizard-step-divider" />
            <div className={`wizard-step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">3</div>
              <span>Adjustment Type</span>
            </div>
            <div className="wizard-step-divider" />
            <div className={`wizard-step ${step === 4 ? 'active' : step > 4 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">4</div>
              <span>Amount &amp; Reason</span>
            </div>
            <div className="wizard-step-divider" />
            <div className={`wizard-step ${step === 5 ? 'active' : ''}`}>
              <div className="wizard-step-circle">5</div>
              <span>Live Preview</span>
            </div>
          </div>

          {/* STEP 1: Select Student */}
          {step === 1 && (
            <div style={{ maxWidth: 700 }}>
              <div className="form-row">
                <label>
                  Filter by Class / Programme
                  <select value={group} onChange={e => setGroup(e.target.value)}>
                    <option value="">All Classes &amp; Programmes</option>
                    {[...new Set(data.students.map(s => s.class))].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Filter by Batch Year
                  <select value={batch} onChange={e => setBatch(e.target.value)}>
                    <option value="">All Batches</option>
                    {[...new Set(data.students.flatMap(s => (s.batch ? [s.batch] : [])))].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Target Student Account
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                >
                  <option value="">All {students.length} matching students in group</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.id} ({s.class})
                    </option>
                  ))}
                </select>
              </label>

              {targetStudent && targetLedger && (
                <div className="wizard-preview-box">
                  <div className="wizard-preview-grid">
                    <div className="wizard-preview-item">
                      <span>Total Committed</span>
                      <strong>{money(targetLedger.total)}</strong>
                    </div>
                    <div className="wizard-preview-item">
                      <span>Paid to Date</span>
                      <strong className="positive">{money(targetLedger.paid)}</strong>
                    </div>
                    <div className="wizard-preview-item">
                      <span>Current Due Now</span>
                      <strong className="negative">{money(targetLedger.due)}</strong>
                    </div>
                  </div>
                </div>
              )}

              <button
                className="button primary"
                style={{ marginTop: 14 }}
                onClick={() => setStep(2)}
              >
                Proceed to Fee Component <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* STEP 2: Choose Fee Head */}
          {step === 2 && (
            <div style={{ maxWidth: 700 }}>
              <label>
                Select Applicable Fee Component
                <select
                  value={selectedHead}
                  onChange={e => setSelectedHead(e.target.value)}
                >
                  {feeHeads.map(head => (
                    <option key={head} value={head}>{head}</option>
                  ))}
                </select>
              </label>
              <div className="small-note">
                <Info size={14} style={{ display: 'inline', marginRight: 4 }} />
                Adjustments will be linked against the institutional general ledger for this component.
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <button className="button secondary" onClick={() => setStep(1)}>
                  <ArrowLeft size={15} /> Back
                </button>
                <button className="button primary" onClick={() => setStep(3)}>
                  Proceed to Adjustment Type <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Adjustment Type */}
          {step === 3 && (
            <div style={{ maxWidth: 700 }}>
              <label>
                Select Adjustment Classification
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value as FeeAdjustment['category'])}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <div className="small-note">
                {isCredit
                  ? 'Credit adjustment: This will reduce the student\'s committed payable amount.'
                  : 'Debit adjustment: This will add an additional institutional charge.'}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <button className="button secondary" onClick={() => setStep(2)}>
                  <ArrowLeft size={15} /> Back
                </button>
                <button className="button primary" onClick={() => setStep(4)}>
                  Proceed to Amount &amp; Reason <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Amount & Reason Note */}
          {step === 4 && (
            <div style={{ maxWidth: 700 }}>
              <div className="form-row">
                <label>
                  Adjustment Amount (INR)
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={adjustmentAmount}
                    onChange={e => setAdjustmentAmount(Number(e.target.value))}
                    required
                  />
                </label>
                <label>
                  Effective Date
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label>
                Reason &amp; Administrative Note
                <input
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Merit Scholarship approved by Principal"
                  required
                />
              </label>
              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <button className="button secondary" onClick={() => setStep(3)}>
                  <ArrowLeft size={15} /> Back
                </button>
                <button className="button primary" onClick={() => setStep(5)}>
                  Review Live Ledger Preview <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Live Ledger Preview & Confirmation */}
          {step === 5 && (
            <div style={{ maxWidth: 700 }}>
              <h4>Live Balance Impact Simulation</h4>
              <p style={{ color: '#718096', fontSize: 12, marginBottom: 14 }}>
                Verify the exact financial impact prior to committing changes to the permanent ledger.
              </p>

              <div className="wizard-preview-box">
                <div className="wizard-preview-grid">
                  <div className="wizard-preview-item">
                    <span>Target</span>
                    <strong>{targetStudent ? targetStudent.name : `All ${students.length} Students`}</strong>
                  </div>
                  <div className="wizard-preview-item">
                    <span>Adjustment Entry</span>
                    <strong className={isCredit ? 'positive' : 'negative'}>
                      {isCredit ? '-' : '+'}{money(adjustmentAmount)} ({selectedCategory})
                    </strong>
                  </div>
                  <div className="wizard-preview-item">
                    <span>Projected Due</span>
                    <strong>{targetStudent ? money(projectedBalance) : 'Calculated per ledger'}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="button secondary" onClick={() => setStep(4)}>
                  <ArrowLeft size={15} /> Modify Details
                </button>
                <button className="button primary" onClick={handleApplyAdjustment}>
                  <CheckCircle2 size={15} /> Commit &amp; Apply Adjustment
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. STRUCTURED FEE TEMPLATES (NO TEXTAREAS) */}
      <section className="card" style={{ marginBottom: 24 }}>
        <div className="premium-card-heading">
          <div>
            <h3>Structured Fee Schedule Templates</h3>
            <p>Design reusable institutional fee structures with modular component rows.</p>
          </div>
          <button className="btn-add-row" onClick={addComponentRow}>
            <Plus size={14} /> Add Component Row
          </button>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <label>
              Structure / Template Name
              <input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g. BCA 2026-27 Standard Fee"
                required
              />
            </label>
            <label>
              Billing Frequency Cycle
              <select
                value={templateCycle}
                onChange={e => setTemplateCycle(e.target.value as 'Annual' | 'Semester')}
              >
                <option value="Annual">Annual Billing (Once a Year)</option>
                <option value="Semester">Semester Billing (Bi-Annual)</option>
              </select>
            </label>
          </div>

          {/* Dynamic Component Table */}
          <div className="table-wrap">
            <table className="fee-components-table">
              <thead>
                <tr>
                  <th>FEE HEAD / COMPONENT</th>
                  <th>AMOUNT (INR)</th>
                  <th>FREQUENCY</th>
                  <th style={{ width: 80 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {components.map((comp, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        value={comp.label}
                        onChange={e => updateComponent(idx, 'label', e.target.value)}
                      >
                        {feeHeads.map(head => (
                          <option key={head} value={head}>{head}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="100"
                        value={comp.amount}
                        onChange={e => updateComponent(idx, 'amount', Number(e.target.value))}
                        style={{ width: 140 }}
                      />
                    </td>
                    <td>
                      <select
                        value={comp.frequency}
                        onChange={e => updateComponent(idx, 'frequency', e.target.value)}
                      >
                        <option value="Annual">Annual</option>
                        <option value="Semester">Semester</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="button secondary small"
                        onClick={() => removeComponentRow(idx)}
                        disabled={components.length <= 1}
                        aria-label="Remove component row"
                      >
                        <Trash2 size={13} color="#DC2626" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
              Total Structure Amount:{' '}
              <span className="positive">
                {money(components.reduce((sum, c) => sum + Number(c.amount || 0), 0))}
              </span>
            </div>
            <button
              className="button primary"
              onClick={() => {
                if (!templateName.trim() || components.some(c => c.amount <= 0)) {
                  setMessage('Provide a template name and valid component amounts.');
                  return;
                }
                setData(cur => ({
                  ...cur,
                  feeTemplates: [
                    ...(cur.feeTemplates ?? []),
                    {
                      id: crypto.randomUUID(),
                      name: templateName,
                      components: components.map(c => ({ label: c.label, amount: c.amount })),
                      cycle: templateCycle,
                    },
                  ],
                }));
                setMessage('Reusable fee structure saved successfully.');
              }}
            >
              Save Structure Template
            </button>
          </div>
        </div>
      </section>

      {/* 3. LATE FEE ASSESSMENT & REFUND PROCESSING */}
      <div className="profile-grid-2col" style={{ marginBottom: 24 }}>
        {/* Late Fee Calculation */}
        <section className="card">
          <div className="premium-card-heading">
            <div>
              <h3>Late Fee Assessment</h3>
              <p>Compute automated penalty for overdue balances beyond grace period.</p>
            </div>
            <ShieldAlert size={18} color="#DC2626" />
          </div>
          <div style={{ padding: '0 22px 22px' }}>
            <form
              onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const ids = students.map(s => s.id);
                const amount = Number(f.get('lateAmount'));
                const grace = Number(f.get('grace'));
                const next = assessLateFees(data, ids, amount, grace);
                if (next === data) {
                  setMessage('No unassessed overdue balances match this rule.');
                  return;
                }
                setData(next);
                setMessage('Late fees assessed and applied to eligible student accounts.');
              }}
            >
              <div className="form-row">
                <label>
                  Flat Late Fee (INR)
                  <input name="lateAmount" type="number" min="1" step="50" defaultValue="500" required />
                </label>
                <label>
                  Grace Period (Days)
                  <input name="grace" type="number" min="0" max="90" defaultValue="7" required />
                </label>
              </div>
              <button className="button secondary full-width" disabled={!students.length}>
                Assess Late Fees for {students.length} Accounts
              </button>
            </form>
          </div>
        </section>

        {/* Refund Processing */}
        <section className="card">
          <div className="premium-card-heading">
            <div>
              <h3>Institutional Refund Processing</h3>
              <p>Process simulated fee refunds against verified payment receipts.</p>
            </div>
            <RotateCcw size={18} color="#234D70" />
          </div>
          <div style={{ padding: '0 22px 22px' }}>
            <form
              onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const id = String(f.get('payment'));
                const amount = Number(f.get('amount'));
                const reference = String(f.get('reference'));
                const next = refundFee(data, id, amount, reference);
                if (next === data) {
                  setMessage('Check refund amount. Cannot exceed verified original receipt amount.');
                  return;
                }
                setData(next);
                setMessage('Refund approved and credited back to payer.');
              }}
            >
              <label>
                Verified Bank Receipt
                <select name="payment" required>
                  <option value="">Choose receipt to refund</option>
                  {data.payments
                    .filter(p => p.verified && !p.refundFor)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.reference} · ₹{p.amount} ({data.students.find(s => s.id === p.studentId)?.name})
                      </option>
                    ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  Refund Amount (INR)
                  <input name="amount" type="number" min="1" step="0.01" defaultValue="5000" required />
                </label>
                <label>
                  Bank Reference / UTR
                  <input name="reference" defaultValue={`REF-${Date.now().toString().slice(-6)}`} required />
                </label>
              </div>
              <button className="button primary full-width">
                Process &amp; Issue Refund
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* 4. FEE ADJUSTMENT AUDIT HISTORY */}
      <section className="card">
        <div className="premium-card-heading">
          <div>
            <h3>Fee Adjustment &amp; Waiver History</h3>
            <p>Chronological audit log of all institutional concessions, scholarships, and penalties.</p>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              downloadCSV('poddar-fee-adjustments.csv', [
                ['Student ID', 'Student Name', 'Date', 'Category', 'Component', 'Amount'],
                ...data.students.flatMap(s =>
                  (s.adjustments ?? []).map(a => [s.id, s.name, a.date, a.category, a.label, a.amount])
                ),
              ])
            }
          >
            <Download size={14} /> Export History CSV
          </button>
        </div>
        <div className="table-wrap">
          <table className="premium-table">
            <thead>
              <tr>
                <th>STUDENT</th>
                <th>DATE</th>
                <th>CATEGORY</th>
                <th>REASON / COMPONENT</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {data.students.flatMap(s =>
                (s.adjustments ?? []).map(a => (
                  <tr key={s.id + a.id}>
                    <td><strong>{s.name}</strong> <small className="block">{s.id}</small></td>
                    <td>{a.date}</td>
                    <td>
                      <span className={`status-pill ${['Waiver', 'Scholarship', 'Concession'].includes(a.category) ? 'good' : 'bad'}`}>
                        {a.category}
                      </span>
                    </td>
                    <td>{a.label}</td>
                    <td><Currency value={a.amount} /></td>
                  </tr>
                ))
              )}
              {!data.students.some(s => (s.adjustments ?? []).length > 0) && (
                <tr>
                  <td colSpan={5} className="empty-state">No adjustments posted yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
