import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { AlertIcon, PlusIcon } from '../icons'
import { NewProjectModal } from '../proyectos/NewProjectModal'
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
  orderedErrorFields,
  PROBATION_DAYS,
  previewSituation,
  probationInfo,
  toResourceRequest,
  validateResourceForm,
  type FieldErrors,
  type ResourceFormValues,
} from './resourceForm'
import { RosterPreview } from './RosterPreview'
import './RegisterResourcePage.css'

interface RegisterResourceFormProps {
  canCreateProjects: boolean
  onCreated: (resource: ResourceResponse) => void
  onCancel: () => void
}

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

export function RegisterResourceForm({ canCreateProjects, onCreated, onCancel }: Readonly<RegisterResourceFormProps>) {
  const [values, setValues] = useState<ResourceFormValues>(EMPTY_RESOURCE_FORM)
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
    update('inProbation', null)
  }

  function changeClient(clientId: string): void {
    update('clientId', clientId)
    update('projectId', '')
    if (!clientId) setClientProjects([])
  }

  function handleProjectCreated(project: Project): void {
    loadClients()
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
    const validation = validateResourceForm(values, todayIso())
    setErrors(validation)
    setShowSummary(false)
    if (Object.keys(validation).length > 0) {
      window.setTimeout(() => setShowSummary(true), 0)
      return
    }

    setSaving(true)
    try {
      const resource = await (await getResourcesApi()).createResource(toResourceRequest(values, todayIso()))
      onCreated(resource)
    } catch (cause) {
      handleApiError(cause)
      window.setTimeout(() => setShowSummary(true), 0)
    } finally {
      setSaving(false)
    }
  }

  function handleApiError(cause: unknown): void {
    if (!(cause instanceof ApiRequestError)) {
      setGeneralError('No se pudo guardar el registro y no se guardó nada. Intenta de nuevo.')
      return
    }
    if (cause.code === 'EMPLOYEE_NUMBER_TAKEN') {
      setErrors({ employeeNumber: cause.detail })
      if (cause.existingResourceId !== undefined) {
        setDuplicate({ id: cause.existingResourceId, name: cause.existingResourceName ?? '' })
      }
      return
    }
    if (cause.status === 400 && cause.errors?.length) {
      setErrors(apiFieldErrors(cause.errors))
      // A taken employee number can also arrive inside a 400 together with other errors
      const taken = cause.errors.find((error) => error.code === 'EMPLOYEE_NUMBER_TAKEN')
      if (taken?.existingResourceId !== undefined) {
        setDuplicate({ id: taken.existingResourceId, name: taken.existingResourceName ?? '' })
      }
      return
    }
    if (cause.status === 403) {
      setGeneralError('Tu perfil no tiene permiso para registrar recursos.')
      return
    }
    // 400 INVALID_REQUEST and 503 SERVICE_UNAVAILABLE bring a detail ready to show; nothing was saved
    setGeneralError(cause.status === 400 || cause.status === 503
      ? cause.detail
      : 'No se pudo guardar el registro y no se guardó nada. Intenta de nuevo.')
  }

  const fieldProps = (path: string) => ({
    id: fieldId(path),
    state: errors[path] ? 'error' as const : 'default' as const,
    error: errors[path],
  })

  const errorFields = orderedErrorFields(errors)
  const terminated = values.status === 'BAJA'
  const today = todayIso()
  const probation = probationInfo(values, today)
  const situation = previewSituation(values)
  const selectedProject = clientProjects.find((project) => project.id === values.projectId)
  const visibleProjects = values.clientId ? clientProjects : []

  return (
    <>
      {showSummary && (errorFields.length > 0 || generalError) && (
        <div className="resource-form__summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <AlertIcon />
          <p>
            <strong>No se guardó el registro.</strong>{' '}
            {errorFields.length > 0 ? (
              <>
                {errorFields.length === 1 ? 'Corrige el campo marcado: ' : `Corrige los ${errorFields.length} campos marcados: `}
                {errorFields.map((path, index) => (
                  <span key={path}>
                    {index > 0 && (index === errorFields.length - 1 ? ' y ' : ', ')}
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
            ) : generalError}
          </p>
        </div>
      )}
      {catalogsError && (
        <div className="resource-form__summary" role="alert">
          <AlertIcon />
          <p>No se pudieron cargar las listas del formulario.</p>
          <Button variant="secondary" onClick={loadCatalogs}>Reintentar</Button>
        </div>
      )}

      <div className="resource-form__layout">
        <form className="resource-form__card" noValidate onSubmit={(event) => void handleSubmit(event)} aria-label="Registrar recurso">
          <section className="resource-form__section" aria-labelledby="resource-form-collaborator">
            <h2 id="resource-form-collaborator">Colaborador</h2>
            <p className="resource-form__hint">Datos de la persona en Infosgroup. No cambian al pasar de un proyecto a otro.</p>
            <div className="resource-form__grid">
              <div>
                <Field {...fieldProps('employeeNumber')} label="N° de empleado *" value={values.employeeNumber} onChange={(event) => update('employeeNumber', event.target.value)} />
                {duplicate && (
                  <a className="resource-form__duplicate" href={`/recursos/${duplicate.id}`}>Abrir su registro</a>
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
                    onChange={(event) => update('inProbation', event.target.checked)}
                  />
                  <span>
                    <strong>En periodo de prueba</strong>
                    <small aria-live="polite">
                      {probation.endDate && probation.vacationMonth
                        ? `Día ${PROBATION_DAYS} calculado desde el inicio de contrato: ${fromIsoDate(probation.endDate)}. El mes de vacaciones (${MONTH_NAMES[probation.vacationMonth - 1]}) también sale de esta fecha.`
                        : `Se calcula con la fecha de inicio de contrato: día ${PROBATION_DAYS}. Puedes marcarlo o desmarcarlo después.`}
                    </small>
                  </span>
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

          <section className="resource-form__section" aria-labelledby="resource-form-project">
            <h2 id="resource-form-project">Proyecto</h2>
            <p className="resource-form__hint">Una persona está en un solo proyecto. El líder, el rol y la fecha final son suyos, aunque comparta proyecto con otros.</p>
            {terminated ? (
              <p className="resource-form__note">Con Estado = Baja la persona se registra sin proyecto.</p>
            ) : (
              <>
                <div className="resource-form__project-bar">
                  <div className="resource-form__toggle" role="group" aria-label="¿Tiene proyecto?">
                    <button type="button" aria-pressed={values.withProject} className={values.withProject ? 'is-active' : ''} onClick={() => update('withProject', true)}>Con proyecto</button>
                    <button type="button" aria-pressed={!values.withProject} className={values.withProject ? '' : 'is-active'} onClick={() => update('withProject', false)}>Sin proyecto por ahora</button>
                  </div>
                  {canCreateProjects && (
                    <Button variant="ghost" icon={<PlusIcon />} onClick={() => setNewProjectOpen(true)}>Crear proyecto</Button>
                  )}
                </div>
                {values.withProject ? (
                  <div className="resource-form__panel resource-form__grid">
                    <Field {...fieldProps('assignment.clientId')} label="Cliente *" type="select" value={values.clientId} onChange={(event) => changeClient(event.target.value)} options={[{ value: '', label: 'Selecciona un cliente' }, ...clients.map((client) => ({ value: client.id, label: client.name }))]} />
                    <div className="resource-form__span-2">
                      <Field {...fieldProps('assignment.projectId')} label="Proyecto asignado *" type="select" value={values.projectId} disabled={!values.clientId} onChange={(event) => update('projectId', event.target.value)} options={[{ value: '', label: values.clientId ? 'Selecciona un proyecto' : 'Elige primero el cliente' }, ...visibleProjects.map((project) => ({ value: project.id, label: project.name }))]} />
                      {selectedProject && (
                        <p className="resource-form__help">
                          {selectedProject.teamSize === 1 ? '1 colaborador' : `${selectedProject.teamSize} colaboradores`}
                          {' · '}
                          {selectedProject.contractEndDate ? `fin de contrato con el cliente ${fromIsoDate(selectedProject.contractEndDate)}` : 'sin fin de contrato con el cliente'}
                        </p>
                      )}
                      {values.clientId && visibleProjects.length === 0 && (
                        <p className="resource-form__help">Este cliente no tiene proyectos activos. Usa «Crear proyecto».</p>
                      )}
                    </div>
                    <Field {...fieldProps('assignment.leaderId')} label="Líder NPD *" type="select" value={values.leaderId} onChange={(event) => update('leaderId', event.target.value)} options={toOptions(catalogs?.npdLeads, 'Selecciona un líder')} />
                    <Field {...fieldProps('assignment.clientRoleId')} label="Rol actual en cliente" type="select" value={values.clientRoleId} onChange={(event) => update('clientRoleId', event.target.value)} options={toOptions(catalogs?.clientRoles, 'Sin rol definido')} />
                    <Field {...fieldProps('assignment.equipmentId')} label="Equipo / laptop" type="select" value={values.equipmentId} onChange={(event) => update('equipmentId', event.target.value)} options={toOptions(catalogs?.equipment, 'Sin equipo definido')} />
                    <div>
                      <Field {...fieldProps('assignment.endDate')} label={values.indefinite ? 'Fecha final' : 'Fecha final *'} placeholder="dd/mm/aaaa" value={values.indefinite ? '' : values.endDate} disabled={values.indefinite} onChange={(event) => update('endDate', formatDateInput(event.target.value))} />
                      <label className="resource-form__checkbox">
                        <input type="checkbox" checked={values.indefinite} onChange={(event) => update('indefinite', event.target.checked)} />
                        Sin fecha final (indefinido)
                      </label>
                    </div>
                    <div className="resource-form__span-2">
                      <Field {...fieldProps('assignment.clientContactEmail')} label="Contacto por cliente" placeholder="correo@cliente.com" value={values.clientContactEmail} onChange={(event) => update('clientContactEmail', event.target.value)} />
                    </div>
                  </div>
                ) : (
                  <p className="resource-form__note">Se registra sin cliente, proyecto, líder ni fecha final. Podrás asignarle un proyecto después.</p>
                )}
              </>
            )}
          </section>

          <footer className="resource-form__actions">
            <p>Cada cambio queda en la auditoría con tu usuario, la fecha y los valores.</p>
            <div>
              <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Registrando…' : 'Registrar recurso'}</Button>
            </div>
          </footer>
        </form>
        <RosterPreview
          today={today}
          hireDate={toIsoDate(values.hireDate)}
          probationEnd={probation.endDate}
          inProbation={probation.checked}
          project={!terminated && values.withProject
            ? { name: selectedProject?.name, endDate: toIsoDate(values.endDate), indefinite: values.indefinite }
            : undefined}
        />
      </div>

      <NewProjectModal
        open={newProjectOpen}
        clients={clients}
        onCreated={(project) => handleProjectCreated(project)}
        onClose={() => setNewProjectOpen(false)}
      />
    </>
  )
}
