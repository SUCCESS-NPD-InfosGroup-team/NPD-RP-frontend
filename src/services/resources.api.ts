import { apiFetch } from './api'
import { read } from './projects.api'
import type { CatalogItem, Catalogs, ResourceRequest, ResourceResponse } from './resources.types'

/** Each form list has its own endpoint; all of them answer { items: [...] } */
const CATALOG_PATHS = {
  jobTitles: '/catalogs/job-titles',
  positions: '/catalogs/positions',
  businessUnits: '/catalogs/business-units',
  workModes: '/catalogs/work-modes',
  genders: '/catalogs/genders',
  talentReviews: '/catalogs/talent-reviews',
  clientRoles: '/catalogs/client-roles',
  equipment: '/catalogs/equipment',
  terminationReasons: '/catalogs/termination-reasons',
  statuses: '/catalogs/statuses',
  npdLeads: '/resources/npd-leads',
} as const satisfies Record<keyof Catalogs, string>

// Lists do not change during the session: cache each one, and forget it if it fails so it can be retried
const listCache = new Map<string, Promise<unknown[]>>()

function listItems<T>(path: string): Promise<T[]> {
  let request = listCache.get(path)
  if (!request) {
    request = apiFetch(path)
      .then((response) => read<{ items: unknown[] }>(response))
      .then((body) => body.items)
      .catch((cause: unknown) => {
        listCache.delete(path)
        throw cause
      })
    listCache.set(path, request)
  }
  return request as Promise<T[]>
}

export const resourcesApi = {
  /** Requests every form list in parallel */
  async getCatalogs(): Promise<Catalogs> {
    const keys = Object.keys(CATALOG_PATHS) as (keyof Catalogs)[]
    const lists = await Promise.all(keys.map((key) => listItems<CatalogItem>(CATALOG_PATHS[key])))
    return Object.fromEntries(keys.map((key, index) => [key, lists[index]])) as unknown as Catalogs
  },
  async createResource(input: ResourceRequest): Promise<ResourceResponse> {
    return read<ResourceResponse>(await apiFetch('/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }))
  },
  async getResource(id: number | string): Promise<ResourceResponse> {
    return read<ResourceResponse>(await apiFetch(`/resources/${encodeURIComponent(String(id))}`))
  },
}

export function clearCatalogsCache(): void {
  listCache.clear()
}

export type ResourcesApi = typeof resourcesApi
