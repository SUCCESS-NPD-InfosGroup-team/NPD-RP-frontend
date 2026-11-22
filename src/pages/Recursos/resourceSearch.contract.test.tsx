import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchRecursos } from '../../services/api'
import { resourceSearchResponse } from '../../test/fixtures/resourceSearch'
import type { RecursoApi } from '../../types'
import { toRecurso } from './resourceMapper'

vi.mock('../../auth/keycloak', async () => (await import('../../test/keycloakMock')).fakeAuthModule)

/**
 * Contrato de GET /api/v1/planner/resources (BUG-07).
 * Campos de los records del backend: ResourceSearchResponse, PageInfo,
 * ResourceGroupResponse y ResourceListItemResponse (módulo planner).
 * Si el backend cambia el DTO, hay que actualizar estas listas, el fixture
 * y el tipo ResourceSearchResponse a la vez.
 */
const RESPONSE_FIELDS = ['items', 'groups', 'page']
const PAGE_FIELDS = ['number', 'size', 'totalElements', 'totalPages']
const GROUP_FIELDS = ['type', 'projectId', 'project', 'client', 'contractEndDate', 'total']
const ITEM_FIELDS = [
  'id', 'employeeNumber', 'name', 'level', 'clientRole', 'leader', 'status', 'situation',
  'hireDate', 'onProbation', 'probationEndDate', 'projectId', 'assignmentStart',
  'assignmentEnd', 'indefinite', 'daysToAssignmentEnd', 'project', 'client', 'projectActive', 'version',
]

const sorted = (keys: string[]) => [...keys].sort((a, b) => a.localeCompare(b))

describe('GET /planner/resources contract', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(JSON.stringify(resourceSearchResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the planner module with a zero-based page', async () => {
    await searchRecursos({ search: '', estado: 'Todos' }, 2, 25)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/planner/resources?page=1&size=25')
    expect(init?.method ?? 'GET').toBe('GET')
  })

  it('returns the response with the backend shape', async () => {
    const response = await searchRecursos({ search: '', estado: 'Todos' })

    expect(sorted(Object.keys(response))).toEqual(sorted(RESPONSE_FIELDS))
    expect(response).toEqual(resourceSearchResponse)
  })

  it('paginates with a page object, not top-level numbers', async () => {
    const { page } = await searchRecursos({ search: '', estado: 'Todos' })

    expect(sorted(Object.keys(page))).toEqual(sorted(PAGE_FIELDS))
    for (const field of PAGE_FIELDS) {
      expect(page[field as keyof typeof page]).toEqual(expect.any(Number))
    }
  })

  it('returns groups as a list of ResourceGroupResponse', async () => {
    const { groups } = await searchRecursos({ search: '', estado: 'Todos' })

    expect(Array.isArray(groups)).toBe(true)
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(sorted(Object.keys(group))).toEqual(sorted(GROUP_FIELDS))
    }
  })

  it('returns items with assignment dates instead of startDate/endDate', async () => {
    const { items } = await searchRecursos({ search: '', estado: 'Todos' })

    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(sorted(Object.keys(item))).toEqual(sorted(ITEM_FIELDS))
      expect(item).not.toHaveProperty('startDate')
      expect(item).not.toHaveProperty('endDate')
      expect(item.status).toEqual({ code: expect.any(String), label: expect.any(String) })
    }
  })

  it('maps the optional API version into the roster model only when provided', () => {
    const resource = resourceSearchResponse.items[0]
    expect(toRecurso(resource).version).toBe(3)

    const resourceWithoutVersion: RecursoApi = { ...resource }
    delete resourceWithoutVersion.version
    expect(toRecurso(resourceWithoutVersion)).not.toHaveProperty('version')
  })
})
