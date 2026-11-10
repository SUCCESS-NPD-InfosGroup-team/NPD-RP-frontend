// src/context/useAuditoria.ts
import { useContext } from 'react';
import { AuditoriaContext } from './AuditoriaContext';

export const useAuditoria = () => {
  const context = useContext(AuditoriaContext);
  if (!context) throw new Error('useAuditoria must be used inside <AuditoriaProvider>');
  return context;
};