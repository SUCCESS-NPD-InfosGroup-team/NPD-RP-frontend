// TODO confirmar contrato con Vela (SCRUM-121)
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
  startDate: string
  contractEnd: string | null
  pendingCount: number
  active: boolean
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
  pageSize: 25
  total: number
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
  message: string
  field?: string
  existingProjectId?: string
  existingProjectName?: string
}
