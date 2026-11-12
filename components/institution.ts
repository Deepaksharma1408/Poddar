'use client';

import { createContext, useContext } from 'react';

export const institutions = {
  college: {
    name: 'Poddar International College',
    shortName: 'College Management',
    subtitle: 'Mansarovar Campus, Jaipur',
    groupLabel: 'Programme & Semester',
    prefix: 'PIC',
    campus: 'Mansarovar Campus, Jaipur',
    code: 'PIC-MAIN',
  },
  finance: {
    name: 'Poddar Institute · College Finance',
    shortName: 'Finance',
    subtitle: 'Accounts, payroll and expenditure',
    groupLabel: 'Programme & Semester',
    prefix: 'PIF',
    campus: 'Mansarovar Campus, Jaipur',
    code: 'PIF-ACCOUNTS',
  },
  // Backward compatibility alias: ensures any legacy reference safely resolves
  management: {
    name: 'Poddar Institute · College Finance',
    shortName: 'Finance',
    subtitle: 'Accounts, payroll and expenditure',
    groupLabel: 'Programme & Semester',
    prefix: 'PIF',
    campus: 'Mansarovar Campus, Jaipur',
    code: 'PIF-ACCOUNTS',
  },
  school: {
    name: 'Poddar International College',
    shortName: 'College Management',
    subtitle: 'Mansarovar Campus, Jaipur',
    groupLabel: 'Programme & Semester',
    prefix: 'PIC',
    campus: 'Mansarovar Campus, Jaipur',
    code: 'PIC-MAIN',
  },
};

export type Institution = keyof typeof institutions;
export const InstitutionContext = createContext<Institution>('college');
export const useInstitution = () => institutions[useContext(InstitutionContext)];
