// src/services/api.ts
import { keycloak, updateTokenOrLogout } from '../auth/keycloak'
import type { Filters, RecursoApi, ResourceSearchResponse } from '../types'

/**
 * Backend modules. Every endpoint lives under one of them: /api/v1/{module}/{resource}.
 * Do not add modules without agreeing it with the backend (see AGENTS.md).
 */
export const API_MODULES = ['planner', 'history', 'insights', 'reports', 'export', 'access', 'notifications'] as const
export type ApiModule = (typeof API_MODULES)[number]

/**
 * Fetch against the backend with the user's token. Paths are relative to /api,
 * which Vite and Vercel proxy to the backend.
 */
export async function apiFetch(module: ApiModule, path: string, init: RequestInit = {}): Promise<Response> {
  await updateTokenOrLogout(30)
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${keycloak.token ?? ''}`)
  headers.set('Content-Type', 'application/json')

  const normalizedPath = path.startsWith('/') ? path : '/' + path
  const response = await fetch(`/api/v1/${module}${normalizedPath}`, { ...init, headers })
  if (response.status === 401) {
    await keycloak.login()
  }
  return response
}

export async function searchRecursos(
  filters: Filters,
  page = 1,
  size = 25,
): Promise<ResourceSearchResponse> {
  const params = new URLSearchParams({
    page: String(Math.max(page - 1, 0)),
    size: String(size),
  })

  if (filters.search?.trim()) params.set('q', filters.search.trim())
  if (filters.cliente && filters.cliente !== 'Todos') params.set('clientId', filters.cliente)
  if (filters.proyecto && filters.proyecto !== 'Todos') params.set('projectId', filters.proyecto)
  if (filters.liderNPD && filters.liderNPD !== 'Todos') params.set('leaderId', filters.liderNPD)
  if (filters.rol && filters.rol !== 'Todos') params.set('clientRoleId', filters.rol)
  if (filters.nivel && filters.nivel !== 'Todos') params.set('level', filters.nivel.replace('N', ''))

  if (filters.situacion && filters.situacion !== 'Todos') params.set('situation', filters.situacion)

  const status = filters.estado?.toUpperCase()
  if (status === 'BAJA') {
    params.set('status', 'BAJA')
  } else if (status !== 'TODOS') {
    params.append('status', 'ACTIVO')
    params.append('status', 'LICENCIA')
  }

  const response = await apiFetch('planner', `/resources?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Error al buscar recursos')
  }
  return response.json() as Promise<ResourceSearchResponse>
}

/** Tamaño máximo de página que acepta el backend (spring.data.web.pageable.max-page-size) */
export const MAX_PAGE_SIZE = 100

/**
 * Todos los recursos que cumplen los filtros, recorriendo las páginas del backend (BUG-06).
 * El backend recorta cualquier `size` mayor a 100, así que no basta con pedir una página grande.
 */
export async function searchAllRecursos(filters: Filters): Promise<RecursoApi[]> {
  const first = await searchRecursos(filters, 1, MAX_PAGE_SIZE)
  const items = [...first.items]
  for (let page = 2; page <= first.page.totalPages; page++) {
    const next = await searchRecursos(filters, page, MAX_PAGE_SIZE)
    items.push(...next.items)
  }
  return items
}
