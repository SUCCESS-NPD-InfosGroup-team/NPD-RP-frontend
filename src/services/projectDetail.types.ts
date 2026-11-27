export interface ProjectDetail {
  id: number
  name: string
  client: {
    id: number
    name: string
    isInternal: boolean
  }
  active: boolean
  startDate: string
  contractEndDate: string | null
  daysToContractEnd: number | null
  teamSize: number
  pendingConfirmation: number
  indefiniteCount: number
  nextAssignmentEnd: string | null
  leads: Array<{
    id: number
    name: string
  }>
  version: number
  updatedAt: string
}

export interface UpdateProjectRequest {
  name: string
  contractEndDate: string | null
  version: number
}

export interface UpdateProjectResponse {
  project: ProjectDetail
  membersEndDateMoved: number
}

export interface ProjectDetailMember {
  id: number
  employeeNumber: string
  name: string
  level: number
  clientRole: string | null
  leader: {
    id: number
    name: string
  } | null
  status: {
    code: 'ACTIVO' | 'LICENCIA'
    label: string
  }
  situation: {
    code: 'ASIGNADO' | 'PENDIENTE_CONFIRMACION'
    label: string
  }
  assignmentStart: string
  assignmentEnd: string | null
  indefinite: boolean
  daysToAssignmentEnd: number | null
  version: number
}

export interface ProjectDetailMembersResponse {
  items: ProjectDetailMember[]
  total: number
}
