// src/context/RecursosContext.tsx

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Recurso } from '../types';
import { MOCK_RECURSOS } from '../services/mockData';
import { useAuditoria } from './AuditoriaContext';
import { useAuth } from './AuthContext';

interface RecursosContextType {
  recursos: Recurso[];
  addRecurso: (recurso: Recurso) => void;
  updateRecurso: (recurso: Recurso) => void;
  deleteRecurso: (id: string) => void;
}

const RecursosContext = createContext<RecursosContextType | undefined>(undefined);

export function RecursosProvider({ children }: { children: ReactNode }) {
  const [recursos, setRecursos] = useState<Recurso[]>(MOCK_RECURSOS);
  const { addEntry } = useAuditoria();
  const { user } = useAuth();

  const autorNombre = user?.name || 'Sistema';
  const autorInitials = user?.avatarInitials || 'SS';

  const addRecurso = (recurso: Recurso) => {
    setRecursos((prev) => [...prev, recurso]);
    addEntry({
      autor: autorNombre,
      autorInitials,
      accion: 'Alta',
      campo: 'Registro creado',
      valorAnterior: '—',
      valorNuevo: `${recurso.nEmpleado} · ${recurso.nombre} · ${recurso.rol}`,
      recursoId: recurso.id,
      recursoNombre: recurso.nombre,
    });
  };

  const updateRecurso = (recurso: Recurso) => {
    const anterior = recursos.find((r) => r.id === recurso.id);
    setRecursos((prev) => prev.map((r) => (r.id === recurso.id ? recurso : r)));

    if (anterior) {
      // Comparar campos y registrar cambios
      const camposAComparar: { key: keyof Recurso; label: string }[] = [
        { key: 'nombre', label: 'Nombre' },
        { key: 'rol', label: 'Rol' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'proyecto', label: 'Proyecto asignado' },
        { key: 'liderNPD', label: 'Líder NPD' },
        { key: 'nivel', label: 'Nivel' },
        { key: 'estado', label: 'Estado' },
        { key: 'fechaFin', label: 'Fecha final de proyecto' },
      ];

      camposAComparar.forEach(({ key, label }) => {
        if (anterior[key] !== recurso[key]) {
          addEntry({
            autor: autorNombre,
            autorInitials,
            accion: 'Edición',
            campo: label,
            valorAnterior: String(anterior[key]),
            valorNuevo: String(recurso[key]),
            recursoId: recurso.id,
            recursoNombre: recurso.nombre,
          });
        }
      });
    }
  };

  const deleteRecurso = (id: string) => {
    const eliminado = recursos.find((r) => r.id === id);
    setRecursos((prev) => prev.filter((r) => r.id !== id));

    if (eliminado) {
      addEntry({
        autor: autorNombre,
        autorInitials,
        accion: 'Baja',
        campo: 'Registro eliminado',
        valorAnterior: `${eliminado.nEmpleado} · ${eliminado.nombre}`,
        valorNuevo: '—',
        recursoId: eliminado.id,
        recursoNombre: eliminado.nombre,
      });
    }
  };

  return (
    <RecursosContext.Provider value={{ recursos, addRecurso, updateRecurso, deleteRecurso }}>
      {children}
    </RecursosContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRecursos() {
  const context = useContext(RecursosContext);
  if (!context) throw new Error('useRecursos debe usarse dentro de RecursosProvider');
  return context;
}