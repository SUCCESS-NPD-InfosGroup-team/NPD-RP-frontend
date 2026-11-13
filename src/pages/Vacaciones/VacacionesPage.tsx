// src/pages/Vacaciones/VacacionesPage.tsx

import { useState } from 'react';
import { useVacaciones } from '../../context/VacacionesContext';
import { RegistrarVacacionModal } from '../../components/vacaciones/RegistrarVacacionModal';

const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const COLORS = [
  '#93C5FD',
  '#FCD34D',
  '#FCA5A5',
  '#A7F3D0',
  '#C4B5FD',
  '#FDBA74',
];

export const VacacionesPage = () => {
  const { vacaciones } = useVacaciones();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState('Todos');
  const [filtroLider, setFiltroLider] = useState('Todos');

  // Rango de fechas: Octubre 2026 a Enero 2027
  const startDate = new Date(2026, 9, 1);
  const endDate = new Date(2027, 0, 31);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Generar meses para el header
  const months: { label: string; days: number }[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    months.push({
      label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`,
      days: monthEnd.getDate(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Filtrar
  const vacacionesFiltradas = vacaciones.filter((v) => {
    const matchCliente = filtroCliente === 'Todos' || v.cliente === filtroCliente;
    const matchLider = filtroLider === 'Todos' || v.liderNPD === filtroLider;
    return matchCliente && matchLider;
  });

  const colaboradoresUnicos = Array.from(new Set(vacacionesFiltradas.map((v) => v.colaborador)));

  const getBarPosition = (fechaInicio: string, fechaFin: string) => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const startOffset = Math.max(0, (inicio.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24) + 1;
    return { startOffset, duration };
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Vacaciones</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Quién sale en los próximos meses y quién queda con menos cobertura.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            backgroundColor: '#E85D04',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          + Registrar vacaciones
        </button>
      </div>

      {/* Filtros */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <select
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '150px' }}
        >
          <option value="Todos">Cliente: Todos</option>
          <option value="BANESCO">BANESCO</option>
          <option value="CAJA DE AHORROS">CAJA DE AHORROS</option>
          <option value="COPA">COPA</option>
        </select>
        <select
          value={filtroLider}
          onChange={(e) => setFiltroLider(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '150px' }}
        >
          <option value="Todos">Líder NPD: Todos</option>
          <option value="Lorena Batista">Lorena Batista</option>
          <option value="Ricardo Him">Ricardo Him</option>
          <option value="Yaritza Castillo">Yaritza Castillo</option>
          <option value="Omar Delgado">Omar Delgado</option>
          <option value="Itzel Quintero">Itzel Quintero</option>
        </select>
        <span style={{ color: '#E85D04', fontWeight: 'bold', fontSize: '13px', marginLeft: 'auto' }}>
          Fuente de vacaciones
        </span>
      </div>

      {/* Calendario */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        {/* Header con meses */}
        <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
          <div
            style={{
              width: '280px',
              padding: '12px 16px',
              fontWeight: 'bold',
              fontSize: '12px',
              color: '#666',
              borderRight: '1px solid #E5E7EB',
            }}
          >
            COLABORADOR · CLIENTE · LÍDER
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            {months.map((m, i) => (
              <div
                key={i}
                style={{
                  flex: m.days,
                  padding: '12px 8px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  color: '#333',
                  borderRight: '1px solid #E5E7EB',
                }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Filas por colaborador */}
        {colaboradoresUnicos.map((colab, colabIndex) => {
          const vacacionesColab = vacacionesFiltradas.filter((v) => v.colaborador === colab);
          const primera = vacacionesColab[0];

          return (
            <div
              key={colab}
              style={{
                display: 'flex',
                borderBottom: '1px solid #F3F4F6',
                minHeight: '60px',
                backgroundColor: colabIndex % 2 === 0 ? 'white' : '#FAFAFA',
              }}
            >
              <div style={{ width: '280px', padding: '12px 16px', borderRight: '1px solid #E5E7EB' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{colab}</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                  {primera?.cliente} · {primera?.liderNPD}
                </div>
              </div>

              <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                {Array.from({ length: totalDays }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      borderRight: i % 7 === 6 ? '1px solid #D1D5DB' : '1px solid #F3F4F6',
                      backgroundColor: i % 7 === 5 || i % 7 === 6 ? '#FAFAFA' : 'transparent',
                    }}
                  />
                ))}

                {vacacionesColab.map((v, i) => {
                  const { startOffset, duration } = getBarPosition(v.fechaInicio, v.fechaFin);
                  const leftPercent = (startOffset / totalDays) * 100;
                  const widthPercent = (duration / totalDays) * 100;

                  return (
                    <div
                      key={v.id}
                      title={`${v.colaborador} · ${v.fechaInicio} al ${v.fechaFin}`}
                      style={{
                        position: 'absolute',
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        top: `${10 + i * 22}px`,
                        height: '18px',
                        backgroundColor: COLORS[colabIndex % COLORS.length],
                        borderRadius: '3px',
                        border: '1px solid rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: '#1F2937',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {duration > 5 && (
                        <span style={{ padding: '0 4px' }}>
                          {new Date(v.fechaInicio).getDate()}-{new Date(v.fechaFin).getDate()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {colaboradoresUnicos.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            No hay vacaciones para mostrar con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '20px', fontSize: '12px', color: '#666', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '20px',
              height: '12px',
              backgroundColor: '#93C5FD',
              borderRadius: '2px',
              border: '1px solid rgba(0,0,0,0.15)',
            }}
          />
          <span>Vacaciones registradas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '20px',
              height: '12px',
              backgroundColor: '#FAFAFA',
              borderRadius: '2px',
              border: '1px solid #E5E7EB',
            }}
          />
          <span>Fin de semana</span>
        </div>
      </div>

      {/* Modal */}
      <RegistrarVacacionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};