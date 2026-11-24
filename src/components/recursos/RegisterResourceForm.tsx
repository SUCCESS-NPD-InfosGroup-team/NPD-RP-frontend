import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { AlertIcon, FolderIcon, PlusIcon } from '../icons'
import { NewProjectModal } from '../proyectos/NewProjectModal'
import { ExistingResourceModal } from './ExistingResourceModal'
import { getProjectsApi } from '../../services/projects'
import { getResourcesApi } from '../../services/resources'
import { ApiRequestError, type Client, type ClientProject, type Project } from '../../services/projects.types'
import type { Catalogs, CatalogItem, ResourceResponse, StatusOption } from '../../services/resources.types'
import { formatDateInput, fromIsoDate, toIsoDate, todayIso } from '../../utils/dates'
import {
  apiFieldErrors,
  EMPTY_RESOURCE_FORM,
  FIELD_LABELS,
  fieldId,
  fieldsToFixErrors,
  fromResourceResponse,
  orderedErrorFields,
  PROBATION_DAYS,
  previewSituation,
  probationInfo,
  toResourceRequest,
  validateResourceForm,
  withProjectChoice,
  type FieldErrors,
  type ResourceFormValues,
} from './resourceForm'
import { NO_PROJECT, projectSummaryDetail, projectTitle, toProjectOption, type ProjectChoice } from './registerProject'
import { RosterPreview } from './RosterPreview'
import './RegisterResourcePage.css'

interface RegisterResourceFormProps {
  canCreateProjects: boolean
  /** With an id the form edits that resource (HU-02): GET to prefill and PUT to save */
  resourceId?: number | string
  /**
   * Registering (SCRUM-84): the project chosen in step 1, shown fixed. Editing ignores it and keeps
   * the client and project selectors.
   */
  projectChoice?: ProjectChoice
  /** «Cambiar proyecto» / «Elegir proyecto»: back to step 1 without losing what was typed */
  onChangeProject?: () => void
  /** A project made with «Crear proyecto» while registering becomes the chosen one */
  onProjectChoice?: (choice: ProjectChoice) => void
  /** Called with the saved record, after registering or editing it */
  onSaved: (resource: ResourceResponse) => void
  onCancel: () => void
}

type FormMode = 'create' | 'edit'

/** API path whose error is cleared when the form value changes */
const ERROR_PATH: Partial<Record<keyof ResourceFormValues, string>> = {
  terminationDate: 'termination.date',
  terminationReasonId: 'termination.reasonId',
  clientId: 'assignment.clientId',
  projectId: 'assignment.projectId',
  leaderId: 'assignment.leaderId',
  clientRoleId: 'assignment.clientRoleId',
  equipmentId: 'assignment.equipmentId',
  endDate: 'assignment.endDate',
  indefinite: 'assignment.endDate',
  clientContactEmail: 'assignment.clientContactEmail',
}

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const DEFAULT_STATUSES: StatusOption[] = [
  { code: 'ACTIVO', label: 'Activo' },
  { code: 'LICENCIA', label: 'Licencia' },
  { code: 'BAJA', label: 'Baja' },
]

function toOptions(items: readonly CatalogItem[] | undefined, placeholder: string) {
  return [{ value: '', label: placeholder }, ...(items ?? []).map((item) => ({ value: String(item.id), label: item.name }))]
}

const SAVE_FAILED = 'No se pudo guardar el registro y no se guardó nada. Intenta de nuevo.'

interface ApiErrorOutcome {
  errors?: FieldErrors
  duplicate?: { id: number; name: string }
  generalError?: string
  /** Someone saved the record after it was read: the form must be reloaded (HU-02 CA-04) */
  stale?: boolean
}

function staleMessage(updatedBy: string | undefined): string {
  const who = updatedBy ? `${updatedBy} lo guardó` : 'Otra persona lo guardó'
  return `${who} después de que lo abriste. Recarga el registro para ver sus cambios; los tuyos no se guardaron.`
}

function duplicateOf(id: number | undefined, name: string | undefined) {
  return id === undefined ? undefined : { id, name: name ?? '' }
}

