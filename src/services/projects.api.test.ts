import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { projectsApi } from './projects.api'

vi.mock('./api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

describe('projectsApi', () => {
  beforeEach(() => mockedApiFetch.mockReset())

  it('serializes filters and pagination', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({ items: [], page: 2, pageSize: 25, total: 0 })))
    await projectsApi.listProjects({ search: 'Atlas', contractEnd: 'none' }, 2)
    expect(mockedApiFetch).toHaveBeenCalledWith('/projects?page=2&pageSize=25&search=Atlas&contractEnd=none')
  })

  it('translates duplicate errors into ApiError', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      code: 'DUPLICATE_PROJECT_NAME',
      message: 'El nombre ya existe.',
      field: 'name',
      existingProjectId: 'project-1',
      existingProjectName: 'Atlas',
    }), { status: 409 }))
    await expect(projectsApi.createProject({ name: 'Atlas' })).rejects.toMatchObject({
      status: 409,
      code: 'DUPLICATE_PROJECT_NAME',
      existingProjectId: 'project-1',
    })
  })

  it('preserves successful responses', async () => {
    const summary = { activeProjects: 2, activeClients: 1, contractEndingSoon: 0, withoutTeam: 1, unassignedPeople: 0 }
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify(summary)))
    await expect(projectsApi.getSummary()).resolves.toEqual(summary)
  })
})
