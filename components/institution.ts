'use client';

import { createContext, useContext } from 'react';

export const institutions = {
  college: {
    name: 'Poddar International College',
    shortName: 'College Management',
    groupLabel: 'Programme & Semester',
    prefix: 'PIC',
    campus: 'Mansarovar Campus, Jaipur',
    code: 'PIC-MAIN',
  },
  management: {
    name: 'Poddar Management and Technical Campus',
    shortName: 'Management & Tech Campus',
    groupLabel: 'Programme & Semester',
    prefix: 'PIC',
    campus: 'Vatika Campus, Jaipur',
    code: 'PMTC-VATIKA',
  },
  // Backward compatibility alias: ensures any legacy reference safely resolves to the college
  school: {
    name: 'Poddar International College',
    shortName: 'College Management',
    groupLabel: 'Programme & Semester',
    prefix: 'PIC',
    campus: 'Mansarovar Campus, Jaipur',
    code: 'PIC-MAIN',
  },
};

export type Institution = keyof typeof institutions;
export const InstitutionContext = createContext<Institution>('college');
export const useInstitution = () => institutions[useContext(InstitutionContext)];
