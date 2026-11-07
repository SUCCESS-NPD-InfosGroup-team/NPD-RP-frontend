// src/pages/Recursos/RecursosPage.tsx

import { useState, useEffect } from 'react';
import { RecursosGantt } from '../../components/recursos/RecursosGantt';
import type { Filters, Recurso } from '../../types';
import { searchRecursos } from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { EditarRecursoModal } from '../../components/recursos/EditarRecursoModal';

// 🛠️ Estilos extraídos para SonarCloud
const BTN_TOGGLE_BASE = { padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' as const };
const BTN_TOGGLE_ACTIVE = { ...BTN_TOGGLE_BASE, background: '#E85D04', color: 'white' };
const BTN_TOGGLE_INACTIVE = { ...BTN_TOGGLE_BASE, background: 'white', color: '#333' };

// Tipado estricto basado en el contrato OpenAPI (BUG-07)
interface ApiResponse {
  items: Recurso[];
  groups: unknown[];
  page: number;
  totalPages?: number; 
}

export const RecursosPage = () => {
  const [viewMode, setViewMode] = useState<'tabla' | 'gantt'>('gantt');
  
  // Estados para la data real
  const [recursosApi, setRecursosApi] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // NUEVO: BUG-02
  
  // La API usa paginación 0-based (BUG-01)
  const [currentPage, setCurrentPage] = useState(0); 
  const [totalPages, setTotalPages] = useState(0); 
  
  const [recursoAEditar, setRecursoAEditar] = useState<Recurso | null>(null);

  // Filtros
  const [filters, setFilters] = useState<Filters>({
    search: '',
    cliente: 'Todos',
    proyecto: 'Todos',
    liderNPD: 'Todos',
    rol: 'Todos',
    nivel: 'Todos',
    estado: 'ACTIVO', // Valor por defecto según el backend
  });

  // Efecto para cargar los recursos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null); // Limpiamos error al reintentar
      try {
        const apiParams = {
          q: filters.search || undefined,
          clientId: filters.cliente !== 'Todos' ? filters.cliente : undefined,
          projectId: filters.proyecto !== 'Todos' ? filters.proyecto : undefined,
          leaderId: filters.liderNPD !== 'Todos' ? filters.liderNPD : undefined,
          clientRoleId: filters.rol !== 'Todos' ? filters.rol : undefined,
          level: filters.nivel !== 'Todos' ? filters.nivel : undefined,
          status: filters.estado !== 'Todos' ? filters.estado : undefined,
        };

        // Forzamos el tipo para evitar errores de TS (BUG-07)
        const res = (await searchRecursos(apiParams, currentPage, 25)) as unknown as ApiResponse;
        
        setRecursosApi(res.items || []);
        setTotalPages(res.totalPages || res.page || 1); 
      } catch {
        // BUG-02: Mostrar error y no datos falsos
        setError("Ocurrió un error al cargar los recursos. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters, currentPage]);

  // TODO Backend: Cargar las opciones de filtros reales cuando los endpoints estén listos
  /*
  useEffect(() => {
    // fetchClientes().then(setOpcionesClientes);
    // fetchLideres().then(setOpcionesLideres);
  }, []);
  */

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(0); 
  };

  const removeFilter = (key: keyof Filters) => {
    setFilters({ ...filters, [key]: key === 'estado' ? 'ACTIVO' : 'Todos' });
    setCurrentPage(0);
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      cliente: 'Todos',
      proyecto: 'Todos',
      liderNPD: 'Todos',
      rol: 'Todos',
      nivel: 'Todos',
      estado: 'ACTIVO',
    });
    setCurrentPage(0);
  };

  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search' && value !== '') return true;
    if (key === 'estado' && value !== 'ACTIVO' && value !== 'Todos') return true;
    if (value !== 'Todos' && key !== 'search' && key !== 'estado') return true;
    return false;
  });

  const recursosFiltrados = recursosApi;

  // BUG-06: Exportar TODOS los datos que coincidan con los filtros
  const handleExport = async () => {
    try {
      setLoading(true);
      // Hacemos una llamada a la API pidiendo un size grande para traer todo
      const apiParams = {
        q: filters.search || undefined,
        clientId: filters.cliente !== 'Todos' ? filters.cliente : undefined,
        projectId: filters.proyecto !== 'Todos' ? filters.proyecto : undefined,
        leaderId: filters.liderNPD !== 'Todos' ? filters.liderNPD : undefined,
        clientRoleId: filters.rol !== 'Todos' ? filters.rol : undefined,
        level: filters.nivel !== 'Todos' ? filters.nivel : undefined,
        status: filters.estado !== 'Todos' ? filters.estado : undefined,
      };
      
      // Pedimos 1000 registros (o el máximo que permita el backend) para la exportación
      const res = (await searchRecursos(apiParams, 0, 1000)) as unknown as ApiResponse;
      const dataToExport = res.items || [];

      const excelData = dataToExport.map((r) => ({
        'N° Empleado': r.nEmpleado,
        Colaborador: r.nombre,
        Rol: r.rol,
        Cliente: r.cliente,
        Proyecto: r.proyecto,
        'Líder NPD': r.liderNPD,
        Nivel: r.nivel,
        Estado: r.estado,
        'Fecha Inicio': r.fechaInicio,
        'Fecha Fin': r.fechaFin,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Recursos');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `Recursos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch {
      alert("Error al exportar los recursos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (recurso: Recurso) => {
    setRecursoAEditar(recurso);
  };

  const handleSaveEdit = (recursoActualizado: Recurso) => {
    setRecursosApi(prev => prev.map(r => r.id === recursoActualizado.id ? recursoActualizado : r));
    setRecursoAEditar(null);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Recursos</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {recursosFiltrados.length} colaboradores mostrados en esta página.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setViewMode('tabla')} style={viewMode === 'tabla' ? BTN_TOGGLE_ACTIVE : BTN_TOGGLE_INACTIVE}>Tabla</button>
          <button onClick={() => setViewMode('gantt')} style={viewMode === 'gantt' ? BTN_TOGGLE_ACTIVE : BTN_TOGGLE_INACTIVE}>Gantt</button>
          <button onClick={handleExport} disabled={loading} style={{ padding: '8px 16px', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            📥 Exportar
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input type="text" name="search" placeholder="Buscar..." value={filters.search} onChange={handleFilterChange} style={{ flex: 2, minWidth: '250px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }} />
          
          <select name="cliente" value={filters.cliente} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Cliente: Todos</option>
            <option value="1">BANESCO</option>
            <option value="2">CAJA DE AHORROS</option>
          </select>
          
          <select name="proyecto" value={filters.proyecto} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Proyecto: Todos</option>
            <option value="1">Proyecto Alpha</option>
            <option value="2">Proyecto Beta</option>
          </select>
          
          <select name="liderNPD" value={filters.liderNPD} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Líder: Todos</option>
            <option value="1">Lorena Batista</option>
            <option value="2">Ricardo Him</option>
          </select>
          
          <select name="rol" value={filters.rol} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Rol: Todos</option>
            <option value="1">Developer</option>
            <option value="2">Tester</option>
          </select>
          
          <select name="nivel" value={filters.nivel} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Nivel: Todos</option>
            <option value="N1">N1</option>
            <option value="N2">N2</option>
            <option value="N3">N3</option>
            <option value="N4">N4</option>
          </select>
          
          <select name="estado" value={filters.estado} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Estado: Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="LICENCIA">Licencia</option>
            <option value="BAJA">Baja</option>
          </select>
          
          <button onClick={clearAllFilters} style={{ padding: '8px 16px', border: 'none', background: '#F5F5F5', borderRadius: '4px', cursor: 'pointer' }}>Limpiar filtros</button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {activeFilters.map(([key, value]) => (
            <span key={key} style={{ backgroundColor: '#FFF3E0', color: '#E85D04', border: '1px solid #FFB74D', padding: '4px 10px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
              {key === 'search' ? 'Búsqueda' : key}: {value}
              <button onClick={() => removeFilter(key as keyof Filters)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E85D04', fontWeight: 'bold', padding: '0 2px', display: 'flex', alignItems: 'center' }}>✕</button>
            </span>
          ))}
        </div>
      )}

      {viewMode === 'gantt' ? (
        <RecursosGantt recursos={recursosFiltrados} />
      ) : (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '15px' }}>Listado de Recursos</h3>
          
          {loading ? (
             <p>Cargando recursos...</p>
          ) : error ? ( 
             // BUG-02: UI de Error con botón Reintentar
             <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #f87171', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                <h3 style={{ color: '#b91c1c' }}>¡Ups! Algo salió mal</h3>
                <p style={{ color: '#7f1d1d', marginBottom: '15px' }}>{error}</p>
                <button onClick={() => setFilters({...filters})} style={{ padding: '8px 16px', background: '#E85D04', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Reintentar
                </button>
             </div>
          ) : recursosFiltrados.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #ddd', borderRadius: '8px' }}>
                <h3>¡Ningún recurso coincide con tu búsqueda!</h3>
                <button onClick={clearAllFilters} style={{ marginTop: '10px', padding: '8px 16px', background: '#E85D04', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Limpiar búsqueda</button>
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
                {recursosFiltrados.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{rec.nEmpleado}</td>
                    <td style={{ padding: '10px' }}>
                      <strong>{rec.nombre}</strong><br />
                      <span style={{ fontSize: '12px', color: '#666' }}>{rec.rol}</span>
                    </td>
                    <td style={{ padding: '10px' }}>{rec.cliente} — {rec.proyecto}</td>
                    <td style={{ padding: '10px' }}>{rec.liderNPD}</td>
                    <td style={{ padding: '10px' }}>{rec.nivel}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>{rec.estado}</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button onClick={() => handleEditClick(rec)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} title="Editar recurso">✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && !error && totalPages > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '6px 12px', cursor: currentPage === 0 ? 'not-allowed' : 'pointer' }}>Anterior</button>
              <span>Página <strong>{currentPage + 1}</strong> de {totalPages}</span>
              <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '6px 12px', cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer' }}>Siguiente</button>
            </div>
          )}
        </div>
      )}

      {recursoAEditar && (
        <EditarRecursoModal recurso={recursoAEditar} onClose={() => setRecursoAEditar(null)} onSave={handleSaveEdit} />
      )}
    </div>
  );
};