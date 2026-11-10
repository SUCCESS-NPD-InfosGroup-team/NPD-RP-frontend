import { keycloak, updateTokenOrLogout } from '../auth/keycloak'
import type { Filters, ResourceSearchResponse } from '../types'

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

  const response = await fetch(`/api/v1/${module}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers })
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

  const status = filters.estado?.toUpperCase()
  if (status === 'BAJA') {
    params.set('status', 'BAJA')
  } else {
    params.append('status', 'ACTIVO')
    params.append('status', 'LICENCIA')
  }

  const response = await apiFetch('planner', `/resources?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Error al buscar recursos')
  }
  return response.json() as Promise<ResourceSearchResponse>
}

export interface UpdateRecursoPayload {
  employeeNumber: string
  name: string
  email?: string
  level: number
  status: string
  version: number
  assignment?: {
    endDate?: string
    indefinite: boolean
  }
}

export async function updateRecurso(id: string, payload: UpdateRecursoPayload): Promise<unknown> {
  const response = await apiFetch('planner', `/resources/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  if (response.status === 409) {
    throw new Error('CONFLICT: El registro fue modificado por otro usuario. Por favor, recarga la página.')
  }
  if (!response.ok) {
    throw new Error(`Error ${response.status}: No se pudo actualizar el recurso.`)
  }
  return response.json()
}
