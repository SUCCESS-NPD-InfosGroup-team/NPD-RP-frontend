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

/** Filtro de la pantalla → parámetro de la API. «Todos» o vacío no se envía */
const FILTER_PARAMS: ReadonlyArray<[keyof Filters, string]> = [
  ['cliente', 'clientId'],
  ['proyecto', 'projectId'],
  ['liderNPD', 'leaderId'],
  ['rol', 'clientRoleId'],
  ['situacion', 'situation'],
]

/** Activo = ACTIVO y LICENCIA; Baja = BAJA; Todos = sin filtro de estado */
function appendStatus(params: URLSearchParams, estado: string | undefined): void {
  const status = estado?.toUpperCase()
  if (status === 'TODOS') return
  if (status === 'BAJA') {
    params.set('status', 'BAJA')
    return
  }
  params.append('status', 'ACTIVO')
  params.append('status', 'LICENCIA')
}

export function buildSearchParams(filters: Filters, page = 1, size = 25): URLSearchParams {
  const params = new URLSearchParams({
    page: String(Math.max(page - 1, 0)),
    size: String(size),
  })

  const q = filters.search?.trim()
  if (q) params.set('q', q)
  for (const [filter, param] of FILTER_PARAMS) {
    const value = filters[filter]
    if (value && value !== 'Todos') params.set(param, value)
  }
  const level = filters.nivel?.replace('N', '')
  if (level && level !== 'Todos') params.set('level', level)

  appendStatus(params, filters.estado)
  return params
}

function matchesSituation(item: RecursoApi, situacion?: string) : boolean{
  if (!situacion || situacion == 'Todos') return true
  const code = (item as RecursoApi & {situation?: {code?: string} }).situation?.code
  return code === situacion
}

async function fetchRawPage(
  filters: Filters,
  page: number,
  size: number,
): Promise<ResourceSearchResponse>{
  const params = buildSearchParams(filters, page, size)
  const response = await apiFetch('planner', `/resources?${params.toString()}`)
  if (!response.ok){
    throw new Error('Error al buscar recursos')
  }
  return response.json() as Promise<ResourceSearchResponse>
}

export async function searchRecursos(
  filters: Filters,
  page = 1,
  size = 25,
): Promise<ResourceSearchResponse>{
  const data = await fetchRawPage(filters, page, size)

  if (filters.situacion && filters.situacion !== 'Todos'){
    const hasMismatch = data.items.some((item) => !matchesSituation(item, filters.situacion))
    if(hasMismatch){
      const all = await searchAllRecursos(filters)
      const totalElements =  all.length
      const totalPages = Math.max(1, Math.ceil(totalElements / size))
      const safePage = Math.min(Math.max(page, 1), totalPages)
      const start = (safePage - 1) * size
      return {
        ...data,
        items: all.slice(start, start + size),
        page: {
          ...data.page,
          number: safePage - 1,
          size,
          totalElements,
          totalPages,
        },
      }
    }
  }

  return data
}

/** Tamaño máximo de página que acepta el backend (spring.data.web.pageable.max-page-size) */
export const MAX_PAGE_SIZE = 100

/**
 * Todos los recursos que cumplen los filtros, recorriendo las páginas del backend (BUG-06).
 * El backend recorta cualquier `size` mayor a 100, así que no basta con pedir una página grande.
 */
export async function searchAllRecursos(filters: Filters): Promise<RecursoApi[]> {
  const first = await searchRecursos(filters, 1, MAX_PAGE_SIZE)
  const remaining = Array.from({ length: Math.max(first.page.totalPages - 1, 0) }, (_, index) => index + 2)
  const rest = await Promise.all(remaining.map((page) => searchRecursos(filters, page, MAX_PAGE_SIZE)))
  return [first, ...rest].flatMap((response) => response.items)
}
