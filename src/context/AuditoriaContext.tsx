import {createContext, useContext, useState, useCallback, useMemo, type ReactNode} from 'react';
import type { AuditEntry } from '../types';

interface AuditoriaContextValue{
  auditoria: AuditEntry[];
  registrarAccion: (entry: AuditEntry) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuditoriaContext = createContext<AuditoriaContextValue | null>(null);

export const AuditoriaProvider = ({children}: Readonly <{children:ReactNode} > ) => {
  const [auditoria, setAuditoria] = useState<AuditEntry[]>([]);
  const registrarAccion = useCallback((entry: AuditEntry) => {
    setAuditoria((prev) => [...prev, entry]);
  }, []);

  const value = useMemo(() => ({ auditoria, registrarAccion}), [auditoria, registrarAccion]);
  return <AuditoriaContext.Provider value={value}>{children}</AuditoriaContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuditoria = () => {
  const context = useContext(AuditoriaContext);
  if(!context) throw new Error ('UseAuditoria must be used inside <AuditoriaProvider');
  return context;
};