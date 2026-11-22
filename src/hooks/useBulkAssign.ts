import { useCallback, useMemo, useRef, useState } from 'react'
import { bulkAssignmentApi, BulkAssignmentApiError } from '../services/bulkAssignment.api'
import { getResourcesApi } from '../services/resources'
import type { ResourceResponse } from '../services/resources.types'
import { todayIso } from '../utils/dates'
import type {
  BulkAssignmentConflictMember,
  BulkAssignmentDefaults,
  BulkAssignmentMember,
  BulkAssignmentProblemDetails,
  BulkAssignmentResponse,
  BulkAssignmentValidationError,
} from '../services/bulkAssignment.types'

export const MAX_BULK_ASSIGNMENT_SELECTION = 100

export type BulkAssignStep = 'project' | 'assignment'

export interface BulkAssignResource {
  employeeId: number
  employeeNumber: string
  name: string
  statusCode: string
  version?: number
  leaderId?: number | null
  clientRoleId?: number | null
  clientRoleName?: string | null
  equipmentId?: number | null
  currentClientName?: string | null
  currentProjectName?: string | null
}
const CONCURRENT_MODIFICATION_MESSAGE = 'Algunos recursos cambiaron desde que se cargaron. Recarga los registros antes de confirmar.'

export interface BulkAssignPerson extends Omit<BulkAssignResource, 'version'> {
  version: number
}

export interface BulkAssignProject {
  id: number
  name: string
  client: { id: number; name: string }
  teamSize: number
  contractEndDate: string | null
}

export interface BulkAssignRow {
  employeeId: number
  employeeNumber: string
  name: string
  version: number
  leaderId?: number
  clientRoleName?: string | null
  clientRoleId?: number
  equipmentId?: number
  endDate?: string | null
  indefinite?: boolean
}

export interface BulkAssignErrors {
  request: BulkAssignmentValidationError[]
  defaults: BulkAssignmentValidationError[]
  rows: Record<number, BulkAssignmentValidationError[]>
}

export interface BulkAssignSubmitError {
  code: string
  message: string
  status?: number
}

export interface UseBulkAssignOptions {
  assignMembers?: typeof bulkAssignmentApi.assignMembers
  loadResource?: (employeeId: number) => Promise<ResourceResponse>
}

const VALIDATION_MESSAGES: Record<string, string> = {
  REQUIRED: 'Este campo es obligatorio.',
  UNKNOWN_ID: 'El valor seleccionado no existe.',
  TERMINATED: 'No se puede asignar una persona en Baja.',
  ALREADY_IN_PROJECT: 'La persona ya pertenece a este proyecto.',
  DUPLICATED: 'La persona está duplicada en la solicitud.',
  INACTIVE_LEADER: 'El líder NPD seleccionado está inactivo.',
  SELF_LEADER: 'Una persona no puede ser su propio líder.',
  DATE_IN_PAST: 'La fecha fin debe ser futura.',
  CONFLICTING_VALUES: 'Elige una fecha fin o indefinido, no ambos.',
  TOO_MANY: 'No se pueden asignar más de 100 colaboradores.',
  INACTIVE_PROJECT: 'El proyecto seleccionado está inactivo.',
}

function emptyErrors(): BulkAssignErrors {
  return { request: [], defaults: [], rows: {} }
}

async function loadResourceById(employeeId: number): Promise<ResourceResponse> {
  const api = await getResourcesApi()
  return api.getResource(employeeId)
}

function isValidVersion(version: number | undefined): version is number {
  return typeof version === 'number' && Number.isInteger(version) && version >= 0
}

function toPerson(resource: BulkAssignResource): BulkAssignPerson | undefined {
  if (!isValidVersion(resource.version)) return undefined
  return { ...resource, version: resource.version }
}

