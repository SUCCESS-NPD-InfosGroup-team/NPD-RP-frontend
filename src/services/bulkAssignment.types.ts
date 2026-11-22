export interface BulkAssignmentCandidate {
  id: number
  employeeNumber: string
  name: string
  level: number
  clientRole: string | null
  status: { code: string; label: string }
  client: { id: number; name: string } | null
  project: { id: number; name: string } | null
  version: number
}

export interface BulkAssignmentCandidatesResponse {
  items: BulkAssignmentCandidate[]
  page: {
    number: number
    size: number
    totalElements: number
    totalPages: number
  }
  withoutProject: number
}

export interface BulkAssignmentCandidatesQuery {
  q?: string
  page?: number
  size?: number
  signal?: AbortSignal
}

export interface BulkAssignmentValues {
  leaderId?: number
  clientRoleId?: number
  equipmentId?: number
  endDate?: string | null
  indefinite?: boolean
}

export type BulkAssignmentDefaults = BulkAssignmentValues

export interface BulkAssignmentMember extends BulkAssignmentValues {
  employeeId: number
  version: number
}

export interface BulkAssignmentRequest {
  defaults: BulkAssignmentDefaults
  members: BulkAssignmentMember[]
}

export interface BulkAssignmentResponse {
  project: { id: number; name: string }
  client: { id: number; name: string }
  assigned: number
  added: number
  moved: number
  members: Array<{
    id: number
    name: string
    previousProject: { id: number; name: string } | null
    endDate: string | null
    indefinite: boolean
    version: number
  }>
}

export interface BulkAssignmentValidationError {
  field: string
  code: string
  message: string
  employeeId?: number
  index?: number
}

export interface BulkAssignmentConflictMember {
  /** pendiente de confirmar con backend (SCRUM-127) */
  employeeId?: number
  currentVersion: number
  updatedBy: string
  updatedAt: string
  [key: string]: unknown
}

export interface BulkAssignmentProblemDetails {
  code: string
  detail?: string
  title?: string
  field?: string
  errors?: BulkAssignmentValidationError[]
  members?: BulkAssignmentConflictMember[]
}
