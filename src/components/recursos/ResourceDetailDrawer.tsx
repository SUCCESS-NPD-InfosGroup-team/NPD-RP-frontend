import { useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useResourceDetail } from '../../hooks/useResourceDetail'
import type { Recurso } from '../../types'
import type { ResourceLastChange, ResourceResponse } from '../../services/resources.types'
import { AlertIcon, ClockIcon, EditIcon, XIcon } from '../icons'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { canPerformResourceAction } from './resourceDetailPermissions'
import { calculateAssignmentRail } from './resourceAssignmentRail'
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
              <XIcon />
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
          {canPerformResourceAction(roles, 'edit') && (
            <Button icon={<EditIcon />} onClick={() => onEdit(resource)}>Editar registro</Button>
          )}
          {canPerformResourceAction(roles, 'history') && (
            <Button variant="secondary" icon={<ClockIcon />} onClick={() => undefined}>Historial</Button>
          )}
          {canPerformResourceAction(roles, 'audit') && (
            <Button variant="secondary" icon={<ClockIcon />} onClick={() => undefined}>Auditoría</Button>
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
          <div className={`resource-detail-drawer__project-card${detail.situation.code === 'PENDIENTE_CONFIRMACION' ? ' is-pending' : ''}`}>
            <div className="resource-detail-drawer__project-heading">
              <div>
                <strong>{assignment.client.name}</strong>
                <span>{assignment.project.name}</span>
              </div>
              <span className={`resource-detail-drawer__days-badge${isAssignmentOverdue(assignment) ? ' is-overdue' : ''}`}>
                {formatDaysToEnd(assignment.daysToEndDate)}
              </span>
            </div>
            <AssignmentRail detail={detail} />
            <dl className="resource-detail-drawer__grid">
              <DetailItem label="Líder NPD" value={`${assignment.leader.name}${assignment.leaderEmployeeNumber ? ` · cód. ${assignment.leaderEmployeeNumber}` : ''}`} />
              <DetailItem label="Rol actual en cliente" value={assignment.clientRole?.name ?? 'No especificado'} />
              <DetailItem label="Contacto por cliente" value={assignment.clientContactEmail ?? 'No especificado'} />
              <DetailItem label="Equipo / laptop" value={assignment.equipment?.name ?? 'No especificado'} />
              <DetailItem
                label="Fin de contrato"
                value={(
                  <>
                    {formatResourceDate(assignment.project.contractEndDate)}
                    <span className="resource-detail-drawer__value-suffix"> · del proyecto</span>
                  </>
                )}
              />
            </dl>
            {detail.situation.code === 'PENDIENTE_CONFIRMACION' && <PendingConfirmationNotice />}
          </div>
        ) : <p className="resource-detail-drawer__empty">Sin proyecto</p>}
      </section>

      <section className="resource-detail-drawer__section" aria-labelledby="resource-contract-title">
        <h3 id="resource-contract-title">Contrato</h3>
        <dl className="resource-detail-drawer__grid">
          <DetailItem label="Fecha de inicio de contrato" value={formatResourceDate(detail.hireDate)} />
          <DetailItem label="En periodo de prueba" value={isOnProbation(detail.probationEndDate) ? 'Sí' : 'No'} />
          <DetailItem
            label="Día 90 de probatoria"
            value={detail.probationEndDate ? (
              <>
                {formatResourceDate(detail.probationEndDate)}
                <span className="resource-detail-drawer__value-suffix"> · calculado</span>
              </>
            ) : '—'}
          />
          <DetailItem label="Mes de vacaciones" value={formatVacationMonth(detail.vacationMonth)} />
        </dl>
      </section>

      <section className="resource-detail-drawer__section" aria-labelledby="resource-collaborator-title">
        <h3 id="resource-collaborator-title">Colaborador</h3>
        <dl className="resource-detail-drawer__grid">
          <DetailItem label="Puesto" value={detail.jobTitle?.name ?? '—'} />
          <DetailItem label="Posición" value={detail.position?.name ?? '—'} />
          <DetailItem label="UEN" value={detail.businessUnit?.name ?? '—'} />
          <DetailItem label="Modalidad laboral" value={detail.workMode?.name ?? '—'} />
          <DetailItem label="Correo" value={detail.email ?? '—'} />
          <DetailItem label="Talent Review" value={detail.talentReview?.name ?? '—'} />
          <DetailItem label="Desvinculación" value={formatTermination(detail.termination)} />
        </dl>
      </section>
    </div>
  )
}

