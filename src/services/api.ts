// src/services/api.ts
import type { Recurso } from '../types';

const API_BASE_URL = 'http://localhost:8080/api/v1'; // Ajustado según el contrato del backend

// Tipado estricto según el contrato OpenAPI (BUG-01 y BUG-07)
export interface SearchRecursosParams {
  q?: string;
  clientId?: string;
  projectId?: string;
  leaderId?: string;
  clientRoleId?: string;
  level?: string;
  status?: string;
}

export interface ResourceSearchResponse {
  items: Recurso[];
  groups: unknown[];
  page: number;
  totalPages?: number; // A veces viene, a veces no.
}

export const searchRecursos = async (
  filters: SearchRecursosParams, 
  page: number = 0, // 0-based según el backend
  size: number = 25
): Promise<ResourceSearchResponse> => {
  
  // Limpiamos los filtros que estén vacíos o undefined
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter((entry) => entry[1] !== undefined && entry[1] !== '' && entry[1] !== 'Todos')
  );

  // Mapeamos page y size correctamente
  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    ...cleanFilters,
  }).toString();

  // Endpoint correcto según el ticket
  const response = await fetch(`${API_BASE_URL}/planner/resources?${queryParams}`);

  if (!response.ok) {
    throw new Error('Error al buscar recursos');
  }

  // Retornamos la estructura real { items, groups, page }
  const json = await response.json();
  
  return {
    items: json.items || [],
    groups: json.groups || [],
    page: json.page || 0,
    totalPages: json.totalPages || json.page || 1
  };
};