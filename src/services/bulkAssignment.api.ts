import { apiFetch } from './api'
import type {
  BulkAssignmentCandidatesQuery,
  BulkAssignmentCandidatesResponse,
  BulkAssignmentProblemDetails,
  BulkAssignmentRequest,
  BulkAssignmentResponse,
  BulkAssignmentValidationError,
} from './bulkAssignment.types'

export class BulkAssignmentApiError extends Error {
  readonly status: number
  readonly code: string
  readonly problem?: BulkAssignmentProblemDetails

  constructor(status: number, problem?: BulkAssignmentProblemDetails) {
    super(problem?.detail ?? problem?.title ?? 'No se pudo completar la asignación.')
    this.name = 'BulkAssignmentApiError'
    this.status = status
    this.code = problem?.code ?? 'API_ERROR'
    this.problem = problem
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidationError(value: unknown): value is BulkAssignmentValidationError {
  return isRecord(value)
    && typeof value.field === 'string'
    && typeof value.code === 'string'
    && typeof value.message === 'string'
    && (value.employeeId === undefined || typeof value.employeeId === 'number')
    && (value.index === undefined || typeof value.index === 'number')
}

function isConflictMember(value: unknown): value is NonNullable<BulkAssignmentProblemDetails['members']>[number] {
  return isRecord(value)
    && typeof value.currentVersion === 'number'
    && typeof value.updatedBy === 'string'
    && typeof value.updatedAt === 'string'
    && (value.employeeId === undefined || (typeof value.employeeId === 'number' && Number.isSafeInteger(value.employeeId)))
}

function parseProblemDetails(value: unknown): BulkAssignmentProblemDetails | undefined {
  if (!isRecord(value) || typeof value.code !== 'string') return undefined

  if (value.errors !== undefined
    && (!Array.isArray(value.errors) || !value.errors.every(isValidationError))) {
    return undefined
  }
  if (value.members !== undefined
    && (!Array.isArray(value.members) || !value.members.every(isConflictMember))) {
    return undefined
  }

  return {
    code: value.code,
    detail: typeof value.detail === 'string' ? value.detail : undefined,
    title: typeof value.title === 'string' ? value.title : undefined,
    field: typeof value.field === 'string' ? value.field : undefined,
    errors: value.errors as BulkAssignmentProblemDetails['errors'],
    members: value.members as BulkAssignmentProblemDetails['members'],
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new BulkAssignmentApiError(response.status)
  }

  const problem = parseProblemDetails(body)
  if (!problem) {
    throw new BulkAssignmentApiError(response.status, {
      code: 'INVALID_PROBLEM_DETAILS',
      detail: 'El servidor devolvió un error con formato no válido.',
    })
  }
  throw new BulkAssignmentApiError(response.status, problem)
}

export const bulkAssignmentApi = {
  async getCandidates(
    projectId: number,
    query: BulkAssignmentCandidatesQuery = {},
  ): Promise<BulkAssignmentCandidatesResponse> {
    const params = new URLSearchParams({
      page: String(query.page ?? 0),
      size: String(query.size ?? 25),
    })
    if (query.q?.trim()) params.set('q', query.q.trim())

    return readResponse<BulkAssignmentCandidatesResponse>(await apiFetch(
      'planner',
      `/projects/${encodeURIComponent(String(projectId))}/candidates?${params.toString()}`,
      { signal: query.signal },
    ))
  },

  async assignMembers(
    projectId: number,
    request: BulkAssignmentRequest,
  ): Promise<BulkAssignmentResponse> {
    return readResponse<BulkAssignmentResponse>(await apiFetch(
      'planner',
      `/projects/${encodeURIComponent(String(projectId))}/members`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    ))
  },
}

export type BulkAssignmentApi = typeof bulkAssignmentApi
