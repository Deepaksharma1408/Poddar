'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { canOpenPage, roles, type DemoRole } from '@/lib/erp-management';
import type { SchoolFinance } from '@/lib/school-finance';

const configurableRoles = roles.filter(role => !['Super Admin', 'Teacher', 'Non-teaching Staff', 'Student'].includes(role));

export default function Permissions({ data, setData, pages }: {
  data: SchoolFinance;
  setData: Dispatch<SetStateAction<SchoolFinance>>;
  pages: string[];
}) {
  const [role, setRole] = useState<DemoRole>('HR Admin');
  const selected = data.roleAccess?.[role] ?? pages.filter(page => canOpenPage(role, page));
  return <section className="card">
    <div className="premium-card-heading"><div><h3>Demo permission matrix</h3><p>Manage workspace access for each role. Access applies to this campus preview.</p></div></div>
    <div className="list-toolbar"><label>Role<select value={role} onChange={event => setRole(event.target.value as DemoRole)}>{configurableRoles.map(option => <option key={option}>{option}</option>)}</select></label>
      <button className="button secondary" onClick={() => setData(current => {
        const roleAccess = { ...current.roleAccess };
        delete roleAccess[role];
        return { ...current, roleAccess };
      })}>Restore defaults</button>
    </div>
    <div className="table-wrap mobile-scroll-table"><table><thead><tr><th>Workspace</th><th>Access</th></tr></thead>
      <tbody>{pages.map(page => <tr key={page}><td>{page}</td><td><label><input type="checkbox" checked={selected.includes(page)} onChange={event => {
        const enabled = event.target.checked;
        setData(current => {
          const currentAccess = current.roleAccess?.[role] ?? pages.filter(name => canOpenPage(role, name));
          const next = enabled ? [...new Set([...currentAccess, page])] : currentAccess.filter(name => name !== page);
          return { ...current, roleAccess: { ...current.roleAccess, [role]: next } };
        });
      }}/> Allow {page}</label></td></tr>)}</tbody>
    </table></div>
  </section>;
}