/** Translates a failed save into field errors, the duplicate link or a general message */
function describeApiError(cause: unknown, mode: FormMode): ApiErrorOutcome {
  if (!(cause instanceof ApiRequestError)) return { generalError: SAVE_FAILED }
  if (cause.code === 'CONCURRENT_MODIFICATION') return { generalError: staleMessage(cause.updatedBy), stale: true }
  if (cause.code === 'EMPLOYEE_NUMBER_TAKEN') {
    return {
      errors: { employeeNumber: cause.detail },
      duplicate: duplicateOf(cause.existingResourceId, cause.existingResourceName),
    }
  }
  if (cause.status === 400 && cause.errors?.length) {
    // A taken employee number can also arrive inside a 400 together with other errors
    const taken = cause.errors.find((error) => error.code === 'EMPLOYEE_NUMBER_TAKEN')
    return {
      errors: apiFieldErrors(cause.errors),
      duplicate: duplicateOf(taken?.existingResourceId, taken?.existingResourceName),
    }
  }
  if (cause.status === 403) {
    const action = mode === 'edit' ? 'editar' : 'registrar'
    return { generalError: `Tu perfil no tiene permiso para ${action} recursos.` }
  }
  // 400 INVALID_REQUEST and 503 SERVICE_UNAVAILABLE bring a detail ready to show; nothing was saved
  const detailReady = cause.status === 400 || cause.status === 503
  return { generalError: detailReady ? cause.detail : SAVE_FAILED }
}

/** Problems that only say the person is already registered: the same N° and, often, the same email */
const ALREADY_REGISTERED = new Set(['EMPLOYEE_NUMBER_TAKEN', 'EMAIL_TAKEN'])

/**
 * Id of the collaborator who already has the employee number, when that is all that stops the
 * registration: a 409, or a 400 whose only errors are that N° and that email. With other errors
 * there is still something to fix in the form, so there is nothing to assign yet.
 */
function existingResourceOf(cause: unknown): number | undefined {
  if (!(cause instanceof ApiRequestError)) return undefined
  if (cause.code === 'EMPLOYEE_NUMBER_TAKEN') return cause.existingResourceId
  if (cause.status !== 400 || !cause.errors?.length) return undefined
  if (!cause.errors.every((error) => ALREADY_REGISTERED.has(error.code))) return undefined
  return cause.errors.find((error) => error.code === 'EMPLOYEE_NUMBER_TAKEN')?.existingResourceId
}

function probationText(probation: { endDate?: string; vacationMonth?: number }): string {
  if (probation.endDate && probation.vacationMonth) {
    return `Día ${PROBATION_DAYS} calculado desde el inicio de contrato: ${fromIsoDate(probation.endDate)}. El mes de vacaciones (${MONTH_NAMES[probation.vacationMonth - 1]}) también sale de esta fecha.`
  }
  return `Se calcula con la fecha de inicio de contrato: día ${PROBATION_DAYS}. Puedes marcarlo o desmarcarlo después.`
}

function ErrorSummary({
  errorFields,
  generalError,
  summaryRef,
  onReload,
}: Readonly<{ errorFields: string[]; generalError: string; summaryRef: RefObject<HTMLDivElement | null>; onReload?: () => void }>) {
  let detail: ReactNode = generalError
  if (errorFields.length > 0) {
    const intro = errorFields.length === 1 ? 'Corrige el campo marcado: ' : `Corrige los ${errorFields.length} campos marcados: `
    detail = (
      <>
        {intro}
        {errorFields.map((path, index) => (
          <span key={path}>
            {index > 0 && listSeparator(index, errorFields.length)}
            <a
              href={`#${fieldId(path)}`}
              onClick={(event) => {
                event.preventDefault()
                document.getElementById(fieldId(path))?.focus()
              }}
            >
              {FIELD_LABELS[path] ?? path}
            </a>
          </span>
        ))}
        .
      </>
    )
  }
  return (
    <div className="resource-form__summary" role="alert" tabIndex={-1} ref={summaryRef}>
      <AlertIcon />
      <p>
        <strong>No se guardó el registro.</strong>{' '}
        {detail}
      </p>
      {onReload && <Button variant="secondary" onClick={onReload}>Recargar registro</Button>}
    </div>
  )
}