function rowsFor(resources: BulkAssignResource[]): BulkAssignRow[] {
  return resources.flatMap((resource) => {
    const person = toPerson(resource)
    if (!person) return []

    return [{
      employeeId: person.employeeId,
      employeeNumber: person.employeeNumber,
      name: person.name,
      version: person.version,
      ...(person.leaderId == null ? {} : { leaderId: person.leaderId }),
      ...(person.clientRoleId == null ? {} : { clientRoleId: person.clientRoleId }),
      ...(person.clientRoleName === undefined ? {} : { clientRoleName: person.clientRoleName }),
      ...(person.equipmentId == null ? {} : { equipmentId: person.equipmentId }),
    }]
  })
}

function toMember(row: BulkAssignRow): BulkAssignmentMember {
  return {
    employeeId: row.employeeId,
    version: row.version,
    ...(row.leaderId === undefined ? {} : { leaderId: row.leaderId }),
    ...(row.clientRoleId === undefined ? {} : { clientRoleId: row.clientRoleId }),
    ...(row.equipmentId === undefined ? {} : { equipmentId: row.equipmentId }),
    ...(row.endDate === undefined ? {} : { endDate: row.endDate }),
    ...(row.indefinite === undefined ? {} : { indefinite: row.indefinite }),
  }
}

function assignProblemErrors(
  problem: BulkAssignmentProblemDetails | undefined,
  rows: BulkAssignRow[],
): BulkAssignErrors {
  const result = emptyErrors()
  for (const originalError of problem?.errors ?? []) {
    const error = VALIDATION_MESSAGES[originalError.code]
      ? { ...originalError, message: VALIDATION_MESSAGES[originalError.code] }
      : originalError
    const employeeId = error.employeeId ?? (error.index === undefined ? undefined : rows[error.index]?.employeeId)
    if (employeeId !== undefined) {
      result.rows[employeeId] = [...(result.rows[employeeId] ?? []), error]
    } else if (error.field.startsWith('defaults.')) {
      result.defaults.push(error)
    } else {
      result.request.push(error)
    }
  }
  return result
}

function submitMessage(error: BulkAssignmentApiError): string {
  if (error.status === 403) return 'No tienes permiso para asignar colaboradores.'
  if (error.status === 404) return 'El proyecto seleccionado ya no existe.'
  if (error.status === 409) return CONCURRENT_MODIFICATION_MESSAGE
  if (error.code === 'INACTIVE_PROJECT') return VALIDATION_MESSAGES.INACTIVE_PROJECT
  if (error.code === 'TOO_MANY') return VALIDATION_MESSAGES.TOO_MANY
  if (error.code === 'VALIDATION_FAILED') return 'Corrige los campos marcados antes de asignar.'
  return error.message
}

function resourceToBulkAssign(resource: ResourceResponse, previous: BulkAssignResource): BulkAssignResource {
  return {
    ...previous,
    employeeNumber: resource.employeeNumber,
    name: resource.name,
    statusCode: resource.status.code,
    version: resource.version,
    leaderId: resource.assignment?.leader?.id,
    clientRoleId: resource.assignment?.clientRole?.id,
    clientRoleName: resource.assignment?.clientRole?.name,
    equipmentId: resource.assignment?.equipment?.id,
    currentClientName: resource.assignment?.client.name ?? null,
    currentProjectName: resource.assignment?.project.name ?? null,
  }
}

