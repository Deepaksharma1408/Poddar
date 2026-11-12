// College Finance Portal - Employee Directory & Compensation Master
// Teaching, Non-Teaching & Support Staff, PAN/IFSC validation, CTC structures & sensitive field masking.

'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  Shield,
  Eye,
  EyeOff,
  Building2,
  Briefcase,
  CreditCard,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise } from '@/lib/finance-portal/finance/money';
import { maskSalary, maskBankAccount, maskPAN } from '@/lib/finance-portal/security/rbac';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import type { Employee, EmployeeCategory, EmploymentType } from '@/lib/finance-portal/types/finance';

export default function EmployeesPage() {
  const { state, dispatch } = useFinance();
  const { showToast } = useToast();
  const currentRole = state.settings.currentRole;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | EmployeeCategory>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // New Employee Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formDept, setFormDept] = useState('Computer Science & IT');
  const [formCategory, setFormCategory] = useState<EmployeeCategory>('Teaching');
  const [formType, setFormType] = useState<EmploymentType>('Permanent');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPan, setFormPan] = useState('');
  const [formAadhaar, setFormAadhaar] = useState('');
  const [formBank, setFormBank] = useState('State Bank of India');
  const [formAccountLast4, setFormAccountLast4] = useState('');
  const [formIfsc, setFormIfsc] = useState('SBIN0004123');
  const [formBaseRupees, setFormBaseRupees] = useState('45000');
  const [formPfOpted, setFormPfOpted] = useState(true);
  const [formEsiOpted, setFormEsiOpted] = useState(false);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return state.employees.filter(emp => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'ALL' || emp.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [state.employees, searchQuery, categoryFilter]);

  // Validation
  const validatePan = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
  const validateIfsc = (ifsc: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
  const validatePhone = (phone: string) => /^\+91-[0-9]{5}-[0-9]{5}$/.test(phone) || /^[0-9]{10}$/.test(phone);

  const handleCreateEmployee = () => {
    if (!formName.trim() || !formDesignation.trim()) {
      showToast('Validation Error', 'Name and designation are required.', 'error');
      return;
    }

    if (formPan && !validatePan(formPan)) {
      showToast('Invalid PAN', 'Permanent Account Number must be 10 characters (e.g. ABCDE1234F).', 'error');
      return;
    }

    if (formIfsc && !validateIfsc(formIfsc)) {
      showToast('Invalid IFSC', 'Bank IFSC code must be 11 characters (e.g. SBIN0004123).', 'error');
      return;
    }

    const base = parseFloat(formBaseRupees) || 30000;
    const newEmp: Employee = {
      id: `EMP0${state.employees.length + 1}`,
      name: formName.trim(),
      designation: formDesignation.trim(),
      department: formDept,
      category: formCategory,
      employmentType: formType,
      joiningDate: new Date().toISOString().slice(0, 10),
      email: formEmail.trim() || `emp${state.employees.length + 1}@poddarinstitute.org`,
      phone: formPhone.trim() || '+91-98290-00999',
      panMasked: formPan ? `${formPan.slice(0, 5)}••••${formPan.slice(9)}` : 'ABCDE••••F',
      aadhaarLastFour: formAadhaar.slice(-4) || '1234',
      bankName: formBank,
      accountLastFour: formAccountLast4 || '4102',
      ifsc: formIfsc.toUpperCase(),
      baseSalaryPaise: toPaise(base),
      hraPaise: toPaise(Math.round(base * 0.3)),
      daPaise: toPaise(Math.round(base * 0.2)),
      specialAllowancePaise: toPaise(3000),
      conveyancePaise: toPaise(2000),
      pfOpted: formPfOpted,
      esiOpted: formEsiOpted,
      status: 'Active',
    };

    dispatch({
      type: 'RESTORE_BACKUP',
      state: {
        ...state,
        employees: [newEmp, ...state.employees],
      },
    });

    showToast('Employee Added', `${newEmp.name} added to staff master.`, 'success');
    setNewModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy)' }}>Employee Directory & Staff Master</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Teaching faculty, non-teaching officers, and support staff profiles with salary terms and PII masking.
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
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
          <span>Add Employee</span>
        </button>
      </div>

      {/* Directory Table Card */}
      <div className="card-surface" style={{ padding: '18px 20px' }}>
        {/* Search & Category Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '320px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search faculty name, ID, department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'Teaching', 'Non-teaching', 'Support'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '5px 12px',
                  fontSize: '11.5px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: categoryFilter === cat ? 'var(--navy)' : 'var(--bg-card)',
                  color: categoryFilter === cat ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: categoryFilter === cat ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {cat === 'ALL' ? 'All Staff' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Employee ID & Name</th>
                <th>Designation & Dept</th>
                <th>Category / Type</th>
                <th>Bank Account</th>
                <th>PAN</th>
                <th style={{ textAlign: 'right' }}>Base Salary (Gross CTC)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => {
                const totalGross =
                  emp.baseSalaryPaise +
                  emp.hraPaise +
                  emp.daPaise +
                  emp.specialAllowancePaise +
                  emp.conveyancePaise;

                return (
                  <tr key={emp.id}>
                    <td data-label="Employee">
                      <strong>{emp.name}</strong>
                      <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {emp.id} · Joined {emp.joiningDate}
                      </span>
                    </td>
                    <td data-label="Designation">
                      <span>{emp.designation}</span>
                      <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--navy)' }}>
                        {emp.department}
                      </span>
                    </td>
                    <td data-label="Category">
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor:
                            emp.category === 'Teaching'
                              ? 'var(--navy-light)'
                              : emp.category === 'Non-teaching'
                              ? 'var(--gold-light)'
                              : 'var(--bg-subtle)',
                          color:
                            emp.category === 'Teaching'
                              ? 'var(--navy)'
                              : emp.category === 'Non-teaching'
                              ? 'var(--gold)'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {emp.category} · {emp.employmentType}
                      </span>
                    </td>
                    <td data-label="Bank" style={{ fontFamily: 'monospace', fontSize: '11.5px' }}>
                      {maskBankAccount(emp.accountLastFour, currentRole)}
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {emp.bankName} ({emp.ifsc})
                      </span>
                    </td>
                    <td data-label="PAN" style={{ fontFamily: 'monospace', fontSize: '11.5px' }}>
                      {maskPAN(emp.panMasked, currentRole)}
                    </td>
                    <td data-label="Salary" style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                      {maskSalary(formatINR(totalGross), currentRole)}
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>
                        Base: {maskSalary(formatINR(emp.baseSalaryPaise), currentRole)}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor: 'var(--green-light)',
                          color: 'var(--green)',
                        }}
                      >
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add New Employee */}
      <Dialog open={newModalOpen} onClose={() => setNewModalOpen(false)} title="Enroll Staff Member" maxWidth="620px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Full Name*</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Dr. / Prof. / Mr. Name"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Designation*</label>
              <input
                type="text"
                value={formDesignation}
                onChange={e => setFormDesignation(e.target.value)}
                placeholder="e.g. Associate Professor"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
              <select
                value={formDept}
                onChange={e => setFormDept(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="Computer Science & IT">Computer Science & IT</option>
                <option value="Management & Business Studies">Management & Business</option>
                <option value="Commerce & Accounting">Commerce & Accounting</option>
                <option value="Basic Sciences & Research Lab">Basic Sciences</option>
                <option value="Campus Administration & Maintenance">Administration</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value as EmployeeCategory)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="Teaching">Teaching</option>
                <option value="Non-teaching">Non-teaching</option>
                <option value="Support">Support</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employment Type</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value as EmploymentType)}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="Permanent">Permanent</option>
                <option value="Contractual">Contractual</option>
                <option value="Probation">Probation</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>PAN (10 alphanumeric)*</label>
              <input
                type="text"
                value={formPan}
                onChange={e => setFormPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bank IFSC Code*</label>
              <input
                type="text"
                value={formIfsc}
                onChange={e => setFormIfsc(e.target.value.toUpperCase())}
                placeholder="SBIN0004123"
                maxLength={11}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Base Monthly Salary (INR)*</label>
              <input
                type="number"
                value={formBaseRupees}
                onChange={e => setFormBaseRupees(e.target.value)}
                placeholder="45000"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bank Account Last 4 Digits</label>
              <input
                type="text"
                value={formAccountLast4}
                onChange={e => setFormAccountLast4(e.target.value.slice(0, 4))}
                placeholder="4102"
                maxLength={4}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => setNewModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateEmployee}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--navy)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Save Employee Record
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

