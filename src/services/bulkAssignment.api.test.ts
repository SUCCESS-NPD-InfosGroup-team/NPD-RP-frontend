import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bulkAssignmentApi, BulkAssignmentApiError } from './bulkAssignment.api'

vi.mock('../auth/keycloak', () => ({
  keycloak: { token: 'test-token', login: vi.fn() },
  updateTokenOrLogout: vi.fn(),
}))

const fetchMock = vi.fn<typeof fetch>()

const candidateResponse = {
  items: [
    {
      id: 890,
      employeeNumber: '890',
      name: 'Jorge Castillo',
      level: 3,
      clientRole: null,
      status: { code: 'ACTIVO', label: 'Activo' },
      client: null,
      project: null,
      version: 2,
    },
    {
      id: 744,
      employeeNumber: '744',
      name: 'Alexis Montenegro',
      level: 3,
      clientRole: 'QA Automatizador',
      status: { code: 'ACTIVO', label: 'Activo' },
      client: { id: 4, name: 'COPA' },
      project: { id: 12, name: 'Copa Airlines - Comercial' },
      version: 5,
    },
  ],
  page: { number: 0, size: 25, totalElements: 31, totalPages: 2 },
  withoutProject: 2,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('bulkAssignmentApi', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches candidates using the contract DTO and pagination query', async () => {
    fetchMock.mockResolvedValue(jsonResponse(candidateResponse))

    await expect(bulkAssignmentApi.getCandidates(7, { q: 'Jorge', page: 0, size: 25 }))
      .resolves.toEqual(candidateResponse)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/planner/projects/7/candidates?page=0&size=25&q=Jorge')
    expect(init?.method).toBeUndefined()
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token')
  })

  it('posts the contract body and accepts an empty defaults object', async () => {
    const request = {
      defaults: {},
      members: [{ employeeId: 890, version: 2, leaderId: 755 }],
    }
    const response = {
      project: { id: 7, name: 'Core QA' },
      client: { id: 3, name: 'Banco Mercantil' },
      assigned: 1,
      added: 1,
      moved: 0,
      members: [{
        id: 890,
        name: 'Jorge Castillo',
        previousProject: null,
        endDate: '2027-03-31',
        indefinite: false,
        version: 3,
      }],
    }
    fetchMock.mockResolvedValue(jsonResponse(response))

    await expect(bulkAssignmentApi.assignMembers(7, request)).resolves.toEqual(response)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/planner/projects/7/members')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify(request))
  })

  it('preserves member and defaults validation errors from ProblemDetails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      code: 'VALIDATION_FAILED',
      errors: [
        {
          field: 'leaderId',
          code: 'REQUIRED',
          message: 'Selecciona el líder NPD.',
          employeeId: 890,
          index: 0,
        },
        {
          field: 'defaults.leaderId',
          code: 'REQUIRED',
          message: 'Selecciona el líder NPD.',
        },
      ],
    }, 400))

    await expect(bulkAssignmentApi.assignMembers(7, {
      defaults: {},
      members: [{ employeeId: 890, version: 2 }],
    })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      problem: {
        errors: [
          { field: 'leaderId', employeeId: 890, index: 0 },
          { field: 'defaults.leaderId' },
        ],
      },
    })
  })

  it('preserves concurrent modification details from ProblemDetails', async () => {
    const conflict = {
      code: 'CONCURRENT_MODIFICATION',
      members: [{
        currentVersion: 3,
        updatedBy: 'María Pérez',
        updatedAt: '2026-10-07T09:12:00Z',
      }],
    }
    fetchMock.mockResolvedValue(jsonResponse(conflict, 409))

    await expect(bulkAssignmentApi.assignMembers(7, {
      defaults: {},
      members: [{ employeeId: 890, version: 2, leaderId: 755 }],
    })).rejects.toMatchObject({
      status: 409,
      code: 'CONCURRENT_MODIFICATION',
      problem: conflict,
    })
  })

  it('surfaces invalid error response bodies instead of treating them as success', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }))
    const request = bulkAssignmentApi.getCandidates(7)

    await expect(request).rejects.toBeInstanceOf(BulkAssignmentApiError)
    await expect(request).rejects.toMatchObject({
      status: 503,
      code: 'API_ERROR',
    })
  })
})
