// src/pages/Recursos/ResourcesPage.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Filters, Recurso } from '../../types';
import { searchAllRecursos, searchRecursos } from '../../services/api';
import { getProjectsApi } from '../../services/projects';
import { getResourcesApi } from '../../services/resources';
import { useAuth } from '../../context/AuthContext';
import { ResourceDetailDrawer } from '../../components/recursos/ResourceDetailDrawer';
import { Download, Plus, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ArrivalsStrip } from '../../components/arribos/ArrivalsStrip';
import { exportFileName, toExportRows } from './resourceExport';
import { toRecurso } from './resourceMapper';


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
.rp-row:hover { background: #FBF8F4 !important; }
.rp-row-button { display: grid; align-items: center; height: 100%; padding: 0; border: none; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.rp-timeline-row { width: 100%; padding: 0; border: none; background: none; font: inherit; }
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
  search: '', cliente: 'Todos', proyecto: 'Todos', liderNPD: 'Todos', rol: 'Todos', nivel: '', estado: 'Activo', situacion: 'Todos',
};
/** El backend pagina de a 25 (HU-03) */
const PAGE_SIZE = 25;
// Opciones de los filtros: los ids van como texto en los <select>
interface CatalogoItem {
  id: number | string;
  name: string;
}
interface PageInfo {
  totalElements: number;
  totalPages: number;
}
const EMPTY_PAGE: PageInfo = { totalElements: 0, totalPages: 0 };

export const ResourcesPage = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('operations-administrator');
  const navigate = useNavigate();
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recursoSeleccionado, setRecursoSeleccionado] = useState<Recurso | null>(null);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState<PageInfo>(EMPTY_PAGE);
  const [catalogError, setCatalogError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // CA-14: selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const gridCols = isAdmin ? `32px ${GRID_COLS}` : GRID_COLS;
  // BUG-01: Catálogos tipados
  const [catalogos, setCatalogos] = useState<{
    clientes: CatalogoItem[];
    proyectos: CatalogoItem[];
    lideres: CatalogoItem[];
    roles: CatalogoItem[];
  }>({
    clientes: [], proyectos: [], lideres: [], roles: []
  });
  const toggleOne = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const clearSelection = () => setSelectedIds(new Set());
  const openResourceDetail = (resource: Recurso) => setRecursoSeleccionado(resource);
  // BUG-01: opciones de los filtros desde la API; si fallan se avisa (BUG-02)
  const loadCatalogos = useCallback(async () => {
    try {
      const [projectsApi, resourcesApi] = await Promise.all([getProjectsApi(), getResourcesApi()]);
      const [clientes, lideres, roles] = await Promise.all([
        projectsApi.listClients(),
        resourcesApi.getNpdLeads(),
        resourcesApi.getClientRoles(),
      ]);
      setCatalogos(prev => ({ ...prev, clientes, lideres, roles }));
      setCatalogError(false);
    } catch {
      setCatalogError(true);
    }
  }, []);

  useEffect(() => {
    const load = async () => { await loadCatalogos(); };
    void load();
  }, [loadCatalogos]);

  // BUG-01: proyectos del cliente elegido
  const clienteElegido = Boolean(filters.cliente && filters.cliente !== 'Todos');
  useEffect(() => {
    if (!clienteElegido) return;
    let current = true;
    const loadProyectos = async () => {
      try {
        const proyectos = await (await getProjectsApi()).listClientProjects(filters.cliente as string);
        if (current) setCatalogos(prev => ({ ...prev, proyectos }));
      } catch {
        if (current) setCatalogError(true);
      }
    };
    void loadProyectos();
    return () => { current = false; };
  }, [filters.cliente, clienteElegido]);
  const proyectosDelCliente = clienteElegido ? catalogos.proyectos : [];

  // BUG-01 y BUG-02: API real, paginada en el servidor.
  // Solo se aplica la respuesta de la última búsqueda: con la red lenta, una respuesta vieja que
  // llega tarde no debe pisar la de los filtros actuales.
  const latestSearch = useRef(0);
  const fetchData = useCallback(async () => {
    const searchId = ++latestSearch.current;
    const isCurrent = () => searchId === latestSearch.current;
    setLoading(true);
    setError(null);
    try {
      const res = await searchRecursos(filters, page, PAGE_SIZE);
      if (!isCurrent()) return;
      setRecursos(res.items.map(toRecurso));
      setPageInfo({ totalElements: res.page.totalElements, totalPages: res.page.totalPages });
      setSelectedIds(new Set());
    } catch {
      if (!isCurrent()) return;
      setError('No se pudieron cargar los recursos.');
      setRecursos([]);
      setPageInfo(EMPTY_PAGE);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [filters, page]);
  useEffect(() => {
    const load = async () => { await fetchData(); };
    void load();
  }, [fetchData]);

  /** Un filtro nuevo vuelve a la página 1; otro cliente limpia el proyecto */
  const updateFilters = (changes: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...changes, ...('cliente' in changes ? { proyecto: 'Todos' } : {}) }));
    setPage(1);
  };
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    const value = name === 'nivel' ? e.target.value.replace(/\D/g, '').slice(0, 3) : e.target.value;
    updateFilters({ [name]: value });
  };

  // BUG-06: exporta todos los recursos que cumplen los filtros, no solo la página en pantalla
  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const [items, XLSX, { saveAs }] = await Promise.all([
        searchAllRecursos(filters),
        import('xlsx'),
        import('file-saver'),
      ]);
      const ws = XLSX.utils.json_to_sheet(toExportRows(items));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recursos');
      saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), exportFileName());
    } catch {
      setExportError('No se pudo exportar. Intenta de nuevo.');
    } finally {
      setExporting(false);
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
    const rangeStart = new Date('2026-10-01').getTime();
    const rangeEnd = new Date('2027-04-01').getTime();
    const start = new Date(inicio).getTime();
    // Sin fecha final = indefinido: la barra llega al final del rango
    const end = fin ? new Date(fin).getTime() : rangeEnd;
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
            {pageInfo.totalElements} colaboradores, {PAGE_SIZE} por página.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="rp-btn" onClick={() => void handleExport()} disabled={exporting} style={{ height: 38, padding: '0 16px', border: `1px solid ${C.border}`, background: C.surface, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: C.text }}>
            <Download size={16} /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {isAdmin && (
          <button onClick={() => navigate('/recursos/nuevo')} className="rp-btn-primary" style={{ height: 38, padding: '0 16px', border: 'none', background: C.primary, color: 'white', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
            <Plus size={16} /> Registrar recurso
          </button>
          )}
        </div>
      </div>

      {/* ARRIBOS PRÓXIMOS (HU-06 CA-01) */}
      <ArrivalsStrip />

      {/* PANEL DE FILTROS CON CATÁLOGOS */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px 12px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.2, minWidth: 220 }}>
          <label htmlFor="rp-filter-search" style={labelStyle}>Buscar</label>
          <input id="rp-filter-search" className="rp-input" type="text" name="search" value={filters.search} placeholder="Nombre, N° empleado, proyecto..." onChange={handleFilterChange} style={inputStyle} />
        </div>
        
        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="rp-filter-cliente" style={labelStyle}>Cliente</label>
          <select id="rp-filter-cliente" className="rp-input" name="cliente" value={filters.cliente} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {catalogos.clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="rp-filter-proyecto" style={labelStyle}>Proyecto</label>
          <select id="rp-filter-proyecto" className="rp-input" name="proyecto" value={filters.proyecto} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {proyectosDelCliente.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="rp-filter-lider" style={labelStyle}>Líder NPD</label>
          <select id="rp-filter-lider" className="rp-input" name="liderNPD" value={filters.liderNPD} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {catalogos.lideres.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="rp-filter-rol" style={labelStyle}>Rol</label>
          <select id="rp-filter-rol" className="rp-input" name="rol" value={filters.rol} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {catalogos.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div style={{ flex: 0.5, minWidth: 90 }}>
          <label htmlFor="rp-filter-nivel" style={labelStyle}>Nivel</label>
          <input id="rp-filter-nivel" className="rp-input" type="text" inputMode="numeric" name="nivel" value={filters.nivel} placeholder="Todos" onChange={handleFilterChange} style={inputStyle} />
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="rp-filter-situacion" style={labelStyle}>Situación</label>
          <select id="rp-filter-situacion" className="rp-input" name="situacion" value={filters.situacion} onChange={handleFilterChange} style={inputStyle}>
            {SITUACIONES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, fontSize: 13, color: C.muted, cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.estado === 'Todos'} onChange={e => updateFilters({ estado: e.target.checked ? 'Todos' : 'Activo' })} />
          <span>Incluir inactivos</span>
        </label>
        <button className="rp-btn" onClick={() => { setFilters(INITIAL_FILTERS); setPage(1); }} style={{ height: 38, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.primary }}>
          Limpiar filtros
        </button>
      </div>

      {/* ERRORES (BUG-02): nunca se muestran datos de ejemplo en su lugar */}
      {error && <ErrorBanner message={error} onRetry={() => void fetchData()} />}
      {catalogError && <ErrorBanner message="No se pudieron cargar las opciones de los filtros." onRetry={() => void loadCatalogos()} />}
      {exportError && <ErrorBanner message={exportError} onRetry={() => void handleExport()} />}

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
          {!loading && !error && recursos.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>Ningún colaborador cumple los filtros.</div>
          )}

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
                  style={{ display: 'grid', gridTemplateColumns: gridCols, padding: '0 16px', height: 43, borderBottom: `1px solid ${C.borderSoft}`, alignItems: 'center', fontSize: 13, backgroundColor: C.surface }}
                >
                  {isAdmin && (<div><input type="checkbox" checked={selectedIds.has(rec.id)} onChange={() => toggleOne(rec.id)} aria-label={`Seleccionar ${rec.nombre}`} /></div>)}
                  <button
                    type="button"
                    className="rp-row-button"
                    onClick={() => openResourceDetail(rec)}
                    style={{ gridColumn: isAdmin ? '2 / -1' : '1 / -1', gridTemplateColumns: GRID_COLS }}
                  >
                    <span style={{ display: 'block', minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700 }}>{rec.nEmpleado}</span>
                      <span style={{ display: 'block', color: C.muted, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.nombre}</span>
                    </span>
                    <span style={{ display: 'block', minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.proyecto}</span>
                      <span style={{ display: 'block', color: C.muted, fontSize: 11 }}>{rec.cliente}</span>
                    </span>
                    <span style={{ display: 'block', color: C.text }}>{rec.liderNPD}</span>
                    <span style={{ display: 'block', textAlign: 'center' }}>
                      <span style={{ backgroundColor: C.pillBg, color: C.pillText, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{rec.nivel}</span>
                    </span>
                  </button>
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
                  const bar = rec.fechaInicio ? getBarStyle(rec.fechaInicio, rec.fechaFin, index) : null;
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      className="rp-timeline-row"
                      onClick={() => openResourceDetail(rec)}
                      aria-label={`Ver detalle de ${rec.nombre}`}
                      style={{ height: 43, borderBottom: `1px solid ${C.borderSoft}`, position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    >
                      {WEEKS.map(w => (<span key={w} style={{ display: 'block', minWidth: 80, flex: 1, height: '100%', borderRight: `1px solid ${C.borderSoft}` }} />))}
                      {bar && <span style={{ display: 'block', position: 'absolute', left: bar.left, width: bar.width, height: 16, backgroundColor: bar.backgroundColor, border: `1px solid ${bar.borderColor}`, borderRadius: 3, zIndex: 6 }} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PAGINACIÓN */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: C.muted }}>
        <span>{pageRangeText(page, recursos.length, pageInfo.totalElements)}</span>
        <button className="rp-btn" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} style={pagerStyle}>◀</button>
        <span>Página {Math.min(page, Math.max(pageInfo.totalPages, 1))} de {Math.max(pageInfo.totalPages, 1)}</span>
        <button className="rp-btn" aria-label="Página siguiente" disabled={page >= pageInfo.totalPages || loading} onClick={() => setPage(p => p + 1)} style={pagerStyle}>▶</button>
      </div>

      {/* CA-14 */}
      {isAdmin && selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: '#2B1810', color: 'white', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600 }}>{selectedIds.size} seleccionados</span>
          <button className="rp-btn-primary" disabled title="Disponible en HU-08" style={{ height: 34, padding: '0 14px', border: 'none', background: C.primary, color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Asignar a proyecto…</button>
          <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>Limpiar selección</button>
        </div>
      )}

      {recursoSeleccionado && (
        <ResourceDetailDrawer
          resource={recursoSeleccionado}
          onClose={() => setRecursoSeleccionado(null)}
          onEdit={(resource) => {
            // BUG-03: se edita con el formulario completo (GET + PUT con version)
            setRecursoSeleccionado(null);
            navigate(`/recursos/${resource.id}/editar`);
          }}
        />
      )}
    </div>
  );
};

const pagerStyle: CSSProperties = { border: `1px solid ${C.border}`, background: C.surface, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' };

/** «26–50 de 112 colaboradores» */
function pageRangeText(page: number, shown: number, total: number): string {
  if (total === 0 || shown === 0) return `0 de ${total} colaboradores`;
  const first = (page - 1) * PAGE_SIZE + 1;
  return `${first}–${first + shown - 1} de ${total} colaboradores`;
}

const ErrorBanner = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div role="alert" style={{ backgroundColor: '#FEF2F2', color: C.danger, padding: '10px 16px', borderRadius: 6, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #FECACA', fontSize: 13 }}>
    <span>⚠️ {message}</span>
    <button onClick={onRetry} style={{ fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', color: C.danger }}>Reintentar</button>
  </div>
);

export const RowAction = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.link, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
    <UserPlus size={16} /> {label}
  </button>
);