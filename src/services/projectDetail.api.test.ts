import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { projectDetailApi } from './projectDetail.api'
import { ApiRequestError } from './projects.types'

vi.mock('./api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

describe('projectDetailApi', () => {
  beforeEach(() => mockedApiFetch.mockReset())
  afterEach(() => vi.useRealTimers())

  it('fetches the project detail with the contract response shape', async () => {
    const project = {
      id: 8,
      name: 'Caja de Ahorros',
      client: { id: 5, name: 'CAJA DE AHORROS', isInternal: false },
      active: true,
      startDate: '2024-10-01',
      contractEndDate: '2026-12-31',
      daysToContractEnd: 35,
      teamSize: 1,
      pendingConfirmation: 1,
      indefiniteCount: 0,
      nextAssignmentEnd: '2026-12-31',
      leads: [{ id: 12, name: 'Ricardo Him' }],
      version: 3,
      updatedAt: '2026-11-25T18:30:00Z',
    }
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify(project)))

    await expect(projectDetailApi.getProject('8')).resolves.toEqual(project)
    expect(mockedApiFetch).toHaveBeenCalledWith('planner', '/projects/8')
  })

  it('fetches members without changing the order or the contract shape', async () => {
    const members = {
      items: [{
        id: 31,
        employeeNumber: '987',
        name: 'José Samudio',
        level: 3,
        clientRole: 'QA Funcional',
        leader: { id: 12, name: 'Ricardo Him' },
        status: { code: 'ACTIVO', label: 'Activo' },
        situation: { code: 'ASIGNADO', label: 'Asignado' },
        assignmentStart: '2024-11-01',
        assignmentEnd: '2026-12-31',
        indefinite: false,
        daysToAssignmentEnd: 35,
        version: 2,
      }],
      total: 1,
    }
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify(members)))

    await expect(projectDetailApi.getMembers('8')).resolves.toEqual(members)
    expect(mockedApiFetch).toHaveBeenCalledWith('planner', '/projects/8/members')
  })

  it('preserves NOT_FOUND ProblemDetails when the project does not exist', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      code: 'NOT_FOUND',
      detail: 'No existe el proyecto.',
    }), { status: 404 }))

    await expect(projectDetailApi.getProject('404')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 404,
      code: 'NOT_FOUND',
      detail: 'No existe el proyecto.',
    } satisfies Partial<ApiRequestError>)
  })

  it('returns an empty members response for a project without a team', async () => {
    const members = { items: [], total: 0 }
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify(members)))

    await expect(projectDetailApi.getMembers('8')).resolves.toEqual(members)
  })
})