export function useBulkAssign({
  assignMembers = bulkAssignmentApi.assignMembers,
  loadResource = loadResourceById,
}: UseBulkAssignOptions = {}) {
  const [selection, setSelection] = useState<Map<number, BulkAssignResource>>(() => new Map())
  const [selectionError, setSelectionError] = useState<string>()
  const [step, setStep] = useState<BulkAssignStep>('project')
  const [project, setProject] = useState<BulkAssignProject | null>(null)
  const [defaults, setDefaultsState] = useState<BulkAssignmentDefaults>({})
  const [rows, setRows] = useState<BulkAssignRow[]>([])
  const [errors, setErrors] = useState<BulkAssignErrors>(emptyErrors)
  const [submitError, setSubmitError] = useState<BulkAssignSubmitError>()
  const [conflicts, setConflicts] = useState<BulkAssignmentConflictMember[]>([])
  const [isReloadingConflicts, setIsReloadingConflicts] = useState(false)
  const [conflictReloadError, setConflictReloadError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<BulkAssignmentResponse>()
  const selectionRef = useRef(selection)
  const submittingRef = useRef(false)
  const selectedPeople = useMemo(() => [...selection.values()], [selection])

  const resetAssignment = useCallback(() => {
    setStep('project')
    setProject(null)
    setDefaultsState({})
    setRows([])
    setErrors(emptyErrors())
    setSubmitError(undefined)
    setConflicts([])
    setIsReloadingConflicts(false)
    setConflictReloadError('')
    setResult(undefined)
  }, [])

  const updateSelection = useCallback((update: (current: Map<number, BulkAssignResource>) => Map<number, BulkAssignResource>) => {
    const next = update(selectionRef.current)
    selectionRef.current = next
    setSelection(next)
  }, [])

  const togglePerson = useCallback((person: BulkAssignResource) => {
    if (person.statusCode.toUpperCase() === 'BAJA') {
      setSelectionError(`${person.name} está en Baja y no se puede seleccionar.`)
      return undefined
    }

    const currentSelection = selectionRef.current
    const alreadySelected = currentSelection.has(person.employeeId)
    if (!alreadySelected && currentSelection.size >= MAX_BULK_ASSIGNMENT_SELECTION) {
      setSelectionError(`Puedes seleccionar hasta ${MAX_BULK_ASSIGNMENT_SELECTION} colaboradores.`)
      return
    }

    updateSelection((current) => {
      const next = new Map(current)
      if (next.has(person.employeeId)) next.delete(person.employeeId)
      else next.set(person.employeeId, person)
      return next
    })
    setSelectionError(undefined)
    resetAssignment()
  }, [resetAssignment, updateSelection])

  const toggleGroup = useCallback((visiblePeople: BulkAssignResource[]) => {
    const visible = [...new Map(visiblePeople.map((person) => [person.employeeId, person])).values()]
      .filter((person) => person.statusCode.toUpperCase() !== 'BAJA')
    if (!visible.length) return

    const currentSelection = selectionRef.current
    const allSelected = visible.every((person) => currentSelection.has(person.employeeId))
    if (allSelected) {
      updateSelection((current) => {
        const next = new Map(current)
        visible.forEach((person) => next.delete(person.employeeId))
        return next
      })
    } else {
      const additions = visible.filter((person) => !currentSelection.has(person.employeeId))
      if (currentSelection.size + additions.length > MAX_BULK_ASSIGNMENT_SELECTION) {
        setSelectionError(`Puedes seleccionar hasta ${MAX_BULK_ASSIGNMENT_SELECTION} colaboradores.`)
        return
      }
      updateSelection((current) => {
        const next = new Map(current)
        additions.forEach((person) => next.set(person.employeeId, person))
        return next
      })
    }

    setSelectionError(undefined)
    resetAssignment()
  }, [resetAssignment, updateSelection])

  const clearSelection = useCallback(() => {
    updateSelection(() => new Map())
    setSelectionError(undefined)
    resetAssignment()
  }, [resetAssignment, updateSelection])

  const chooseProject = useCallback((target: BulkAssignProject) => {
    setProject(target)
    setRows(rowsFor([...selectionRef.current.values()]))
    setErrors(emptyErrors())
    setSubmitError(undefined)
    setConflicts([])
    setResult(undefined)
    setStep('assignment')
  }, [])

  const backToProjectStep = useCallback(() => setStep('project'), [])

  const setDefaults = useCallback((changes: Partial<BulkAssignmentDefaults>) => {
    setDefaultsState((current) => ({ ...current, ...changes }))
    setErrors((current) => ({ ...current, defaults: [] }))
    setSubmitError(undefined)
  }, [])

  const updateRow = useCallback((
    employeeId: number,
    changes: Partial<Omit<BulkAssignRow, 'employeeId' | 'employeeNumber' | 'name' | 'version'>>,
  ) => {
    setRows((current) => current.map((row) => row.employeeId === employeeId ? { ...row, ...changes } : row))
    setErrors((current) => {
      const rowErrors = current.rows[employeeId]
      if (!rowErrors) return current
      const clearedFields = new Set(Object.keys(changes))
      const remaining = rowErrors.filter((error) => !clearedFields.has(error.field))
      const nextRows = { ...current.rows }
      if (remaining.length) nextRows[employeeId] = remaining
      else delete nextRows[employeeId]
      return { ...current, rows: nextRows }
    })
    setSubmitError(undefined)
  }, [])

  const applyDefaultsToAll = useCallback(() => {
    setRows((current) => current.map((row) => ({
      ...row,
      ...(defaults.leaderId === undefined ? {} : { leaderId: defaults.leaderId }),
      ...(defaults.clientRoleId === undefined ? {} : { clientRoleId: defaults.clientRoleId }),
      ...(defaults.equipmentId === undefined ? {} : { equipmentId: defaults.equipmentId }),
      ...(defaults.endDate === undefined ? {} : { endDate: defaults.endDate }),
      ...(defaults.indefinite === undefined ? {} : { indefinite: defaults.indefinite }),
    })))
  }, [defaults])

  const reloadConflictMember = useCallback(async (employeeId?: number) => {
    const targetPeople = employeeId === undefined
      ? selectedPeople
      : selectedPeople.filter((person) => person.employeeId === employeeId)
    if (!targetPeople.length) {
      setConflictReloadError('No se encontró el colaborador que se debe recargar. Actualiza el roster e inténtalo de nuevo.')
      return
    }

    setIsReloadingConflicts(true)
    setConflictReloadError('')
    try {
      const updatedResources = await Promise.all(targetPeople.map(async (person) => ({
        previous: person,
        resource: await loadResource(person.employeeId),
      })))
      const updatedById = new Map(updatedResources.map(({ previous, resource }) => [
        previous.employeeId,
        resourceToBulkAssign(resource, previous),
      ]))
      updateSelection((current) => {
        const next = new Map(current)
        updatedById.forEach((person, id) => next.set(id, person))
        return next
      })
      setRows((current) => current.map((row) => {
        const updated = updatedById.get(row.employeeId)
        return updated?.version === undefined ? row : { ...row, version: updated.version }
      }))
      const remainingConflicts = employeeId === undefined
        ? []
        : conflicts.filter((conflict) => conflict.employeeId !== employeeId)
      setConflicts(remainingConflicts)
      setErrors(emptyErrors())
      setSubmitError(remainingConflicts.length
        ? { code: 'CONCURRENT_MODIFICATION', message: CONCURRENT_MODIFICATION_MESSAGE }
        : undefined)
    } catch (cause) {
      setConflictReloadError(cause instanceof Error
        ? `No se pudo recargar el registro: ${cause.message}`
        : 'No se pudo recargar el registro. Intenta de nuevo.')
    } finally {
      setIsReloadingConflicts(false)
    }
  }, [conflicts, loadResource, selectedPeople, updateSelection])

  const submit = useCallback(async (): Promise<BulkAssignmentResponse | undefined> => {
    if (submittingRef.current) return undefined
    if (!project) {
      setSubmitError({ code: 'PROJECT_REQUIRED', message: 'Selecciona un proyecto antes de continuar.' })
      return undefined
    }
    if (selectedPeople.length === 0) {
      setSubmitError({ code: 'MEMBERS_REQUIRED', message: 'Selecciona al menos un colaborador.' })
      return undefined
    }

    const missingVersion = selectedPeople.filter((person) => !isValidVersion(person.version))
    if (missingVersion.length) {
      const rowsWithErrors = { ...errors.rows }
      for (const person of missingVersion) {
        rowsWithErrors[person.employeeId] = [{
          field: 'version',
          code: 'VERSION_REQUIRED',
          message: `No se puede asignar a ${person.name}: falta la versión del registro. Recarga los recursos para volver a intentarlo.`,
        }]
      }
      setErrors({ ...errors, rows: rowsWithErrors })
      setSubmitError({
        code: 'VERSION_REQUIRED',
        message: 'No se pudo enviar la asignación porque faltan versiones en uno o más registros.',
      })
      return undefined
    }
    if (rows.length !== selectedPeople.length) {
      setSubmitError({ code: 'ASSIGNMENT_ROWS_MISMATCH', message: 'No se pudieron preparar todos los colaboradores seleccionados.' })
      return undefined
    }

    const validationErrors = emptyErrors()
    for (const row of rows) {
      if (row.leaderId === undefined && defaults.leaderId === undefined) {
        validationErrors.rows[row.employeeId] = [{
          field: 'leaderId',
          code: 'REQUIRED',
          message: 'Selecciona un líder NPD para esta persona o en los valores para todos.',
          employeeId: row.employeeId,
        }]
      }
      if (row.indefinite && row.endDate) {
        validationErrors.rows[row.employeeId] = [
          ...(validationErrors.rows[row.employeeId] ?? []),
          {
            field: 'endDate',
            code: 'CONFLICTING_VALUES',
            message: 'Elige una fecha final o indefinido, no ambos.',
            employeeId: row.employeeId,
          },
        ]
      } else if (row.endDate && row.endDate <= todayIso()) {
        validationErrors.rows[row.employeeId] = [
          ...(validationErrors.rows[row.employeeId] ?? []),
          {
            field: 'endDate',
            code: 'DATE_IN_PAST',
            message: 'La fecha final debe ser futura.',
            employeeId: row.employeeId,
          },
        ]
      }
    }
    if (defaults.indefinite && defaults.endDate) {
      validationErrors.defaults.push({
        field: 'defaults.endDate',
        code: 'CONFLICTING_VALUES',
        message: 'Elige una fecha final o indefinido, no ambos.',
      })
    } else if (defaults.endDate && defaults.endDate <= todayIso()) {
      validationErrors.defaults.push({
        field: 'defaults.endDate',
        code: 'DATE_IN_PAST',
        message: 'La fecha final debe ser futura.',
      })
    }
    if (Object.keys(validationErrors.rows).length || validationErrors.defaults.length) {
      setErrors(validationErrors)
      setSubmitError({
        code: 'VALIDATION_FAILED',
        message: 'Corrige los campos marcados antes de asignar.',
      })
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    setErrors(emptyErrors())
    setSubmitError(undefined)
    setConflicts([])
    setResult(undefined)
    try {
      const response = await assignMembers(project.id, {
        defaults,
        members: rows.map(toMember),
      })
      setResult(response)
      return response
    } catch (cause) {
      if (cause instanceof BulkAssignmentApiError) {
        setErrors(assignProblemErrors(cause.problem, rows))
        setConflicts(cause.problem?.members ?? [])
        setSubmitError({ code: cause.code, message: submitMessage(cause), status: cause.status })
      } else {
        setSubmitError({
          code: 'UNEXPECTED_ERROR',
          message: 'No se pudo completar la asignación. Revisa tu conexión e inténtalo de nuevo.',
        })
      }
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }, [assignMembers, defaults, errors, project, rows, selectedPeople])

  return {
    selectedPeople,
    selectedCount: selectedPeople.length,
    selectionError,
    step,
    project,
    defaults,
    rows,
    errors,
    submitError,
    conflicts,
    isReloadingConflicts,
    conflictReloadError,
    isSubmitting,
    result,
    togglePerson,
    toggleGroup,
    clearSelection,
    chooseProject,
    backToProjectStep,
    setDefaults,
    updateRow,
    applyDefaultsToAll,
    reloadConflictMember,
    submit,
  }
}
