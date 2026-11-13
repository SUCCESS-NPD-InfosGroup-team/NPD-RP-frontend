// src/hooks/useArribosProximos.ts

import { useRecursos } from '../context/RecursosContext';
import { useVacaciones } from '../context/VacacionesContext';

export type TipoEvento = 'Fin de asignación' | 'Fin de contrato' | 'Fin de probatoria' | 'Vacaciones';

export interface EventoProximo {
  id: string;
  tipo: TipoEvento;
  recurso: string;
  nEmpleado: string;
  cliente: string;
  proyecto: string;
  liderNPD: string;
  fecha: string; // ISO
  diasRestantes: number;
  avisoEnviado: boolean;
  avisoTexto: string;
}

// Fecha "hoy" simulada del mockup (7 oct 2026)
const HOY = new Date('2026-10-07');

const diffEnDias = (fechaISO: string): number => {
  const fecha = new Date(fechaISO);
  return Math.ceil((fecha.getTime() - HOY.getTime()) / (1000 * 60 * 60 * 24));
};

export const useArribosProximos = () => {
  const { recursos } = useRecursos();
  const { vacaciones } = useVacaciones();

  const eventos: EventoProximo[] = [];

  // 1. Eventos desde recursos (Fin de asignación, Fin de contrato, Fin de probatoria)
  recursos.forEach((r) => {
    const diasFinProyecto = diffEnDias(r.fechaFin);

    // Fin de asignación = fin de proyecto
    if (diasFinProyecto >= 0 && diasFinProyecto <= 90) {
      eventos.push({
        id: `fin-asig-${r.id}`,
        tipo: 'Fin de asignación',
        recurso: r.nombre,
        nEmpleado: r.nEmpleado,
        cliente: r.cliente,
        proyecto: r.proyecto,
        liderNPD: r.liderNPD,
        fecha: r.fechaFin,
        diasRestantes: diasFinProyecto,
        avisoEnviado: diasFinProyecto <= 30,
        avisoTexto: diasFinProyecto <= 30 ? '30 días enviado' : 'Pendiente',
      });
    }

    // Fin de probatoria = fin de proyecto - 9 meses (simulamos)
    const fechaProbatoria = new Date(r.fechaInicio);
    fechaProbatoria.setMonth(fechaProbatoria.getMonth() + 3);
    const fechaProbatoriaISO = fechaProbatoria.toISOString().split('T')[0];
    const diasProbatoria = diffEnDias(fechaProbatoriaISO);

    if (diasProbatoria >= 0 && diasProbatoria <= 90) {
      eventos.push({
        id: `fin-prob-${r.id}`,
        tipo: 'Fin de probatoria',
        recurso: r.nombre,
        nEmpleado: r.nEmpleado,
        cliente: r.cliente,
        proyecto: r.proyecto,
        liderNPD: r.liderNPD,
        fecha: fechaProbatoriaISO,
        diasRestantes: diasProbatoria,
        avisoEnviado: diasProbatoria <= 15,
        avisoTexto: diasProbatoria <= 15 ? 'Enviado al líder' : 'Pendiente',
      });
    }

    // Fin de contrato: usamos la misma fecha del proyecto como aproximación
    const diasContrato = diffEnDias(r.fechaFin);
    if (diasContrato > 90 && diasContrato <= 180) {
      eventos.push({
        id: `fin-cont-${r.id}`,
        tipo: 'Fin de contrato',
        recurso: r.nombre,
        nEmpleado: r.nEmpleado,
        cliente: r.cliente,
        proyecto: r.proyecto,
        liderNPD: r.liderNPD,
        fecha: r.fechaFin,
        diasRestantes: diasContrato,
        avisoEnviado: false,
        avisoTexto: 'Pendiente',
      });
    }
  });

  // 2. Eventos de vacaciones
  vacaciones.forEach((v) => {
    const dias = diffEnDias(v.fechaInicio);
    if (dias >= 0 && dias <= 90) {
      eventos.push({
        id: `vac-${v.id}`,
        tipo: 'Vacaciones',
        recurso: v.colaborador,
        nEmpleado: v.nEmpleado,
        cliente: v.cliente,
        proyecto: '—',
        liderNPD: v.liderNPD,
        fecha: v.fechaInicio,
        diasRestantes: dias,
        avisoEnviado: false,
        avisoTexto: 'Resumen del 15 oct',
      });
    }
  });

  // Ordenar por días restantes
  eventos.sort((a, b) => a.diasRestantes - b.diasRestantes);

  return { eventos };
};

// Utilidades para formatear fechas
export const formatearFecha = (fechaISO: string): string => {
  const fecha = new Date(fechaISO);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

// Agrupar eventos por semana relativa
export const agruparPorSemana = (eventos: EventoProximo[]) => {
  const grupos: { titulo: string; eventos: EventoProximo[] }[] = [
    { titulo: 'PRÓXIMA SEMANA (12 oct – 18 oct)', eventos: [] },
    { titulo: 'EN 2 SEMANAS (19 oct – 25 oct)', eventos: [] },
    { titulo: 'EN 3 SEMANAS (26 oct – 01 nov)', eventos: [] },
    { titulo: 'MÁS ADELANTE', eventos: [] },
  ];

  eventos.forEach((e) => {
    if (e.diasRestantes >= 5 && e.diasRestantes <= 11) grupos[0].eventos.push(e);
    else if (e.diasRestantes >= 12 && e.diasRestantes <= 18) grupos[1].eventos.push(e);
    else if (e.diasRestantes >= 19 && e.diasRestantes <= 25) grupos[2].eventos.push(e);
    else grupos[3].eventos.push(e);
  });

  return grupos.filter((g) => g.eventos.length > 0);
};