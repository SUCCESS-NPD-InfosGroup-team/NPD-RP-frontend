import type { ApiError } from '../../services/projects.types'
import type { ResourceRequest, ResourceSituationCode, ResourceStatusCode, StatusOption } from '../../services/resources.types'
import { addDaysIso, todayIso, toIsoDate } from '../../utils/dates'

/** Probation ends on day 90 counted from the contract start date (generated column in the DB) */
export const PROBATION_DAYS = 90
const SMALLINT_MAX = 32767
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ResourceFormValues {
  employeeNumber: string
  name: string
  email: string
  jobTitleId: string
  positionId: string
  level: string
  businessUnitId: string
  workModeId: string
  genderId: string
  talentReviewId: string
  hireDate: string
  /** null = follow the calculation from the hire date until the user marks or unmarks it */
  inProbation: boolean | null
  status: ResourceStatusCode | ''
  terminationDate: string
  terminationReasonId: string
  withProject: boolean
  /** Only filters the project selector; the API takes the client from the project */
  clientId: string
  projectId: string
  leaderId: string
  clientRoleId: string
  equipmentId: string
  endDate: string
  indefinite: boolean
  clientContactEmail: string
}

export const EMPTY_RESOURCE_FORM: ResourceFormValues = {
  employeeNumber: '',
  name: '',
  email: '',
  jobTitleId: '',
  positionId: '',
  level: '',
  businessUnitId: '',
  workModeId: '',
  genderId: '',
  talentReviewId: '',
  hireDate: '',
  inProbation: null,
  status: 'ACTIVO',
  terminationDate: '',
  terminationReasonId: '',
  withProject: true,
  clientId: '',
  projectId: '',
  leaderId: '',
  clientRoleId: '',
  equipmentId: '',
  endDate: '',
  indefinite: false,
  clientContactEmail: '',
}

/** Error keys are the API field paths, so 400 responses map onto the same fields */
export type FieldErrors = Record<string, string>

export const FIELD_LABELS: Record<string, string> = {
  employeeNumber: 'N° de empleado',
  name: 'Nombre de empleado',
  email: 'Correo del recurso',
  jobTitleId: 'Puesto',
  positionId: 'Posición en Infosgroup',
  level: 'Nivel',
  businessUnitId: 'UEN',
  workModeId: 'Modalidad laboral',
  genderId: 'Género',
  talentReviewId: 'Resultado de Talent Review',
  hireDate: 'Fecha de inicio de contrato',
  status: 'Estado',
  'termination.reasonId': 'Motivo de desvinculación',
  'termination.date': 'Fecha de desvinculación',
  'assignment.clientId': 'Cliente',
  'assignment.projectId': 'Proyecto asignado',
  'assignment.leaderId': 'Líder NPD',
  'assignment.clientRoleId': 'Rol actual en cliente',
  'assignment.equipmentId': 'Equipo / laptop',
  'assignment.endDate': 'Fecha final',
  'assignment.clientContactEmail': 'Contacto por cliente',
}

const FIELD_ORDER = Object.keys(FIELD_LABELS)

export function fieldId(path: string): string {
  return `resource-${path.replace(/\./g, '-')}`
}

export function orderedErrorFields(errors: FieldErrors): string[] {
  return Object.keys(errors).sort((a, b) => rank(a) - rank(b))
}

function rank(path: string): number {
  const index = FIELD_ORDER.indexOf(path)
  return index === -1 ? FIELD_ORDER.length : index
}

