import type { ResourceResponse } from '../../services/resources.types'

/** Respuesta de GET /api/v1/planner/resources/{id} (ResourceResponse del backend) */
export function buildResourceResponse(overrides: Partial<ResourceResponse> = {}): ResourceResponse {
  return {
    id: 1045,
    employeeNumber: '1045',
    name: 'Ana Torres',
    email: 'ana.torres@infosgroup.com',
    jobTitle: { id: 1, name: 'QA Funcional' },
    position: { id: 4, name: 'Analista' },
    level: 3,
    businessUnit: { id: 2, name: 'Testing' },
    workMode: { id: 1, name: 'Remoto' },
    gender: { id: 1, name: 'Femenino' },
    talentReview: null,
    hireDate: '2025-11-03',
    onProbation: false,
    probationEndDate: '2026-02-01',
    status: { code: 'ACTIVO', label: 'Activo' },
    situation: { code: 'ASIGNADO', label: 'Asignado' },
    assignment: {
      client: { id: 3, name: 'BANESCO' },
      project: { id: 41, name: 'Programa de automatización (DEYEL)', contractEndDate: '2026-12-31' },
      leader: { id: 755, name: 'Lorena Batista' },
      clientRole: { id: 7, name: 'QA Automatizador' },
      equipment: null,
      endDate: null,
      indefinite: true,
      clientContactEmail: null,
    },
    termination: null,
    fieldsToFix: [],
    version: 3,
    updatedAt: '2026-11-10T15:00:00Z',
    updatedBy: 'lbatista',
    ...overrides,
  }
}
