import { apiFetch } from './api'
import type {
  ApiError,
  Client,
  CreateProjectInput,
  Page,
  Project,
  ProjectFilters,
} from './projects.types'
import { ApiRequestError } from './projects.types'

function query(filters: ProjectFilters, page: number): string {
  const params = new URLSearchParams({ page: String(Math.max(page - 1, 0)), size: '25' })
  if (filters.clientId && /^\d+$/.test(filters.clientId)) params.set('clientId', filters.clientId)
  if (filters.leadId && /^\d+$/.test(filters.leadId)) params.set('leaderId', filters.leadId)
  if (filters.contractEnd === 'next30') {
    const date = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
    params.set('contractEndBefore', date)
  }
  if (filters.includeInactive !== undefined) params.set('includeInactive', String(filters.includeInactive))
  return params.toString()
}

interface ApiProject {
  id: number
  name: string
  client: { id: number; name: string; isInternal: boolean }
  active: boolean
  startDate: string
  contractEndDate: string | null
  daysToContractEnd: number | null
  teamSize: number
  pendingConfirmation: number
  leads: Array<{ id: number; name: string }>
}

interface ApiPage<T> {
  items: T[]
  page: { number: number; size: number; totalElements: number; totalPages: number }
}

function mapProject(project: ApiProject): Project {
  return {
    id: String(project.id),
    name: project.name,
    client: { ...project.client, id: String(project.client.id) },
    teamSize: project.teamSize,
    members: [],
    leads: project.leads.map((lead) => lead.name),
    leadIds: project.leads.map((lead) => lead.id),
    startDate: project.startDate,
    contractEnd: project.contractEndDate,
    pendingCount: project.pendingConfirmation,
    active: project.active,
  }
}

async function read<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>
  const body = await response.json().catch(() => ({})) as Partial<ApiError>
  throw new ApiRequestError({
    status: response.status,
    code: body.code ?? 'API_ERROR',
    detail: body.detail ?? 'No se pudo completar la operación.',
    title: body.title,
    errors: body.errors,
    field: body.field,
    existingProjectId: body.existingProjectId,
    existingProjectName: body.existingProjectName,
  } satisfies ApiError)
}

export const projectsApi = {
  async listProjects(filters: ProjectFilters = {}, page = 1): Promise<Page<Project>> {
    const response = await read<ApiPage<ApiProject>>(await apiFetch(`/projects?${query(filters, page)}`))
    return {
      items: response.items.map(mapProject),
      page: response.page.number + 1,
      pageSize: response.page.size,
      total: response.page.totalElements,
      totalPages: response.page.totalPages,
    }
  },
  async createProject(input: CreateProjectInput): Promise<Project> {
    const response = await read<ApiProject>(await apiFetch('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: input.clientId && /^\d+$/.test(input.clientId) ? Number(input.clientId) : undefined,
        newClient: input.newClient,
        name: input.name,
        contractEndDate: input.contractEnd ?? null,
      }),
    }))
    return mapProject(response)
  },
  async listClients(): Promise<Client[]> {
    const response = await read<{ items: Array<Omit<Client, 'id'> & { id: number }> }>(await apiFetch('/clients?active=true'))
    return response.items.map((client) => ({ ...client, id: String(client.id), active: true }))
  },
  async createClient(input: { name: string; isInternal: boolean }): Promise<Client> {
    return read<Client>(await apiFetch('/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }))
  },
}

export type ProjectsApi = typeof projectsApi
