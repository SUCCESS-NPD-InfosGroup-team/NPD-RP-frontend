import type { ApiError } from '../../services/projects.types'
import type { ResourceRequest, ResourceResponse, ResourceSituationCode, ResourceStatusCode, StatusOption } from '../../services/resources.types'
import { addDaysIso, fromIsoDate, todayIso, toIsoDate } from '../../utils/dates'
import type { ProjectChoice } from './registerProject'

/** Probation ends on day 90 counted from the contract start date (generated column in the DB) */
export const PROBATION_DAYS = 90
const SMALLINT_MAX = 32767
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

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
  onProbation: boolean | null
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
  onProbation: null,
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
  return `resource-${path.replaceAll('.', '-')}`
}

export function orderedErrorFields(errors: FieldErrors): string[] {
  return Object.keys(errors).sort((a, b) => rank(a) - rank(b))
}

function rank(path: string): number {
  const index = FIELD_ORDER.indexOf(path)
  return index === -1 ? FIELD_ORDER.length : index
}

const INVALID_DATE = 'Usa una fecha válida en formato dd/mm/aaaa.'

type Rule = [path: string, message: string | false]

/** Keeps the first failing message of each field */
function collectErrors(rules: Rule[]): FieldErrors {
  const errors: FieldErrors = {}
  for (const [path, message] of rules) {
    if (message && !(path in errors)) errors[path] = message
  }
  return errors
}

/** Message for a required dd/mm/aaaa date, or false when it is valid */
function requiredDateError(raw: string, missing: string): string | false {
  if (!raw) return missing
  return toIsoDate(raw) ? false : INVALID_DATE
}

function invalidEmail(raw: string): boolean {
  const email = raw.trim()
  return email !== '' && !EMAIL_PATTERN.test(email)
}

function personRules(values: ResourceFormValues): Rule[] {
  const level = values.level.trim()
  return [
    ['employeeNumber', !values.employeeNumber.trim() && 'Escribe el N° de empleado.'],
    ['name', !values.name.trim() && 'Escribe el nombre del colaborador.'],
    ['email', invalidEmail(values.email) && 'Usa un correo válido.'],
    ['positionId', !values.positionId && 'Selecciona la posición en Infosgroup.'],
    ['level', level !== '' && !isSmallint(level) && 'Usa un número entero mayor que 0.'],
    ['workModeId', !values.workModeId && 'Selecciona la modalidad laboral.'],
    ['genderId', !values.genderId && 'Selecciona el género.'],
    ['hireDate', requiredDateError(values.hireDate, 'Indica el inicio de contrato.')],
    ['status', !values.status && 'Selecciona el estado.'],
  ]
}

function terminationRules(values: ResourceFormValues): Rule[] {
  const hireDate = toIsoDate(values.hireDate)
  const terminationDate = toIsoDate(values.terminationDate)
  return [
    ['termination.reasonId', !values.terminationReasonId && 'Selecciona el motivo de desvinculación.'],
    ['termination.date', requiredDateError(values.terminationDate, 'Indica la fecha de desvinculación.')],
    ['termination.date', Boolean(hireDate && terminationDate && terminationDate < hireDate) && 'No puede ser anterior al inicio de contrato.'],
  ]
}

function assignmentRules(values: ResourceFormValues, today: string): Rule[] {
  const endDate = toIsoDate(values.endDate)
  return [
    ['assignment.clientId', !values.clientId && 'Selecciona el cliente.'],
    ['assignment.projectId', !values.projectId && 'Selecciona el proyecto.'],
    ['assignment.leaderId', !values.leaderId && 'Selecciona el líder NPD.'],
    ['assignment.endDate', !values.indefinite && requiredDateError(values.endDate, 'Indica la fecha final o marca indefinido.')],
    ['assignment.endDate', !values.indefinite && Boolean(endDate && endDate < today) && 'Ya pasó. Usa una fecha futura o marca indefinido.'],
    ['assignment.clientContactEmail', invalidEmail(values.clientContactEmail) && 'Usa un correo válido.'],
  ]
}

