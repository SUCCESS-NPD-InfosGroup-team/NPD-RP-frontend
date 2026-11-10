// src/context/AvisosContext.tsx

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AvisoConfig } from '../types';

interface AvisosContextType {
  avisos: AvisoConfig[];
  updateAviso: (aviso: AvisoConfig) => void;
}

const AvisosContext = createContext<AvisosContextType | undefined>(undefined);

const AVISOS_INICIALES: AvisoConfig[] = [
  {
    id: 'fin-contrato',
    titulo: 'Fin de contrato de cliente',
    descripcion: 'A Sales con copia a Operaciones · 30 y 15 días',
    activo: true,
    umbral1: 30,
    umbral2: 15,
    horaEnvio: '08:00',
    destinatariosPara: ['Sales', 'Operations administrator'],
    destinatariosCC: ['Customer Success'],
    asunto: 'Vence en {dias_restantes} días: contrato de {cliente} · {proyecto}',
    cuerpo: `Hola equipo de Sales:

El contrato de {cliente} para el proyecto {proyecto} termina el {fecha_fin} ({dias_restantes} días).

Recursos asignados:
{tabla_recursos}

Operaciones NPD`,
    previewData: {
      cliente: 'BANESCO',
      proyecto: 'Programa de automatización (DEYEL)',
      fechaFin: '31/10/2026',
      diasRestantes: 30,
    },
  },
  {
    id: 'fin-probatoria',
    titulo: 'Fin de probatoria',
    descripcion: 'Al Líder NPD con copia a Operaciones · 15 días antes del día 90',
    activo: true,
    umbral1: 30,
    umbral2: 15,
    horaEnvio: '08:00',
    destinatariosPara: ['NPD Lead'],
    destinatariosCC: ['Operations administrator'],
    asunto: 'Fin de probatoria en {dias_restantes} días: {recurso}',
    cuerpo: `Hola {lider_npd}:

El período de probatoria de {recurso} ({n_empleado}) termina el {fecha_fin} ({dias_restantes} días).

Cliente: {cliente}
Proyecto: {proyecto}

Operaciones NPD`,
    previewData: {
      cliente: 'TIGO',
      proyecto: 'Tigo',
      fechaFin: '18/10/2026',
      diasRestantes: 15,
    },
  },
  {
    id: 'fin-asignacion',
    titulo: 'Fin de asignación',
    descripcion: 'A Customer Success · 30 días antes del fin',
    activo: true,
    umbral1: 30,
    umbral2: 15,
    horaEnvio: '08:00',
    destinatariosPara: ['Customer Success'],
    destinatariosCC: ['Operations administrator'],
    asunto: 'Fin de asignación en {dias_restantes} días: {recurso} en {cliente}',
    cuerpo: `Hola equipo de Customer Success:

La asignación de {recurso} ({n_empleado}) en el cliente {cliente} finaliza el {fecha_fin}.

Proyecto: {proyecto}
Líder NPD: {lider_npd}

Operaciones NPD`,
    previewData: {
      cliente: 'BANESCO',
      proyecto: 'Programa de automatización (DEYEL)',
      fechaFin: '31/10/2026',
      diasRestantes: 24,
    },
  },
  {
    id: 'resumen-vacaciones',
    titulo: 'Resumen de vacaciones',
    descripcion: 'A cada Líder NPD · quincenal, el 1 y el 15',
    activo: true,
    umbral1: 15,
    umbral2: 30,
    horaEnvio: '08:00',
    destinatariosPara: ['NPD Lead'],
    destinatariosCC: [],
    asunto: 'Resumen de vacaciones · quincena',
    cuerpo: `Hola {lider_npd}:

Estas son las vacaciones aprobadas de tus colaboradores para las próximas 2 semanas:

{tabla_vacaciones}

Operaciones NPD`,
    previewData: {
      cliente: 'COPA',
      proyecto: 'Copa Airlines',
      fechaFin: '30/10/2026',
      diasRestantes: 15,
    },
  },
];

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<AvisoConfig[]>(AVISOS_INICIALES);

  const updateAviso = (aviso: AvisoConfig) => {
    setAvisos((prev) => prev.map((a) => (a.id === aviso.id ? aviso : a)));
  };

  return (
    <AvisosContext.Provider value={{ avisos, updateAviso }}>
      {children}
    </AvisosContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAvisos() {
  const context = useContext(AvisosContext);
  if (!context) throw new Error('useAvisos debe usarse dentro de AvisosProvider');
  return context;
}