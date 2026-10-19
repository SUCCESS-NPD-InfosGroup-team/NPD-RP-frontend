// src/pages/ArribosProximos/ArribosProximosPage.tsx

import { useState } from 'react';
import { useArribosProximos, formatearFecha, agruparPorSemana, type EventoProximo, type TipoEvento } from '../../hooks/useArribosProximos';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const getTipoBadge = (tipo: TipoEvento) => {
  if (tipo === 'Fin de asignación') return { bg: '#FEE2E2', color: '#991B1B' };
  if (tipo === 'Fin de contrato') return { bg: '#FEF3C7', color: '#92400E' };
  if (tipo === 'Fin de probatoria') return { bg: '#DBEAFE', color: '#1E40AF' };
  return { bg: '#E9D5FF', color: '#6B21A8' }; // Vacaciones
};

const getDiasColor = (dias: number) => {
  if (dias <= 7) return { bg: '#FEE2E2', color: '#991B1B' };
  if (dias <= 15) return { bg: '#FED7AA', color: '#9A3412' };
  return { bg: '#F3F4F6', color: '#374151' };
};

export const ArribosProximosPage = () => {
  const { eventos } = useArribosProximos();
  const [filtroVentana, setFiltroVentana] = useState('30');
  const [filtroCliente, setFiltroCliente] = useState('Todos');
  const [filtroLider, setFiltroLider] = useState('Todos');
  const [eventoDetalle, setEventoDetalle] = useState<EventoProximo | null>(null);

  // Aplicar filtros
  const eventosFiltrados = eventos.filter((e) => {
    const matchVentana = e.diasRestantes <= parseInt(filtroVentana);
    const matchCliente = filtroCliente === 'Todos' || e.cliente === filtroCliente;
    const matchLider = filtroLider === 'Todos' || e.liderNPD === filtroLider;
    return matchVentana && matchCliente && matchLider;
  });

  // Contadores por tipo
  const countByTipo = (tipo: TipoEvento) => eventosFiltrados.filter((e) => e.tipo === tipo).length;

  // Exportar a Excel
  const handleExport = () => {
    const data = eventosFiltrados.map((e) => ({
      'Días restantes': `D-${e.diasRestantes}`,
      Fecha: formatearFecha(e.fecha),
      Tipo: e.tipo,
      Recurso: e.recurso,
      'N° Empleado': e.nEmpleado,
      'Cliente · Proyecto': `${e.cliente} — ${e.proyecto}`,
      'Líder NPD': e.liderNPD,
      'Aviso por correo': e.avisoTexto,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Arribos');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer]), `Arribos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const grupos = agruparPorSemana(eventosFiltrados);

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Arribos próximos</h2>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            Fines de asignación, de contrato y de probatoria, y vacaciones que empiezan. Hoy es miércoles 07 oct 2026.
          </p>
        </div>
        <button
          onClick={handleExport}
          style={{
            padding: '10px 20px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          📥 Exportar
        </button>
      </div>

      {/* 4 tarjetas de resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #FEE2E2', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{countByTipo('Fin de asignación')}</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#991B1B', backgroundColor: '#FEE2E2', padding: '2px 8px', borderRadius: '10px', display: 'inline-block' }}>
              Fin de asignación
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Aviso a Customer Success</div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #FEF3C7', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{countByTipo('Fin de contrato')}</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#92400E', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '10px', display: 'inline-block' }}>
              Fin de contrato
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Aviso a Sales</div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #DBEAFE', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{countByTipo('Fin de probatoria')}</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '10px', display: 'inline-block' }}>
              Fin de probatoria
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Día 90 · aviso a líder</div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #E9D5FF', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{countByTipo('Vacaciones')}</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#6B21A8', backgroundColor: '#E9D5FF', padding: '2px 8px', borderRadius: '10px', display: 'inline-block' }}>
              Vacaciones
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Resumen quincenal</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select value={filtroVentana} onChange={(e) => setFiltroVentana(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '150px' }}>
          <option value="30">Próximos 30 días</option>
          <option value="60">Próximos 60 días</option>
          <option value="90">Próximos 90 días</option>
        </select>
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '150px' }}>
          <option value="Todos">Cliente: Todos</option>
          <option value="BANESCO">BANESCO</option>
          <option value="CAJA DE AHORROS">CAJA DE AHORROS</option>
          <option value="COPA">COPA</option>
          <option value="TIGO">TIGO</option>
        </select>
        <select value={filtroLider} onChange={(e) => setFiltroLider(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '150px' }}>
          <option value="Todos">Líder NPD: Todos</option>
          <option value="Lorena Batista">Lorena Batista</option>
          <option value="Ricardo Him">Ricardo Him</option>
          <option value="Yaritza Castillo">Yaritza Castillo</option>
          <option value="Omar Delgado">Omar Delgado</option>
          <option value="Itzel Quintero">Itzel Quintero</option>
        </select>
        <span style={{ fontSize: '13px', color: '#666', marginLeft: 'auto' }}>
          {eventosFiltrados.length} eventos en los próximos {filtroVentana} días
        </span>
      </div>

      {/* Tabla agrupada por semanas */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {/* Header de la tabla */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 130px 160px 1fr 180px 200px 1fr 140px', gap: '0', backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB', fontSize: '11px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px' }}>
          <div style={{ padding: '12px' }}>FALTAN</div>
          <div style={{ padding: '12px' }}>FECHA</div>
          <div style={{ padding: '12px' }}>TIPO</div>
          <div style={{ padding: '12px' }}>RECURSO</div>
          <div style={{ padding: '12px' }}>CLIENTE · PROYECTO</div>
          <div style={{ padding: '12px' }}>LÍDER NPD</div>
          <div style={{ padding: '12px' }}>AVISO POR CORREO</div>
          <div style={{ padding: '12px' }}></div>
        </div>

        {grupos.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            No hay eventos próximos con los filtros seleccionados.
          </div>
        )}

        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            {/* Título de la semana */}
            <div style={{ padding: '10px 16px', backgroundColor: '#FFF7ED', fontSize: '11px', fontWeight: 'bold', color: '#9A3412', letterSpacing: '0.5px', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
              {grupo.titulo}
            </div>

            {grupo.eventos.map((e) => {
              const tipoBadge = getTipoBadge(e.tipo);
              const diasBadge = getDiasColor(e.diasRestantes);

              return (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '80px 130px 160px 1fr 180px 200px 1fr 140px', gap: '0', borderBottom: '1px solid #F3F4F6', fontSize: '13px', alignItems: 'center' }}>
                  <div style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: diasBadge.bg, color: diasBadge.color, padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                      D-{e.diasRestantes}
                    </span>
                  </div>
                  <div style={{ padding: '12px', color: '#333' }}>{formatearFecha(e.fecha)}</div>
                  <div style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: tipoBadge.bg, color: tipoBadge.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {e.tipo}
                    </span>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{e.recurso}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{e.nEmpleado}</div>
                  </div>
                  <div style={{ padding: '12px', fontSize: '12px', color: '#333' }}>
                    <strong>{e.cliente}</strong>
                    <div style={{ fontSize: '11px', color: '#666' }}>{e.proyecto}</div>
                  </div>
                  <div style={{ padding: '12px', fontSize: '13px', color: '#333' }}>{e.liderNPD}</div>
                  <div style={{ padding: '12px', fontSize: '12px' }}>
                    {e.avisoEnviado ? (
                      <span style={{ color: '#166534', fontWeight: 'bold' }}>✓ {e.avisoTexto}</span>
                    ) : (
                      <span style={{ color: '#666' }}>⏱ {e.avisoTexto}</span>
                    )}
                  </div>
                  <div style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => setEventoDetalle(e)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Modal de detalle del evento */}
      {eventoDetalle && (
        <div
          onClick={() => setEventoDetalle(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ backgroundColor: getTipoBadge(eventoDetalle.tipo).bg, color: getTipoBadge(eventoDetalle.tipo).color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                  {eventoDetalle.tipo}
                </span>
                <h3 style={{ fontSize: '18px', marginTop: '12px' }}>{eventoDetalle.recurso}</h3>
                <p style={{ color: '#666', fontSize: '13px' }}>{eventoDetalle.nEmpleado}</p>
              </div>
              <button onClick={() => setEventoDetalle(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px' }}>FECHA DEL EVENTO</div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>{formatearFecha(eventoDetalle.fecha)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px' }}>FALTAN</div>
                <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: 'bold', color: getDiasColor(eventoDetalle.diasRestantes).color }}>
                  D-{eventoDetalle.diasRestantes} días
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px' }}>CLIENTE</div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>{eventoDetalle.cliente}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px' }}>PROYECTO</div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>{eventoDetalle.proyecto}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px' }}>LÍDER NPD</div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>{eventoDetalle.liderNPD}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px' }}>AVISO POR CORREO</div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>
                  {eventoDetalle.avisoEnviado ? <span style={{ color: '#166534' }}>✓ {eventoDetalle.avisoTexto}</span> : <span style={{ color: '#666' }}>⏱ {eventoDetalle.avisoTexto}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};