import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { getProjectsApi } from '../../services/projects'
import type { Client } from '../../services/projects.types'

interface NewProjectModalProps {
  open: boolean
  clients: Client[]
  onCreated: () => void
  onClose: () => void
}

export function NewProjectModal({ open, clients, onCreated, onClose }: Readonly<NewProjectModalProps>) {
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!clientId || !name.trim()) {
      setError('Cliente y nombre son obligatorios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await (await getProjectsApi()).createProject({ clientId, name: name.trim(), contractEnd: contractEnd || undefined })
      onCreated()
      onClose()
    } catch (cause) {
      const message = cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'No se pudo crear el proyecto.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Nuevo proyecto" onClose={onClose}>
      <p>Créalo aunque todavía no tenga equipo. Lo podrás llenar ahora o después.</p>
      {error && <p role="alert">{error}</p>}
      <Field id="new-project-client" label="Cliente *" type="select" value={clientId} onChange={(event) => setClientId(event.target.value)} options={[{ value: '', label: 'Selecciona un cliente' }, ...clients.map((client) => ({ value: client.id, label: client.name }))]} />
      <Field id="new-project-name" label="Nombre del proyecto *" value={name} onChange={(event) => setName(event.target.value)} state={error && !name.trim() ? 'error' : 'default'} error={error && !name.trim() ? error : undefined} />
      <Field id="new-project-contract" label="Fin de contrato con el cliente" type="input" value={contractEnd} onChange={(event) => setContractEnd(event.target.value)} />
      <div className="ui-modal__actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => void submit()} disabled={saving}>{saving ? 'Creando…' : 'Crear proyecto'}</Button>
      </div>
    </Modal>
  )
}
