import { apiFetch } from './api'
import { read } from './projects.api'
import {
  ARRIVALS_PAGE_SIZE,
  type ArrivalEvent,
  type ArrivalFilters,
  type ArrivalNotice,
  type ArrivalsPage,
  type ArrivalsStrip,
  type ArrivalsSummary,
  type ArrivalType,
} from './arrivals.types'

/*
 * Contract proposed for SCRUM-181 (backend), module `planner`:
 *   GET /api/v1/planner/upcoming-events?windowDays=30&clientId=&leaderId=&type=&page=0&size=25
 * Align it with the backend before connecting: this adapter is the only place that knows the shape.
 */
interface ApiArrival {
  id: number | string
  type: ArrivalType
  date: string
  daysRemaining: number
  resource: { id: number; employeeNumber: string; name: string; clientRole: string | null } | null
  resourceCount: number
  client: { id: number; name: string } | null
  project: { id: number; name: string } | null
  leader: { id: number; name: string } | null
  notice: ArrivalNotice
}

interface ApiArrivalsStrip {
  windowDays: number
  total: number
  nearest: ApiArrival[]
}

interface ApiArrivalsPage {
  summary: ArrivalsSummary
  items: ApiArrival[]
  page: { number: number; size: number; totalElements: number; totalPages: number }
}

function query(filters: ArrivalFilters, page: number): string {
  const params = new URLSearchParams({
    windowDays: String(filters.windowDays),
    page: String(Math.max(page - 1, 0)),
    size: String(ARRIVALS_PAGE_SIZE),
  })
  if (filters.clientId && /^\d+$/.test(filters.clientId)) params.set('clientId', filters.clientId)
  if (filters.leaderId && /^\d+$/.test(filters.leaderId)) params.set('leaderId', filters.leaderId)
  if (filters.type) params.set('type', filters.type)
  return params.toString()
}

function mapArrival(event: ApiArrival): ArrivalEvent {
  return {
    id: String(event.id),
    type: event.type,
    date: event.date,
    daysRemaining: event.daysRemaining,
    resource: event.resource ? { ...event.resource, id: String(event.resource.id) } : null,
    resourceCount: event.resourceCount,
    client: event.client?.name ?? null,
    project: event.project?.name ?? null,
    leader: event.leader?.name ?? null,
    notice: event.notice,
  }
}

export const arrivalsApi = {
  async listArrivals(filters: ArrivalFilters, page = 1): Promise<ArrivalsPage> {
    const response = await read<ApiArrivalsPage>(
      await apiFetch('planner', `/upcoming-events?${query(filters, page)}`),
    )
    return {
      summary: response.summary,
      items: response.items.map(mapArrival),
      page: response.page.number + 1,
      pageSize: response.page.size,
      total: response.page.totalElements,
      totalPages: response.page.totalPages,
    }
  },

  /** GET /api/v1/planner/upcoming-events/summary (SCRUM-181): the strip of Recursos */
  async getStrip(): Promise<ArrivalsStrip> {
    const response = await read<ApiArrivalsStrip>(await apiFetch('planner', '/upcoming-events/summary'))
    return { windowDays: response.windowDays, total: response.total, nearest: response.nearest.map(mapArrival) }
  },
}

export type ArrivalsApi = typeof arrivalsApi
