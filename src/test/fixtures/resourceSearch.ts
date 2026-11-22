import type { RecursoApi, ResourceSearchResponse } from '../../types'

/**
 * Respuesta real de GET /api/v1/planner/resources (ResourceSearchResponse en el backend),
 * con los campos de los records del backend. Los mocks de los tests parten de aquí para no esconder errores
 * de contrato (BUG-07).
 */
export const resourceSearchResponse = {
  items: [
    {
      id: 1,
      employeeNumber: '1045',
      name: 'Ana Torres',
      level: 3,
      clientRole: 'QA',
      leader: { id: 1, name: 'Lorena' },
      status: { code: 'ACTIVO', label: 'Activo' },
      situation: { code: 'ASIGNADO', label: 'Asignado' },
      hireDate: '2025-11-03',
      onProbation: false,
      probationEndDate: '2026-02-01',
      projectId: 1,
      assignmentStart: '2026-01-01',
      assignmentEnd: '2026-12-31',
      indefinite: false,
      daysToAssignmentEnd: 42,
      project: { id: 1, name: 'DEYEL' },
      client: { id: 1, name: 'BANESCO' },
      projectActive: true,
      version: 3,
    },
  ],
  groups: [
    {
      type: 'PROJECT',
      projectId: 1,
      project: 'DEYEL',
      client: { id: 1, name: 'BANESCO' },
      contractEndDate: '2026-12-31',
      total: 1,
    },
  ],
  page: { number: 0, size: 25, totalElements: 1, totalPages: 1 },
} satisfies ResourceSearchResponse

export function buildResource(overrides: Partial<RecursoApi> = {}): RecursoApi {
  return { ...resourceSearchResponse.items[0], ...overrides }
}

export function buildResourceSearchResponse(
  items: RecursoApi[] = resourceSearchResponse.items,
  page: Partial<ResourceSearchResponse['page']> = {},
): ResourceSearchResponse {
  return {
    items,
    groups: items.length ? resourceSearchResponse.groups : [],
    page: { ...resourceSearchResponse.page, totalElements: items.length, ...page },
  }
}
