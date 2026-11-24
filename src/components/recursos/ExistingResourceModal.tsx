import { useCallback, useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { AlertIcon, ArrowRightIcon } from '../icons'
import { getResourcesApi } from '../../services/resources'
import { ApiRequestError } from '../../services/projects.types'
import type { AssignmentRequest, ResourceResponse } from '../../services/resources.types'
import { formatShortDate } from '../../utils/dates'
import { fromResourceResponse, toResourceRequest } from './resourceForm'
import { projectTitle, type ProjectChoice } from './registerProject'
import './ExistingResourceModal.css'

interface ExistingResourceModalProps {
  /** Id and N° of the collaborator that already has the employee number */
  resourceId: number
  employeeNumber: string
  /** The project chosen in step 1 */
  choice: ProjectChoice
  /** The assignment filled in step 2; null without project */
  assignment: AssignmentRequest | null
  onAssigned: (resource: ResourceResponse) => void
  onClose: () => void
}

type LoadState = 'loading' | 'ready' | 'error'

const ASSIGN_FAILED = 'No se pudo asignar y no se guardó nada. Intenta de nuevo.'

function assignError(cause: unknown): { message: string; reload: boolean } {
  if (!(cause instanceof ApiRequestError)) return { message: ASSIGN_FAILED, reload: false }
  if (cause.code === 'CONCURRENT_MODIFICATION') {
    return { message: 'Otra persona cambió su registro mientras tanto. Revisa los datos y vuelve a asignar.', reload: true }
  }
  if (cause.status === 403) return { message: 'Tu perfil no tiene permiso para editar recursos.', reload: false }
  const detail = cause.errors?.[0]?.message ?? cause.detail
  return { message: detail ? `No se pudo asignar: ${detail}` : ASSIGN_FAILED, reload: false }
}

function currentAssignmentText(assignment: NonNullable<ResourceResponse['assignment']>): string {
  const leader = assignment.leader ? `Líder ${assignment.leader.name}` : 'Sin líder'
  let end = 'sin fecha final'
  if (assignment.indefinite) end = 'indefinido'
  else if (assignment.endDate) end = `fin ${formatShortDate(assignment.endDate, true)}`
  return `${leader} · ${end}`
}

/**
 * The employee number of the form is already taken (SCRUM-84): instead of a duplicate, offers to
 * move that person to the project chosen in step 1. Saving is a PUT of their own record, with the
 * version that was read, where only the assignment changes.
 */
export function ExistingResourceModal({ resourceId, employeeNumber, choice, assignment, onAssigned, onClose }: Readonly<ExistingResourceModalProps>) {
  const [resource, setResource] = useState<ResourceResponse>()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      setResource(await (await getResourcesApi()).getResource(resourceId))
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [resourceId])

  useEffect(() => {
    const run = async () => { await load() }
    void run()
  }, [load])

  async function assign(target: ResourceResponse, newAssignment: AssignmentRequest): Promise<void> {
    setSaving(true)
    setError('')
    try {
      const request = { ...toResourceRequest(fromResourceResponse(target)), assignment: newAssignment, version: target.version }
      onAssigned(await (await getResourcesApi()).updateResource(target.id, request))
    } catch (cause) {
      const outcome = assignError(cause)
      setError(outcome.message)
      if (outcome.reload) await load()
    } finally {
      setSaving(false)
    }
  }

  const name = resource?.name ?? 'esta persona'
  const current = resource?.assignment ?? null
  const target = choice.kind === 'project' ? choice.project : undefined
  const terminated = resource?.status.code === 'BAJA'
  const sameProject = Boolean(target && current && String(current.project.id) === target.id)
  const canAssign = Boolean(resource && target && assignment && !terminated && !sameProject)

  return (
    <Modal open title={`El N° ${employeeNumber} ya está registrado`} onClose={onClose} className="existing-resource">
      {loadState === 'loading' && <output className="existing-resource__note">Buscando su registro…</output>}
      {loadState === 'error' && (
        <p className="existing-resource__note">No se pudo cargar su registro. Ábrelo para ver sus datos.</p>
      )}
      {loadState === 'ready' && resource && (
        <>
          <p className="existing-resource__intro">
            Pertenece a <strong>{resource.name}</strong>, así que no se crea un registro nuevo.
            {canAssign && ` Puedes asignar a ${resource.name} a este proyecto.`}
          </p>
          {target && (
            <div className="existing-resource__move">
              <div>
                <span className="existing-resource__caption">Ahora</span>
                {current ? (
                  <>
                    <strong>{current.client.name} · {current.project.name}</strong>
                    <small>{currentAssignmentText(current)}</small>
                  </>
                ) : (
                  <strong>Sin proyecto</strong>
                )}
              </div>
              <ArrowRightIcon />
              <div>
                <span className="existing-resource__caption">Pasaría a</span>
                <strong>{projectTitle(target)}</strong>
                <small>Con los datos de asignación de este formulario</small>
              </div>
            </div>
          )}
          <ExistingResourceNotice
            name={name}
            terminated={terminated}
            sameProject={sameProject}
            withTarget={Boolean(target)}
            leaving={canAssign && current ? `${current.client.name} · ${current.project.name}` : undefined}
            targetName={target?.name}
          />
          {canAssign && (
            <p className="existing-resource__footnote">Sus datos personales no cambian. El proyecto anterior queda en la auditoría.</p>
          )}
        </>
      )}
      {error && <p className="existing-resource__error" role="alert">{error}</p>}
      <div className="ui-modal__actions existing-resource__actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <div>
          <a className="ui-button ui-button--secondary" href={`/recursos/${resourceId}/editar`}><span>Ver su registro</span></a>
          {canAssign && resource && target && assignment && (
            <Button icon={<ArrowRightIcon />} disabled={saving} onClick={() => void assign(resource, assignment)}>
              {saving ? 'Asignando…' : `Asignar a ${target.name}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

interface ExistingResourceNoticeProps {
  name: string
  terminated: boolean
  sameProject: boolean
  withTarget: boolean
  /** «CLIENTE · Proyecto» the person leaves when assigned */
  leaving?: string
  targetName?: string
}

function ExistingResourceNotice({ name, terminated, sameProject, withTarget, leaving, targetName }: Readonly<ExistingResourceNoticeProps>) {
  let text: string | undefined
  if (terminated) text = `${name} está de Baja: ábrelo para reactivarlo antes de asignarle un proyecto.`
  else if (sameProject) text = `${name} ya es colaborador de ${targetName}. Ábrelo si quieres cambiar su asignación.`
  else if (!withTarget) text = 'Elegiste «Sin proyecto por ahora»: ábrelo para ver o editar su registro.'
  else if (leaving) {
    return (
      <p className="existing-resource__warning">
        <AlertIcon />
        <span>
          <strong>Si asignas a {name} a {targetName}, dejará de ser colaborador de {leaving}.</strong>{' '}
          Su líder, rol y fecha final se reemplazan por los de esta asignación.
        </span>
      </p>
    )
  }
  if (!text) return null
  return (
    <p className="existing-resource__warning">
      <AlertIcon />
      <span>{text}</span>
    </p>
  )
}
