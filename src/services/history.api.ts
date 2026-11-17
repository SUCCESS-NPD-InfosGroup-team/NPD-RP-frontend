import { apiFetch } from './api'
import { read } from './projects.api'
import type { ApiError } from './projects.types'
import { ApiRequestError } from './projects.types'
import type { AuditLogFilters, AuditLogPage } from './history.types'

interface ApiAuditLogEntry {
  id: number
  action: 'CREATE' | 'UPDATE'
  actor: string
  occurredAt: string
  fields: Array<{ field: string; label: string; oldValue: string | null; newValue: string | null }>
}

interface ApiAuditLogResponse {
  items: ApiAuditLogEntry[]
  page: { number: number; size: number; totalElements: number; totalPages: number }
  actors: string[]
  fields: Array<{ field: string; label: string }>
}

export function buildAuditLogQuery(filters: AuditLogFilters = {}, page = 1): string {
  const params = new URLSearchParams({
    page: String(Math.max(page - 1, 0)),
    size: '25',
  })

  if (filters.actor?.trim()) params.set('actor', filters.actor.trim())
  if (filters.field?.trim()) params.set('field', filters.field.trim())
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)

  return params.toString()
}

export const historyApi = {
  async listAuditLog(resourceId: number | string, filters: AuditLogFilters = {}, page = 1): Promise<AuditLogPage> {
    const response = await read<ApiAuditLogResponse>(await apiFetch('history', `/resources/${encodeURIComponent(String(resourceId))}/audit-log?${buildAuditLogQuery(filters, page)}`))
    return {
      items: response.items,
      page: {
        number: response.page.number + 1,
        size: response.page.size,
        totalElements: response.page.totalElements,
        totalPages: response.page.totalPages,
      },
      actors: response.actors,
      fields: response.fields,
    }
  },
}

export async function readAuditLogError(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({})) as Partial<ApiError>
  throw new ApiRequestError({
    status: response.status,
    code: body.code ?? 'API_ERROR',
    detail: body.detail ?? 'No se pudo completar la operación.',
    title: body.title,
    errors: body.errors,
    field: body.field,
  })
}

export type HistoryApi = typeof historyApi
