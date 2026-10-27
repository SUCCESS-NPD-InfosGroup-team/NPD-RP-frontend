import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { clearCatalogsCache, resourcesApi } from './resources.api'
import type { ResourceRequest } from './resources.types'

vi.mock('./api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

const request: ResourceRequest = {
  employeeNumber: '1045',
  name: 'Ana Torres',
  email: null,
  jobTitleId: null,
  positionId: 4,
  level: 3,
  businessUnitId: null,
  workModeId: 1,
  genderId: 1,
  talentReviewId: null,
  hireDate: '2026-08-03',
  onProbation: true,
  status: 'ACTIVO',
  termination: null,
  assignment: null,
}

describe('resourcesApi', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset()
    clearCatalogsCache()
  })

  it('posts the resource request', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({ id: 1102, name: 'Ana Torres' }), { status: 201 }))
    await expect(resourcesApi.createResource(request)).resolves.toMatchObject({ id: 1102 })
    expect(mockedApiFetch).toHaveBeenCalledWith('/resources', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(request),
    }))
  })

  it('translates a duplicate employee number into ApiRequestError', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      code: 'EMPLOYEE_NUMBER_TAKEN',
      detail: 'El N° 1045 ya está registrado (Ana Torres).',
      existingResourceId: 1045,
      existingResourceName: 'Ana Torres',
    }), { status: 409 }))
    await expect(resourcesApi.createResource(request)).rejects.toMatchObject({
      status: 409,
      code: 'EMPLOYEE_NUMBER_TAKEN',
      existingResourceId: 1045,
      existingResourceName: 'Ana Torres',
    })
  })

  it('keeps the field errors of a validation failure', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      code: 'VALIDATION_FAILED',
      detail: 'No se guardó el registro.',
      errors: [{ field: 'assignment.leaderId', code: 'REQUIRED', message: 'Selecciona el líder NPD.' }],
    }), { status: 400 }))
    await expect(resourcesApi.createResource(request)).rejects.toMatchObject({
      errors: [{ field: 'assignment.leaderId', code: 'REQUIRED', message: 'Selecciona el líder NPD.' }],
    })
  })

  it('requests one endpoint per list in parallel and joins them', async () => {
    mockedApiFetch.mockImplementation(async (path: string) => new Response(JSON.stringify({ items: [{ id: 1, name: path }] })))
    const catalogs = await resourcesApi.getCatalogs()
    expect(mockedApiFetch).toHaveBeenCalledTimes(11)
    expect(catalogs.workModes).toEqual([{ id: 1, name: '/catalogs/work-modes' }])
    expect(catalogs.terminationReasons).toEqual([{ id: 1, name: '/catalogs/termination-reasons' }])
    expect(catalogs.npdLeads).toEqual([{ id: 1, name: '/resources/npd-leads' }])
    expect(mockedApiFetch).toHaveBeenCalledWith('/catalogs/statuses')
  })

  it('caches each list and only retries the ones that failed', async () => {
    mockedApiFetch.mockImplementation(async (path: string) => (path === '/catalogs/genders'
      ? new Response('{}', { status: 503 })
      : new Response(JSON.stringify({ items: [] }))))
    await expect(resourcesApi.getCatalogs()).rejects.toMatchObject({ status: 503 })
    mockedApiFetch.mockClear()
    mockedApiFetch.mockImplementation(async () => new Response(JSON.stringify({ items: [] })))
    await resourcesApi.getCatalogs()
    expect(mockedApiFetch).toHaveBeenCalledExactlyOnceWith('/catalogs/genders')
    await resourcesApi.getCatalogs()
    expect(mockedApiFetch).toHaveBeenCalledOnce()
  })

  it('reads one resource', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({ id: 7 })))
    await expect(resourcesApi.getResource(7)).resolves.toEqual({ id: 7 })
    expect(mockedApiFetch).toHaveBeenCalledWith('/resources/7')
  })
})
