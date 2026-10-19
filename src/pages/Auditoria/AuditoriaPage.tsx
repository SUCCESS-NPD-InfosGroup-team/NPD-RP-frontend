// src/pages/Auditoria/AuditoriaPage.tsx

import { useState } from 'react';
import { useAuditoria } from '../../context/AuditoriaContext';
import type { AuditEntry } from '../../types';

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

const formatearFechaHora = (iso: string) => {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()];
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return { fecha: `${dia} ${mes} ${d.getFullYear()}`, hora: `${hora}:${min}` };
};

const getAccionBadge = (accion: string) => {
  if (accion === 'Alta') return { bg: '#DCFCE7', color: '#166534' };
  if (accion === 'Edición') return { bg: '#FEF3C7', color: '#92400E' };
  if (accion === 'Baja') return { bg: '#FEE2E2', color: '#991B1B' };
  if (accion === 'Descarga') return { bg: '#DBEAFE', color: '#1E40AF' };
  return { bg: '#F3F4F6', color: '#374151' };
};

export const AuditoriaPage = () => {
  const { entries } = useAuditoria();
  const [filtroUsuario, setFiltroUsuario] = useState('Todos');
  const [filtroCampo, setFiltroCampo] = useState('Todos');
  const [fechaDesde, setFechaDesde] = useState('2026-01-01');
  const [fechaHasta, setFechaHasta] = useState('2026-12-31');

  // Aplicar filtros
  const entriesFiltradas = entries.filter((e) => {
    const matchUsuario = filtroUsuario === 'Todos' || e.autor === filtroUsuario;
    const matchCampo = filtroCampo === 'Todos' || e.campo === filtroCampo;
    const fecha = e.fecha.split('T')[0];
    const matchDesde = fecha >= fechaDesde;
    const matchHasta = fecha <= fechaHasta;
    return matchUsuario && matchCampo && matchDesde && matchHasta;
  });

  // Agrupar por mes
  const gruposPorMes = entriesFiltradas.reduce<Record<string, AuditEntry[]>>((acc, entry) => {
    const d = new Date(entry.fecha);
    const key = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  // Lista de usuarios únicos para el filtro
  const usuariosUnicos = Array.from(new Set(entries.map((e) => e.autor)));
  const camposUnicos = Array.from(new Set(entries.map((e) => e.campo)));

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px' }}>Auditoría</h2>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
          Quién cambió qué y cuándo en este registro. Las entradas no se pueden editar ni borrar.
        </p>
      </div>

      {/* Filtros */}
      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px' }}>USUARIO</label>
          <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '150px' }}>
            <option value="Todos">Todos</option>
            {usuariosUnicos.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px' }}>CAMPO</label>
          <select value={filtroCampo} onChange={(e) => setFiltroCampo(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '200px' }}>
            <option value="Todos">Todos los campos</option>
            {camposUnicos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px' }}>DESDE</label>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px' }}>HASTA</label>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>

        <span style={{ fontSize: '12px', color: '#666', marginLeft: 'auto', alignSelf: 'flex-end', paddingBottom: '10px' }}>
          Más recientes primero · 1-{entriesFiltradas.length} de {entries.length}
        </span>
      </div>

      {/* Tabla */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 180px 100px 200px 1fr', gap: '0', backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB', fontSize: '11px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px' }}>
          <div style={{ padding: '12px' }}>FECHA Y HORA</div>
          <div style={{ padding: '12px' }}>AUTOR</div>
          <div style={{ padding: '12px' }}>ACCIÓN</div>
          <div style={{ padding: '12px' }}>CAMPO</div>
          <div style={{ padding: '12px' }}>VALOR ANTERIOR → NUEVO</div>
        </div>

        {entriesFiltradas.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            No hay registros con los filtros seleccionados.
          </div>
        )}

        {Object.entries(gruposPorMes).map(([mes, entradas]) => (
          <div key={mes}>
            {/* Título del mes */}
            <div style={{ padding: '10px 16px', backgroundColor: '#FFF7ED', fontSize: '11px', fontWeight: 'bold', color: '#9A3412', letterSpacing: '0.5px', borderBottom: '1px solid #E5E7EB' }}>
              {mes}
            </div>

            {entradas.map((e) => {
              const { fecha, hora } = formatearFechaHora(e.fecha);
              const badge = getAccionBadge(e.accion);

              return (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '140px 180px 100px 200px 1fr', gap: '0', borderBottom: '1px solid #F3F4F6', fontSize: '13px', alignItems: 'center' }}>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{fecha}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{hora}</div>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          backgroundColor: '#1F2937',
                          color: 'white',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        {e.autorInitials}
                      </div>
                      <span style={{ fontSize: '13px' }}>{e.autor}</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: badge.bg, color: badge.color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                      {e.accion}
                    </span>
                  </div>
                  <div style={{ padding: '12px', fontSize: '13px', fontWeight: 'bold' }}>{e.campo}</div>
                  <div style={{ padding: '12px', fontSize: '12px', color: '#333' }}>
                    <span style={{ color: '#666' }}>{e.valorAnterior}</span>
                    <span style={{ color: '#E85D04', margin: '0 8px', fontWeight: 'bold' }}>→</span>
                    <span style={{ color: '#166534', fontWeight: 'bold' }}>{e.valorNuevo}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};