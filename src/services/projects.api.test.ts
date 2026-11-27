import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { projectsApi } from './projects.api'

vi.mock('./api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

describe('projectsApi', () => {
  beforeEach(() => mockedApiFetch.mockReset())
  afterEach(() => vi.useRealTimers())

  it('serializes filters and pagination', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      items: [],
      page: { number: 1, size: 25, totalElements: 0, totalPages: 0 },
    })))
    await projectsApi.listProjects({ search: 'Atlas', contractEnd: 'none' }, 2)
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'planner',
      '/projects?page=1&size=25&contractEnd=NONE&search=Atlas',
    )
  })

  it('translates duplicate errors into ApiError', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      code: 'PROJECT_NAME_TAKEN',
      detail: 'El nombre ya existe.',
      field: 'name',
      existingProjectId: 1,
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

  it('maps project list items from the backend response', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      items: [{
        id: 8,
        name: 'Atlas',
        client: { id: 3, name: 'Aurora', isInternal: false },
        active: true,
        startDate: '2026-01-02',
        contractEndDate: '2026-12-01',
        daysToContractEnd: 18,
        nextAssignmentEnd: '2026-09-10',
        teamSize: 4,
        pendingConfirmation: 1,
        indefiniteCount: 2,
        leads: [{ id: 12, name: 'Líder de prueba' }],
      }],
      page: { number: 0, size: 25, totalElements: 1, totalPages: 1 },
    })))

    await expect(projectsApi.listProjects()).resolves.toMatchObject({
      items: [{
        id: '8',
        client: { id: '3', name: 'Aurora' },
        leads: ['Líder de prueba'],
        leadIds: [12],
        nextAssignmentEnd: '2026-09-10',
        indefiniteCount: 2,
        pendingCount: 1,
      }],
    })
  })

  it('uses the backend next-30-days filter and maps global KPIs', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      projects: 34,
      clients: 12,
      withoutTeam: 2,
      contractEndingSoon: 3,
      collaboratorsWithoutProject: 5,
    })))

    await expect(projectsApi.getKpis({
      clientId: '4',
      leadId: '3',
      contractEnd: 'next30',
      includeInactive: true,
    })).resolves.toEqual({
      activeProjects: 34,
      activeClients: 12,
      contractEndingSoon: 3,
      withoutTeam: 2,
      unassignedPeople: 5,
    })

    expect(mockedApiFetch).toHaveBeenCalledWith(
      'planner',
      '/projects/kpis?clientId=4&leaderId=3&contractEnd=NEXT_30_DAYS&includeInactive=true',
    )
  })

  it('creates projects with the backend request shape', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      id: 8,
      name: 'Atlas',
      client: { id: 3, name: 'Aurora', isInternal: false },
      active: true,
      startDate: '2026-01-02',
      contractEndDate: '2026-12-01',
      daysToContractEnd: 18,
      teamSize: 0,
      pendingConfirmation: 0,
      leads: [],
    }), { status: 201 }))

    await expect(projectsApi.createProject({
      clientId: '3',
      name: 'Atlas',
      contractEnd: '2026-12-01',
    })).resolves.toMatchObject({ id: '8', name: 'Atlas' })
    expect(mockedApiFetch).toHaveBeenCalledWith('planner', '/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 3,
        newClient: undefined,
        name: 'Atlas',
        contractEndDate: '2026-12-01',
      }),
    })
  })

  it('maps clients and a client’s project options', async () => {
    mockedApiFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{ id: 3, name: 'Aurora', isInternal: false }],
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{ id: 8, name: 'Atlas', teamSize: 4, contractEndDate: null }],
      })))

    await expect(projectsApi.listClients()).resolves.toEqual([
      { id: '3', name: 'Aurora', isInternal: false, active: true },
    ])
    await expect(projectsApi.listClientProjects('3')).resolves.toEqual([
      { id: '8', name: 'Atlas', teamSize: 4, contractEndDate: null },
    ])
  })

  it('lists every active project for step 1 of «Registrar recurso», page by page', async () => {
    const item = (id: number) => ({
      id, name: `P${id}`, client: { id: 3, name: 'Aurora', isInternal: false }, active: true, startDate: '2026-01-02',
      contractEndDate: id === 1 ? '2026-12-31' : null, daysToContractEnd: null, teamSize: id, pendingConfirmation: 0, leads: [],
    })
    mockedApiFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [item(1)], page: { number: 0, size: 100, totalElements: 2, totalPages: 2 } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [item(2)], page: { number: 1, size: 100, totalElements: 2, totalPages: 2 } })))

    await expect(projectsApi.listActiveProjects()).resolves.toEqual([
      { id: '1', name: 'P1', client: { id: '3', name: 'Aurora' }, teamSize: 1, contractEndDate: '2026-12-31' },
      { id: '2', name: 'P2', client: { id: '3', name: 'Aurora' }, teamSize: 2, contractEndDate: null },
    ])
    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, 'planner', '/projects?page=0&size=100&includeInactive=false')
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, 'planner', '/projects?page=1&size=100&includeInactive=false')
  })

  it('stops after one call when there are no active projects', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({ items: [], page: { number: 0, size: 100, totalElements: 0, totalPages: 0 } })))
    await expect(projectsApi.listActiveProjects()).resolves.toEqual([])
    expect(mockedApiFetch).toHaveBeenCalledOnce()
  })

  it('reads one project, whose ProjectResponse has no leads', async () => {
    const project = { id: 52, name: 'Caja de Ahorros', client: { id: 5, name: 'CAJA DE AHORROS', isInternal: false }, active: false, startDate: '2026-01-02', contractEndDate: '2026-12-31', teamSize: 4 }
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify(project)))

    await expect(projectsApi.getProject('52')).resolves.toEqual({
      id: '52', name: 'Caja de Ahorros', client: { id: '5', name: 'CAJA DE AHORROS' }, teamSize: 4, contractEndDate: '2026-12-31', active: false,
    })
    expect(mockedApiFetch).toHaveBeenCalledWith('planner', '/projects/52')
  })

  it('creates a project from a ProjectResponse without leads or pending count', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      id: 8, name: 'Atlas', client: { id: 3, name: 'Aurora', isInternal: false }, active: true, startDate: '2026-01-02', contractEndDate: null, teamSize: 0,
    }), { status: 201 }))

    await expect(projectsApi.createProject({ clientId: '3', name: 'Atlas' })).resolves.toMatchObject({
      id: '8', leads: [], leadIds: [], pendingCount: 0,
    })
  })

  it('preserves status when an error response is not JSON', async () => {
    mockedApiFetch.mockResolvedValue(new Response(null, { status: 503 }))

    await expect(projectsApi.getKpis()).rejects.toMatchObject({
      status: 503,
      code: 'API_ERROR',
      detail: 'No se pudo completar la operación.',
    })
  })
})
