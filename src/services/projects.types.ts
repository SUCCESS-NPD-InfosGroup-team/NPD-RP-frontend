export interface Client {
  id: string
  name: string
  isInternal: boolean
  active: boolean
}

export interface ProjectMember {
  id: string
  initials: string
}

export interface Project {
  id: string
  name: string
  client: Pick<Client, 'id' | 'name' | 'isInternal'>
  teamSize: number
  members: ProjectMember[]
  leads: string[]
  leadIds?: number[]
  startDate: string
  contractEnd: string | null
  pendingCount: number
  active: boolean
}

/** Light project row for the "Proyecto asignado" selector: only active projects of one client */
export interface ClientProject {
  id: string
  name: string
  teamSize: number
  contractEndDate: string | null
}

export interface ProjectFilters {
  search?: string
  clientId?: string
  leadId?: string
  contractEnd?: 'next30' | 'next60' | 'none' | 'any'
  includeInactive?: boolean
}

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages?: number
}

export interface ProjectsSummary {
  activeProjects: number
  activeClients: number
  contractEndingSoon: number
  withoutTeam: number
  unassignedPeople: number
}

export interface CreateProjectInput {
  clientId?: string
  newClient?: { name: string; isInternal: boolean }
  name: string
  contractEnd?: string
}

export interface ApiError {
  status: number
  code: string
  detail: string
  title?: string
  errors?: Array<{
    field: string
    code: string
    message: string
    /** Only on an EMPLOYEE_NUMBER_TAKEN error that comes with other errors inside a 400 */
    existingResourceId?: number
    existingResourceName?: string
  }>
  field?: string
  existingProjectId?: number
  existingProjectName?: string
  existingResourceId?: number
  existingResourceName?: string
}

export class ApiRequestError extends Error implements ApiError {
  readonly status: number
  readonly code: string
  readonly detail: string
  readonly field?: string
  readonly existingProjectId?: number
  readonly existingProjectName?: string
  readonly errors?: ApiError['errors']
  readonly existingResourceId?: number
  readonly existingResourceName?: string

  constructor(error: ApiError) {
    super(error.detail)
    this.name = 'ApiRequestError'
    this.status = error.status
    this.code = error.code
    this.detail = error.detail
    this.field = error.field
    this.existingProjectId = error.existingProjectId
    this.existingProjectName = error.existingProjectName
    this.errors = error.errors
    this.existingResourceId = error.existingResourceId
    this.existingResourceName = error.existingResourceName
  }
}
