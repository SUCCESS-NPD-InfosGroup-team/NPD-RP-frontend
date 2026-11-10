import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { getProjectsApi } from '../../services/projects'
import type { Client, Project } from '../../services/projects.types'
import { formatDateInput, toIsoDate } from '../../utils/dates'

interface NewProjectModalProps {
  open: boolean
  clients: Client[]
  onCreated: (project: Project) => void
  onClose: () => void
  onDuplicateProject?: (projectId: string) => void
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

function getDuplicateProjectId(cause: unknown): string | undefined {
  if (!cause || typeof cause !== 'object' || !('code' in cause) || cause.code !== 'PROJECT_NAME_TAKEN') return undefined
  return 'existingProjectId' in cause && cause.existingProjectId !== undefined
    ? String(cause.existingProjectId)
    : undefined
}

export function NewProjectModal({ open, clients, onCreated, onClose, onDuplicateProject }: Readonly<NewProjectModalProps>) {
  const [clientId, setClientId] = useState('')
  const [newClient, setNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientInternal, setNewClientInternal] = useState(false)
  const [name, setName] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicateProjectId, setDuplicateProjectId] = useState<string>()

  function handleClose(): void {
    setClientId('')
    setNewClient(false)
    setNewClientName('')
    setNewClientInternal(false)
    setName('')
    setContractEnd('')
    setError('')
    setSaving(false)
    setDuplicateProjectId(undefined)
    onClose()
  }

  function handleDateChange(value: string): void {
    setContractEnd(formatDateInput(value))
  }

  const trimmedName = name.trim()
  const trimmedNewClientName = newClientName.trim()
  const invalidContractEnd = Boolean(error && contractEnd && !toIsoDate(contractEnd))
  const nameError = !trimmedName ? error : undefined
  const nameFieldState = error && (duplicateProjectId || !trimmedName) ? 'error' : 'default'
  const shouldShowErrorDetail = Boolean(error && trimmedName && (clientId || trimmedNewClientName))

  async function submit() {
    const isoContractEnd = toIsoDate(contractEnd)
    const validationError = getValidationError(newClient ? trimmedNewClientName : clientId, name, contractEnd, isoContractEnd)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    setDuplicateProjectId(undefined)
    try {
      const project = await (await getProjectsApi()).createProject({
        clientId: newClient ? undefined : clientId,
        newClient: newClient ? { name: trimmedNewClientName, isInternal: newClientInternal } : undefined,
        name: trimmedName,
        contractEnd: isoContractEnd,
      })
      onCreated(project)
      handleClose()
    } catch (cause) {
      const duplicateId = getDuplicateProjectId(cause)
      setDuplicateProjectId(duplicateId)
      if (duplicateId) onDuplicateProject?.(duplicateId)
      setError(getApiErrorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Nuevo proyecto" onClose={handleClose}>
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
      <Field id="new-project-contract" label="Fin de contrato con el cliente" placeholder="dd/mm/aaaa" value={contractEnd} onChange={(event) => handleDateChange(event.target.value)} state={invalidContractEnd ? 'error' : 'default'} error={invalidContractEnd ? error : undefined} />
      <p className="new-project-modal__help">Opcional. Con esta fecha se avisa a Sales a 30 y 15 días. El inicio del proyecto es el día en que lo creas.</p>
      <div className="ui-modal__actions">
        <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
        {/* TODO SCRUM-165: restore add-members action when the registration route exists. */}
        <Button onClick={() => void submit()} disabled={saving}>{saving ? 'Creando…' : 'Crear proyecto'}</Button>
      </div>
    </Modal>
  )
}
