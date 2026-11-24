// src/pages/Recursos/ResourcesPage.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Filters, Recurso, RecursoApi } from '../../types';
import { searchAllRecursos, searchRecursos } from '../../services/api';
import { getProjectsApi } from '../../services/projects';
import { getResourcesApi } from '../../services/resources';
import { useAuth } from '../../context/AuthContext';
import { ResourceDetailDrawer } from '../../components/recursos/ResourceDetailDrawer';
import { ChevronLeft, ChevronRight, Download, GanttChartSquare, Plus, Table, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ArrivalsStrip } from '../../components/arribos/ArrivalsStrip';
import { useOpenRegisterResource } from '../../components/recursos/registerProject';
import { exportFileName, statusText, toExportRows } from './resourceExport';


// ==========================================
// TOKENS DE DISEÑO
// ==========================================
const FONT_BODY = '"Barlow", system-ui, -apple-system, sans-serif';
const FONT_DISPLAY = '"Barlow Condensed", "Barlow", sans-serif';

const C = {
  bg: '#F7F7F7', surface: '#FFFFFF', border: '#E5E5E5', borderSoft: '#EFEFEF', headRow: '#F1F1F1',
  groupRow: '#F5F1EC', text: '#1F1F1F', muted: '#6B6B6B', faint: '#8A8A8A', primary: '#C8400A',
  primaryHover: '#AF3708', link: '#0B3A7A', danger: '#B91C1C', pillBg: '#FDEBC8', pillText: '#9A5B00',
  brandBrown: '#4a231c', white: '#ffffff', chipBg: '#E3EDFB'
};

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap');
.rp-root, .rp-root * { box-sizing: border-box; }
.rp-root input, .rp-root select, .rp-root button { font-family: ${FONT_BODY}; }
.rp-btn:hover:not(:disabled) { filter: brightness(0.97); }
.rp-btn-primary:hover { background: ${C.primaryHover} !important; }
.rp-row:hover { background: #FBF8F4 !important; }
.rp-row-button { display: grid; align-items: center; height: 100%; padding: 0; border: none; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.rp-timeline-row { width: 100%; padding: 0; border: none; background: none; font: inherit; }
.rp-input:focus { outline: 2px solid #F5C9A8; border-color: ${C.primary} !important; }
`;
const labelStyle: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 };
const inputStyle: CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 14, color: C.text, backgroundColor: C.surface };
const thStyle: CSSProperties = { fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' };

const ROW_H = 36;
const HEAD_H = 34;

const RANGE_START = Date.UTC(2026, 8, 1);
const RANGE_END = Date.UTC(2027, 3, 1);
const RANGE_TOTAL = RANGE_END - RANGE_START;
const MONTHS = [
  {label: 'SEP 26', days: 30}, {label: 'OCT 26', days: 31}, {label: 'NOV 26', days: 30}, {label: 'DIC 26', days: 31}, {label: 'ENE 27', days: 31}, {label: 'FEB 27', days: 28}, {label: 'MAR 27', days: 31},
];
const TIMELINE_MIN_W = 700;

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtDia = (d: string) => {const x = new Date(d); return `${x.getUTCDate()} ${MES[x.getUTCMonth()]}`; };
const fmtDesde = (d: string) => {const x = new Date(d); return `desde ${MES[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
const ENDING_SOON_DAYS = 30;

const SITUACIONES = [
  {value: 'Todos', label: 'Todas'},
  {value: 'ASIGNADO', label: 'Asignado'},
  {value: 'PENDIENTE_CONFIRMACION', label: 'Pendiente de confirmación'},
  {value: 'SIN_PROYECTO', label: 'Sin proyecto'},
];

const ESTADOS = [
  {value: 'Activo', label: 'Activo'},
  {value: 'Todos', label: 'Todos'},
];

const INITIAL_FILTERS: Filters = {
  search: '', cliente: 'Todos', proyecto: 'Todos', liderNPD: 'Todos', rol: 'Todos', nivel: '', estado: 'Activo', situacion: 'Todos',};
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

/** Grupo de la fila: el cliente, «No especificado» si el proyecto está inactivo o «Sin proyecto» */
function groupLabel(item: RecursoApi): string {
  if (item.projectActive === false) return 'No especificado';
  return item.client?.name ?? 'Sin proyecto';
}

function toRecurso(item: RecursoApi): Recurso & {
  indefinite?: boolean;
  probationEndDate?: string;
  vacations?: Array<{startDate: string; endDate: string}>;
  raw?: RecursoApi;
}{
  const raw = item as RecursoApi & {
    hireDate?: string;
    indefinite?: boolean;
    probationEndDate?: string;
    vacations?: Array<{ startDate?: string; endDate?: string; start?: string; end?: string}>;
  };

  let effectiveStart = item.assignmentStart ?? '';
  if (effectiveStart && raw.hireDate && new Date(raw.hireDate).getTime() > new Date(effectiveStart).getTime()){
    effectiveStart = raw.hireDate;
  }

  let probationEnd = raw.probationEndDate ?? '';
  if (!probationEnd && raw.hireDate){
    const d = new Date(raw.hireDate);
    if (!Number.isNaN(d.getUTCDate())){
      d.setUTCDate(d.getUTCDate() + 90);
      probationEnd = d.toISOString().slice(0,10);
    }
  }

  const vacations = Array.isArray(raw.vacations)
  ?raw.vacations
      .map(v => ({startDate: v.startDate ?? v.start ?? '', endDate: v.endDate ?? v.end ?? ''}))
      .filter(v => v.startDate && v.endDate)
  : [];
  return {
    id: item.id.toString(),
    nEmpleado: `#${item.employeeNumber}`,
    nombre: item.name,
    rol: item.clientRole ?? 'Sin rol',
    cliente: groupLabel(item),
    proyecto: item.project?.name ?? 'Sin proyecto',
    liderNPD: item.leader?.name ?? 'Sin líder',
    nivel: item.level == null ? '—' : `N${item.level}`,
    estado: statusText(item.status),
    // Sin datos falsos (BUG-02): sin proyecto no hay barra; sin fin es indefinido
    fechaInicio: effectiveStart,
    fechaFin: raw.indefinite ? '' : (item.assignmentEnd ?? ''),
    indefinite: Boolean(raw.indefinite || (!item.assignmentEnd && Boolean(effectiveStart))),
    probationEndDate: probationEnd,
    vacations,
    raw: item,
  };
}

type GrupoKind = 'normal' | 'sinDefinir' | 'sinProyecto';
interface Grupo{
  cliente: string;
  proyecto: string;
  kind: GrupoKind;
  recs: Recurso[];
}
const kindOf = (cliente: string): GrupoKind => 
  cliente === 'No especificado' ? 'sinDefinir' : cliente === 'Sin proyecto' ? 'sinProyecto': 'normal';
const KIND_RANK: Record<GrupoKind, number> = { sinDefinir: 0, sinProyecto: 1, normal: 2};

const GROUP_STYLE: Record<GrupoKind, {bg: string; color: string; msg: string }> = {
  normal: {bg: C.groupRow, color: C.text, msg: ''},
  sinDefinir: {bg: '#FDECEC', color: C.danger, msg: 'Importados sin Cliente o Proyecto - Corrige el Registro antes de volver a guardarlo'},
  sinProyecto: {bg: '#FEF3D7', color: C.pillText, msg: 'Disponible para asignar - márcalos y usa <<Asignar a Proyectos>>' }, 
};

const countText = (shownInPage: number, totalInGroup?: number, currentPage = 1) => {
  if (totalInGroup && totalInGroup > shownInPage){
    return `${shownInPage} de ${totalInGroup} - sigue en la página ${currentPage + 1}`;
  }
  return `${shownInPage} colaborador${shownInPage === 1 ? '' : 'es'}`;
};

type RecursoExt = ReturnType<typeof toRecurso>;

const TABLE_COLUMNS: Array<{ key: string; label: string; width: number; getValue: (r: RecursoExt) => string }> = [
  { key: 'nEmpleado', label: 'N° emp.', width: 85, getValue: r => r.nEmpleado },
  { key: 'nombre', label: 'Colaborador', width: 210, getValue: r => r.nombre },
  { key: 'email', label: 'Correo', width: 200, getValue: r => (r.raw as { email?: string }).email ?? '—' },
  { key: 'estado', label: 'Estado', width: 100, getValue: r => r.estado },
  { key: 'situacion', label: 'Situación', width: 165, getValue: r => (r.raw as { situation?: { name?: string; code?: string } }).situation?.name ?? (r.raw as { situation?: { code?: string } }).situation?.code ?? '—' },
  { key: 'cliente', label: 'Cliente', width: 160, getValue: r => r.cliente },
  { key: 'proyecto', label: 'Proyecto', width: 180, getValue: r => r.proyecto },
  { key: 'rol', label: 'Rol cliente', width: 165, getValue: r => r.rol },
  { key: 'perfil', label: 'Perfil / Cargo', width: 150, getValue: r => (r.raw as { position?: string; internalRole?: string }).position ?? (r.raw as { internalRole?: string }).internalRole ?? '—' },
  { key: 'nivel', label: 'Nivel', width: 75, getValue: r => r.nivel },
  { key: 'liderNPD', label: 'Líder NPD', width: 170, getValue: r => r.liderNPD },
  { key: 'liderCliente', label: 'Líder cliente', width: 160, getValue: r => (r.raw as { clientLeader?: string }).clientLeader ?? '—' },
  { key: 'hireDate', label: 'Fecha ingreso', width: 120, getValue: r => (r.raw as { hireDate?: string }).hireDate ? fmtDia((r.raw as { hireDate?: string }).hireDate!) : '—' },
  { key: 'fechaInicio', label: 'Inicio asig.', width: 115, getValue: r => r.fechaInicio ? fmtDia(r.fechaInicio) : '—' },
  { key: 'fechaFin', label: 'Fin asig.', width: 115, getValue: r => r.indefinite ? 'Indefinido' : (r.fechaFin ? fmtDia(r.fechaFin) : '—') },
  { key: 'diasRestantes', label: 'Días rest.', width: 95, getValue: r => (r.raw as { daysToAssignmentEnd?: number | null }).daysToAssignmentEnd != null ? `${(r.raw as { daysToAssignmentEnd?: number }).daysToAssignmentEnd} d` : '—' },
  { key: 'probatoria', label: 'Fin probatoria', width: 120, getValue: r => r.probationEndDate ? fmtDia(r.probationEndDate) : '—' },
  { key: 'asignacionPct', label: '% Asig.', width: 85, getValue: r => (r.raw as { allocationPercentage?: number }).allocationPercentage != null ? `${(r.raw as { allocationPercentage?: number }).allocationPercentage}%` : '100%' },
  { key: 'modalidad', label: 'Modalidad', width: 120, getValue: r => (r.raw as { workMode?: string; modality?: string }).workMode ?? (r.raw as { modality?: string }).modality ?? '—' },
  { key: 'ubicacion', label: 'Ubicación', width: 130, getValue: r => (r.raw as { location?: string; country?: string }).location ?? (r.raw as { country?: string }).country ?? '—' },
  { key: 'tarifa', label: 'Tarifa / Costo', width: 115, getValue: r => (r.raw as { rate?: number | string }).rate != null ? String((r.raw as { rate?: number | string }).rate) : '—' },
  { key: 'notas', label: 'Observaciones', width: 220, getValue: r => (r.raw as { notes?: string; comments?: string }).notes ?? (r.raw as { comments?: string }).comments ?? '—' },
];

export const ResourcesPage = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('operations-administrator');
  const navigate = useNavigate();
  const openRegisterResource = useOpenRegisterResource();
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'roster' | 'tabla'>('roster');

  const gridCols = isAdmin ? '24px 62px 1fr 40px' : '62px 1fr 40px';

  const allSelected = recursos.length > 0 && recursos.every(r => selectedIds.has(r.id));
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set (prev);
      if (allSelected) recursos.forEach(r => next.delete(r.id));
      else recursos.forEach(r => next.add(r.id));
      return next;
    });
  };

  const clearSelection = () =>  setSelectedIds(new Set());


  
  // BUG-01: Catálogos tipados
  const [catalogos, setCatalogos] = useState<{
    clientes: CatalogoItem[];
    proyectos: CatalogoItem[];
    lideres: CatalogoItem[];
    roles: CatalogoItem[];
  }>({
    clientes: [], proyectos: [], lideres: [], roles: []
  });


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
  let current = true;
  const loadProyectos = async () => {
    if (!clienteElegido) {
      setCatalogos(prev => ({ ...prev, proyectos: [] }));
      return;
    }
    try {
      const projectsApi = await getProjectsApi();
      const proyectos = await projectsApi.listClientProjects(filters.cliente as string);
      if (current) setCatalogos(prev => ({ ...prev, proyectos }));
    } catch {
      if (current) setCatalogError(true);
    }
  };
  void loadProyectos();
  return () => { current = false; };
}, [filters.cliente, clienteElegido]);

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
    updateFilters({ [name]: value } as Partial<Filters>);
  };

  const resetFilters = () => {setFilters(INITIAL_FILTERS); setPage(1); };
  const goPrev = () => setPage(p => p - 1 );
  const goNext = () => setPage(p => p + 1);

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

  // BUG-36: exporta solo los recursos seleccionados en la barra flotante
  const handleExportSelected = async () => {
    const selectedItems = recursos
      .filter(r => selectedIds.has(r.id))
      .map(r => (r as RecursoExt).raw)
      .filter((item): item is RecursoApi => Boolean(item));

    if (selectedItems.length === 0) return;

    setExporting(true);
    setExportError(null);
    try {
      const [XLSX, { saveAs }] = await Promise.all([
        import('xlsx'),
        import('file-saver'),
      ]);
      const ws = XLSX.utils.json_to_sheet(toExportRows(selectedItems));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recursos seleccionados');
      saveAs(
        new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }),
        exportFileName()
      );
    } catch {
      setExportError('No se pudo exportar la selección. Intenta de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  const grupos: Grupo[] = Object.values(
    recursos.reduce((acc, rec) => {
      const key = `${rec.cliente}||${rec.proyecto}`;
      if (!acc[key]) acc[key] = {cliente: rec.cliente, proyecto: rec.proyecto, kind: kindOf(rec.cliente), recs: []};
      acc[key].recs.push(rec);
      return acc;
    }, {} as Record<string, Grupo>)
  ).sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);


  const now = new Date();
  const todayPct = ((now.getTime() - RANGE_START) / RANGE_TOTAL) * 100;
  const showToday = todayPct >= 0 && todayPct <= 100;
  const todayLabel = `HOY ${String(now.getDate()).padStart(2, '0')} ${MES[now.getMonth()].toUpperCase()}`;
  const pctInRange = (ts: number) => ((ts - RANGE_START) / RANGE_TOTAL) * 100;

  const getBar = (inicio: string, fin: string, indefinite?: boolean) => {
    const start = new Date(inicio).getTime();
    const hasEnd = Boolean(fin) && !indefinite;
    const end = hasEnd ? new Date(fin).getTime() : RANGE_END;
    if (end <RANGE_START || start > RANGE_END) return null;

    const startC = Math.max(start, RANGE_START);
    const endC = Math.min(end, RANGE_END);
    const left = pctInRange(startC);
    const width = Math.max(1.5, pctInRange(endC) - left);

    const daysLeft = hasEnd ? Math.ceil((end - now.getTime()) / 86400000) : null;
    const expired = daysLeft !== null && daysLeft <0;
    const ending = daysLeft !== null && daysLeft >= 0 && daysLeft <= ENDING_SOON_DAYS;
    const alertState = expired || ending;

    const marks: Array<{pct: number, label: string}> = [];
    if (hasEnd){
      for(const daysBefore of [30, 15]) {
        const markTs = end - daysBefore * 86400000;
        if(markTs > startC && markTs < endC) {
          marks.push({pct: ((markTs - startC) / endC - startC) *100, label: `${daysBefore}d` })
        }
      }
    }
    return{
      left,
      width,
      label: start <RANGE_START ? fmtDesde(inicio) : fmtDia(inicio),
      endLabel: hasEnd && end <= RANGE_END ? fmtDia(fin) : null,
      expired,
      ending,
      daysLeft,
      marks,
      bg: alertState ? '#FBE4E4' : '#FDE3D6',
      border: alertState ? '#E9A3A3' : '#F4A582',
    };
  };

  const getProbationPct = (probationDate?: string) => {
    if (!probationDate) return null;
    const ts = new Date(probationDate).getTime();
    if(Number.isNaN(ts) || ts <RANGE_START || ts > RANGE_END) return null;
    return {pct: pctInRange(ts), label: `Fin de probatoria: ${fmtDia(probationDate)}`};
  };

  const pagerProps = {
    page,
    totalPages: pageInfo.totalPages,
    shown: recursos.length,
    total: pageInfo.totalElements,
    loading,
    onPrev: goPrev,
    onNext: goNext,
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Selector segmentado Roster | Tabla (BUG-32) */}
          <div role="group" aria-label="Modo de vista" style={{ display: 'inline-flex', backgroundColor: C.surface, padding: 3, borderRadius: 6, border: `1px solid ${C.border}`, height: 38, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setViewMode('roster')}
              style={{
                height: 30,
                padding: '0 12px',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: viewMode === 'roster' ? '#3B1E14' : 'transparent',
                color: viewMode === 'roster' ? '#FFFFFF' : C.text,
              }}
            >
              <GanttChartSquare size={15} /> Roster
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tabla')}
              style={{
                height: 30,
                padding: '0 12px',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: viewMode === 'tabla' ? '#3B1E14' : 'transparent',
                color: viewMode === 'tabla' ? '#FFFFFF' : C.text,
              }}
            >
              <Table size={15} /> Tabla
            </button>
          </div>

          <button className="rp-btn" onClick={() => void handleExport()} disabled={exporting} style={{ height: 38, padding: '0 16px', border: `1px solid ${C.border}`, background: C.surface, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: C.text }}>
            <Download size={16} /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {isAdmin && (
            <button onClick={openRegisterResource} className="rp-btn-primary" style={{ height: 38, padding: '0 16px', border: 'none', background: C.primary, color: 'white', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
              <Plus size={16} /> Registrar recurso
            </button>
          )}
        </div>
      </div>

      {/* ARRIBOS PRÓXIMOS (HU-06 CA-01) */}
      <ArrivalsStrip />

      {/* PANEL DE FILTROS CON CATÁLOGOS */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px 12px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1.55fr 1fr 1fr 1fr 1fr 0.6fr 0.7fr 1.05fr auto', gap: 10, alignItems: 'end' }}>
        <div>
          <label htmlFor="rp-filter-search" style={labelStyle}>Buscar</label>
          <input id="rp-filter-search" className="rp-input" type="text" name="search" value={filters.search} placeholder="Nombre, N° empleado, proyecto..." onChange={handleFilterChange} style={inputStyle} />
        </div>

        <div>
          <label htmlFor="rp-filter-cliente" style={labelStyle}>Cliente</label>
          <select id="rp-filter-cliente" className="rp-input" name="cliente" value={filters.cliente} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {catalogos.clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="rp-filter-proyecto" style={labelStyle}>Proyecto</label>
          {/* Cascada: los proyectos dependen del cliente, así que sin cliente el combo queda desactivado */}
          <select
            id="rp-filter-proyecto"
            className="rp-input"
            name="proyecto"
            value={filters.proyecto}
            onChange={handleFilterChange}
            disabled={!clienteElegido}
            title={clienteElegido ? undefined : 'Elige un cliente para ver sus proyectos'}
            style={clienteElegido ? inputStyle : { ...inputStyle, backgroundColor: C.bg, color: C.muted, cursor: 'not-allowed' }}
          >
            <option value="Todos">{clienteElegido ? 'Todos' : 'Elige un cliente primero'}</option>
            {catalogos.proyectos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="rp-filter-lider" style={labelStyle}>Líder NPD</label>
          <select id="rp-filter-lider" className="rp-input" name="liderNPD" value={filters.liderNPD} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {catalogos.lideres.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="rp-filter-rol" style={labelStyle}>Rol</label>
          <select id="rp-filter-rol" className="rp-input" name="rol" value={filters.rol} onChange={handleFilterChange} style={inputStyle}>
            <option value="Todos">Todos</option>
            {catalogos.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="rp-filter-nivel" style={labelStyle}>Nivel</label>
          <input id="rp-filter-nivel" className="rp-input" type="text" inputMode="numeric" name="nivel" value={filters.nivel} placeholder="Todos" onChange={handleFilterChange} style={inputStyle} />
        </div>

        <div>
          <label htmlFor="rp-filter-estado" style={labelStyle}>Estado</label>
          <select id="rp-filter-estado" className="rp-input" name="estado" value={filters.estado} onChange={handleFilterChange} style={inputStyle}>
            {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="rp-filter-situacion" style={labelStyle}>Situación</label>
          <select id="rp-filter-situacion" className="rp-input" name="situacion" value={filters.situacion} onChange={handleFilterChange} style={inputStyle}>
            {SITUACIONES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, fontSize: 13, fontWeight: 500, color: C.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <input
         type="checkbox"
         checked={filters.estado === 'Todos'}
         onChange={(e) => updateFilters({ estado: e.target.checked ? 'Todos' : 'Activo' })}
       />
       Incluir inactivos
       </label>
      </div>

      {/* ERRORES (BUG-02): nunca se muestran datos de ejemplo en su lugar */}
      {error && <ErrorBanner message={error} onRetry={() => void fetchData()} />}
      {catalogError && <ErrorBanner message="No se pudieron cargar las opciones de los filtros." onRetry={() => void loadCatalogos()} />}
      {exportError && <ErrorBanner message={exportError} onRetry={() => void handleExport()} />}

      {/* PAGINACIÓN SUPERIOR (a la izquierda) */}
      <div style={{ marginBottom: 10 }}>
        <Pager {...pagerProps} />
      </div>

      {/* CONTENEDOR UNIFICADO: SUB-BARRA + TABLA + TIMELINE */}
      <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>

        {/* SUB-BARRA: chips de todos los filtros activos a la izquierda, agrupación a la derecha */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: C.muted }}>Filtros:</span>

            {(filters.search ?? '').trim() !== '' && (
              <Chip text={`Buscar: «${(filters.search ?? '').trim()}»`} onRemove={() => updateFilters({ search: '' })} />
            )}
            {filters.cliente !== 'Todos' && (
              <Chip
                text={`Cliente: ${catalogos.clientes.find(c => String(c.id) === String(filters.cliente))?.name ?? filters.cliente}`}
                onRemove={() => updateFilters({ cliente: 'Todos' })}
              />
            )}
            {filters.proyecto !== 'Todos' && (
              <Chip
                text={`Proyecto: ${catalogos.proyectos.find(p => String(p.id) === String(filters.proyecto))?.name ?? filters.proyecto}`}
                onRemove={() => updateFilters({ proyecto: 'Todos' })}
              />
            )}
            {filters.liderNPD !== 'Todos' && (
              <Chip
                text={`Líder NPD: ${catalogos.lideres.find(l => String(l.id) === String(filters.liderNPD))?.name ?? filters.liderNPD}`}
                onRemove={() => updateFilters({ liderNPD: 'Todos' })}
              />
            )}
            {filters.rol !== 'Todos' && (
              <Chip
                text={`Rol: ${catalogos.roles.find(r => String(r.id) === String(filters.rol))?.name ?? filters.rol}`}
                onRemove={() => updateFilters({ rol: 'Todos' })}
              />
            )}
            {filters.nivel !== '' && (
              <Chip text={`Nivel: N${filters.nivel}`} onRemove={() => updateFilters({ nivel: '' })} />
            )}
            {filters.estado === 'Activo' && (
              <Chip text="Estado: Activo" onRemove={() => updateFilters({ estado: 'Todos' })} />
            )}
            {filters.situacion !== 'Todos' && (
              <Chip
                text={`Situación: ${SITUACIONES.find(s => s.value === filters.situacion)?.label ?? filters.situacion}`}
                onRemove={() => updateFilters({ situacion: 'Todos' })}
              />
            )}

            <button type="button" className="rp-btn" onClick={resetFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.link }}>
              Limpiar filtros
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {viewMode === 'roster' && (
            <span style={{ color: C.muted }}>
            {viewMode === 'roster'
              ? <>Agrupado por <strong style={{ color: C.text }}>Cliente → Proyecto</strong></>
              : <>Vista completa · <strong style={{ color: C.text }}>22 columnas</strong></>}
          </span>
            )}
            <div role="group" aria-label="Modo de vista" style={{ display: 'inline-flex', backgroundColor: C.headRow, padding: 2, borderRadius: 5, border: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => setViewMode('roster')}
                style={{
                  padding: '4px 12px',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'roster' ? C.surface : 'transparent',
                  color: viewMode === 'roster' ? C.text : C.muted,
                  boxShadow: viewMode === 'roster' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Roster
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tabla')}
                style={{
                  padding: '4px 12px',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'tabla' ? C.surface : 'transparent',
                  color: viewMode === 'tabla' ? C.text : C.muted,
                  boxShadow: viewMode === 'tabla' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Tabla
              </button>
            </div>
          </div>
        </div>

        {/* TABLA + TIMELINE */}
        {viewMode === 'roster' ? (
        <div style={{ display: 'flex', minHeight: 400 }}>

          {/* IZQUIERDA (conserva checkboxes de selección múltiple de tus compañeros) */}
          <div style={{ width: isAdmin ? 372 : 348, minWidth: isAdmin ? 372 : 348, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, padding: '0 12px', height: HEAD_H, alignItems: 'center', backgroundColor: C.headRow, borderBottom: `1px solid ${C.border}`, ...thStyle }}>
              {isAdmin && (<div><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos" /></div>)}
              <div>N° emp.</div>
              <div>Colaborador · Rol · Líder</div>
              <div style={{ textAlign: 'right' }}>Niv.</div>
            </div>

{!loading && !error && recursos.length === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
              Ningún colaborador cumple los filtros.
            </div>
          )}

            {grupos.map(({ cliente, proyecto, kind, recs }) => (
              <div key={`${cliente}||${proyecto}`}>
                <div style={{ height: ROW_H, padding: '0 12px', backgroundColor: GROUP_STYLE[kind].bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, textTransform: kind === 'normal' ? 'uppercase' : 'none', color: GROUP_STYLE[kind].color, whiteSpace: 'nowrap' }}>{cliente}</span>
                  {kind === 'normal' && (
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.link, textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proyecto}</span>
                  )}
                  {kind !== 'normal' && <span style={{ flex: 1 }} />}
                  <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
                    {countText(recs.length, undefined, page)}
                    </span>
                </div>

                {recs.map(rec => (
                  <div
                    key={rec.id}
                    className="rp-row"
                    style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, padding: '0 12px', height: ROW_H, borderBottom: `1px solid ${C.borderSoft}`, alignItems: 'center', fontSize: 13, backgroundColor: C.surface }}
                  >
                    {isAdmin && (<div><input type="checkbox" checked={selectedIds.has(rec.id)} onChange={() => toggleOne(rec.id)} aria-label={`Seleccionar ${rec.nombre}`} /></div>)}
                    <button
                      type="button"
                      className="rp-row-button"
                      onClick={() => openResourceDetail(rec)}
                      style={{ gridColumn: isAdmin ? '2 / -1' : '1 / -1', gridTemplateColumns: '62px 1fr 40px', gap: 8 }}
                    >
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700 }}>{rec.nEmpleado}</span>
                      <span style={{ display: 'block', minWidth: 0, lineHeight: 1.2 }}>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.nombre}</span>
                        <span style={{ display: 'block', color: C.muted, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.rol} · {rec.liderNPD}</span>
                      </span>
                      <span style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.muted }}>{rec.nivel}</span>
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* DERECHA: TIMELINE */}
          <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
            <div style={{ position: 'relative', minWidth: TIMELINE_MIN_W }}>

              {/* Encabezado de meses */}
              <div style={{ display: 'flex', height: HEAD_H, backgroundColor: C.headRow, borderBottom: `1px solid ${C.border}` }}>
                {MONTHS.map(m => (
                  <div key={m.label} style={{ flex: m.days, borderRight: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', ...thStyle }}>{m.label}</div>
                ))}
              </div>

              {/* Línea y etiqueta HOY */}
              {showToday && (
                <>
                  <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 2, backgroundColor: C.link, zIndex: 8, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: `${todayPct}%`, top: 6, transform: 'translateX(-50%)', backgroundColor: C.link, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 3, whiteSpace: 'nowrap', zIndex: 12, pointerEvents: 'none' }}>
                    {todayLabel}
                  </div>
                </>
              )}

              {grupos.map(({ cliente, proyecto, kind, recs }) => (
                <div key={`${cliente}||${proyecto}`}>
                  <div style={{ height: ROW_H, borderBottom: `1px solid ${C.border}`, backgroundColor: GROUP_STYLE[kind].bg, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 11, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {GROUP_STYLE[kind].msg}
                  </div>
{recs.map(rec => {
  const ext = rec as ReturnType<typeof toRecurso>;
  const bar = rec.fechaInicio ? getBar(rec.fechaInicio, rec.fechaFin, ext.indefinite) : null;
  const probation = getProbationPct(ext.probationEndDate);
  return (
    <div key={rec.id} style={{ height: ROW_H, borderBottom: `1px solid ${C.borderSoft}`, position: 'relative' }}>
      <button
        type="button"
        className="rp-timeline-row"
        onClick={() => openResourceDetail(rec)}
        aria-label={`Ver detalle de ${rec.nombre}`}
        style={{ height: '100%', display: 'flex', cursor: 'pointer' }}
      >
        {MONTHS.map(m => (<span key={m.label} style={{ display: 'block', flex: m.days, height: '100%', borderRight: `1px solid ${C.borderSoft}` }} />))}
      </button>

      {/* Capa visual: fuera del botón, no captura clics */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* Vacaciones rayadas */}
        {(ext.vacations ?? []).map((v, idx) => {
          const vStart = Math.max(new Date(v.startDate).getTime(), RANGE_START);
          const vEnd = Math.min(new Date(v.endDate).getTime(), RANGE_END);
          if (vEnd <= vStart) return null;
          const vLeft = pctInRange(vStart);
          const vWidth = Math.max(1, pctInRange(vEnd) - vLeft);
          return (
            <span
              key={idx}
              title={`Vacaciones: ${fmtDia(v.startDate)} – ${fmtDia(v.endDate)}`}
              style={{
                position: 'absolute',
                top: 6,
                left: `${vLeft}%`,
                width: `${vWidth}%`,
                height: 24,
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(11,58,122,0.14), rgba(11,58,122,0.14) 4px, transparent 4px, transparent 8px)',
                border: '1px dashed #60A5FA',
                borderRadius: 3,
                zIndex: 5,
              }}
            />
          );
        })}

        {bar && (
          <>
            <span style={{ position: 'absolute', top: 8, left: `${bar.left}%`, width: `${bar.width}%`, height: 20, backgroundColor: bar.bg, border: `1px solid ${bar.border}`, borderRadius: 3, padding: '0 8px', fontSize: 10, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'left', zIndex: 6 }}>
              {bar.label}
              {bar.marks.map(mk => (
                <span
                  key={mk.label}
                  title={`Faltan ${mk.label}`}
                  style={{ position: 'absolute', left: `${mk.pct}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(31,31,31,0.35)' }}
                />
              ))}
            </span>

            {bar.expired ? (
              <span style={{ position: 'absolute', top: 9, left: `calc(${bar.left + bar.width}% + 6px)`, backgroundColor: C.danger, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap', zIndex: 7 }}>
                Venció · confirmar
              </span>
            ) : bar.ending ? (
              <span style={{ position: 'absolute', top: 9, left: `calc(${bar.left + bar.width}% + 6px)`, backgroundColor: C.danger, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap', zIndex: 7 }}>
                D-{bar.daysLeft}
              </span>
            ) : bar.endLabel && (
              <span style={{ position: 'absolute', top: 12, left: `calc(${bar.left + bar.width}% + 8px)`, fontSize: 10, color: C.muted, whiteSpace: 'nowrap', zIndex: 6 }}>
                {bar.endLabel}
              </span>
            )}
          </>
        )}

        {/* Rombo de período de prueba (día 90) */}
        {probation && (
          <span
            title={probation.label}
            style={{
              position: 'absolute',
              top: 13,
              left: `${probation.pct}%`,
              width: 10,
              height: 10,
              backgroundColor: C.link,
              border: '1.5px solid #fff',
              transform: 'translateX(-50%) rotate(45deg)',
              zIndex: 9,
            }}
          />
        )}
      </div>
    </div>
  );
})}
              </div>
              ))}
            </div>
          </div>
        </div>
        ) : (
          /* VISTA TABLA DE 22 COLUMNAS CON NOMBRE FIJO */
          <div style={{ overflowX: 'auto', minHeight: 400 }}>
{!loading && !error && recursos.length === 0 && (
  <div style={{ padding: '28px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
    Ningún colaborador cumple los filtros.
  </div>
)}
            {!loading && recursos.length > 0 && (
              <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ height: HEAD_H, backgroundColor: C.headRow, borderBottom: `1px solid ${C.border}`, ...thStyle }}>
                    {isAdmin && (
                      <th style={{ position: 'sticky', left: 0, zIndex: 12, backgroundColor: C.headRow, padding: '0 10px', width: 36, textAlign: 'center', borderRight: `1px solid ${C.borderSoft}` }}>
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos" />
                      </th>
                    )}
                    {TABLE_COLUMNS.map(col => {
                      const isStickyName = col.key === 'nombre';
                      const stickyLeft = isAdmin ? 36 : 0;
                      return (
                        <th
                          key={col.key}
                          style={{
                            minWidth: col.width,
                            padding: '0 12px',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            borderRight: `1px solid ${C.borderSoft}`,
                            ...(isStickyName
                              ? { position: 'sticky', left: stickyLeft, zIndex: 11, backgroundColor: C.headRow, boxShadow: '2px 0 4px rgba(0,0,0,0.05)' }
                              : {}),
                          }}
                        >
                          {col.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {recursos.map(rec => {
                    const ext = rec as RecursoExt;
                    return (
                      <tr key={rec.id} className="rp-row" style={{ height: ROW_H, borderBottom: `1px solid ${C.borderSoft}`, backgroundColor: C.surface }}>
                        {isAdmin && (
                          <td style={{ position: 'sticky', left: 0, zIndex: 9, backgroundColor: 'inherit', padding: '0 10px', textAlign: 'center', borderRight: `1px solid ${C.borderSoft}` }}>
                            <input type="checkbox" checked={selectedIds.has(rec.id)} onChange={() => toggleOne(rec.id)} aria-label={`Seleccionar ${rec.nombre}`} />
                          </td>
                        )}
                        {TABLE_COLUMNS.map(col => {
                          const isStickyName = col.key === 'nombre';
                          const stickyLeft = isAdmin ? 36 : 0;
                          return (
                            <td
                              key={col.key}
                              onClick={() => openResourceDetail(rec)}
                              style={{
                                minWidth: col.width,
                                maxWidth: col.width,
                                padding: '0 12px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer',
                                borderRight: `1px solid ${C.borderSoft}`,
                                fontWeight: isStickyName ? 600 : 400,
                                ...(isStickyName
                                  ? { position: 'sticky', left: stickyLeft, zIndex: 8, backgroundColor: C.surface, boxShadow: '2px 0 4px rgba(0,0,0,0.05)' }
                                  : {}),
                              }}
                            >
                              {col.getValue(ext)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* CA-14 */}
      {isAdmin && selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: '#2B1810', color: 'white', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, marginRight: 4 }}>{selectedIds.size} seleccionados</span>
          <button
            type="button"
            className="rp-btn-primary"
            disabled
            title="Disponible en HU-08"
            style={{ height: 34, padding: '0 14px', border: 'none', background: C.primary, color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}
          >
            Asignar a proyecto…
          </button>
          <button
            type="button"
            disabled
            title="Disponible en HU-08"
            style={{ height: 34, padding: '0 14px', border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}
          >
            Quitar de proyecto
          </button>
          <button
            type="button"
            className="rp-btn"
            disabled={exporting}
            onClick={() => void handleExportSelected()}
            style={{ height: 34, padding: '0 14px', border: '1px solid rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.12)', color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} /> {exporting ? 'Exportando…' : 'Exportar selección'}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, marginLeft: 4 }}
          >
            Limpiar selección
          </button>
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

/** «26–50 de 112 colaboradores» */
function pageRangeText(page: number, shown: number, total: number): string {
  if (total === 0 || shown === 0) return `0 de ${total} colaboradores`;
  const first = (page - 1) * PAGE_SIZE + 1;
  return `${first}–${first + shown - 1} de ${total} colaboradores`;
}

const pagerBtn = (disabled: boolean): CSSProperties => ({
  height: 30, width: 30, padding: 0, border: 'none', background: 'none',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  color: disabled ? '#C4C4C4' : C.text, cursor: disabled ? 'not-allowed' : 'pointer',
});

interface PagerProps {
  page: number;
  totalPages: number;
  shown: number;
  total: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  showRange?: boolean;
}

/** Botones Atrás / Siguiente + rango; se usa arriba y abajo de la tabla, alineado a la izquierda */
const Pager = ({ page, totalPages, shown, total, loading, onPrev, onNext, showRange = true }: PagerProps) => {
  const prevOff = page <= 1 || loading;
  const nextOff = page >= totalPages || loading;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, fontSize: 12, color: C.muted }}>
      <button type="button" className="rp-btn" aria-label="Página anterior" disabled={prevOff} onClick={onPrev} style={pagerBtn(prevOff)}><ChevronLeft size={20} strokeWidth={2.5} /></button>
      <button type="button" className="rp-btn" aria-label="Página siguiente" disabled={nextOff} onClick={onNext} style={pagerBtn(nextOff)}><ChevronRight size={20} strokeWidth={2.5} /></button>
      {showRange && <strong style={{ color: C.text }}>{pageRangeText(page, shown, total)}</strong>}
      {showRange && <span>·</span>}
      <span>Página {Math.min(page, Math.max(totalPages, 1))} de {Math.max(totalPages, 1)}</span>
    </div>
  );
};

const Chip = ({ text, onRemove }: { text: string; onRemove: () => void }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.chipBg, color: C.link, borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
    {text}
    <button type="button" onClick={onRemove} title={`Quitar filtro ${text}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.link, padding: 0, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>×</button>
  </span>
);

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