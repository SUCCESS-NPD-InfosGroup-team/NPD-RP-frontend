// src/services/api.ts
import { keycloak, updateTokenOrLogout } from '../auth/keycloak';
import type { Filters } from '../types';

/**
 * Backend modules. Every endpoint lives under one of them: /api/v1/{module}/{resource}.
 * Do not add modules without agreeing it with the backend (see AGENTS.md).
 */
export const API_MODULES = ['planner', 'history', 'insights', 'reports', 'export', 'access', 'notifications'] as const;
export type ApiModule = (typeof API_MODULES)[number];

/**
 * fetch against the backend with the user's token. Paths are relative to /api,
 * which Vite (and Vercel in production) proxies to the backend, so the browser never needs CORS.
 */
export async function apiFetch(module: ApiModule, path: string, init: RequestInit = {}): Promise<Response> {
  await updateTokenOrLogout(30);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${keycloak.token}`);

  const response = await fetch(`/api/v1/${module}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
  if (response.status === 401) {
    // Session revoked or expired in Keycloak: send the user back to the login page
    await keycloak.login();
  }
  return response;
}

// Tu función para la HU-03 (Búsqueda y filtros)
export const searchRecursos = async (filters: Filters, page: number = 1, limit: number = 25) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
  );

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...cleanFilters,
  }).toString();

  // Usamos apiFetch que ya incluye el token de Keycloak
  const response = await apiFetch('planner', `/resources?${queryParams}`);
  
  if (!response.ok) {
    throw new Error('Error al buscar recursos');
  }
  
  return response.json(); 
};