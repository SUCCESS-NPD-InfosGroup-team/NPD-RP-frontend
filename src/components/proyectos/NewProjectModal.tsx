import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { UserPlusIcon } from '../icons'
import { getProjectsApi } from '../../services/projects'
import type { Client, Project } from '../../services/projects.types'

interface NewProjectModalProps {
  open: boolean
  clients: Client[]
  onCreated: (project: Project, options?: { addMembers?: boolean }) => void
  onClose: () => void
}

export function NewProjectModal({ open, clients, onCreated, onClose }: Readonly<NewProjectModalProps>) {
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicateProject, setDuplicateProject] = useState<{ name: string; id?: string }>()

  function handleDateChange(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    const formatted = digits.length > 4
      ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits.length > 2
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits
    setContractEnd(formatted)
  }

  function toIsoDate(value: string): string | undefined {
    if (!value) return undefined
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    if (!match) return undefined
    const [, day, month, year] = match
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    return date.getUTCFullYear() === Number(year)
      && date.getUTCMonth() === Number(month) - 1
      && date.getUTCDate() === Number(day)
      ? `${year}-${month}-${day}`
      : undefined
  }

  const invalidContractEnd = Boolean(error && contractEnd && !toIsoDate(contractEnd))

  async function submit() {
    const isoContractEnd = toIsoDate(contractEnd)
    if (!clientId || !name.trim() || (contractEnd && !isoContractEnd)) {
      setError(contractEnd && !isoContractEnd ? 'Usa una fecha válida en formato dd/mm/aaaa.' : 'Cliente y nombre son obligatorios.')
      return
    }

    setSaving(true)
    setError('')
    setDuplicateProject(undefined)
    try {
      const project = await (await getProjectsApi()).createProject({
        clientId,
        name: name.trim(),
        contractEnd: isoContractEnd,
      })
      onCreated(project)
      onClose()
    } catch (cause) {
      const message = cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'No se pudo crear el proyecto.'
      if (cause && typeof cause === 'object' && 'code' in cause && cause.code === 'DUPLICATE_PROJECT_NAME') {
        setDuplicateProject({
          name: 'existingProjectName' in cause ? String(cause.existingProjectName) : name.trim(),
          id: 'existingProjectId' in cause ? String(cause.existingProjectId) : undefined,
        })
      }
      setError(cause && typeof cause === 'object' && 'status' in cause && cause.status === 403
        ? 'No tienes permisos para crear proyectos.'
        : message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Nuevo proyecto" onClose={onClose}>
      <p className="new-project-modal__intro">Créalo aunque todavía no tenga equipo. Lo podrás llenar ahora o después.</p>
      {error && <p className="new-project-modal__banner" role="alert">⚠ No se creó el proyecto. Corrige el campo marcado.</p>}
      {error && name.trim() && clientId && !duplicateProject && <p className="new-project-modal__error-detail">{error}</p>}
      <Field id="new-project-client" label="Cliente *" type="select" value={clientId} onChange={(event) => setClientId(event.target.value)} options={[{ value: '', label: 'Selecciona un cliente' }, ...clients.map((client) => ({ value: client.id, label: client.name }))]} />
      <Field id="new-project-name" label="Nombre del proyecto *" value={name} onChange={(event) => setName(event.target.value)} state={error && (duplicateProject || !name.trim()) ? 'error' : 'default'} error={duplicateProject ? `${duplicateProject.name} ya tiene un proyecto con este nombre.` : error && !name.trim() ? error : undefined} />
      {duplicateProject && <p className="new-project-modal__duplicate"><a href={duplicateProject.id ? `/proyectos?project=${duplicateProject.id}` : '#'}>Abrir {duplicateProject.name}</a></p>}
      <Field id="new-project-contract" label="Fin de contrato con el cliente" placeholder="dd/mm/aaaa" value={contractEnd} onChange={(event) => handleDateChange(event.target.value)} state={invalidContractEnd ? 'error' : 'default'} error={invalidContractEnd ? error : undefined} />
      <p className="new-project-modal__help">Opcional. Con esta fecha se avisa a Sales a 30 y 15 días. El inicio del proyecto es el día en que lo creas.</p>
      <div className="ui-modal__actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <div className="new-project-modal__action-group">
          <Button onClick={() => void submit()} disabled={saving}>{saving ? 'Creando…' : 'Crear proyecto'}</Button>
          <Button variant="feature" icon={<UserPlusIcon />} onClick={() => void submit()} disabled={saving}>Crear y agregar colaboradores</Button>
        </div>
      </div>
    </Modal>
  )
}
