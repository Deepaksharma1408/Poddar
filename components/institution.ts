'use client';

import { createContext, useContext } from 'react';

export const institutions = {
  school: { name: 'Poddar International School', shortName: 'International School', groupLabel: 'Class', prefix: 'PIS' },
  college: { name: 'Poddar Institute · College', shortName: 'College Management', groupLabel: 'Programme & semester', prefix: 'PIC' },
};

export type Institution = keyof typeof institutions;
export const InstitutionContext = createContext<Institution>('school');
export const useInstitution = () => institutions[useContext(InstitutionContext)];