export function validateResourceForm(values: ResourceFormValues, today: string): FieldErrors {
  const rules = personRules(values)
  if (values.status === 'BAJA') rules.push(...terminationRules(values))
  else if (values.withProject) rules.push(...assignmentRules(values, today))
  return collectErrors(rules)
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
  if (!hireDate) return { checked: values.onProbation ?? false }
  const endDate = addDaysIso(hireDate, PROBATION_DAYS)
  return {
    endDate,
    vacationMonth: ((Number(hireDate.slice(5, 7)) + 10) % 12) + 1,
    checked: values.onProbation ?? today <= endDate,
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
    onProbation: probationInfo(values, today).checked,
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

/**
 * Registering (SCRUM-84): the project is chosen in step 1, not in the form, so it overrides
 * whatever the form holds for «¿Tiene proyecto?», client and project.
 */
export function withProjectChoice(values: ResourceFormValues, choice: ProjectChoice): ResourceFormValues {
  if (choice.kind === 'none') return { ...values, withProject: false, clientId: '', projectId: '' }
  return { ...values, withProject: true, clientId: choice.project.client.id, projectId: choice.project.id }
}

/** Preview only: the backend calculates and stores the real situation */
export function previewSituation(values: ResourceFormValues): StatusOption<ResourceSituationCode> {
  if (values.status !== 'BAJA' && values.withProject && values.projectId) return { code: 'ASIGNADO', label: 'Asignado' }
  return { code: 'SIN_PROYECTO', label: 'Sin proyecto' }
}

export function apiFieldErrors(errors: ApiError['errors']): FieldErrors {
  return Object.fromEntries((errors ?? []).map(({ field, message }) => [field, message]))
}

/** Message for a field that still holds an imported «No especificado» value (HU-02 CA-08) */
export const NOT_SPECIFIED_MESSAGE = 'Tiene «No especificado» del import. Elige el valor real.'

const idText = (item: { id: number } | null | undefined) => (item ? String(item.id) : '')
const dateText = (iso: string | null | undefined) => (iso ? fromIsoDate(iso) : '')

/**
 * Prefills the edit form with the record from GET /planner/resources/{id} (HU-02).
 * Fields listed in `fieldsToFix` start empty: their «No especificado» value is inactive, so it is
 * not among the options and the API rejects it until the real value is chosen (CA-08).
 */
export function fromResourceResponse(resource: ResourceResponse): ResourceFormValues {
  const fix = new Set(resource.fieldsToFix)
  const assignment = resource.assignment
  const projectToFix = fix.has('assignment.projectId')
  return {
    employeeNumber: resource.employeeNumber,
    name: resource.name,
    email: resource.email ?? '',
    jobTitleId: idText(resource.jobTitle),
    positionId: idText(resource.position),
    level: resource.level == null ? '' : String(resource.level),
    businessUnitId: idText(resource.businessUnit),
    workModeId: fix.has('workModeId') ? '' : idText(resource.workMode),
    genderId: idText(resource.gender),
    talentReviewId: idText(resource.talentReview),
    hireDate: dateText(resource.hireDate),
    onProbation: resource.onProbation,
    status: resource.status.code,
    terminationDate: dateText(resource.termination?.date),
    terminationReasonId: idText(resource.termination?.reason),
    withProject: assignment !== null,
    clientId: assignment && !projectToFix ? idText(assignment.client) : '',
    projectId: assignment && !projectToFix ? idText(assignment.project) : '',
    leaderId: idText(assignment?.leader),
    clientRoleId: idText(assignment?.clientRole),
    equipmentId: idText(assignment?.equipment),
    endDate: dateText(assignment?.endDate),
    indefinite: assignment?.indefinite ?? false,
    clientContactEmail: assignment?.clientContactEmail ?? '',
  }
}

/** Field errors that point at the «No especificado» values to fix */
export function fieldsToFixErrors(fieldsToFix: readonly string[]): FieldErrors {
  return Object.fromEntries(fieldsToFix.map((path) => [path, NOT_SPECIFIED_MESSAGE]))
}
