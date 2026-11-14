import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { arrivalsApi } from './arrivals.api'

vi.mock('./api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

describe('arrivalsApi', () => {
  beforeEach(() => mockedApiFetch.mockReset())
  afterEach(() => vi.restoreAllMocks())

  it('serializes numeric filters and maps the API page', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      summary: { total: 1, byType: { PENDING_CONFIRMATION: 0, ASSIGNMENT_END: 1, CONTRACT_END: 0, PROBATION_END: 0, VACATION_START: 0 } },
      items: [{
        id: 7,
        type: 'ASSIGNMENT_END',
        date: '2026-10-18',
        daysRemaining: 11,
        resource: { id: 1078, employeeNumber: '1078', name: 'Iván', clientRole: null },
        resourceCount: 1,
        client: { id: 4, name: 'TIGO' },
        project: null,
        leader: { id: 3, name: 'Abdiel' },
        notice: { status: 'NONE', audience: null, stage: null, date: null },
      }],
      page: { number: 1, size: 25, totalElements: 1, totalPages: 1 },
    })))

    await expect(arrivalsApi.listArrivals({
      windowDays: 30,
      clientId: '4',
      leaderId: '3',
      type: 'ASSIGNMENT_END',
    }, 2)).resolves.toMatchObject({
      page: 2,
      items: [{ id: '7', resource: { id: '1078' }, client: 'TIGO', project: null, leader: 'Abdiel' }],
    })
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'planner',
      '/upcoming-events?windowDays=30&page=1&size=25&clientId=4&leaderId=3&type=ASSIGNMENT_END',
    )
  })

  it('ignores non-numeric client and leader filters', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      summary: { total: 0, byType: { PENDING_CONFIRMATION: 0, ASSIGNMENT_END: 0, CONTRACT_END: 0, PROBATION_END: 0, VACATION_START: 0 } },
      items: [], page: { number: 0, size: 25, totalElements: 0, totalPages: 0 },
    })))
    await arrivalsApi.listArrivals({ windowDays: 90, clientId: 'client-1', leaderId: 'x' })
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'planner',
      '/upcoming-events?windowDays=90&page=0&size=25',
    )
  })

  it('reads the strip of Recursos and maps its events like the list', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      windowDays: 30,
      total: 8,
      nearest: [{
        id: 'PROBATION_END-41',
        type: 'PROBATION_END',
        date: '2026-11-25',
        daysRemaining: 11,
        resource: { id: 41, employeeNumber: '1078', name: 'Iván', clientRole: null },
        resourceCount: 1,
        client: { id: 4, name: 'TIGO' },
        project: { id: 12, name: 'Portal' },
        leader: null,
        notice: { status: 'NONE', audience: null, stage: null, date: null },
      }],
    })))

    await expect(arrivalsApi.getStrip()).resolves.toEqual({
      windowDays: 30,
      total: 8,
      nearest: [expect.objectContaining({ id: 'PROBATION_END-41', resource: expect.objectContaining({ id: '41' }), client: 'TIGO', project: 'Portal', leader: null })],
    })
    expect(mockedApiFetch).toHaveBeenCalledWith('planner', '/upcoming-events/summary')
  })

  it('surfaces API errors through the shared response reader', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      code: 'EVENTS_ERROR',
      detail: 'No se pudo cargar.',
    }), { status: 500 }))
    await expect(arrivalsApi.listArrivals({ windowDays: 30 })).rejects.toMatchObject({
      status: 500,
      code: 'EVENTS_ERROR',
    })
  })
})
