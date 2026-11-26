import { useState, type FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { projectDetailApi } from '../../services/projectDetail.api'
import type { ProjectDetail } from '../../services/projectDetail.types'
import projectDateError from '../../assets/icon/project-date-error.svg'
import projectModalClose from '../../assets/icon/project-modal-close.svg'
import './ProjectManagementActions.css'

interface ProjectManagementActionsProps {
  project: ProjectDetail
  canManage: boolean
  onUpdated: () => Promise<void>
}

export function ProjectManagementActions({
  project,
  canManage,
  onUpdated,
}: Readonly<ProjectManagementActionsProps>) {
  const [editing, setEditing] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [name, setName] = useState(project.name)
  const [contractEndDate, setContractEndDate] = useState(project.contractEndDate ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!canManage || !project.active) return null

  function openEdit(): void {
    setName(project.name)
    setContractEndDate(project.contractEndDate ?? '')
    setError('')
    setEditing(true)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (saving || !name.trim()) return
    if (hasPastContractEnd(contractEndDate, project.contractEndDate)) return

    setSaving(true)
    setError('')
    try {
      await projectDetailApi.updateProject(String(project.id), {
        name: name.trim(),
        contractEndDate: contractEndDate || null,
        version: project.version,
      })
      setEditing(false)
      await onUpdated()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el proyecto.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(): Promise<void> {
    if (saving) return

    setSaving(true)
    setError('')
    try {
      await projectDetailApi.deactivateProject(String(project.id), project.version)
      setEditing(false)
      setDeactivating(false)
      await onUpdated()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo desactivar el proyecto.')
    } finally {
      setSaving(false)
    }
  }

  const pastContractEnd = hasPastContractEnd(contractEndDate, project.contractEndDate)

  return (
    <>
      <button className="project-detail__button" type="button" onClick={openEdit}>
        <Pencil aria-hidden="true" /> Editar proyecto
      </button>

      <Modal
        open={editing}
        title="Editar proyecto"
        onClose={() => setEditing(false)}
        className="project-management__modal project-management__modal--edit"
        overlayClassName="project-management__overlay"
        closeIcon={<img src={projectModalClose} alt="" />}
      >
        <form className="project-management__form" onSubmit={(event) => void handleSave(event)}>
          <div className="project-management__fields">
            <div className="project-management__field">
              <label htmlFor="project-edit-client">Cliente</label>
              <input id="project-edit-client" type="text" value={project.client.name} readOnly />
              <span className="project-management__help">
                El cliente no cambia. Para otro cliente, crea un proyecto nuevo y mueve al equipo.
              </span>
            </div>
            <div className="project-management__field">
              <label htmlFor="project-edit-name">
                Nombre del proyecto <span className="project-management__required">*</span>
              </label>
              <input
                id="project-edit-name"
                type="text"
                required
                maxLength={150}
                value={name}
                aria-describedby="project-edit-name-help"
                onChange={(event) => {
                  setName(event.currentTarget.value)
                  setError('')
                }}
              />
              <span id="project-edit-name-help" className="project-management__help">Único dentro del cliente.</span>
            </div>
            <div className="project-management__field">
              <label htmlFor="project-edit-contract-end">Fin de contrato con el cliente</label>
              <input
                id="project-edit-contract-end"
                type="date"
                value={contractEndDate}
                aria-invalid={pastContractEnd}
                aria-describedby={pastContractEnd
                  ? 'project-edit-contract-help project-edit-contract-error'
                  : 'project-edit-contract-help'}
                className={pastContractEnd ? 'project-management__input--error' : undefined}
                onChange={(event) => {
                  setContractEndDate(event.currentTarget.value)
                  setError('')
                }}
              />
              <span id="project-edit-contract-help" className="project-management__help">
                Si la mueves a una fecha posterior, la fecha final de cada colaborador no cambia.
              </span>
              {pastContractEnd && (
                <span className="project-management__date-error">
                  <img src={projectDateError} alt="" />
                  <span id="project-edit-contract-error">
                    Ya pasó. Usa una fecha futura o deja el campo vacío.
                  </span>
                </span>
              )}
            </div>
            {error && <p className="project-management__error" role="alert">{error}</p>}
          </div>
          <footer className="project-management__footer">
            {project.teamSize === 0 && (
              <Button
                className="project-management__deactivate"
                variant="danger"
                onClick={() => {
                  setError('')
                  setEditing(false)
                  setDeactivating(true)
                }}
              >
                Desactivar proyecto
              </Button>
            )}
            <span className="project-management__footer-spacer" />
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </footer>
        </form>
      </Modal>

      <Modal
        open={deactivating}
        title={`¿Desactivar ${project.name}?`}
        onClose={() => setDeactivating(false)}
        className="project-management__modal project-management__modal--deactivate"
        overlayClassName="project-management__overlay"
        closeIcon={<img src={projectModalClose} alt="" />}
      >
        <div className="project-management__deactivation">
          <p>El proyecto queda <strong>inactivo y en solo lectura</strong>: ya no aparece al asignar colaboradores.</p>
          {error && <p className="project-management__error" role="alert">{error}</p>}
        </div>
        <footer className="project-management__footer project-management__footer--deactivate">
          <Button variant="secondary" onClick={() => setDeactivating(false)}>Cancelar</Button>
          <span className="project-management__footer-spacer" />
          <Button variant="danger" disabled={saving} onClick={() => void handleDeactivate()}>
            {saving ? 'Desactivando…' : 'Desactivar proyecto'}
          </Button>
        </footer>
      </Modal>
    </>
  )
}

function hasPastContractEnd(value: string, originalValue: string | null): boolean {
  if (!value || value === originalValue) return false
  const today = new Date()
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  return value < todayIso
}