export function validateResourceForm(values: ResourceFormValues, today: string): FieldErrors {
  const errors: FieldErrors = {}
  const hireDate = toIsoDate(values.hireDate)

  if (!values.employeeNumber.trim()) errors.employeeNumber = 'Escribe el N° de empleado.'
  if (!values.name.trim()) errors.name = 'Escribe el nombre del colaborador.'
  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Usa un correo válido.'
  if (!values.positionId) errors.positionId = 'Selecciona la posición en Infosgroup.'
  if (values.level.trim() && !isSmallint(values.level.trim())) errors.level = 'Usa un número entero mayor que 0.'
  if (!values.workModeId) errors.workModeId = 'Selecciona la modalidad laboral.'
  if (!values.genderId) errors.genderId = 'Selecciona el género.'
  if (!values.hireDate) errors.hireDate = 'Indica el inicio de contrato.'
  else if (!hireDate) errors.hireDate = 'Usa una fecha válida en formato dd/mm/aaaa.'
  if (!values.status) errors.status = 'Selecciona el estado.'

  if (values.status === 'BAJA') {
    const terminationDate = toIsoDate(values.terminationDate)
    if (!values.terminationReasonId) errors['termination.reasonId'] = 'Selecciona el motivo de desvinculación.'
    if (!values.terminationDate) errors['termination.date'] = 'Indica la fecha de desvinculación.'
    else if (!terminationDate) errors['termination.date'] = 'Usa una fecha válida en formato dd/mm/aaaa.'
    else if (hireDate && terminationDate < hireDate) errors['termination.date'] = 'No puede ser anterior al inicio de contrato.'
    return errors
  }

  if (!values.withProject) return errors

  if (!values.clientId) errors['assignment.clientId'] = 'Selecciona el cliente.'
  if (!values.projectId) errors['assignment.projectId'] = 'Selecciona el proyecto.'
  if (!values.leaderId) errors['assignment.leaderId'] = 'Selecciona el líder NPD.'
  if (!values.indefinite) {
    const endDate = toIsoDate(values.endDate)
    if (!values.endDate) errors['assignment.endDate'] = 'Indica la fecha final o marca indefinido.'
    else if (!endDate) errors['assignment.endDate'] = 'Usa una fecha válida en formato dd/mm/aaaa.'
    else if (endDate < today) errors['assignment.endDate'] = 'Ya pasó. Usa una fecha futura o marca indefinido.'
  }
  const contact = values.clientContactEmail.trim()
  if (contact && !EMAIL_PATTERN.test(contact)) errors['assignment.clientContactEmail'] = 'Usa un correo válido.'
  return errors
}

function isSmallint(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= SMALLINT_MAX
}

export interface ProbationInfo {
  /** Day 90 from the hire date, as yyyy-MM-dd */
  endDate?: string
  /** Month (1-12) when 11 months since the hire date are completed */
  vacationMonth?: number
  checked: boolean
}

export function probationInfo(values: ResourceFormValues, today: string): ProbationInfo {
  const hireDate = toIsoDate(values.hireDate)
  if (!hireDate) return { checked: values.inProbation ?? false }
  const endDate = addDaysIso(hireDate, PROBATION_DAYS)
  return {
    endDate,
    vacationMonth: ((Number(hireDate.slice(5, 7)) + 10) % 12) + 1,
    checked: values.inProbation ?? today <= endDate,
  }
}

const optionalId = (value: string) => (value ? Number(value) : null)
const optionalText = (value: string) => value.trim() || null

export function toResourceRequest(values: ResourceFormValues, today = todayIso()): ResourceRequest {
  const terminated = values.status === 'BAJA'
  return {
    employeeNumber: values.employeeNumber.trim(),
    name: values.name.trim(),
    email: optionalText(values.email),
    jobTitleId: optionalId(values.jobTitleId),
    positionId: Number(values.positionId),
    level: values.level.trim() ? Number(values.level.trim()) : null,
    businessUnitId: optionalId(values.businessUnitId),
    workModeId: Number(values.workModeId),
    genderId: Number(values.genderId),
    talentReviewId: optionalId(values.talentReviewId),
    hireDate: toIsoDate(values.hireDate) ?? '',
    inProbation: probationInfo(values, today).checked,
    status: values.status || 'ACTIVO',
    termination: terminated
      ? { date: toIsoDate(values.terminationDate) ?? '', reasonId: Number(values.terminationReasonId) }
      : null,
    // A terminated person is stored without a project (BD-08)
    assignment: !terminated && values.withProject
      ? {
          projectId: Number(values.projectId),
          leaderId: Number(values.leaderId),
          clientRoleId: optionalId(values.clientRoleId),
          equipmentId: optionalId(values.equipmentId),
          endDate: values.indefinite ? null : (toIsoDate(values.endDate) ?? null),
          indefinite: values.indefinite,
          clientContactEmail: optionalText(values.clientContactEmail),
        }
      : null,
  }
}

/** Preview only: the backend calculates and stores the real situation */
export function previewSituation(values: ResourceFormValues): StatusOption<ResourceSituationCode> {
  if (values.status !== 'BAJA' && values.withProject && values.projectId) return { code: 'ASIGNADO', label: 'Asignado' }
  return { code: 'SIN_PROYECTO', label: 'Sin proyecto' }
}

export function apiFieldErrors(errors: ApiError['errors']): FieldErrors {
  return Object.fromEntries((errors ?? []).map(({ field, message }) => [field, message]))
}
