// src/context/AuditoriaContext.tsx

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuditEntry } from '../types';

interface AuditoriaContextType {
  entries: AuditEntry[];
  addEntry: (entry: Omit<AuditEntry, 'id' | 'fecha'>) => void;
  clearAll: () => void;
}

const AuditoriaContext = createContext<AuditoriaContextType | undefined>(undefined);

// Datos iniciales de ejemplo (como en el mockup)
const MOCK_AUDITORIA: AuditEntry[] = [
  {
    id: 'a1',
    fecha: '2026-10-02T10:14:00',
    autor: 'María Pérez',
    autorInitials: 'MP',
    accion: 'Edición',
    campo: 'Fecha final de proyecto',
    valorAnterior: '30/09/2026',
    valorNuevo: '31/10/2026',
    recursoId: '1',
    recursoNombre: 'Ana Torres',
  },
  {
    id: 'a2',
    fecha: '2026-09-22T16:02:00',
    autor: 'Jorge Rios',
    autorInitials: 'JR',
    accion: 'Edición',
    campo: 'Líder NPD',
    valorAnterior: 'Omar Delgado',
    valorNuevo: 'Lorena Batista',
    recursoId: '1',
    recursoNombre: 'Ana Torres',
  },
  {
    id: 'a3',
    fecha: '2026-09-22T16:02:00',
    autor: 'Jorge Rios',
    autorInitials: 'JR',
    accion: 'Edición',
    campo: 'Contacto por cliente',
    valorAnterior: '—',
    valorNuevo: 'mmedina@banesco.com',
    recursoId: '1',
    recursoNombre: 'Ana Torres',
  },
  {
    id: 'a4',
    fecha: '2026-09-01T09:40:00',
    autor: 'María Pérez',
    autorInitials: 'MP',
    accion: 'Descarga',
    campo: 'Exportación .xlsx',
    valorAnterior: '—',
    valorNuevo: 'Filtro: Cliente = BANESCO · 18 filas',
    recursoNombre: 'Exportación',
  },
  {
    id: 'a5',
    fecha: '2026-08-05T11:27:00',
    autor: 'María Pérez',
    autorInitials: 'MP',
    accion: 'Edición',
    campo: 'Proyecto asignado',
    valorAnterior: 'Banesco — Administración',
    valorNuevo: 'Programa de automatización (DEYEL)',
    recursoId: '1',
    recursoNombre: 'Ana Torres',
  },
  {
    id: 'a6',
    fecha: '2026-08-05T11:27:00',
    autor: 'María Pérez',
    autorInitials: 'MP',
    accion: 'Edición',
    campo: 'Rol actual en cliente',
    valorAnterior: 'Analista de Sistemas de Negocios Jr.',
    valorNuevo: 'QA Funcional',
    recursoId: '1',
    recursoNombre: 'Ana Torres',
  },
  {
    id: 'a7',
    fecha: '2026-08-03T08:15:00',
    autor: 'María Pérez',
    autorInitials: 'MP',
    accion: 'Alta',
    campo: 'Registro creado',
    valorAnterior: '—',
    valorNuevo: 'N° 1045 · Ana Torres · Analista de Pruebas de Calidad Sr. · inicio 03/08/2026',
    recursoId: '1',
    recursoNombre: 'Ana Torres',
  },
];

export function AuditoriaProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<AuditEntry[]>(MOCK_AUDITORIA);

  const addEntry = (entry: Omit<AuditEntry, 'id' | 'fecha'>) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
      fecha: new Date().toISOString(),
    };
    setEntries((prev) => [newEntry, ...prev]);
  };

  const clearAll = () => setEntries([]);

  return (
    <AuditoriaContext.Provider value={{ entries, addEntry, clearAll }}>
      {children}
    </AuditoriaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuditoria() {
  const context = useContext(AuditoriaContext);
  if (!context) throw new Error('useAuditoria debe usarse dentro de AuditoriaProvider');
  return context;
}