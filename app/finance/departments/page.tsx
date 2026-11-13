// College Finance Portal - Institutional Department Master
// Manage academic, administrative and support departments, HODs, student capacities and budget ceilings.

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  PlusCircle,
  Users,
  GraduationCap,
  IndianRupee,
  Edit3,
  Trash2,
  Mail,
} from 'lucide-react';
import { useFinance } from '@/lib/finance-portal/store/finance-store';
import { formatINR, toPaise, toRupees } from '@/lib/finance-portal/finance/money';
import { Dialog } from '@/components/finance-portal/ui/dialog';
import { useToast } from '@/components/finance-portal/ui/toast';
import type { InstitutionalDepartment } from '@/lib/finance-portal/types/finance';

type DeptCategory = InstitutionalDepartment['category'];

export default function DepartmentsPage() {
  const { state, dispatch } = useFinance();
  const { showToast } = useToast();
  const departments = state.departments || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | DeptCategory>('ALL');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<InstitutionalDepartment | null>(null);

  // Add form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [hodName, setHodName] = useState('');
  const [hodEmail, setHodEmail] = useState('');
  const [category, setCategory] = useState<DeptCategory>('Teaching / Academic');
  const [budgetRupees, setBudgetRupees] = useState('3500000');
  const [facultyCount, setFacultyCount] = useState('15');
  const [studentCount, setStudentCount] = useState('250');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Stats calculation
  const totalDepts = departments.length;
  const totalFaculty = departments.reduce((acc, d) => acc + (d.facultyCount || 0), 0);
  const totalStudents = departments.reduce((acc, d) => acc + (d.studentCount || 0), 0);
  const totalBudgetPaise = departments.reduce((acc, d) => acc + (d.annualBudgetPaise || 0), 0);

  // Filtered depts
  const filteredDepts = useMemo(() => {
    return departments.filter(d => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.hodName.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'ALL' || d.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [departments, searchQuery, categoryFilter]);

  const resetForm = () => {
    setCode('');
    setName('');
    setHodName('');
    setHodEmail('');
    setCategory('Teaching / Academic');
    setBudgetRupees('3500000');
    setFacultyCount('15');
    setStudentCount('250');
    setStatus('Active');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !hodName.trim()) {
      showToast('Validation Error', 'Department code, name and HOD are required.', 'error');
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    if (departments.some(d => d.code.toUpperCase() === cleanCode)) {
      showToast('Duplicate Code', `Department code ${cleanCode} already exists.`, 'error');
      return;
    }

    const newDept: InstitutionalDepartment = {
      id: `DEPT-${cleanCode}`,
      code: cleanCode,
      name: name.trim(),
      hodName: hodName.trim(),
      hodEmail: hodEmail.trim() || `${cleanCode.toLowerCase()}.hod@poddarinstitute.org`,
      category,
      facultyCount: parseInt(facultyCount) || 0,
      studentCount: parseInt(studentCount) || 0,
      annualBudgetPaise: toPaise(parseFloat(budgetRupees) || 0),
      status,
    };

    dispatch({ type: 'ADD_DEPARTMENT', department: newDept });
    showToast('Department Added', `${newDept.name} (${newDept.code}) created successfully.`);
    resetForm();
    setIsAddOpen(false);
  };

  const handleOpenEdit = (dept: InstitutionalDepartment) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setHodName(dept.hodName);
    setHodEmail(dept.hodEmail || '');
    setCategory(dept.category);
    setBudgetRupees(String(toRupees(dept.annualBudgetPaise)));
    setFacultyCount(String(dept.facultyCount));
    setStudentCount(String(dept.studentCount));
    setStatus(dept.status);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    if (!name.trim() || !hodName.trim()) {
      showToast('Validation Error', 'Department name and HOD are required.', 'error');
      return;
    }

    const updated: InstitutionalDepartment = {
      ...editingDept,
      name: name.trim(),
      hodName: hodName.trim(),
      hodEmail: hodEmail.trim() || editingDept.hodEmail,
      category,
      facultyCount: parseInt(facultyCount) || 0,
      studentCount: parseInt(studentCount) || 0,
      annualBudgetPaise: toPaise(parseFloat(budgetRupees) || 0),
      status,
    };

    dispatch({ type: 'UPDATE_DEPARTMENT', department: updated });
    showToast('Department Updated', `${updated.name} updated successfully.`);
    setEditingDept(null);
    resetForm();
  };

  const handleDelete = (dept: InstitutionalDepartment) => {
    // Check if staff belongs to this dept
    const linkedStaff = state.employees.filter(
      e => e.department.toLowerCase() === dept.name.toLowerCase() || e.department.toLowerCase() === dept.code.toLowerCase()
    );
    if (linkedStaff.length > 0) {
      if (!confirm(`Warning: ${linkedStaff.length} employees are currently assigned to ${dept.name}. Are you sure you want to delete this department?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete ${dept.name} (${dept.code})? This action cannot be undone.`)) {
        return;
      }
    }

    dispatch({ type: 'DELETE_DEPARTMENT', departmentId: dept.id });
    showToast('Department Removed', `${dept.name} deleted.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', padding: 8, background: 'rgba(198, 164, 90, 0.12)', borderRadius: 10, color: 'var(--gold)' }}>
              <Building2 size={24} />
            </span>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--navy)' }}>Department Master & Academics</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                Official department register, Head of Department (HOD) assignments, faculty strength and operating budgets.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link
            href="/finance/employees"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}
          >
            <Users size={16} />
            <span>Staff Directory</span>
          </Link>
          <button
            onClick={() => { resetForm(); setIsAddOpen(true); }}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, background: 'var(--navy)', color: '#fff' }}
          >
            <PlusCircle size={16} />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="card-surface" style={{ padding: 18, borderLeft: '4px solid var(--gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
            <span>ACTIVE DEPARTMENTS</span>
            <Building2 size={16} style={{ color: 'var(--gold)' }} />
          </div>
          <div className="headline-number" style={{ fontSize: 28, marginTop: 8, fontWeight: 700, color: 'var(--navy)' }}>
            {totalDepts}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Academic, Administrative & Support
          </div>
        </div>

        <div className="card-surface" style={{ padding: 18, borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
            <span>FACULTY & STAFF</span>
            <Users size={16} style={{ color: '#3b82f6' }} />
          </div>
          <div className="headline-number" style={{ fontSize: 28, marginTop: 8, fontWeight: 700, color: 'var(--navy)' }}>
            {totalFaculty}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Across all wings and faculties
          </div>
        </div>

        <div className="card-surface" style={{ padding: 18, borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
            <span>STUDENT ENROLLMENT</span>
            <GraduationCap size={16} style={{ color: '#10b981' }} />
          </div>
          <div className="headline-number" style={{ fontSize: 28, marginTop: 8, fontWeight: 700, color: 'var(--navy)' }}>
            {totalStudents.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Undergraduate & Postgraduate
          </div>
        </div>

        <div className="card-surface" style={{ padding: 18, borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
            <span>ANNUAL BUDGET CEILING</span>
            <IndianRupee size={16} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="headline-number" style={{ fontSize: 24, marginTop: 8, fontWeight: 700, color: 'var(--navy)' }}>
            {formatINR(totalBudgetPaise)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Approved operational funds FY 2026-27
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card-surface" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 260 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by department name, code, or HOD name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                  color: 'inherit',
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as any)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                  color: 'inherit',
                  fontSize: 13,
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="Teaching / Academic">Academic / Teaching</option>
                <option value="Administrative">Administrative</option>
                <option value="Campus Operations">Campus Operations</option>
                <option value="Student Support">Student Support / Amenities</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Showing <strong>{filteredDepts.length}</strong> of {departments.length} departments
          </div>
        </div>
      </div>

      {/* Department Directory Table */}
      <div className="card-surface" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)' }}>
            Institutional Departments & Academic Units
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Poddar International College Official Hierarchy
          </span>
        </div>

        <div className="responsive-table">
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Department Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Head of Dept (HOD)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Staff</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Students</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Annual Budget</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No departments matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredDepts.map(dept => (
                  <tr key={dept.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--navy)' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        background: 'rgba(11, 29, 58, 0.08)',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}>
                        {dept.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{dept.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {dept.id}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        background: dept.category === 'Teaching / Academic'
                          ? 'rgba(59, 130, 246, 0.12)'
                          : dept.category === 'Administrative'
                          ? 'rgba(198, 164, 90, 0.15)'
                          : 'rgba(16, 185, 129, 0.12)',
                        color: dept.category === 'Teaching / Academic'
                          ? '#1d4ed8'
                          : dept.category === 'Administrative'
                          ? '#997328'
                          : '#047857',
                      }}>
                        {dept.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{dept.hodName}</div>
                      {dept.hodEmail && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={11} /> {dept.hodEmail}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                      {dept.facultyCount}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {dept.studentCount > 0 ? dept.studentCount.toLocaleString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                      {formatINR(dept.annualBudgetPaise)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: dept.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.15)',
                        color: dept.status === 'Active' ? '#047857' : '#a16207',
                      }}>
                        {dept.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          onClick={() => handleOpenEdit(dept)}
                          className="btn-icon"
                          title="Edit Department"
                          style={{
                            padding: 6,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            cursor: 'pointer',
                            color: 'var(--text-main)',
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(dept)}
                          className="btn-icon"
                          title="Delete Department"
                          style={{
                            padding: 6,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            cursor: 'pointer',
                            color: '#ef4444',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Department Dialog */}
      <Dialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Institutional Department"
        subtitle="Register a new academic, administrative or student-services department with assigned HOD and annual budget."
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Dept Code*
              </label>
              <input
                type="text"
                placeholder="e.g. LAW"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                required
                maxLength={8}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Department Name*
              </label>
              <input
                type="text"
                placeholder="e.g. Faculty of Law & Legal Studies"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Department Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DeptCategory)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              >
                <option value="Teaching / Academic">Teaching / Academic</option>
                <option value="Administrative">Administrative Wing</option>
                <option value="Campus Operations">Campus Operations</option>
                <option value="Student Support">Student Support & Amenities</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Operating Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Head of Department (HOD)*
              </label>
              <input
                type="text"
                placeholder="e.g. Prof. Arvind Verma"
                value={hodName}
                onChange={e => setHodName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                HOD Institutional Email
              </label>
              <input
                type="email"
                placeholder="hod.law@poddarinstitute.org"
                value={hodEmail}
                onChange={e => setHodEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Staff Strength
              </label>
              <input
                type="number"
                min="0"
                value={facultyCount}
                onChange={e => setFacultyCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Students Enrolled
              </label>
              <input
                type="number"
                min="0"
                value={studentCount}
                onChange={e => setStudentCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Annual Budget (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={budgetRupees}
                onChange={e => setBudgetRupees(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: 'var(--navy)', color: '#fff' }}
            >
              Save Department Record
            </button>
          </div>
        </form>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog
        open={Boolean(editingDept)}
        onClose={() => setEditingDept(null)}
        title="Edit Department"
        subtitle={editingDept ? `Update details for ${editingDept.name} (${editingDept.code}).` : ''}
      >
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Dept Code
              </label>
              <input
                type="text"
                value={code}
                disabled
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                  fontWeight: 600,
                  opacity: 0.7,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Department Name*
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Department Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DeptCategory)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              >
                <option value="Teaching / Academic">Teaching / Academic</option>
                <option value="Administrative">Administrative Wing</option>
                <option value="Campus Operations">Campus Operations</option>
                <option value="Student Support">Student Support & Amenities</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Operating Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Head of Department (HOD)*
              </label>
              <input
                type="text"
                value={hodName}
                onChange={e => setHodName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                HOD Institutional Email
              </label>
              <input
                type="email"
                value={hodEmail}
                onChange={e => setHodEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Staff Strength
              </label>
              <input
                type="number"
                min="0"
                value={facultyCount}
                onChange={e => setFacultyCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Students Enrolled
              </label>
              <input
                type="number"
                min="0"
                value={studentCount}
                onChange={e => setStudentCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Annual Budget (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={budgetRupees}
                onChange={e => setBudgetRupees(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-main)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setEditingDept(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: 'var(--navy)', color: '#fff' }}
            >
              Update Department
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
