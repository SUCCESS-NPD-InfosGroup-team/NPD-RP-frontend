// src/pages/Recursos/RecursosPage.tsx

import { useState, useEffect, lazy, Suspense } from 'react';
import type { Filters, Recurso, RecursoApi } from '../../types';
import { searchRecursos } from '../../services/api';
import { EditarRecursoModal } from '../../components/recursos/EditarRecursoModal';

// BUG-26: Importación dinámica (Lazy) para bajar el peso del bundle
const RecursosGantt = lazy(() => 
  import('../../components/recursos/RecursosGantt').then(m => ({ default: m.RecursosGantt }))
);

const BTN_TOGGLE_BASE = { padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' as const };
const BTN_TOGGLE_ACTIVE = { ...BTN_TOGGLE_BASE, background: '#E85D04', color: 'white' };
const BTN_TOGGLE_INACTIVE = { ...BTN_TOGGLE_BASE, background: 'white', color: '#333' };

export const RecursosPage = () => {
  const [viewMode, setViewMode] = useState<'tabla' | 'gantt'>('gantt');
  
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recursoAEditar, setRecursoAEditar] = useState<Recurso | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    cliente: 'Todos',
    proyecto: 'Todos',
    liderNPD: 'Todos',
    rol: 'Todos',
    nivel: 'Todos',
    estado: 'Activo', // CA-10
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchRecursos(filters, currentPage, 25);
      
      const mappedItems: Recurso[] = res.items.map((item: RecursoApi) => ({
        id: item.id.toString(),
        nEmpleado: item.employeeNumber || 'N/A',
        nombre: item.name || 'Sin nombre',
        rol: item.clientRole || 'Sin rol',
        cliente: item.client?.name || 'No especificado',
        proyecto: item.project?.name || 'Sin proyecto',
        liderNPD: item.leader?.name || 'Sin líder',
        nivel: `N${item.level}`,
        estado: item.status === 'ACTIVO' ? 'Activo' : item.status === 'LICENCIA' ? 'Licencia' : 'Inactivo',
        fechaInicio: item.startDate || '',
        fechaFin: item.endDate || '',
        version: item.version
      }));

      setRecursos(mappedItems);
      setTotalPages(res.totalPages || 1);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al cargar los recursos.';
      setError(msg);
      setRecursos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchData();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      cliente: 'Todos',
      proyecto: 'Todos',
      liderNPD: 'Todos',
      rol: 'Todos',
      nivel: 'Todos',
      estado: 'Activo',
    });
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      const res = await searchRecursos(filters, 1, 10000);
      
      const dataToExport = res.items.map((r) => ({
        'N° Empleado': r.employeeNumber,
        Colaborador: r.name,
        Rol: r.clientRole || 'N/A',
        Cliente: r.client?.name || 'No especificado',
        Proyecto: r.project?.name || 'Sin proyecto',
        'Líder NPD': r.leader?.name || 'Sin líder',
        Nivel: `N${r.level}`,
        Estado: r.status,
        'Fecha Inicio': r.startDate,
        'Fecha Fin': r.endDate,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Recursos');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      saveAs(blob, `Recursos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch {
      alert('Hubo un error al exportar los datos.');
    }
  };

  const handleSaveEdit = () => {
    fetchData();
    setRecursoAEditar(null);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Recursos</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {loading ? 'Cargando...' : `${recursos.length} colaboradores mostrados en esta página.`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setViewMode('tabla')} style={viewMode === 'tabla' ? BTN_TOGGLE_ACTIVE : BTN_TOGGLE_INACTIVE}>
            Tabla
          </button>
          <button onClick={() => setViewMode('gantt')} style={viewMode === 'gantt' ? BTN_TOGGLE_ACTIVE : BTN_TOGGLE_INACTIVE}>
            Gantt
          </button>
          <button onClick={handleExport} style={{ padding: '8px 16px', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            📥 Exportar
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            name="search"
            placeholder="Buscar por nombre, N° empleado, proyecto..."
            value={filters.search}
            onChange={handleFilterChange}
            style={{ flex: 2, minWidth: '250px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <select name="estado" value={filters.estado} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Activo">Activo (Incluye Licencia)</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Todos">Todos</option>
          </select>
          <button onClick={clearAllFilters} style={{ padding: '8px 16px', border: 'none', background: '#F5F5F5', borderRadius: '4px', cursor: 'pointer' }}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button onClick={fetchData} style={{ padding: '6px 12px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Reintentar
          </button>
        </div>
      )}

      {viewMode === 'gantt' ? (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Cargando vista Gantt...</div>}>
          <RecursosGantt recursos={recursos} />
        </Suspense>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '15px' }}>Listado de Recursos</h3>
          
          {loading ? (
             <p>Cargando recursos desde el servidor...</p>
          ) : recursos.length === 0 && !error ? (
             <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #ddd', borderRadius: '8px' }}>
                <h3>¡Ningún recurso coincide con tu búsqueda!</h3>
             </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>N° EMP.</th>
                  <th style={{ padding: '10px' }}>Colaborador</th>
                  <th style={{ padding: '10px' }}>Cliente - Proyecto</th>
                  <th style={{ padding: '10px' }}>Líder NPD</th>
                  <th style={{ padding: '10px' }}>Nivel</th>
                  <th style={{ padding: '10px' }}>Estado</th>
                  <th style={{ padding: '10px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recursos.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{rec.nEmpleado}</td>
                    <td style={{ padding: '10px' }}>
                      <strong>{rec.nombre}</strong>
                      <br />
                      <span style={{ fontSize: '12px', color: '#666' }}>{rec.rol}</span>
                    </td>
                    <td style={{ padding: '10px' }}>{rec.cliente} — {rec.proyecto}</td>
                    <td style={{ padding: '10px' }}>{rec.liderNPD}</td>
                    <td style={{ padding: '10px' }}>{rec.nivel}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ backgroundColor: rec.estado === 'Activo' ? '#e0f2fe' : '#f3f4f6', color: rec.estado === 'Activo' ? '#0369a1' : '#374151', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                        {rec.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button onClick={() => setRecursoAEditar(rec)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} title="Editar recurso">
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && recursos.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '6px 12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
                Anterior
              </button>
              <span>Página <strong>{currentPage}</strong> de {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '6px 12px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {recursoAEditar && (
        <EditarRecursoModal 
          recurso={recursoAEditar} 
          onClose={() => setRecursoAEditar(null)} 
          onSave={handleSaveEdit} 
        />
      )}
    </div>
  );
};