function submitLabel(editing: boolean, saving: boolean): string {
  if (editing) return saving ? 'Guardando…' : 'Guardar cambios'
  return saving ? 'Registrando…' : 'Registrar recurso'
}

function listSeparator(index: number, total: number): string {
  return index === total - 1 ? ' y ' : ', '
}

type FieldPropsOf = (path: string) => { id: string; state: 'error' | 'default'; error: string | undefined }
type UpdateValue = <K extends keyof ResourceFormValues>(key: K, value: ResourceFormValues[K]) => void

interface AssignmentFieldsProps {
  values: ResourceFormValues
  update: UpdateValue
  fieldProps: FieldPropsOf
  catalogs: Catalogs | undefined
}

/** Líder, rol, equipo, fecha final y contacto: what belongs to this person in the project */
function AssignmentFields({ values, update, fieldProps, catalogs }: Readonly<AssignmentFieldsProps>) {
  return (
    <>
      <Field {...fieldProps('assignment.leaderId')} label="Líder NPD *" type="select" value={values.leaderId} onChange={(event) => update('leaderId', event.target.value)} options={toOptions(catalogs?.npdLeads, 'Selecciona un líder')} />
      <Field {...fieldProps('assignment.clientRoleId')} label="Rol actual en cliente" type="select" value={values.clientRoleId} onChange={(event) => update('clientRoleId', event.target.value)} options={toOptions(catalogs?.clientRoles, 'Sin rol definido')} />
      <Field {...fieldProps('assignment.equipmentId')} label="Equipo / laptop" type="select" value={values.equipmentId} onChange={(event) => update('equipmentId', event.target.value)} options={toOptions(catalogs?.equipment, 'Sin equipo definido')} />
      <div>
        <Field {...fieldProps('assignment.endDate')} label={values.indefinite ? 'Fecha final' : 'Fecha final *'} placeholder="dd/mm/aaaa" value={values.indefinite ? '' : values.endDate} disabled={values.indefinite} onChange={(event) => update('endDate', formatDateInput(event.target.value))} />
        <label className="resource-form__checkbox">
          <input type="checkbox" checked={values.indefinite} onChange={(event) => update('indefinite', event.target.checked)} />
          <span>Sin fecha final (indefinido)</span>
        </label>
      </div>
      <div className="resource-form__span-2">
        <Field {...fieldProps('assignment.clientContactEmail')} label="Contacto por cliente" placeholder="correo@cliente.com" value={values.clientContactEmail} onChange={(event) => update('clientContactEmail', event.target.value)} />
      </div>
    </>
  )
}

interface EditAssignmentPanelProps extends AssignmentFieldsProps {
  changeClient: (clientId: string) => void
  clients: Client[]
  visibleProjects: ClientProject[]
  selectedProject: ClientProject | undefined
}

/** Editing (HU-02): the current project loads in the client and project selectors */
function EditAssignmentPanel({
  values,
  update,
  changeClient,
  fieldProps,
  clients,
  visibleProjects,
  selectedProject,
  catalogs,
}: Readonly<EditAssignmentPanelProps>) {
  if (!values.withProject) {
    return <p className="resource-form__note">Se registra sin cliente, proyecto, líder ni fecha final. Podrás asignarle un proyecto después.</p>
  }
  return (
    <div className="resource-form__panel resource-form__grid">
      <Field {...fieldProps('assignment.clientId')} label="Cliente *" type="select" value={values.clientId} onChange={(event) => changeClient(event.target.value)} options={[{ value: '', label: 'Selecciona un cliente' }, ...clients.map((client) => ({ value: client.id, label: client.name }))]} />
      <div className="resource-form__span-2">
        <Field {...fieldProps('assignment.projectId')} label="Proyecto asignado *" type="select" value={values.projectId} disabled={!values.clientId} onChange={(event) => update('projectId', event.target.value)} options={[{ value: '', label: values.clientId ? 'Selecciona un proyecto' : 'Elige primero el cliente' }, ...visibleProjects.map((project) => ({ value: project.id, label: project.name }))]} />
        {selectedProject && <p className="resource-form__help">{projectSummaryDetail(selectedProject)}</p>}
        {values.clientId && visibleProjects.length === 0 && (
          <p className="resource-form__help">Este cliente no tiene proyectos activos. Usa «Crear proyecto».</p>
        )}
      </div>
      <AssignmentFields values={values} update={update} fieldProps={fieldProps} catalogs={catalogs} />
    </div>
  )
}