function DetailItem({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="resource-detail-drawer__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function AssignmentRail({ detail }: Readonly<{ detail: ResourceResponse }>) {
  if (!detail.assignment) return null

  const assignment = detail.assignment
  const startDate = assignment.startDate ?? detail.hireDate
  const rail = calculateAssignmentRail({
    startDate,
    endDate: assignment.endDate,
    indefinite: assignment.indefinite,
    today: getTodayIso(),
  })
  const railTone = getAssignmentRailTone(assignment, detail.status.code)
  const endLabel = assignment.indefinite
    ? 'sin fecha final'
    : `fecha final ${formatResourceDate(assignment.endDate)}`

  return (
    <div className="resource-detail-drawer__rail">
      <div
        className="resource-detail-drawer__rail-graphic"
        role="img"
        aria-label={`Asignación desde ${formatResourceDate(startDate)} hasta ${endLabel}`}
      >
        <svg className="resource-detail-drawer__rail-track" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
          <rect className={`resource-detail-drawer__rail-bar is-${railTone}`} x={rail.startPercent} width={rail.widthPercent} />
          {rail.todayPercent !== null && (
            <line className="resource-detail-drawer__rail-today" x1={rail.todayPercent} x2={rail.todayPercent} y1="0" y2="26" />
          )}
        </svg>
      </div>
      <p className="resource-detail-drawer__rail-caption">
        En el proyecto desde {formatResourceDate(startDate)} → {endLabel}
      </p>
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
          {lastChange.action === 'CREATE'
            ? <p>Registro creado por {lastChange.actor}</p>
            : lastChange.fields.map((field) => (
              <p key={field.field}>
                {lastChange.actor} cambió <strong>{field.label}</strong> de{' '}
                {formatLastChangeValue(field.field, field.oldValue)} a {formatLastChangeValue(field.field, field.newValue)}
                {' · '}
                {formatResourceDateTime(lastChange.occurredAt)}.
              </p>
            ))}
        </div>
      ) : (
        <p className="resource-detail-drawer__empty">Cargando cambios…</p>
      )}
    </section>
  )
}

function formatLastChangeValue(field: string, value: string | null): string {
  if (value === null) return '—'
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
  if (!termination) return '—'
  return `${formatResourceDate(termination.date)} · ${termination.reason.name}`
}

function isAssignmentOverdue(assignment: NonNullable<ResourceResponse['assignment']>): boolean {
  return (assignment.daysToEndDate ?? 0) < 0
}

function getAssignmentRailTone(
  assignment: NonNullable<ResourceResponse['assignment']>,
  status: ResourceResponse['status']['code'],
): 'danger' | 'warn' | 'ok' {
  if (isAssignmentOverdue(assignment) || status === 'BAJA') return 'danger'
  return status === 'LICENCIA' ? 'warn' : 'ok'
}

function PendingConfirmationNotice() {
  return (
    <div className="resource-detail-drawer__pending-notice" role="note">
      <span className="resource-detail-drawer__pending-icon"><AlertIcon /></span>
      <p>
        <strong>Pendiente de confirmación.</strong>
        {' '}La fecha final pasó y nadie la extendió. Confirma si sigue en el proyecto o quítalo.
      </p>
    </div>
  )
}

function getTodayIso(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
