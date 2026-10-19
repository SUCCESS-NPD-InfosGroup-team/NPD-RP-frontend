// src/context/VacacionesContext.tsx

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Vacacion } from '../types';
import { getMockVacaciones } from '../services/mockData';

interface VacacionesContextType {
  vacaciones: Vacacion[];
  addVacacion: (vacacion: Vacacion) => void;
  deleteVacacion: (id: string) => void;
  tieneSolapamiento: (nEmpleado: string, fechaInicio: string, fechaFin: string) => Vacacion | null;
}

const VacacionesContext = createContext<VacacionesContextType | undefined>(undefined);

export function VacacionesProvider({ children }: { children: ReactNode }) {
  // 🛠️ Usamos la función getMockVacaciones() con paréntesis
  const [vacaciones, setVacaciones] = useState<Vacacion[]>(getMockVacaciones());

  const addVacacion = (vacacion: Vacacion) => {
    setVacaciones((prev) => [...prev, vacacion]);
  };

  const deleteVacacion = (id: string) => {
    setVacaciones((prev) => prev.filter((v) => v.id !== id));
  };

  const tieneSolapamiento = (
    nEmpleado: string,
    fechaInicio: string,
    fechaFin: string
  ): Vacacion | null => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const solapada = vacaciones.find((v) => {
      if (v.nEmpleado !== nEmpleado) return false;
      const vInicio = new Date(v.fechaInicio);
      const vFin = new Date(v.fechaFin);
      return inicio <= vFin && fin >= vInicio;
    });

    return solapada || null;
  };

  return (
    <VacacionesContext.Provider value={{ vacaciones, addVacacion, deleteVacacion, tieneSolapamiento }}>
      {children}
    </VacacionesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVacaciones() {
  const context = useContext(VacacionesContext);
  if (!context) throw new Error('useVacaciones debe usarse dentro de VacacionesProvider');
  return context;
}