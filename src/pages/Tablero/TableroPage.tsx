// src/pages/Tablero/TableroPage.tsx

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { useRecursos } from '../../context/RecursosContext';
import { useVacaciones } from '../../context/VacacionesContext';
import { useUsuarios } from '../../context/UsuariosContext';

const COLORS = ['#E85D04', '#1E40AF', '#7C3AED', '#059669', '#DC2626', '#D97706'];

export const TableroPage = () => {
  const { recursos } = useRecursos();
  const { vacaciones } = useVacaciones();
  const { usuarios } = useUsuarios();
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'año'>('mes');

  // ─── KPIs ───────────────────────────────────────────────
  const kpis = useMemo(() => {
    const clientesUnicos = new Set(recursos.map((r) => r.cliente));
    const proyectosUnicos = new Set(recursos.map((r) => `${r.cliente}·${r.proyecto}`));
    const vacacionesActivas = vacaciones.filter((v) => {
      const hoy = new Date('2026-10-07');
      const inicio = new Date(v.fechaInicio);
      const fin = new Date(v.fechaFin);
      return inicio <= hoy && hoy <= fin;
    });
    const enBench = recursos.filter((r) => r.estado === 'Activo-Sin Asignación').length;

    return {
      recursos: recursos.length,
      clientes: clientesUnicos.size,
      proyectos: proyectosUnicos.size,
      vacaciones: vacacionesActivas.length,
      bench: enBench,
      usuarios: usuarios.filter((u) => u.status === 'Activo').length,
    };
  }, [recursos, vacaciones, usuarios]);

  // ─── Recursos por cliente ───────────────────────────────
  const recursosPorCliente = useMemo(() => {
    const conteo: Record<string, number> = {};
    recursos.forEach((r) => {
      conteo[r.cliente] = (conteo[r.cliente] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([cliente, cantidad]) => ({ cliente, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [recursos]);

  // ─── Distribución por nivel ─────────────────────────────
  const recursosPorNivel = useMemo(() => {
    const conteo: Record<string, number> = {};
    recursos.forEach((r) => {
      conteo[r.nivel] = (conteo[r.nivel] || 0) + 1;
    });
    const keys = Object.keys(conteo);
    return keys.map((nivel, i) => ({
      name: nivel,
      value: conteo[nivel],
      fill: COLORS[i % COLORS.length],
    }));
  }, [recursos]);

  // ─── Distribución por estado ────────────────────────────
  const recursosPorEstado = useMemo(() => {
    const conteo: Record<string, number> = {};
    recursos.forEach((r) => {
      const estadoSimplificado = r.estado
        .replace('Activo-', '')
        .replace('Proyecto Asignado', 'Asignado')
        .replace('Sin Asignación', 'Disponible');
      conteo[estadoSimplificado] = (conteo[estadoSimplificado] || 0) + 1;
    });
    return Object.entries(conteo).map(([estado, cantidad]) => ({
      name: estado,
      value: cantidad,
    }));
  }, [recursos]);

  // ─── Radial: % recursos asignados ───────────────────────
  const recursosAsignados = recursos.filter((r) => r.estado === 'Activo-Proyecto Asignado').length;
  const porcentajeAsignado = recursos.length > 0 ? Math.round((recursosAsignados / recursos.length) * 100) : 0;

  const radialData = [
    {
      name: 'Asignados',
      value: porcentajeAsignado,
      fill: '#E85D04',
    },
  ];

  // ─── Área: Actividad mensual ────────────────────────────
  const actividadMensual = useMemo(() => {
    const meses = ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];
    return meses.map((mes, i) => ({
      mes,
      altas: [5, 7, 6, 9, 8, 11][i],
      bajas: [2, 3, 1, 4, 2, 3][i],
      total: Math.max(3, recursos.length - (5 - i)),
    }));
  }, [recursos]);

  const topClientes = recursosPorCliente.slice(0, 5);

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Tablero</h2>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            KPIs, vencimientos y estado general del planner.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'white', padding: '4px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
          {(['mes', 'trimestre', 'año'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              style={{
                padding: '8px 16px',
                backgroundColor: periodo === p ? '#E85D04' : 'transparent',
                color: periodo === p ? 'white' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                textTransform: 'capitalize',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <KpiCard label="Recursos activos" value={kpis.recursos} color="#E85D04" />
        <KpiCard label="Clientes" value={kpis.clientes} color="#1E40AF" />
        <KpiCard label="Proyectos" value={kpis.proyectos} color="#7C3AED" />
        <KpiCard label="Vacaciones activas" value={kpis.vacaciones} color="#059669" />
        <KpiCard label="En bench" value={kpis.bench} color="#DC2626" />
        <KpiCard label="Usuarios activos" value={kpis.usuarios} color="#D97706" />
      </div>

      {/* FILA 1: Radial + 2 Donuts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Radial: % asignados */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>Cobertura de asignación</h3>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>Porcentaje de recursos asignados a proyectos</p>

          <div style={{ position: 'relative', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="100%"
                barSize={20}
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar background dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>

            {/* Texto central */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#E85D04', lineHeight: 1 }}>
                {porcentajeAsignado}%
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', fontWeight: 'bold' }}>
                ASIGNADOS
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                {recursosAsignados} de {recursos.length}
              </div>
            </div>
          </div>
        </div>

        {/* Donut: Estado */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>Estado de recursos</h3>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>Distribución por estado actual</p>

          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={recursosPorEstado}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                stroke="white"
                strokeWidth={2}
              >
                {recursosPorEstado.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', justifyContent: 'center' }}>
            {recursosPorEstado.map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: COLORS[i % COLORS.length] }} />
                <span style={{ color: '#666' }}>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut: Niveles */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>Distribución por nivel</h3>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>Cantidad de recursos por nivel</p>

          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={recursosPorNivel}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                stroke="white"
                strokeWidth={2}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {recursosPorNivel.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FILA 2: Área + Top 5 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px' }}>Actividad mensual</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={actividadMensual}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E85D04" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#E85D04" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAltas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="total" stroke="#E85D04" strokeWidth={2} fill="url(#colorTotal)" name="Total recursos" />
              <Area type="monotone" dataKey="altas" stroke="#059669" strokeWidth={2} fill="url(#colorAltas)" name="Altas del mes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px' }}>Top 5 clientes</h3>
          <div>
            {topClientes.map((c, i) => {
              const max = topClientes[0]?.cantidad || 1;
              const widthPct = (c.cantidad / max) * 100;
              return (
                <div key={c.cliente} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold' }}>{c.cliente}</span>
                    <span style={{ color: '#666' }}>{c.cantidad} recursos</span>
                  </div>
                  <div style={{ height: '10px', backgroundColor: '#F3F4F6', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${widthPct}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                        borderRadius: '5px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FILA 3: Barras por cliente */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px' }}>Recursos por cliente</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={recursosPorCliente}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="cliente" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
            <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
              {recursosPorCliente.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Componente KpiCard
const KpiCard = ({ label, value, color }: { label: string; value: number; color: string }) => {
  return (
    <div
      style={{
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        borderLeftWidth: '4px',
        borderLeftColor: color,
      }}
    >
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontWeight: 'bold' }}>{label}</div>
    </div>
  );
};