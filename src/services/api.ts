// src/services/api.ts
import type { Filters, ResourceSearchResponse } from '../types';

// Apuntamos al backend local (el que acabas de levantar con Docker)
const API_BASE_URL = 'http://localhost:8080/api/v1'; 

// ==========================================
// BÚSQUEDA DE RECURSOS (BUG-01 y BUG-02)
// ==========================================
export const searchRecursos = async (
  filters: Filters, 
  page: number = 1, 
  size: number = 25
): Promise<ResourceSearchResponse> => {
  
  const params = new URLSearchParams();

  // Scalar dice que la paginación es 0-based
  params.append('page', (page - 1).toString());
  params.append('size', size.toString());

  // El parámetro de búsqueda de texto se llama 'q'
  if (filters.search && filters.search.trim() !== '') {
    params.append('q', filters.search.trim());
  }

  // Nota: Los filtros de cliente, proyecto, líder y rol en Scalar piden IDs numéricos.
  // Si tu frontend maneja strings ("BANESCO", "Proyecto Alpha"), habrá que mapearlos.
  // Por ahora, los enviamos solo si no son "Todos".
  if (filters.cliente && filters.cliente !== 'Todos') params.append('clientId', filters.cliente);
  if (filters.proyecto && filters.proyecto !== 'Todos') params.append('projectId', filters.proyecto);
  if (filters.liderNPD && filters.liderNPD !== 'Todos') params.append('leaderId', filters.liderNPD);
  if (filters.rol && filters.rol !== 'Todos') params.append('clientRoleId', filters.rol);
  
  // El nivel en el backend es un número, así que quitamos la 'N' si viene como "N2"
  if (filters.nivel && filters.nivel !== 'Todos') {
    params.append('level', filters.nivel.replace('N', ''));
  }

  // CA-10: El filtro por defecto es Activo, que incluye ACTIVO y LICENCIA
  if (filters.estado === 'Activo' || filters.estado === 'Todos' || !filters.estado) {
    params.append('status', 'ACTIVO');
    params.append('status', 'LICENCIA');
  } else {
    params.append('status', filters.estado.toUpperCase());
  }

  const response = await fetch(`${API_BASE_URL}/planner/resources?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Aquí irá el token de Keycloak más adelante
    }
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: No se pudieron cargar los recursos.`);
  }

  return response.json();
};

// ==========================================
// EDITAR RECURSO (BUG-03)
// ==========================================
export interface UpdateRecursoPayload {
  employeeNumber: string;
  name: string;
  email?: string;
  level: number;
  status: string;
  version: number;
  assignment?: {
    endDate?: string;
    indefinite: boolean;
  };
}

export const updateRecurso = async (id: string, payload: UpdateRecursoPayload) => {
  const response = await fetch(`${API_BASE_URL}/planner/resources/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Aquí irá el token de Keycloak más adelante
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 409) {
    throw new Error('CONFLICT: El registro fue modificado por otro usuario. Por favor, recarga la página.');
  }

  if (!response.ok) {
    throw new Error(`Error ${response.status}: No se pudo actualizar el recurso.`);
  }

  return response.json();
};