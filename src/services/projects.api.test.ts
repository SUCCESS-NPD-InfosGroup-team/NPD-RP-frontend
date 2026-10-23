import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { projectsApi } from './projects.api'

vi.mock('./api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

describe('projectsApi', () => {
  beforeEach(() => mockedApiFetch.mockReset())

  it('serializes filters and pagination', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      items: [],
      page: { number: 1, size: 25, totalElements: 0, totalPages: 0 },
    })))
    await projectsApi.listProjects({ search: 'Atlas', contractEnd: 'none' }, 2)
    expect(mockedApiFetch).toHaveBeenCalledWith('/projects?page=1&size=25')
  })

  it('translates duplicate errors into ApiError', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      code: 'PROJECT_NAME_TAKEN',
      detail: 'El nombre ya existe.',
      field: 'name',
      existingProjectId: 1,
      existingProjectName: 'Atlas',
    }), { status: 409 }))
    await expect(projectsApi.createProject({ name: 'Atlas' })).rejects.toMatchObject({
      status: 409,
      code: 'PROJECT_NAME_TAKEN',
      existingProjectId: 1,
    })
  })

  it('preserves successful responses', async () => {
    const response = {
      items: [],
      page: { number: 0, size: 25, totalElements: 0, totalPages: 0 },
    }
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify(response)))
    await expect(projectsApi.listProjects()).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    })
  })
})
