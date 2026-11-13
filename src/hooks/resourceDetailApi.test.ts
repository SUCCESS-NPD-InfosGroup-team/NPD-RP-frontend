import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../services/api'
import { clearCatalogsCache, resourcesApi } from '../services/resources.api'
import type { ResourceRequest } from '../services/resources.types'

vi.mock('../services/api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

describe('resource detail API client', () => {
  beforeEach(() => mockedApiFetch.mockReset())

  it('creates a resource', async () => {
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
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({ id: 1102 }), { status: 201 }))

    await expect(resourcesApi.createResource(request)).resolves.toEqual({ id: 1102 })
    expect(mockedApiFetch).toHaveBeenCalledWith('planner', '/resources', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(request),
    }))
  })

  it('loads catalogs and NPD leads through the planner endpoints', async () => {
    clearCatalogsCache()
    mockedApiFetch.mockImplementation(async (_module, path) => new Response(JSON.stringify({
      items: [{ id: 1, name: path }],
    })))

    const catalogs = await resourcesApi.getCatalogs()
    expect(catalogs.equipment).toEqual([{ id: 1, name: '/catalogs/equipment' }])
    await expect(resourcesApi.getNpdLeads()).resolves.toEqual([{ id: 1, name: '/resources/npd-leads' }])
  })

  it('reads a resource and its last change', async () => {
    mockedApiFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 7 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        action: 'UPDATE',
        actor: 'maria.perez',
        occurredAt: '2026-10-02T15:14:00Z',
        fields: [],
      }), { status: 200 }))

    await expect(resourcesApi.getResource(7)).resolves.toEqual({ id: 7 })
    await expect(resourcesApi.fetchLastChange(7)).resolves.toMatchObject({ action: 'UPDATE' })
    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, 'planner', '/resources/7', { signal: undefined })
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, 'history', '/resources/7/last-change', { signal: undefined })
  })

  it('maps 204 to null', async () => {
    mockedApiFetch.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(resourcesApi.fetchLastChange(7)).resolves.toBeNull()
  })

  it.each([400, 401, 404, 503])('propagates resource and last-change error %s', async (status) => {
    const body = JSON.stringify({ code: 'API_ERROR', detail: 'Error' })
    mockedApiFetch.mockResolvedValue(new Response(body, { status }))

    await expect(resourcesApi.getResource(7)).rejects.toMatchObject({ status })
    mockedApiFetch.mockResolvedValue(new Response(body, { status }))
    await expect(resourcesApi.fetchLastChange(7)).rejects.toMatchObject({ status })
  })

  it('passes cancellation signals to both requests', async () => {
    const controller = new AbortController()
    mockedApiFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 7 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await resourcesApi.getResource(7, controller.signal)
    await resourcesApi.fetchLastChange(7, controller.signal)

    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, 'planner', '/resources/7', { signal: controller.signal })
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, 'history', '/resources/7/last-change', { signal: controller.signal })
  })
})