interface ChosenProjectSectionProps extends AssignmentFieldsProps {
  choice: ProjectChoice
  terminated: boolean
  canCreateProjects: boolean
  onChangeProject?: () => void
  onCreateProject: () => void
}

/**
 * Registering (SCRUM-84, CA-01): the project from step 1 as a fixed summary with «Cambiar
 * proyecto», and the assignment of the person in it.
 */
function ChosenProjectSection({
  choice,
  terminated,
  canCreateProjects,
  onChangeProject,
  onCreateProject,
  values,
  update,
  fieldProps,
  catalogs,
}: Readonly<ChosenProjectSectionProps>) {
  const project = choice.kind === 'project' ? choice.project : undefined
  // A project error from the API points at «Cambiar proyecto», the only way to fix it
  const projectError = fieldProps('assignment.projectId').error ?? fieldProps('assignment.clientId').error
  return (
    <section className="resource-form__section" aria-labelledby="resource-form-project">
      <h2 id="resource-form-project">{project ? 'Asignación en este proyecto' : 'Proyecto'}</h2>
      <p className="resource-form__hint">
        {project
          ? 'El líder, el rol y la fecha final son de esta persona en este proyecto, aunque comparta proyecto con otros.'
          : 'Una persona está en un solo proyecto. Podrás asignarla después desde Proyectos o con «Asignar a proyecto».'}
      </p>
      <div className={`resource-form__chosen${projectError ? ' is-invalid' : ''}`}>
        <span className="resource-form__chosen-icon"><FolderIcon /></span>
        <div>
          <strong>{project ? projectTitle(project) : 'Sin proyecto por ahora'}</strong>
          <small>{project ? projectSummaryDetail(project) : 'Se registrará como Sin proyecto. Podrás asignarlo después desde Proyectos.'}</small>
        </div>
        {onChangeProject && (
          <Button id={fieldId('assignment.projectId')} variant="secondary" onClick={onChangeProject}>
            {project ? 'Cambiar proyecto' : 'Elegir proyecto'}
          </Button>
        )}
      </div>
      {projectError && <p className="resource-form__error" role="alert">{projectError}</p>}
      {canCreateProjects && (
        <div className="resource-form__create-project">
          <Button variant="ghost" icon={<PlusIcon />} onClick={onCreateProject}>Crear proyecto</Button>
        </div>
      )}
      {project && terminated && (
        <p className="resource-form__warning">
          <AlertIcon />
          <span>
            Con Estado = Baja la persona se registra <strong>sin proyecto</strong>: no entra a {projectTitle(project)}. Cambia el
            estado si debe entrar al proyecto.
          </span>
        </p>
      )}
      {project && !terminated && (
        <div className="resource-form__panel resource-form__grid">
          <AssignmentFields values={values} update={update} fieldProps={fieldProps} catalogs={catalogs} />
        </div>
      )}
      {!project && (
        <p className="resource-form__info">
          Se registrará como <strong>Sin proyecto</strong>. Aparecerá primero al agregar colaboradores desde Proyectos.
        </p>
      )}
    </section>
  )
}

type LoadState = 'loading' | 'ready' | 'error'

/**
 * Edit mode (HU-02): reads the record from GET /planner/resources/{id} and hands it to `onLoaded`.
 * `reload` discards unsaved changes, as «Recargar registro» asks.
 */
