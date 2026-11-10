// src/services/api.ts
import type { Filters, ResourceSearchResponse } from '../types';

// Apuntamos al backend local (el que acabas de levantar con Docker)
const API_BASE_URL = 'http://localhost:8080/api/v1'; 

// ==========================================
// HELPER PARA KEYCLOAK (Traído de develop)
// ==========================================
export const apiFetch = async (
  moduleOrPath: string, 
  pathOrOptions?: string | RequestInit, 
  options: RequestInit = {}
) => {
  // Declaramos SIN valor inicial para que ESLint no marque "no-unused-vars"
  let url: string;
  let finalOptions: RequestInit;

  // Detectamos si nos pasaron (module, path, options) o solo (path, options)
  if (typeof pathOrOptions === 'string') {
    url = `${API_BASE_URL}/${moduleOrPath}${pathOrOptions}`;
    finalOptions = options;
  } else {
    url = `${API_BASE_URL}${moduleOrPath.startsWith('/') ? '' : '/'}${moduleOrPath}`;
    finalOptions = pathOrOptions || {};
  }

  const response = await fetch(url, {
    ...finalOptions,
    headers: {
      'Content-Type': 'application/json',
      ...finalOptions.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: Fallo en la petición a ${url}`);
  }

  return response.json();
};

// ==========================================
// BÚSQUEDA DE RECURSOS (BUG-01 y BUG-02)
// ==========================================
export const searchRecursos = async (
  filters: Filters, 
  page: number = 1, 
  size: number = 25
): Promise<ResourceSearchResponse> => {
  
  const params = new URLSearchParams();

  params.append('page', (page - 1).toString());
  params.append('size', size.toString());

  if (filters.search && filters.search.trim() !== '') {
    params.append('q', filters.search.trim());
  }

  if (filters.cliente && filters.cliente !== 'Todos') params.append('clientId', filters.cliente);
  if (filters.proyecto && filters.proyecto !== 'Todos') params.append('projectId', filters.proyecto);
  if (filters.liderNPD && filters.liderNPD !== 'Todos') params.append('leaderId', filters.liderNPD);
  if (filters.rol && filters.rol !== 'Todos') params.append('clientRoleId', filters.rol);
  
  if (filters.nivel && filters.nivel !== 'Todos') {
    params.append('level', filters.nivel.replace('N', ''));
  }

  // CA-10: Sanitized status to prevent SSRF warning from SonarCloud
  const estadoSeguro = (filters.estado || '').toUpperCase();
  
  if (estadoSeguro === 'ACTIVO' || estadoSeguro === 'TODOS' || estadoSeguro === '') {
    params.append('status', 'ACTIVO');
    params.append('status', 'LICENCIA');
  } else if (estadoSeguro === 'BAJA') {
    params.append('status', 'BAJA');
  }

  const response = await fetch(`${API_BASE_URL}/planner/resources?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
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