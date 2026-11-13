// src/pages/Recursos/ResourcesPage.tsx
import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { Filters, Recurso, RecursoApi } from '../../types';
import { searchRecursos, apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { EditarRecursoModal } from '../../components/recursos/EditarRecursoModal';
import { ResourceDetailDrawer } from '../../components/recursos/ResourceDetailDrawer';
import { ArrowRight, Download, Plus, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


// ==========================================
// TOKENS DE DISEÑO
// ==========================================
const FONT_BODY = '"Barlow", system-ui, -apple-system, sans-serif';
const FONT_DISPLAY = '"Barlow Condensed", "Barlow", sans-serif';

const C = {
  bg: '#F7F7F7', surface: '#FFFFFF', border: '#E5E5E5', borderSoft: '#EFEFEF', headRow: '#F1F1F1',
  groupRow: '#F5F1EC', text: '#1F1F1F', muted: '#6B6B6B', faint: '#8A8A8A', primary: '#C8400A',
  primaryHover: '#AF3708', link: '#0B3A7A', danger: '#B91C1C', pillBg: '#FDEBC8', pillText: '#9A5B00',
  brandBrown: '#4a231c', white: '#ffffff',
};
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap');
.rp-root, .rp-root * { box-sizing: border-box; }
.rp-root input, .rp-root select, .rp-root button { font-family: ${FONT_BODY}; }
.rp-btn:hover { filter: brightness(0.97); }
.rp-btn-primary:hover { background: ${C.primaryHover} !important; }
.rp-stat-card--clickable:hover, .rp-stat-card--clickable:focus-visible { background: #351914 !important; }
.rp-stat-card--clickable:focus-visible { outline: 2px solid ${C.brandBrown}; outline-offset: 2px; }
.rp-row:hover { background: #FBF8F4 !important; }
.rp-input:focus { outline: 2px solid #F5C9A8; border-color: ${C.primary} !important; }
`;
const labelStyle: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 };
const inputStyle: CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 14, color: C.text, backgroundColor: C.surface };
const thStyle: CSSProperties = { fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' };
const DOT_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const WEEKS = ['05 Oct 26', '12 Oct 26', '19 Oct 26', '26 Oct 26', '02 Nov 26', '09 Nov 26', '16 Nov 26', '23 Nov 26', '30 Nov 26'];
const GRID_COLS = '2.2fr 3fr 1.3fr 0.6fr';
const SITUACIONES = [
  { value: 'Todos', label: 'Todas' },
  { value: 'ASIGNADO', label: 'Asignado' },
  { value: 'PENDIENTE_CONFIRMACION', label: 'Pendiente de confirmación' },
  { value: 'SIN_PROYECTO', label: 'Sin proyecto' },
];
const INITIAL_FILTERS: Filters = {
  search: '', cliente: 'Todos', proyecto: 'Todos', liderNPD: 'Todos', rol: 'Todos', nivel: 'Todos', estado: 'Activo', situacion: 'Todos',
};
// Interfaz para los catálogos
interface CatalogoItem {
  id: number;
  name: string;
}
export const ResourcesPage = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('operations-administrator');
  const navigate = useNavigate();
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recursoAEditar, setRecursoAEditar] = useState<Recurso | null>(null);
  const [recursoSeleccionado, setRecursoSeleccionado] = useState<Recurso | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  // CA-14: selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const gridCols = isAdmin ? `32px ${GRID_COLS}` : GRID_COLS;
  // BUG-01: Catálogos tipados
  const [catalogos, setCatalogos] = useState<{
    clientes: CatalogoItem[];
    proyectos: CatalogoItem[];
    lideres: CatalogoItem[];
  }>({
    clientes: [], proyectos: [], lideres: []
  });
  const toggleOne = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const clearSelection = () => setSelectedIds(new Set());
  const openResourceDetail = (resource: Recurso) => setRecursoSeleccionado(resource);
  const handleResourceKeyDown = (event: React.KeyboardEvent, resource: Recurso) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openResourceDetail(resource);
    }
  };
  // BUG-01: Cargar catálogos al montar
  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [resClientes, resLideres] = await Promise.all([
          apiFetch('planner', '/clients').then(r => r.json()),
          apiFetch('planner', '/resources/npd-leads').then(r => r.json()),
        ]);
        setCatalogos(prev => ({ 
          ...prev, 
          clientes: resClientes.items || [],
          lideres: resLideres.items || [],
         }));
      } catch {
        // Error silencioso
      }
    };
    void loadCatalogos();
  }, []);

  // BUG-01: Cargar proyectos cuando cambia el cliente
  useEffect(() => {
    const loadProyectos = async () => {
      if (!filters.cliente || filters.cliente === 'Todos') {
        setCatalogos(prev => ({ ...prev, proyectos: []}));
        return;
      }
        try {
          const res = await apiFetch('planner', `/clients/${filters.cliente}/projects`);
          const data = await res.json();
            setCatalogos(prev => ({ ...prev, proyectos: data.items || []}));
        } catch {
          // Error silencioso
        }
    };
    void loadProyectos();
  }, [filters.cliente]);

  // BUG-01 y BUG-02: API real
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchRecursos(filters, 1, 25);
      const mappedItems: Recurso[] = res.items.map((item: RecursoApi) => ({
        id: item.id.toString(),
        nEmpleado: `#${item.employeeNumber || '0000'}`,
        nombre: item.name || 'Sin nombre',
        rol: item.clientRole || 'Sin rol',
        cliente: item.client?.name || 'No especificado',
        proyecto: item.project?.name || 'Sin proyecto',
        liderNPD: item.leader?.name || 'Sin líder',
        nivel: `N${item.level}`,
        estado: item.status === 'ACTIVO' ? 'Activo' : item.status,
        fechaInicio: item.startDate || '2026-10-19',
        fechaFin: item.endDate || '2026-12-20',
        version: item.version,
      }));
      setRecursos(mappedItems);
      setSelectedIds(new Set());
    } catch {
      setError('No se pudo conectar con la API');
      setRecursos([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    const loadData = async () => { await fetchData(); };
    loadData();
  }, [fetchData]);
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // BUG-06: Exportar TODOS los datos
  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');
      
      const res = await searchRecursos(filters, 1, 10000);
      
      const ws = XLSX.utils.json_to_sheet(res.items.map(r => ({
        'N° Empleado': r.employeeNumber,
        'Nombre': r.name,
        'Rol': r.clientRole,
        'Cliente': r.client?.name,
        'Proyecto': r.project?.name,
        'Líder': r.leader?.name,
        'Nivel': r.level,
        'Estado': r.status,
        'Fecha Inicio': r.startDate,
        'Fecha Fin': r.endDate,
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recursos');
      saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `Recursos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch {
      alert("Error al exportar");
    }
  };
  const allSelected = recursos.length > 0 && selectedIds.size === recursos.length;
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(recursos.map(r => r.id)));
  const groupedRecursos = recursos.reduce((acc, rec) => {
    if (!acc[rec.cliente]) acc[rec.cliente] = [];
    acc[rec.cliente].push(rec);
    return acc;
  }, {} as Record<string, Recurso[]>);
  const getBarStyle = (inicio: string, fin: string, index: number) => {
    const start = new Date(inicio).getTime();
    const end = new Date(fin).getTime();
    const rangeStart = new Date('2026-10-01').getTime();
    const rangeEnd = new Date('2027-04-01').getTime();
    const total = rangeEnd - rangeStart;
    const left = Math.max(0, ((start - rangeStart) / total) * 100);
    const width = Math.max(2, ((end - start) / total) * 100);
    return {
      left: `${Math.min(100, left)}%`,
      width: `${Math.min(100 - left, width)}%`,
      backgroundColor: index % 2 === 0 ? '#FED7AA' : '#BFDBFE',
      borderColor: index % 2 === 0 ? '#F59E0B' : '#3B82F6',
    };
  };

  return (
    <div className="rp-root" style={{ fontFamily: FONT_BODY, color: C.text }}>
      <style>{GLOBAL_CSS}</style>

      {/* ENCABEZADO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>Recursos</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: '8px 0 0' }}>
            {recursos.length} colaboradores activos en {Object.keys(groupedRecursos).length} clientes, 25 por página.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="rp-btn" onClick={handleExport} style={{ height: 38, padding: '0 16px', border: `1px solid ${C.border}`, background: C.surface, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: C.text }}>
            <Download size={16} /> Exportar
          </button>
          <button onClick={() => navigate('/recursos/nuevo')} className="rp-btn-primary" style={{ height: 38, padding: '0 16px', border: 'none', background: C.primary, color: 'white', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
            <Plus size={16} /> Registrar recurso
          </button>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard title="Arribos próximos" value="11" sub="Lo que vence en los próximos 30 días" onClick={() => navigate('/arribos-proximos')} />
        <StatCard title="Fin de contrato ≤ 30 días" value="12" sub="avisar a 30 y 15 días" danger />
        <StatCard title="Fin de contrato ≤ 7 días" value="14" sub="1 semana" danger />
        <StatCard title="Colaboradores sin proyecto" value="10" sub="listos para asignar" />
      </div>

      {/* PANEL DE FILTROS CON CATÁLOGOS */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px 12px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.2, minWidth: 220 }}>
          <label style={labelStyle}>Buscar</label>
          <input className="rp-input" type="text" name="search" value={filters.search} placeholder="Nombre, N° empleado, proyecto..." onChange={handleFilterChange} style={inputStyle} />
        </div>
        
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={labelStyle}>Cliente</label>
          <select className="rp-input" name="cliente" value={filters.cliente} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {catalogos.clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={labelStyle}>Proyecto</label>
          <select className="rp-input" name="proyecto" value={filters.proyecto} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {catalogos.proyectos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={labelStyle}>Líder NPD</label>
          <select className="rp-input" name="liderNPD" value={filters.liderNPD} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {catalogos.lideres.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={labelStyle}>Situación</label>
          <select className="rp-input" name="situacion" value={filters.situacion} onChange={handleFilterChange} style={inputStyle}>
            {SITUACIONES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, fontSize: 13, color: C.muted, cursor: 'pointer' }}>
          <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
          Incluir inactivos
        </label>
        <button className="rp-btn" onClick={() => setFilters(INITIAL_FILTERS)} style={{ height: 38, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.primary }}>
          Limpiar filtros
        </button>
      </div>

      {/* ERROR (BUG-02) */}
      {error && (
        <div style={{ backgroundColor: '#FEF2F2', color: C.danger, padding: '10px 16px', borderRadius: 6, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #FECACA', fontSize: 13 }}>
          <span>⚠️ {error} (mostrando datos de prueba locales)</span>
          <button onClick={fetchData} style={{ fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', color: C.danger }}>Reintentar</button>
        </div>
      )}

      {/* TABLA + TIMELINE */}
      <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', overflowX: 'auto', minHeight: 400 }}>
        {/* IZQUIERDA */}
        <div style={{ width: '45%', minWidth: 460, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, padding: '0 16px', height: 35, alignItems: 'center', backgroundColor: C.headRow, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10, ...thStyle }}>
            {isAdmin && (<div><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos" /></div>)}
            <div>Colaborador</div>
            <div>Proyecto / Cliente</div>
            <div>Líder NPD</div>
            <div style={{ textAlign: 'center' }}>Nivel</div>
          </div>

          {loading && <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>Cargando…</div>}

          {Object.entries(groupedRecursos).map(([cliente, recs], groupIndex) => (
            <div key={cliente}>
              <div style={{ height: 33, padding: '0 16px', backgroundColor: C.groupRow, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: DOT_COLORS[groupIndex % DOT_COLORS.length] }} />
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>{cliente}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{recs.length} colaboradores</span>
              </div>

              {recs.map(rec => (
                <div
                  key={rec.id}
                  className="rp-row"
                  onClick={() => openResourceDetail(rec)}
                  onKeyDown={(event) => handleResourceKeyDown(event, rec)}
                  role="button"
                  tabIndex={0}
                  style={{ display: 'grid', gridTemplateColumns: gridCols, padding: '0 16px', height: 43, borderBottom: `1px solid ${C.borderSoft}`, alignItems: 'center', fontSize: 13, cursor: 'pointer', backgroundColor: C.surface }}
                >
                  {isAdmin && (<div onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(rec.id)} onChange={() => toggleOne(rec.id)} aria-label={`Seleccionar ${rec.nombre}`} /></div>)}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700 }}>{rec.nEmpleado}</div>
                    <div style={{ color: C.muted, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.nombre}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.proyecto}</div>
                    <div style={{ color: C.muted, fontSize: 11 }}>{rec.cliente}</div>
                  </div>
                  <div style={{ color: C.text }}>{rec.liderNPD}</div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ backgroundColor: C.pillBg, color: C.pillText, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{rec.nivel}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* DERECHA: TIMELINE */}
        <div style={{ width: '55%', position: 'relative', overflowX: 'auto' }}>
          <div style={{ display: 'flex', position: 'sticky', top: 0, backgroundColor: C.headRow, borderBottom: `1px solid ${C.border}`, zIndex: 10, height: 35 }}>
            {WEEKS.map(w => (<div key={w} style={{ minWidth: 80, flex: 1, borderRight: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...thStyle, textTransform: 'none' }}>{w}</div>))}
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: 2, backgroundColor: '#1D4ED8', zIndex: 5 }} />
            {Object.entries(groupedRecursos).map(([cliente, recs]) => (
              <div key={cliente}>
                <div style={{ height: 33, borderBottom: `1px solid ${C.border}`, backgroundColor: C.groupRow }} />
                {recs.map((rec, index) => {
                  const bar = getBarStyle(rec.fechaInicio, rec.fechaFin, index);
                  return (
                    <div
                      key={rec.id}
                      className="rp-timeline-row"
                      onClick={() => openResourceDetail(rec)}
                      onKeyDown={(event) => handleResourceKeyDown(event, rec)}
                      role="button"
                      tabIndex={0}
                      style={{ height: 43, borderBottom: `1px solid ${C.borderSoft}`, position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    >
                      {WEEKS.map(w => (<div key={w} style={{ minWidth: 80, flex: 1, height: '100%', borderRight: `1px solid ${C.borderSoft}` }} />))}
                      <div style={{ position: 'absolute', left: bar.left, width: bar.width, height: 16, backgroundColor: bar.backgroundColor, border: `1px solid ${bar.borderColor}`, borderRadius: 3, zIndex: 6 }} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PAGINACIÓN */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: C.muted }}>
        <span>{recursos.length} de {recursos.length} colaboradores</span>
        <button className="rp-btn" style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>◀</button>
        <button className="rp-btn" style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>▶</button>
      </div>

      {/* CA-14 */}
      {isAdmin && selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: '#2B1810', color: 'white', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600 }}>{selectedIds.size} seleccionados</span>
          <button className="rp-btn-primary" disabled title="Disponible en HU-08" style={{ height: 34, padding: '0 14px', border: 'none', background: C.primary, color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Asignar a proyecto…</button>
          <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>Limpiar selección</button>
        </div>
      )}

      {/* BUG-03 */}
      {recursoAEditar && isAdmin && (
        <EditarRecursoModal recurso={recursoAEditar} onClose={() => setRecursoAEditar(null)} onSave={() => { fetchData(); setRecursoAEditar(null); }} />
      )}
      {recursoSeleccionado && (
        <ResourceDetailDrawer
          resource={recursoSeleccionado}
          onClose={() => setRecursoSeleccionado(null)}
          onEdit={(resource) => {
            setRecursoAEditar(resource);
            setRecursoSeleccionado(null);
          }}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value, sub, danger, onClick }: { title: string; value: string; sub: string; danger?: boolean; onClick?: () => void }) => {
  const content = (
    <>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: onClick ? C.white : C.text, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 700, lineHeight: 1.1, color: onClick ? C.white : danger ? C.danger : C.text, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 12, color: onClick ? C.white : C.muted, marginTop: 2 }}>{sub}</div>
      {onClick && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, color: C.white, fontSize: 12, fontWeight: 600 }}>Ver los {value} eventos <ArrowRight size={14} /></div>}
    </>
  );

  if (onClick) {
    return <button type="button" className="rp-stat-card--clickable" onClick={onClick} style={{ width: '100%', background: C.brandBrown, border: `1px solid ${C.brandBrown}`, borderRadius: 6, padding: '12px 12px 14px', textAlign: 'left', cursor: 'pointer' }}>{content}</button>;
  }

  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 12px 14px' }}>{content}</div>;
};

export const RowAction = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.link, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
    <UserPlus size={16} /> {label}
  </button>
);