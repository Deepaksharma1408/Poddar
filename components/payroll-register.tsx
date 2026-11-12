'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Policy, SchoolFinance } from '@/lib/school-finance';
import { changePayroll, createPayrollRecord, openingPeriod, type PayrollRecord } from '@/lib/payroll';
import { Currency, Dialog, Status, downloadCSV } from './finance-ui';
import { useInstitution } from './institution';
import { downloadPayslipPDF, downloadPayrollRegisterPDF } from '@/lib/pdf-documents';
import { Download, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';

export default function PayrollRegister({
  data,
  setData,
}: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
}) {
  const campus = useInstitution();
  const [mode, setMode] = useState('NEFT');
  const [period, setPeriod] = useState(openingPeriod);
  const [department, setDepartment] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [transfer, setTransfer] = useState<PayrollRecord>();
  const [slip, setSlip] = useState<PayrollRecord>();
  const [holdTarget, setHoldTarget] = useState<PayrollRecord>();
  const [approvalModal, setApprovalModal] = useState<{
    record: PayrollRecord;
    action: 'approve_hod' | 'approve_hr' | 'approve_accounts' | 'approve';
    title: string;
  }>();

  const employees = data.staff.filter(employee => !department || employee.subject === department);
  const records = (data.payroll ?? []).filter(
    record => record.period === period && (!department || record.department === department)
  );
  const queued = records.filter(record => selected.includes(record.id) && ['Approved', 'Failed'].includes(record.status));

  function calculate() {
    const additions = employees.flatMap(employee => {
      const record = createPayrollRecord(data, employee, period);
      return record ? [record] : [];
    });
    setData(current => ({
      ...current,
      payroll: [
        ...(current.payroll ?? []),
        ...additions.filter(record => !current.payroll?.some(existing => existing.id === record.id)),
      ],
    }));
    setMessage(
      additions.length
        ? `${additions.length} draft payroll records calculated for ${period}.`
        : 'No new records calculated. Check if payroll for this period already exists.'
    );
  }

  function queueBatch() {
    const batch = mode.toUpperCase().replaceAll(' ', '-') + '-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    setData(current => queued.reduce((next, record) => changePayroll(next, record.id, 'queue', batch, mode), current));
    setSelected([]);
    setMessage(`Simulated ${mode} batch ${batch} queued for ${queued.length} employees.`);
  }

  return (
    <section className="card">
      <div className="premium-card-heading">
        <div>
          <h3>Monthly Payroll Register &amp; Disbursement Engine</h3>
          <p>
            Full multi-tier approval workflow: Draft &rarr; HOD Review &rarr; HR Approval &rarr; Accounts Approval &rarr; Approved &rarr; Queued &rarr; Paid.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="button secondary"
            onClick={() =>
              downloadPayrollRegisterPDF({
                campusName: campus.name,
                period,
                records,
              })
            }
          >
            <Download size={14} />
            Download Register PDF
          </button>
          <button
            className="button secondary"
            onClick={() =>
              downloadCSV('payroll-' + period + '.csv', [
                ['Employee ID', 'Name', 'Month', 'Gross', 'Paid leave days', 'Unpaid leave days', 'Deductions', 'Net', 'Status', 'Batch', 'Reference'],
                ...records.map(row => [
                  row.employeeId,
                  row.name,
                  row.period,
                  row.gross,
                  row.calculation.paidDays,
                  row.calculation.unpaidDays,
                  row.calculation.deduction,
                  row.calculation.net,
                  row.status,
                  row.batch ?? '',
                  row.reference ?? '',
                ]),
              ])
            }
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="list-toolbar payroll-toolbar">
        <div className="payroll-filter-group">
          <label>
            Payroll month
            <input
              aria-label="Payroll month"
              type="month"
              value={period}
              onChange={event => {
                setPeriod(event.target.value);
                setSelected([]);
              }}
            />
          </label>
          <label>
            Department
            <select
              value={department}
              onChange={event => {
                setDepartment(event.target.value);
                setSelected([]);
              }}
            >
              <option value="">All departments</option>
              {[...new Set(data.staff.map(employee => employee.subject))].map(value => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Payroll divisor
            <select
              value={data.policy.divisorMode ?? 'Fixed'}
              onChange={event => {
                const divisorMode = event.target.value as Policy['divisorMode'];
                setData(current => ({ ...current, policy: { ...current.policy, divisorMode } }));
              }}
            >
              <option>Fixed</option>
              <option>Calendar days</option>
              <option>Working days</option>
            </select>
          </label>
          <label>
            Transfer mode
            <select value={mode} onChange={event => setMode(event.target.value)}>
              {['NEFT', 'RTGS', 'IMPS', 'Bank transfer', 'Cheque'].map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="payroll-action-group">
          <button className="button primary" disabled={!period} onClick={calculate}>
            Calculate payroll
          </button>
          <button className="button secondary" disabled={!queued.length} onClick={queueBatch}>
            Queue selected for {mode} ({queued.length})
          </button>
        </div>
      </div>

      {message && (
        <p className="info-strip" role="status">
          {message}
        </p>
      )}

      <div className="table-wrap mobile-scroll-table" role="region" aria-label="Monthly payroll register" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>Employee</th>
              <th>Gross</th>
              <th>Paid / Unpaid Days</th>
              <th>Deductions</th>
              <th>Net</th>
              <th>Approval Status</th>
              <th>Batch / Reference</th>
              <th>Workflow Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map(row => (
              <tr key={row.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={'Select ' + row.name}
                    disabled={!['Approved', 'Failed'].includes(row.status)}
                    checked={selected.includes(row.id)}
                    onChange={event => {
                      const checked = event.target.checked;
                      setSelected(current => (checked ? [...current, row.id] : current.filter(id => id !== row.id)));
                    }}
                  />
                </td>
                <td>
                  <strong>{row.name}</strong>
                  <small className="block">
                    {row.employeeId} · {row.department}
                  </small>
                  {data.staff.find(person => person.id === row.employeeId)?.profile?.bank && (
                    <small className="block">
                      {data.staff.find(person => person.id === row.employeeId)?.profile?.bank} · ••••{' '}
                      {data.staff.find(person => person.id === row.employeeId)?.profile?.accountLastFour} ·{' '}
                      {data.staff.find(person => person.id === row.employeeId)?.profile?.ifsc}
                    </small>
                  )}
                  {row.holdReason && (
                    <small className="block" style={{ color: 'var(--negative)', fontWeight: 600 }}>
                      Hold: {row.holdReason}
                    </small>
                  )}
                </td>
                <td>
                  <Currency value={row.gross} />
                </td>
                <td>
                  {row.calculation.paidDays} / {row.calculation.unpaidDays}
                </td>
                <td className="negative">
                  −<Currency value={row.calculation.deduction} />
                </td>
                <td>
                  <strong>
                    <Currency value={row.calculation.net} />
                  </strong>
                </td>
                <td>
                  <Status>{row.status}</Status>
                  {row.approvalRemarks && (
                    <small className="block" style={{ fontStyle: 'italic' }}>
                      {row.approvalRemarks}
                    </small>
                  )}
                </td>
                <td>
                  {row.batch ?? '—'}
                  <small className="block">{row.mode}</small>
                  <small className="block">{row.reference}</small>
                </td>
                <td>
                  <div className="row-actions" style={{ flexWrap: 'wrap', gap: 4 }}>
                    {/* Intermediate stages */}
                    {row.status === 'Draft' && (
                      <>
                        <button
                          className="button secondary small"
                          title="Submit for HOD Review"
                          onClick={() => setData(current => changePayroll(current, row.id, 'submit_hod'))}
                        >
                          Submit HOD
                        </button>
                        <button
                          className="button secondary small"
                          title="Direct Admin Approval"
                          onClick={() => {
                            if (changePayroll(data, row.id, 'approve') === data) {
                              setMessage('Finalize employee attendance for this month in Leave calendar before approving payroll.');
                              return;
                            }
                            setData(current => changePayroll(current, row.id, 'approve'));
                            setMessage(`Direct approval recorded for ${row.name}.`);
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="button secondary small"
                          onClick={() => setHoldTarget(row)}
                          title="Put payroll on hold"
                        >
                          <PauseCircle size={13} /> Hold
                        </button>
                      </>
                    )}

                    {row.status === 'Pending HOD Review' && (
                      <>
                        <button
                          className="button primary small"
                          onClick={() =>
                            setApprovalModal({
                              record: row,
                              action: 'approve_hod',
                              title: `HOD Review Approval · ${row.name}`,
                            })
                          }
                        >
                          Approve HOD
                        </button>
                        <button className="button secondary small" onClick={() => setHoldTarget(row)}>
                          <PauseCircle size={13} /> Hold
                        </button>
                      </>
                    )}

                    {row.status === 'Pending HR Approval' && (
                      <>
                        <button
                          className="button primary small"
                          onClick={() =>
                            setApprovalModal({
                              record: row,
                              action: 'approve_hr',
                              title: `HR Department Approval · ${row.name}`,
                            })
                          }
                        >
                          Approve HR
                        </button>
                        <button className="button secondary small" onClick={() => setHoldTarget(row)}>
                          <PauseCircle size={13} /> Hold
                        </button>
                      </>
                    )}

                    {row.status === 'Pending Accounts Approval' && (
                      <>
                        <button
                          className="button primary small"
                          onClick={() =>
                            setApprovalModal({
                              record: row,
                              action: 'approve_accounts',
                              title: `Accounts Final Approval · ${row.name}`,
                            })
                          }
                        >
                          Approve Accounts
                        </button>
                        <button className="button secondary small" onClick={() => setHoldTarget(row)}>
                          <PauseCircle size={13} /> Hold
                        </button>
                      </>
                    )}

                    {row.status === 'On Hold' && (
                      <button
                        className="button primary small"
                        onClick={() => {
                          setData(current => changePayroll(current, row.id, 'resume'));
                          setMessage(`Resumed payroll for ${row.name}.`);
                        }}
                      >
                        <PlayCircle size={13} /> Resume
                      </button>
                    )}

                    {row.status === 'Approved' && (
                      <button className="button secondary small" onClick={() => setHoldTarget(row)}>
                        <PauseCircle size={13} /> Hold
                      </button>
                    )}

                    {row.status === 'Processing' && (
                      <>
                        <button className="button primary small" onClick={() => setTransfer(row)}>
                          Record Success
                        </button>
                        <button
                          className="button secondary small"
                          onClick={() => {
                            setData(current => changePayroll(current, row.id, 'fail'));
                            setMessage(`Simulated NEFT failure recorded for ${row.name}.`);
                          }}
                        >
                          Simulate Failure
                        </button>
                      </>
                    )}

                    {row.status === 'Failed' && (
                      <button
                        className="button primary small"
                        onClick={() => {
                          const retryBatch = 'RETRY-' + crypto.randomUUID().slice(0, 6).toUpperCase();
                          setData(current => changePayroll(current, row.id, 'queue', retryBatch, row.mode ?? 'NEFT'));
                          setMessage(`Re-queued failed payment for ${row.name} in batch ${retryBatch}.`);
                        }}
                      >
                        <RefreshCw size={13} /> Retry NEFT
                      </button>
                    )}

                    {row.status !== 'Draft' && (
                      <button className="button secondary small" onClick={() => setSlip(row)}>
                        Payslip &amp; History
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length && <p className="empty-state">Calculate payroll to create records for this period.</p>}
      </div>

      {/* Put on Hold Dialog */}
      {holdTarget && (
        <Dialog
          title={`Put Payroll on Hold · ${holdTarget.name}`}
          kicker="PAYROLL SAFETY CHECK"
          onClose={() => setHoldTarget(undefined)}
        >
          <form
            onSubmit={event => {
              event.preventDefault();
              const reason = String(new FormData(event.currentTarget).get('reason')).trim();
              if (!reason) return;
              setData(current => changePayroll(current, holdTarget.id, 'hold', reason));
              setHoldTarget(undefined);
              setMessage(`Payroll for ${holdTarget.name} has been placed On Hold.`);
            }}
          >
            <p className="dialog-description">
              A payroll marked On Hold cannot be disbursed until explicitly resumed.
            </p>
            <label>
              Hold Reason
              <input
                name="reason"
                required
                placeholder="e.g. Attendance dispute, pending document, bank account change"
              />
            </label>
            <button className="button primary full-width" type="submit">
              Confirm Hold
            </button>
          </form>
        </Dialog>
      )}

      {/* Multi-Tier Approval Remarks Dialog */}
      {approvalModal && (
        <Dialog
          title={approvalModal.title}
          kicker="PAYROLL APPROVAL STAGE"
          onClose={() => setApprovalModal(undefined)}
        >
          <form
            onSubmit={event => {
              event.preventDefault();
              const remarks = String(new FormData(event.currentTarget).get('remarks')).trim();
              const res = changePayroll(data, approvalModal.record.id, approvalModal.action, '', 'NEFT', remarks);
              if (res === data) {
                setMessage('Cannot approve: verify finalized attendance and stage requirements.');
                return;
              }
              setData(res);
              setApprovalModal(undefined);
              setMessage(`Stage approval saved for ${approvalModal.record.name}.`);
            }}
          >
            <p className="dialog-description">
              Enter formal review remarks for the approval log.
            </p>
            <label>
              Approval Remarks
              <input
                name="remarks"
                defaultValue="Verified calculations, attendance records and statutory deductions."
                required
                maxLength={180}
              />
            </label>
            <button className="button primary full-width" type="submit">
              Submit Stage Approval
            </button>
          </form>
        </Dialog>
      )}

      {/* Record Transfer / UTR Dialog */}
      {transfer && (
        <Dialog title="Record simulated transfer" kicker="NEFT SETTLEMENT" onClose={() => setTransfer(undefined)}>
          <form
            onSubmit={event => {
              event.preventDefault();
              const reference = String(new FormData(event.currentTarget).get('reference')).trim();
              if (changePayroll(data, transfer.id, 'pay', reference) === data) {
                setMessage('Enter a unique UTR reference for settlement.');
                return;
              }
              setData(current => changePayroll(current, transfer.id, 'pay', reference));
              setTransfer(undefined);
              setMessage(`Simulated settlement recorded for ${transfer.name} with UTR ${reference.toUpperCase()}.`);
            }}
          >
            <label>
              Unique Bank UTR Reference
              <input name="reference" required maxLength={50} placeholder="e.g. UTR-2026-NEFT-9812" />
            </label>
            {message && <p role="status">{message}</p>}
            <button className="button primary full-width">Record simulated settlement</button>
          </form>
        </Dialog>
      )}

      {/* Detailed Payslip & History Dialog */}
      {slip && (
        <Dialog title={'Payslip & Calculation · ' + slip.period} kicker={campus.name} onClose={() => setSlip(undefined)}>
          <div className="erp-print-payslip">
            <img src="/poddar-logo.png" alt="Poddar" width={140} />
            <h3>{campus.name} · Official Payslip</h3>
            <p>
              {slip.name} · {slip.employeeId} · {slip.department} · {slip.period}
            </p>
            <dl>
              <dt>Designation</dt>
              <dd>{data.staff.find(person => person.id === slip.employeeId)?.designation ?? 'Faculty'}</dd>
              <dt>Basic salary</dt>
              <dd>
                <Currency value={slip.salaryTerms?.basic ?? slip.gross} />
              </dd>
              <dt>Allowances</dt>
              <dd>
                <Currency value={slip.salaryTerms?.allowances ?? 0} />
              </dd>
              <dt>Bonus</dt>
              <dd>
                <Currency value={slip.salaryTerms?.bonus ?? 0} />
              </dd>
              <dt>Leave encashment</dt>
              <dd>
                <Currency value={slip.salaryTerms?.encashment ?? 0} />
              </dd>
              <dt>Other deductions</dt>
              <dd>
                <Currency value={slip.salaryTerms?.otherDeductions ?? 0} />
              </dd>
              <dt>Loan recovery</dt>
              <dd>
                <Currency value={(slip.loanRecoveries ?? []).reduce((sum, item) => sum + item.amount, 0)} />
              </dd>
              <dt>Gross salary</dt>
              <dd>
                <Currency value={slip.gross} />
              </dd>
              <dt>Working days</dt>
              <dd>{slip.workingDays ?? '—'}</dd>
              <dt>Recorded present days</dt>
              <dd>{slip.presentDays ?? '—'}</dd>
              <dt>Salary divisor</dt>
              <dd>
                {slip.divisorMode ?? 'Fixed'} · {slip.divisor ?? '—'}
              </dd>
              <dt>Daily salary rate</dt>
              <dd>
                <Currency value={slip.calculation.daily} />
              </dd>
              <dt>Total deductions</dt>
              <dd>
                <Currency value={slip.calculation.deduction} />
              </dd>
              <dt>Paid leave days</dt>
              <dd>{slip.calculation.paidDays}</dd>
              <dt>Unpaid leave days</dt>
              <dd>{slip.calculation.unpaidDays}</dd>
              <dt>Unpaid leave deduction</dt>
              <dd>
                <Currency value={slip.calculation.unpaidDeduction} />
              </dd>
              <dt>Net payable</dt>
              <dd>
                <strong>
                  <Currency value={slip.calculation.net} />
                </strong>
              </dd>
              <dt>Payment status</dt>
              <dd>
                {slip.mode ?? 'NEFT'} · {slip.status} · {slip.reference ?? 'No UTR recorded'}
              </dd>
            </dl>
          </div>

          <div className="row-actions" style={{ margin: '16px 0' }}>
            <button
              className="button primary"
              onClick={() => {
                const emp = data.staff.find(s => s.id === slip.employeeId);
                if (emp) downloadPayslipPDF({ campusName: campus.name, employee: emp, record: slip });
              }}
            >
              <Download size={14} /> Download Official PDF Payslip
            </button>
          </div>

          <h3>Activity &amp; Approval History</h3>
          <ul>
            {slip.history.map((entry, index) => (
              <li key={index}>
                <strong>{entry.event}</strong> · {entry.at.slice(0, 10)} {entry.remarks && `(${entry.remarks})`}
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </section>
  );
}
