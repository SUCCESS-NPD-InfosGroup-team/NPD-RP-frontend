import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useResourceDetail } from '../../hooks/useResourceDetail'
import type { Recurso } from '../../types'
import type { ResourceLastChange, ResourceResponse } from '../../services/resources.types'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { canPerformResourceAction } from './resourceDetailPermissions'
import {
  formatDaysToEnd,
  formatResourceDate,
  formatResourceDateTime,
  formatVacationMonth,
} from './resourceDetailView'
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
  const {
    resource: detail,
    lastChange,
    loading,
    error,
    lastChangeError,
    refetch,
  } = useResourceDetail(resource.id)
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
          <div className="resource-detail-drawer__identity">
            <div className="resource-detail-drawer__identity-main">
              <div className="resource-detail-drawer__avatar" aria-hidden="true">
                {getInitials(detail?.name ?? resource.nombre)}
              </div>
              <div>
                <h2 id="resource-detail-drawer-title">{detail?.name ?? resource.nombre}</h2>
                <p className="resource-detail-drawer__employee">
                  #{detail?.employeeNumber ?? resource.nEmpleado.replace(/^#/, '')}
                  {' · Nivel '}
                  {detail?.level ?? resource.nivel.replace(/^N/, '')}
                  {' · '}
                  {detail?.workMode?.name ?? 'Modalidad no especificada'}
                </p>
              </div>
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
          </div>
          <div className="resource-detail-drawer__chips">
            <Chip tone="ok" className="resource-detail-drawer__status-chip">
              {detail?.status.label ?? resource.estado}
            </Chip>
            <Chip tone={detail?.situation.code === 'PENDIENTE_CONFIRMACION' ? 'danger' : 'neutral'}>
              {detail?.situation.label ?? 'Situación no disponible'}
            </Chip>
          </div>
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
          {!loading && !error && detail && (
            <LastChangeSection lastChange={lastChange} error={lastChangeError} onRetry={refetch} />
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

function ResourceDetailContent({ detail }: Readonly<{ detail: ResourceResponse }>) {
  const assignment = detail.assignment
  return (
    <div className="resource-detail-drawer__content">
      <section className="resource-detail-drawer__section" aria-labelledby="resource-project-title">
        <h3 id="resource-project-title">Proyecto</h3>
        {assignment ? (
          <div className="resource-detail-drawer__project-card">
            <div className="resource-detail-drawer__project-heading">
              <div>
                <strong>{assignment.client.name}</strong>
                <span>{assignment.project.name}</span>
              </div>
              <Chip tone={assignment.daysToEndDate !== null && (assignment.daysToEndDate ?? 0) < 0 ? 'danger' : 'neutral'}>
                {formatDaysToEnd(assignment.daysToEndDate)}
              </Chip>
            </div>
            <dl className="resource-detail-drawer__grid">
            <DetailItem label="Líder NPD" value={`${assignment.leader.name}${assignment.leaderEmployeeNumber ? ` · cód. ${assignment.leaderEmployeeNumber}` : ''}`} />
              <DetailItem label="Rol actual en cliente" value={assignment.clientRole?.name ?? 'No especificado'} />
              <DetailItem label="Contacto por cliente" value={assignment.clientContactEmail ?? 'No especificado'} />
              <DetailItem label="Equipo / laptop" value={assignment.equipment?.name ?? 'No especificado'} />
              <DetailItem label="Fin de contrato" value={`${formatResourceDate(assignment.project.contractEndDate)} · del proyecto`} />
            </dl>
          </div>
        ) : <p className="resource-detail-drawer__empty">Sin proyecto</p>}
      </section>

      <section className="resource-detail-drawer__section" aria-labelledby="resource-contract-title">
        <h3 id="resource-contract-title">Contrato</h3>
        <dl className="resource-detail-drawer__grid">
          <DetailItem label="Inicio de contrato" value={formatResourceDate(detail.hireDate)} />
          <DetailItem label="En periodo de prueba" value={isOnProbation(detail.probationEndDate) ? 'Sí' : 'No'} />
          <DetailItem label="Día 90 de probatoria" value={formatResourceDate(detail.probationEndDate)} />
          <DetailItem label="Mes de vacaciones" value={formatVacationMonth(detail.vacationMonth)} />
        </dl>
      </section>

      <section className="resource-detail-drawer__section" aria-labelledby="resource-collaborator-title">
        <h3 id="resource-collaborator-title">Colaborador</h3>
        <dl className="resource-detail-drawer__grid">
          <DetailItem label="Puesto" value={detail.jobTitle?.name ?? 'No especificado'} />
          <DetailItem label="Posición" value={detail.position?.name ?? 'No especificado'} />
          <DetailItem label="Correo" value={detail.email ?? 'No especificado'} />
          <DetailItem label="UEN" value={detail.businessUnit?.name ?? 'No especificado'} />
          <DetailItem label="Modalidad laboral" value={detail.workMode?.name ?? 'No especificado'} />
          <DetailItem label="Talent Review" value={detail.talentReview?.name ?? 'No especificado'} />
          <DetailItem label="Desvinculación" value={formatTermination(detail.termination)} />
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

function LastChangeSection({
  lastChange,
  error,
  onRetry,
}: Readonly<{
  lastChange: ResourceLastChange | null | undefined
  error: unknown
  onRetry: () => void
}>) {
  return (
    <section className="resource-detail-drawer__section" aria-labelledby="resource-last-change-title">
      <h3 id="resource-last-change-title">Último cambio</h3>
      {error ? (
        <div className="resource-detail-drawer__state resource-detail-drawer__state--error" role="alert">
          <p>No se pudo cargar el último cambio.</p>
          <Button variant="secondary" onClick={onRetry}>Reintentar</Button>
        </div>
      ) : lastChange === null ? (
        <p className="resource-detail-drawer__empty">Sin cambios registrados</p>
      ) : lastChange ? (
        <div className="resource-detail-drawer__last-change">
          <p>
            {lastChange.action === 'CREATE'
              ? `Registro creado por ${lastChange.actor}`
              : lastChange.fields.map((field, index) => (
                <span key={field.field}>
                  {index > 0 && <br />}
                  {`${lastChange.actor} cambió ${field.label} de ${formatLastChangeValue(field.field, field.oldValue)} a ${formatLastChangeValue(field.field, field.newValue)} · ${formatResourceDateTime(lastChange.occurredAt)}`}
                </span>
              ))}
          </p>
        </div>
      ) : (
        <p className="resource-detail-drawer__empty">Cargando cambios…</p>
      )}
    </section>
  )
}

function formatLastChangeValue(field: string, value: string | null): string {
  if (value === null) return 'Sin valor'
  return field.toLowerCase().includes('date') ? formatResourceDate(value) : value
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function isOnProbation(probationEndDate: string | null): boolean {
  if (!probationEndDate) return false
  const today = new Date()
  const endDate = new Date(`${probationEndDate}T23:59:59`)
  return endDate >= today
}

function formatTermination(
  termination: ResourceResponse['termination'],
): string {
  if (!termination) return 'No aplica'
  return `${formatResourceDate(termination.date)} · ${termination.reason.name}`
}
