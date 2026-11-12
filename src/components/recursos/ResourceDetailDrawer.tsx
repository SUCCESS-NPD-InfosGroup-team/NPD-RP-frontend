import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useResourceDetail } from '../../hooks/useResourceDetail'
import type { Recurso } from '../../types'
import { Button } from '../ui/Button'
import { canPerformResourceAction } from './resourceDetailPermissions'
import './ResourceDetailDrawer.css'

interface ResourceDetailDrawerProps {
  resource: Recurso
  onClose: () => void
  onEdit: (resource: Recurso) => void
}

export function ResourceDetailDrawer({
  resource,
  onClose,
  onEdit,
}: Readonly<ResourceDetailDrawerProps>) {
  const { roles } = useAuth()
  const { loading, error, refetch } = useResourceDetail(resource.id)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="resource-detail-drawer__layer" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <aside
        className="resource-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resource-detail-drawer-title"
      >
        <header className="resource-detail-drawer__header">
          <div>
            <p className="resource-detail-drawer__eyebrow">Detalle del recurso</p>
            <h2 id="resource-detail-drawer-title">{resource.nombre}</h2>
            <p className="resource-detail-drawer__employee">{resource.nEmpleado}</p>
          </div>
          <button
            ref={closeRef}
            className="resource-detail-drawer__close"
            type="button"
            aria-label="Cerrar detalle del recurso"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="resource-detail-drawer__body">
          {loading && (
            <div className="resource-detail-drawer__state" aria-label="Cargando detalle">
              Cargando detalle…
            </div>
          )}
          {error && (
            <div className="resource-detail-drawer__state resource-detail-drawer__state--error" role="alert">
              <p>No se pudo cargar el detalle del recurso.</p>
              <Button variant="secondary" onClick={refetch}>Reintentar</Button>
            </div>
          )}
          {!loading && !error && (
            <div className="resource-detail-drawer__placeholder">
              <p>Detalle disponible para {resource.nEmpleado}.</p>
            </div>
          )}
        </div>

        <footer className="resource-detail-drawer__footer">
          {canPerformResourceAction(roles, 'history') && (
            <Button variant="secondary" onClick={() => undefined}>Historial</Button>
          )}
          {canPerformResourceAction(roles, 'audit') && (
            <Button variant="secondary" onClick={() => undefined}>Auditoría</Button>
          )}
          {canPerformResourceAction(roles, 'edit') && (
            <Button onClick={() => onEdit(resource)}>Editar registro</Button>
          )}
        </footer>
      </aside>
    </div>
  )
}