function useResourceRecord(resourceId: number | string | undefined, onLoaded: (resource: ResourceResponse) => void) {
  const [loadState, setLoadState] = useState<LoadState>(resourceId === undefined ? 'ready' : 'loading')

  const reload = useCallback(async () => {
    if (resourceId === undefined) return
    setLoadState('loading')
    try {
      const resource = await (await getResourcesApi()).getResource(resourceId)
      onLoaded(resource)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [resourceId, onLoaded])

  useEffect(() => {
    const load = async () => { await reload() }
    void load()
  }, [reload])

  return { loadState, reload }
}

function RecordLoadState({ loadState, onRetry }: Readonly<{ loadState: LoadState; onRetry: () => void }>) {
  if (loadState === 'loading') {
    return <output className="resource-form__note">Cargando el registro…</output>
  }
  return (
    <div className="resource-form__summary" role="alert">
      <AlertIcon />
      <p>No se pudo cargar el registro del recurso.</p>
      <Button variant="secondary" onClick={onRetry}>Reintentar</Button>
    </div>
  )
}

/** CA-08: tells which imported «No especificado» values must be replaced before saving */
function NotSpecifiedNotice({ fields }: Readonly<{ fields: string[] }>) {
  if (fields.length === 0) return null
  return (
    <output className="resource-form__summary">
      <AlertIcon />
      <p>
        Este registro viene del import con valores «No especificado» en{' '}
        {fields.map((path) => FIELD_LABELS[path] ?? path).join(' y ')}. Elige el valor real para poder guardar.
      </p>
    </output>
  )
}

export function RegisterResourceForm({
  canCreateProjects,
  resourceId,
  projectChoice = NO_PROJECT,
  onChangeProject,
  onProjectChoice,
  onSaved,
  onCancel,
}: Readonly<RegisterResourceFormProps>) {
  const mode: FormMode = resourceId === undefined ? 'create' : 'edit'
  const [values, setValues] = useState<ResourceFormValues>(EMPTY_RESOURCE_FORM)
  const [version, setVersion] = useState<number>()
  const [toFix, setToFix] = useState<string[]>([])
  const [stale, setStale] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showSummary, setShowSummary] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [duplicate, setDuplicate] = useState<{ id: number; name: string }>()
  const [saving, setSaving] = useState(false)
  const [catalogs, setCatalogs] = useState<Catalogs>()
  const [catalogsError, setCatalogsError] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([])
  const [projectsReload, setProjectsReload] = useState(0)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  /** Registering with an employee number that is already taken: whose it is */
  const [existing, setExisting] = useState<{ id: number; employeeNumber: string }>()
  const summaryRef = useRef<HTMLDivElement>(null)

  const loadCatalogs = useCallback(() => {
    void getResourcesApi()
      .then((api) => api.getCatalogs())
      .then((loaded) => {
        setCatalogs(loaded)
        setCatalogsError(false)
      })
      .catch(() => setCatalogsError(true))
  }, [])

  const loadClients = useCallback(() => {
    void getProjectsApi()
      .then((api) => api.listClients())
      .then(setClients)
      .catch(() => setClients([]))
  }, [])

  useEffect(() => {
    loadCatalogs()
    loadClients()
  }, [loadCatalogs, loadClients])

  /** Edit mode: prefills the form with the record and the version the PUT will send */
  const applyRecord = useCallback((resource: ResourceResponse) => {
    setValues(fromResourceResponse(resource))
    setVersion(resource.version)
    setToFix(resource.fieldsToFix)
    setErrors(fieldsToFixErrors(resource.fieldsToFix))
    setGeneralError('')
    setShowSummary(false)
    setStale(false)
  }, [])
  const { loadState, reload } = useResourceRecord(resourceId, applyRecord)
  const reloadRecord = () => { void reload() }

  useEffect(() => {
    if (!values.clientId) return
    let current = true
    void getProjectsApi()
      .then((api) => api.listClientProjects(values.clientId))
      .then((items) => { if (current) setClientProjects(items) })
      .catch(() => { if (current) setClientProjects([]) })
    return () => { current = false }
  }, [values.clientId, projectsReload])

  useEffect(() => {
    if (showSummary) summaryRef.current?.focus()
  }, [showSummary])

  function update<K extends keyof ResourceFormValues>(key: K, value: ResourceFormValues[K]): void {
    setValues((previous) => ({ ...previous, [key]: value }))
    const path = ERROR_PATH[key] ?? key
    setErrors((previous) => {
      if (!(path in previous)) return previous
      const next = { ...previous }
      delete next[path]
      return next
    })
    if (key === 'employeeNumber') setDuplicate(undefined)
  }

  function changeHireDate(hireDate: string): void {
    update('hireDate', hireDate)
    // A new hire date brings back the calculated probation until the user marks it again
    update('onProbation', null)
  }

  function changeClient(clientId: string): void {
    update('clientId', clientId)
    update('projectId', '')
    if (!clientId) setClientProjects([])
  }

  function handleProjectCreated(project: Project): void {
    loadClients()
    if (mode === 'create') {
      onProjectChoice?.({ kind: 'project', project: toProjectOption(project) })
      return
    }
    setValues((previous) => ({ ...previous, withProject: true, clientId: project.client.id, projectId: project.id }))
    setErrors((previous) => {
      const next = { ...previous }
      delete next['assignment.clientId']
      delete next['assignment.projectId']
      return next
    })
    setProjectsReload((count) => count + 1)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (saving) return
    setGeneralError('')
    setDuplicate(undefined)
    const validation = validateResourceForm(formValues, todayIso())
    setErrors(validation)
    setShowSummary(false)
    if (Object.keys(validation).length > 0) {
      window.setTimeout(() => setShowSummary(true), 0)
      return
    }

    setSaving(true)
    try {
      const api = await getResourcesApi()
      const request = toResourceRequest(formValues, todayIso())
      const resource = resourceId === undefined
        ? await api.createResource(request)
        : await api.updateResource(resourceId, { ...request, version: version ?? 0 })
      onSaved(resource)
    } catch (cause) {
      handleApiError(cause)
      window.setTimeout(() => setShowSummary(true), 0)
    } finally {
      setSaving(false)
    }
  }

  function handleApiError(cause: unknown): void {
    const outcome = describeApiError(cause, mode)
    if (outcome.errors) setErrors(outcome.errors)
    if (outcome.duplicate) setDuplicate(outcome.duplicate)
    if (outcome.generalError) setGeneralError(outcome.generalError)
    setStale(Boolean(outcome.stale))
    // Registering: offer to assign the person who has that N° instead of a duplicate (SCRUM-84, CA-04)
    const existingId = mode === 'create' ? existingResourceOf(cause) : undefined
    if (existingId !== undefined) setExisting({ id: existingId, employeeNumber: formValues.employeeNumber.trim() })
  }

  const fieldProps = (path: string) => ({
    id: fieldId(path),
    state: errors[path] ? 'error' as const : 'default' as const,
    error: errors[path],
  })

  const editing = mode === 'edit'
  // Registering: client and project come from step 1, not from the form
  const formValues = editing ? values : withProjectChoice(values, projectChoice)
  const errorFields = orderedErrorFields(errors)
  const terminated = formValues.status === 'BAJA'
  const today = todayIso()
  const probation = probationInfo(formValues, today)
  const situation = previewSituation(formValues)
  const selectedProject = clientProjects.find((project) => project.id === values.projectId)
  const visibleProjects = values.clientId ? clientProjects : []
  const chosenProject = projectChoice.kind === 'project' ? projectChoice.project : undefined
  const previewProjectName = editing ? selectedProject?.name : chosenProject?.name

  if (loadState !== 'ready') return <RecordLoadState loadState={loadState} onRetry={reloadRecord} />

  return (
    <>
      {showSummary && (errorFields.length > 0 || generalError) && (
        <ErrorSummary
          errorFields={stale ? [] : errorFields}
          generalError={generalError}
          summaryRef={summaryRef}
          onReload={stale ? reloadRecord : undefined}
        />
      )}
      {editing && !showSummary && <NotSpecifiedNotice fields={toFix} />}
      {catalogsError && (
        <div className="resource-form__summary" role="alert">
          <AlertIcon />
          <p>No se pudieron cargar las listas del formulario.</p>
          <Button variant="secondary" onClick={loadCatalogs}>Reintentar</Button>
        </div>
      )}

      <div className="resource-form__layout">
        <form className="resource-form__card" noValidate onSubmit={(event) => void handleSubmit(event)} aria-label={editing ? 'Editar recurso' : 'Registrar recurso'}>
          <section className="resource-form__section" aria-labelledby="resource-form-collaborator">
            <h2 id="resource-form-collaborator">Colaborador</h2>
            <p className="resource-form__hint">Datos de la persona en Infosgroup. No cambian al pasar de un proyecto a otro.</p>
            <div className="resource-form__grid">
              <div>
                <Field {...fieldProps('employeeNumber')} label="N° de empleado *" value={values.employeeNumber} onChange={(event) => update('employeeNumber', event.target.value)} />
                {duplicate && (
                  <a className="resource-form__duplicate" href={`/recursos/${duplicate.id}/editar`}>Abrir su registro</a>
                )}
              </div>
              <div className="resource-form__span-2">
                <Field {...fieldProps('name')} label="Nombre de empleado *" value={values.name} onChange={(event) => update('name', event.target.value)} />
              </div>
              <Field {...fieldProps('email')} label="Correo del recurso" placeholder="nombre@infosgroup.com" value={values.email} onChange={(event) => update('email', event.target.value)} />
              <Field {...fieldProps('jobTitleId')} label="Puesto" type="select" value={values.jobTitleId} onChange={(event) => update('jobTitleId', event.target.value)} options={toOptions(catalogs?.jobTitles, 'Selecciona un puesto')} />
              <Field {...fieldProps('positionId')} label="Posición en Infosgroup *" type="select" value={values.positionId} onChange={(event) => update('positionId', event.target.value)} options={toOptions(catalogs?.positions, 'Selecciona una posición')} />
              <Field {...fieldProps('level')} label="Nivel" placeholder="Ej. 3" value={values.level} onChange={(event) => update('level', event.target.value.replace(/\D/g, '').slice(0, 5))} />
              <Field {...fieldProps('businessUnitId')} label="UEN" type="select" value={values.businessUnitId} onChange={(event) => update('businessUnitId', event.target.value)} options={toOptions(catalogs?.businessUnits, 'Selecciona una UEN')} />
              <Field {...fieldProps('workModeId')} label="Modalidad laboral *" type="select" value={values.workModeId} onChange={(event) => update('workModeId', event.target.value)} options={toOptions(catalogs?.workModes, 'Selecciona una modalidad')} />
              <div>
                <Field {...fieldProps('genderId')} label="Género *" type="select" value={values.genderId} onChange={(event) => update('genderId', event.target.value)} options={toOptions(catalogs?.genders, 'Selecciona un género')} />
                <p className="resource-form__help">Provisional: fuente y categorías por confirmar con el cliente.</p>
              </div>
              <Field {...fieldProps('talentReviewId')} label="Resultado de Talent Review" type="select" value={values.talentReviewId} onChange={(event) => update('talentReviewId', event.target.value)} options={toOptions(catalogs?.talentReviews, 'Sin resultado')} />
            </div>

            <h3 className="resource-form__subheading">Contrato</h3>
            <div className="resource-form__grid">
              <div>
                <Field {...fieldProps('hireDate')} label="Fecha de inicio de contrato *" placeholder="dd/mm/aaaa" value={values.hireDate} onChange={(event) => changeHireDate(formatDateInput(event.target.value))} />
                <p className="resource-form__help">Día en que entró a Infosgroup.</p>
              </div>
              <div className="resource-form__span-2 resource-form__probation">
                <span className="resource-form__probation-label">Periodo de prueba</span>
                <label className="resource-form__probation-box">
                  <input
                    type="checkbox"
                    checked={probation.checked}
                    disabled={!probation.endDate}
                    onChange={(event) => update('onProbation', event.target.checked)}
                  />
                  <strong>En periodo de prueba</strong>
                  <small aria-live="polite">{probationText(probation)}</small>
                </label>
              </div>
            </div>

            <h3 className="resource-form__subheading">Estado</h3>
            <div className="resource-form__grid">
              <Field {...fieldProps('status')} label="Estado *" type="select" value={values.status} onChange={(event) => update('status', event.target.value as ResourceFormValues['status'])} options={(catalogs?.statuses ?? DEFAULT_STATUSES).map((status) => ({ value: status.code, label: status.label }))} />
              <div className="resource-form__span-2 resource-form__situation">
                <span className="resource-form__situation-label">Situación en el proyecto</span>
                <div>
                  <span className={`resource-form__chip resource-form__chip--${situation.code.toLowerCase()}`}>{situation.label}</span>
                  <span className="resource-form__help">Se calcula con el proyecto y la fecha final</span>
                </div>
              </div>
              {terminated && (
                <>
                  <Field {...fieldProps('termination.reasonId')} label="Motivo de desvinculación *" type="select" value={values.terminationReasonId} onChange={(event) => update('terminationReasonId', event.target.value)} options={toOptions(catalogs?.terminationReasons, 'Selecciona un motivo')} />
                  <Field {...fieldProps('termination.date')} label="Fecha de desvinculación *" placeholder="dd/mm/aaaa" value={values.terminationDate} onChange={(event) => update('terminationDate', formatDateInput(event.target.value))} />
                  <p className="resource-form__help resource-form__align-end">No puede ser anterior al inicio de contrato.</p>
                </>
              )}
            </div>
          </section>

          {editing ? (
            <section className="resource-form__section" aria-labelledby="resource-form-project">
              <h2 id="resource-form-project">Proyecto</h2>
              <p className="resource-form__hint">Una persona está en un solo proyecto. El líder, el rol y la fecha final son suyos, aunque comparta proyecto con otros.</p>
              {terminated ? (
                <p className="resource-form__note">Con Estado = Baja la persona se registra sin proyecto.</p>
              ) : (
                <>
                  <div className="resource-form__project-bar">
                    <fieldset className="resource-form__toggle" aria-label="¿Tiene proyecto?">
                      <button type="button" aria-pressed={values.withProject} className={values.withProject ? 'is-active' : ''} onClick={() => update('withProject', true)}>Con proyecto</button>
                      <button type="button" aria-pressed={!values.withProject} className={values.withProject ? '' : 'is-active'} onClick={() => update('withProject', false)}>Sin proyecto por ahora</button>
                    </fieldset>
                    {canCreateProjects && (
                      <Button variant="ghost" icon={<PlusIcon />} onClick={() => setNewProjectOpen(true)}>Crear proyecto</Button>
                    )}
                  </div>
                  <EditAssignmentPanel
                    values={values}
                    update={update}
                    changeClient={changeClient}
                    fieldProps={fieldProps}
                    clients={clients}
                    visibleProjects={visibleProjects}
                    selectedProject={selectedProject}
                    catalogs={catalogs}
                  />
                </>
              )}
            </section>
          ) : (
            <ChosenProjectSection
              choice={projectChoice}
              terminated={terminated}
              canCreateProjects={canCreateProjects}
              onChangeProject={onChangeProject}
              onCreateProject={() => setNewProjectOpen(true)}
              values={values}
              update={update}
              fieldProps={fieldProps}
              catalogs={catalogs}
            />
          )}

          <footer className="resource-form__actions">
            <p>Cada cambio queda en la auditoría con tu usuario, la fecha y los valores.</p>
            <div>
              <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{submitLabel(editing, saving)}</Button>
            </div>
          </footer>
        </form>
        <RosterPreview
          today={today}
          hireDate={toIsoDate(values.hireDate)}
          probationEnd={probation.endDate}
          onProbation={probation.checked}
          project={!terminated && formValues.withProject
            ? { name: previewProjectName, endDate: toIsoDate(values.endDate), indefinite: values.indefinite }
            : undefined}
        />
      </div>

      <NewProjectModal
        open={newProjectOpen}
        clients={clients}
        onCreated={(project) => handleProjectCreated(project)}
        onClose={() => setNewProjectOpen(false)}
      />

      {existing && (
        <ExistingResourceModal
          resourceId={existing.id}
          employeeNumber={existing.employeeNumber}
          choice={projectChoice}
          assignment={toResourceRequest(formValues, today).assignment}
          onAssigned={onSaved}
          onClose={() => setExisting(undefined)}
        />
      )}
    </>
  )
}
