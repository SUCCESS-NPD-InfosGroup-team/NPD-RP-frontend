// src/pages/Recursos/RecursosPage.tsx

import { useState, useEffect } from 'react';
import { RecursosGantt } from '../../components/recursos/RecursosGantt';
import type { Filters, Recurso } from '../../types';
import { searchRecursos } from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// CA-05: Función para ignorar mayúsculas y acentos
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export const RecursosPage = () => {
  const [viewMode, setViewMode] = useState<'tabla' | 'gantt'>('gantt');
  
  // Estados para la data que viene de la API
  const [recursosApi, setRecursosApi] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros (CA-10: Por defecto Estado = Activo)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    cliente: 'Todos',
    proyecto: 'Todos',
    liderNPD: 'Todos',
    rol: 'Todos',
    nivel: 'Todos',
    estado: 'Activo',
  });

  // 🚨 MOCK TEMPORAL (BORRAR CUANDO CONECTES LA API REAL)
  const mockRecursos: Recurso[] = [
    { id: '1', nEmpleado: '1045', nombre: 'Ana Torres', rol: 'Developer', cliente: 'COPA', proyecto: 'Proyecto Alpha', liderNPD: 'Lorena Batista', nivel: 'N3', estado: 'Activo', fechaInicio: '2026-01-01', fechaFin: '2026-12-31' },
    { id: '2', nEmpleado: '1046', nombre: 'Peña', rol: 'Tester', cliente: 'BANESCO', proyecto: 'Proyecto Beta', liderNPD: 'Ricardo Him', nivel: 'N2', estado: 'Activo', fechaInicio: '2026-02-01', fechaFin: '2026-11-30' },
  ];

  // Efecto para llamar a la API cuando cambian los filtros o la página
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const cleanFilters = { ...filters };
        Object.keys(cleanFilters).forEach(key => {
          if (cleanFilters[key as keyof Filters] === 'Todos') {
            cleanFilters[key as keyof Filters] = '';
          }
        });

        const res = await searchRecursos(cleanFilters, currentPage, 25);
        setRecursosApi(res.data);
        setTotalPages(res.totalPages);
      } catch (error) {
        console.error("Error cargando recursos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters, currentPage]);

  // Función para manejar cambios en los filtros
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setCurrentPage(1);
  };

  // Función para quitar un filtro individual (CA-04)
  const removeFilter = (key: keyof Filters) => {
    setFilters({ ...filters, [key]: key === 'estado' ? 'Activo' : 'Todos' });
    setCurrentPage(1);
  };

  // Limpiar todos los filtros
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

  // Calculamos los filtros activos para las etiquetas (CA-04)
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search' && value !== '') return true;
    if (key === 'estado' && value !== 'Activo' && value !== 'Todos') return true;
    if (value !== 'Todos' && key !== 'search' && key !== 'estado') return true;
    return false;
  });

  // Lógica de filtrado local (CA-05) - APLICA AL MOCK
  const recursosFiltrados = (recursosApi.length > 0 ? recursosApi : mockRecursos).filter((r) => {
    // Usamos || '' para solucionar el error de TypeScript con los campos opcionales
    const searchTxt = filters.search || '';
    
    const matchSearch =
      searchTxt === '' ||
      normalizeText(r.nombre).includes(normalizeText(searchTxt)) ||
      normalizeText(r.nEmpleado).includes(normalizeText(searchTxt)) ||
      normalizeText(r.proyecto).includes(normalizeText(searchTxt));

    const matchCliente = filters.cliente === 'Todos' || !filters.cliente || r.cliente === filters.cliente;
    const matchProyecto = filters.proyecto === 'Todos' || !filters.proyecto || r.proyecto === filters.proyecto;
    const matchLider = filters.liderNPD === 'Todos' || !filters.liderNPD || r.liderNPD === filters.liderNPD;
    const matchRol = filters.rol === 'Todos' || !filters.rol || r.rol === filters.rol;
    const matchNivel = filters.nivel === 'Todos' || !filters.nivel || r.nivel === filters.nivel;
    const matchEstado = filters.estado === 'Todos' || !filters.estado || r.estado === filters.estado;

    return matchSearch && matchCliente && matchProyecto && matchLider && matchRol && matchNivel && matchEstado;
  });

  // Exportar a Excel
  const handleExport = () => {
    const dataToExport = recursosFiltrados.map((r) => ({
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

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recursos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `Recursos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header de la página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Recursos</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {recursosFiltrados.length} colaboradores mostrados en esta página.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setViewMode('tabla')}
            style={{ padding: '8px 16px', border: '1px solid #ddd', background: viewMode === 'tabla' ? '#E85D04' : 'white', color: viewMode === 'tabla' ? 'white' : '#333', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Tabla
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            style={{ padding: '8px 16px', border: '1px solid #ddd', background: viewMode === 'gantt' ? '#E85D04' : 'white', color: viewMode === 'gantt' ? 'white' : '#333', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Gantt
          </button>
          <button onClick={handleExport} style={{ padding: '8px 16px', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            📥 Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
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
          <select name="cliente" value={filters.cliente} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Cliente: Todos</option>
            <option value="BANESCO">BANESCO</option>
            <option value="CAJA DE AHORROS">CAJA DE AHORROS</option>
            <option value="COPA">COPA</option>
          </select>
          <select name="proyecto" value={filters.proyecto} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Proyecto: Todos</option>
            <option value="Proyecto Alpha">Proyecto Alpha</option>
            <option value="Proyecto Beta">Proyecto Beta</option>
          </select>
          <select name="liderNPD" value={filters.liderNPD} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Líder: Todos</option>
            <option value="Lorena Batista">Lorena Batista</option>
            <option value="Ricardo Him">Ricardo Him</option>
            <option value="Yaritza Castillo">Yaritza Castillo</option>
          </select>
          <select name="rol" value={filters.rol} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Rol: Todos</option>
            <option value="Developer">Developer</option>
            <option value="Tester">Tester</option>
          </select>
          <select name="nivel" value={filters.nivel} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Nivel: Todos</option>
            <option value="N2">N2</option>
            <option value="N3">N3</option>
          </select>
          <select name="estado" value={filters.estado} onChange={handleFilterChange} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <option value="Todos">Estado: Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <button
            onClick={clearAllFilters}
            style={{ padding: '8px 16px', border: 'none', background: '#F5F5F5', borderRadius: '4px', cursor: 'pointer' }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* CA-04: Etiquetas de filtros activos */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {activeFilters.map(([key, value]) => (
            <span key={key} style={{ 
              backgroundColor: '#FFF3E0', 
              color: '#E85D04', 
              border: '1px solid #FFB74D', 
              padding: '4px 10px', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '13px',
              fontWeight: 'bold'
            }}>
              {key === 'search' ? 'Búsqueda' : key}: {value}
              <button 
                onClick={() => removeFilter(key as keyof Filters)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#E85D04', 
                  fontWeight: 'bold',
                  padding: '0 2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Vista: Gantt o Tabla */}
      {viewMode === 'gantt' ? (
        <RecursosGantt recursos={recursosFiltrados} />
      ) : (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '15px' }}>Listado de Recursos</h3>
          
          {loading ? (
             <p>Cargando recursos...</p>
          ) : recursosFiltrados.length === 0 ? (
             /* CA-03: EMPTY STATE */
             <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #ddd', borderRadius: '8px' }}>
                <h3>¡Ningún recurso coincide con tu búsqueda!</h3>
                <button onClick={clearAllFilters} style={{ marginTop: '10px', padding: '8px 16px', background: '#E85D04', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Limpiar búsqueda
                </button>
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
                </tr>
              </thead>
              <tbody>
                {recursosFiltrados.map((rec) => (
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
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                        {rec.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* CA-06: Paginación */}
          {!loading && recursosFiltrados.length > 0 && (
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
    </div>
  );
};