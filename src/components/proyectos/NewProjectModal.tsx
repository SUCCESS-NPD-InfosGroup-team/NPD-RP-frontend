import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { UserPlusIcon } from '../icons'
import { getProjectsApi } from '../../services/projects'
import type { Client, Project } from '../../services/projects.types'
import { formatDateInput, toIsoDate } from '../../utils/dates'

interface NewProjectModalProps {
  open: boolean
  clients: Client[]
  onCreated: (project: Project, options?: { addMembers?: boolean }) => void
  onClose: () => void
}

function getValidationError(clientId: string, name: string, contractEnd: string, isoContractEnd?: string): string {
  if (contractEnd && !isoContractEnd) return 'Usa una fecha válida en formato dd/mm/aaaa.'
  if (!clientId || !name.trim()) return 'Cliente y nombre son obligatorios.'
  return ''
}

function getApiErrorMessage(cause: unknown): string {
  if (cause && typeof cause === 'object' && 'status' in cause && cause.status === 403) {
    return 'No tienes permisos para crear proyectos.'
  }
  if (cause && typeof cause === 'object' && 'detail' in cause) return String(cause.detail)
  if (cause && typeof cause === 'object' && 'message' in cause) return String(cause.message)
  return 'No se pudo crear el proyecto.'
}

function getDuplicateProject(cause: unknown, fallbackName: string): { name: string; id?: string } | undefined {
  if (!cause || typeof cause !== 'object' || !('code' in cause) || cause.code !== 'PROJECT_NAME_TAKEN') return undefined
  return {
    name: 'existingProjectName' in cause ? String(cause.existingProjectName) : fallbackName,
    id: 'existingProjectId' in cause ? String(cause.existingProjectId) : undefined,
  }
}

export function NewProjectModal({ open, clients, onCreated, onClose }: Readonly<NewProjectModalProps>) {
  const [clientId, setClientId] = useState('')
  const [newClient, setNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientInternal, setNewClientInternal] = useState(false)
  const [name, setName] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicateProject, setDuplicateProject] = useState<{ name: string; id?: string }>()

  function handleDateChange(value: string): void {
    setContractEnd(formatDateInput(value))
  }

  const trimmedName = name.trim()
  const trimmedNewClientName = newClientName.trim()
  const invalidContractEnd = Boolean(error && contractEnd && !toIsoDate(contractEnd))
  const nameError = duplicateProject ? `${duplicateProject.name} ya tiene un proyecto con este nombre.` : (!trimmedName ? error : undefined)
  const nameFieldState = error && (duplicateProject || !trimmedName) ? 'error' : 'default'
  const shouldShowErrorDetail = Boolean(error && trimmedName && (clientId || trimmedNewClientName) && !duplicateProject)

  async function submit(addMembers = false) {
    const isoContractEnd = toIsoDate(contractEnd)
    const validationError = getValidationError(newClient ? trimmedNewClientName : clientId, name, contractEnd, isoContractEnd)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    setDuplicateProject(undefined)
    try {
      const project = await (await getProjectsApi()).createProject({
        clientId: newClient ? undefined : clientId,
        newClient: newClient ? { name: trimmedNewClientName, isInternal: newClientInternal } : undefined,
        name: trimmedName,
        contractEnd: isoContractEnd,
      })
      onCreated(project, { addMembers })
      onClose()
    } catch (cause) {
      setDuplicateProject(getDuplicateProject(cause, trimmedName))
      setError(getApiErrorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Nuevo proyecto" onClose={onClose}>
      <p className="new-project-modal__intro">Créalo aunque todavía no tenga equipo. Lo podrás llenar ahora o después.</p>
      {error && <p className="new-project-modal__banner" role="alert">⚠ No se creó el proyecto. Corrige el campo marcado.</p>}
      {shouldShowErrorDetail && <p className="new-project-modal__error-detail">{error}</p>}
      <Field id="new-project-client" label="Cliente *" type="select" value={newClient ? '__new__' : clientId} onChange={(event) => {
        const value = event.target.value
        setNewClient(value === '__new__')
        if (value !== '__new__') setClientId(value)
      }} options={[{ value: '', label: 'Selecciona un cliente' }, ...clients.map((client) => ({ value: client.id, label: client.name })), { value: '__new__', label: 'Crear cliente nuevo' }]} />
      {newClient && (
        <>
          <Field id="new-project-client-name" label="Nombre del cliente *" value={newClientName} onChange={(event) => setNewClientName(event.target.value)} />
          <label className="new-project-modal__checkbox">
            <input type="checkbox" checked={newClientInternal} onChange={(event) => setNewClientInternal(event.target.checked)} />
            Cliente interno
          </label>
        </>
      )}
      <Field id="new-project-name" label="Nombre del proyecto *" value={name} onChange={(event) => setName(event.target.value)} state={nameFieldState} error={nameError} />
      {duplicateProject && <p className="new-project-modal__duplicate"><a href={duplicateProject.id ? `/proyectos?project=${duplicateProject.id}` : '#'}>Abrir {duplicateProject.name}</a></p>}
      <Field id="new-project-contract" label="Fin de contrato con el cliente" placeholder="dd/mm/aaaa" value={contractEnd} onChange={(event) => handleDateChange(event.target.value)} state={invalidContractEnd ? 'error' : 'default'} error={invalidContractEnd ? error : undefined} />
      <p className="new-project-modal__help">Opcional. Con esta fecha se avisa a Sales a 30 y 15 días. El inicio del proyecto es el día en que lo creas.</p>
      <div className="ui-modal__actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <div className="new-project-modal__action-group">
          <Button onClick={() => void submit()} disabled={saving}>{saving ? 'Creando…' : 'Crear proyecto'}</Button>
          <Button variant="feature" icon={<UserPlusIcon />} onClick={() => void submit(true)} disabled={saving}>Crear y agregar colaboradores</Button>
        </div>
      </div>
    </Modal>
  )
}
