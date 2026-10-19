// src/services/api.ts
import type { Filters, Recurso } from '../types';

// TODO: Reemplaza esto con la URL real de Francisco cuando te la dé.
// Por ahora asumimos que es localhost:8080/api
const API_BASE_URL = 'http://localhost:8080/api'; 

export const searchRecursos = async (
  filters: Filters, 
  page: number = 1, 
  limit: number = 25
): Promise<{ data: Recurso[], totalPages: number }> => {
  
  // Limpiamos los filtros que estén vacíos para no enviar basura en la URL
  const cleanFilters = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
  );

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...cleanFilters,
  }).toString();

  // Hacemos la petición al endpoint (asumimos que es /resources)
  const response = await fetch(`${API_BASE_URL}/resources?${queryParams}`);

  if (!response.ok) {
    throw new Error('Error al buscar recursos');
  }

  // NOTA: Asegúrate de cómo devuelve los datos Francisco. 
  // A veces el backend devuelve { content: [...], totalPages: 5 }
  // Si es así, tendrás que ajustar esta parte.
  const json = await response.json();
  
  return {
    data: json.data || json, // Asume que devuelve un array directo o dentro de 'data'
    totalPages: json.totalPages || 1,
  };
};