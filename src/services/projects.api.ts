import { apiFetch } from './api'
import type {
  ApiError,
  Client,
  CreateProjectInput,
  Page,
  Project,
  ProjectFilters,
  ProjectsSummary,
} from './projects.types'

function query(filters: ProjectFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), pageSize: '25' })
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

async function read<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>
  const body = await response.json().catch(() => ({})) as Partial<ApiError>
  throw {
    status: response.status,
    code: body.code ?? 'API_ERROR',
    message: body.message ?? 'No se pudo completar la operación.',
    field: body.field,
    existingProjectId: body.existingProjectId,
    existingProjectName: body.existingProjectName,
  } satisfies ApiError
}

export const projectsApi = {
  async listProjects(filters: ProjectFilters = {}, page = 1): Promise<Page<Project>> {
    return read<Page<Project>>(await apiFetch(`/projects?${query(filters, page)}`))
  },
  async getSummary(): Promise<ProjectsSummary> {
    return read<ProjectsSummary>(await apiFetch('/projects/summary'))
  },
  async createProject(input: CreateProjectInput): Promise<Project> {
    return read<Project>(await apiFetch('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }))
  },
  async listClients(): Promise<Client[]> {
    return read<Client[]>(await apiFetch('/clients'))
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
