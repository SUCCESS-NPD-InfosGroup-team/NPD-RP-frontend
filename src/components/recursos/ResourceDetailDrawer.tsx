import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useResourceDetail } from '../../hooks/useResourceDetail'
import type { Recurso } from '../../types'
import type { ResourceResponse } from '../../services/resources.types'
import { Button } from '../ui/Button'
import { canPerformResourceAction } from './resourceDetailPermissions'
import { formatDaysToEnd, formatResourceDate, formatVacationMonth } from './resourceDetailView'
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
  const { resource: detail, loading, error, refetch } = useResourceDetail(resource.id)
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
          {!loading && !error && detail && <ResourceDetailContent detail={detail} />}
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

function ResourceDetailContent({ detail }: Readonly<{ detail: ResourceResponse }>) {
  const assignment = detail.assignment
  return (
    <div className="resource-detail-drawer__content">
      <section className="resource-detail-drawer__section" aria-labelledby="resource-status-title">
        <h3 id="resource-status-title">Estado y situación</h3>
        <dl className="resource-detail-drawer__grid">
          <DetailItem label="Estado" value={detail.status.label} />
          <DetailItem label="Situación" value={detail.situation.label} />
          <DetailItem label="Días restantes" value={formatDaysToEnd(assignment?.daysToEndDate)} />
          <DetailItem label="Periodo de prueba" value={detail.probationEndDate ? `Hasta ${formatResourceDate(detail.probationEndDate)}` : 'No aplica'} />
        </dl>
      </section>

      <section className="resource-detail-drawer__section" aria-labelledby="resource-timeline-title">
        <h3 id="resource-timeline-title">Asignación</h3>
        <div className="resource-detail-drawer__lane">
          <span>{formatResourceDate(assignment?.startDate ?? detail.hireDate)}</span>
          <span className="resource-detail-drawer__lane-line" aria-hidden="true" />
          <span>{assignment?.indefinite ? 'Indefinida' : formatResourceDate(assignment?.endDate)}</span>
        </div>
      </section>

      <section className="resource-detail-drawer__section" aria-labelledby="resource-project-title">
        <h3 id="resource-project-title">Proyecto</h3>
        {assignment ? (
          <dl className="resource-detail-drawer__grid">
            <DetailItem label="Cliente" value={assignment.client.name} />
            <DetailItem label="Proyecto" value={assignment.project.name} />
            <DetailItem label="Líder NPD" value={`${assignment.leader.name}${assignment.leaderEmployeeNumber ? ` · cód. ${assignment.leaderEmployeeNumber}` : ''}`} />
            <DetailItem label="Rol" value={assignment.clientRole?.name ?? 'No especificado'} />
            <DetailItem label="Contacto" value={assignment.clientContactEmail ?? 'No especificado'} />
            <DetailItem label="Fecha final" value={formatResourceDate(assignment.endDate)} />
            <DetailItem label="Fin de contrato del cliente" value={formatResourceDate(assignment.project.contractEndDate)} />
          </dl>
        ) : <p className="resource-detail-drawer__empty">Sin proyecto</p>}
      </section>

      <section className="resource-detail-drawer__section" aria-labelledby="resource-collaborator-title">
        <h3 id="resource-collaborator-title">Datos del colaborador</h3>
        <dl className="resource-detail-drawer__grid">
          <DetailItem label="N° de empleado" value={detail.employeeNumber} />
          <DetailItem label="Correo" value={detail.email ?? 'No especificado'} />
          <DetailItem label="Cargo" value={detail.jobTitle?.name ?? 'No especificado'} />
          <DetailItem label="Posición" value={detail.position?.name ?? 'No especificado'} />
          <DetailItem label="Nivel" value={detail.level === null ? 'No especificado' : `N${detail.level}`} />
          <DetailItem label="Equipo / laptop" value={assignment?.equipment?.name ?? 'No especificado'} />
          <DetailItem label="Mes de vacaciones" value={formatVacationMonth(detail.vacationMonth)} />
          <DetailItem label="Inicio de contrato" value={formatResourceDate(detail.hireDate)} />
        </dl>
      </section>
    </div>
  )
}

function DetailItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="resource-detail-drawer__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
