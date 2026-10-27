export interface CatalogItem {
  id: number
  name: string
}

export type ResourceStatusCode = 'ACTIVO' | 'LICENCIA' | 'BAJA'
export type ResourceSituationCode = 'ASIGNADO' | 'PENDIENTE_CONFIRMACION' | 'SIN_PROYECTO'

export interface StatusOption<T extends string = string> {
  code: T
  label: string
}

export interface Catalogs {
  jobTitles: CatalogItem[]
  positions: CatalogItem[]
  businessUnits: CatalogItem[]
  workModes: CatalogItem[]
  genders: CatalogItem[]
  talentReviews: CatalogItem[]
  clientRoles: CatalogItem[]
  equipment: CatalogItem[]
  terminationReasons: CatalogItem[]
  npdLeads: CatalogItem[]
  statuses: StatusOption<ResourceStatusCode>[]
}

export interface AssignmentRequest {
  /** Must be an active project that already exists: the API never creates projects */
  projectId: number
  leaderId: number
  clientRoleId: number | null
  equipmentId: number | null
  endDate: string | null
  indefinite: boolean
  clientContactEmail: string | null
}

export interface ResourceRequest {
  employeeNumber: string
  name: string
  email: string | null
  jobTitleId: number | null
  positionId: number
  /** Stored as a smallint, not a catalog */
  level: number | null
  businessUnitId: number | null
  workModeId: number
  genderId: number
  talentReviewId: number | null
  hireDate: string
  /** Marked by the user; defaults to today being within the 90 days after hireDate */
  onProbation: boolean
  status: ResourceStatusCode
  termination: { date: string; reasonId: number } | null
  assignment: AssignmentRequest | null
}

export interface ResourceResponse {
  id: number
  employeeNumber: string
  name: string
  email: string | null
  jobTitle: CatalogItem | null
  position: CatalogItem | null
  level: number | null
  businessUnit: CatalogItem | null
  workMode: CatalogItem | null
  gender: CatalogItem | null
  talentReview: CatalogItem | null
  hireDate: string
  probationEndDate: string | null
  status: StatusOption<ResourceStatusCode>
  situation: StatusOption<ResourceSituationCode>
  assignment: {
    client: CatalogItem
    project: CatalogItem & { contractEndDate: string | null }
    leader: CatalogItem
    clientRole: CatalogItem | null
    equipment: CatalogItem | null
    endDate: string | null
    indefinite: boolean
    clientContactEmail: string | null
  } | null
  termination: { date: string; reason: CatalogItem } | null
  fieldsToFix: string[]
  version: number
  updatedAt: string
  updatedBy: string
}
