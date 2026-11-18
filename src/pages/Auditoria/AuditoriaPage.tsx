import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { canAccessNavigationItem } from '../../components/layout/roleNavigation'
import { formatAuditDateTime, formatAuditValue } from '../../components/auditoria/auditValueFormat'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Field } from '../../components/ui/Field'
import { Paginador } from '../../components/ui/Paginador'
import { useAuth } from '../../context/AuthContext'
import { useHistoryAuditLog } from '../../hooks/useHistoryAuditLog'
import { useResourceDetail } from '../../hooks/useResourceDetail'
import type { AuditLogEntry } from '../../services/history.types'
import { ResourceAuditSelector } from './ResourceAuditSelector'
import './AuditoriaPage.css'

export function AuditoriaPage() {
  const { resourceId } = useParams()
  const location = useLocation()
  const { roles } = useAuth()
  const [actorFilter, setActorFilter] = useState('')
  const [fieldFilter, setFieldFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  const filters = useMemo(
    () => ({
      actor: actorFilter || undefined,
      field: fieldFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [actorFilter, fieldFilter, fromDate, toDate],
  )

  const canViewAudit = canAccessNavigationItem(roles, 'audit')
  const cameFromAuditSelector = isAuditSelectorState(location.state)
  const resourceDetailState = useResourceDetail(canViewAudit ? resourceId ?? null : null)
  const dateError = useMemo(() => {
    if (!fromDate || !toDate) return ''
    return new Date(`${toDate}T23:59:59Z`).getTime() < new Date(`${fromDate}T00:00:00Z`).getTime()
      ? 'La fecha «Hasta» no puede ser anterior a «Desde».'
      : ''
  }, [fromDate, toDate])

  const { data, loading, error, refetch } = useHistoryAuditLog(
    canViewAudit ? resourceId ?? null : null,
    filters,
    page,
  )

  if (!canViewAudit) {
    return (
      <section className="no-access" role="alert">
        <h1>No tienes acceso a esta pantalla</h1>
        <p>Tu perfil no tiene permiso para consultar esta sección.</p>
      </section>
    )
  }

  if (!resourceId) {
    return <ResourceAuditSelector />
  }

  const handleFilterChange = (setter: (nextValue: string) => void, nextValue: string): void => {
    setPage(1)
    setter(nextValue)
  }

  const actorOptions = data?.actors ?? []
  const fieldOptions = data?.fields ?? []
  const resourceName = resourceTitle(resourceDetailState, resourceId)
  const totalElements = data?.page.totalElements ?? 0
  const pageMeta = data?.page
  const visibleItems = data?.items ?? []
  const hasRequestError = Boolean(error) && !dateError
  const groupedItems = groupItemsByMonth(visibleItems)
  const initials = resourceDetailState.resource?.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase('es'))
    .join('') ?? ''

  return (
    <section className="audit-log-page">
      <nav className="audit-log-page__breadcrumb" aria-label="Migas de pan">
        <Link to={cameFromAuditSelector ? '/auditoria' : '/recursos'}>
          {cameFromAuditSelector ? 'Auditoría' : 'Recursos'}
        </Link>
        <span aria-hidden="true">›</span>
        <span>{resourceName}</span>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Auditoría</span>
      </nav>
      <header className="audit-log-page__heading">
        <div className="audit-log-page__avatar" aria-hidden="true">{initials}</div>
        <div>
          <h1>Auditoría · {resourceDetailState.resource?.name ?? `Recurso #${resourceId}`}</h1>
          <p>Quién cambió qué y cuándo en este registro. Las entradas no se pueden editar ni borrar.</p>
        </div>
      </header>

      {resourceDetailState.error && (
        <div className="audit-log-page__resource-error" role="alert">
          <span>No se pudo cargar el recurso.</span>
          <Button variant="secondary" onClick={resourceDetailState.refetch}>Reintentar</Button>
        </div>
      )}

      <section className="audit-log-page__card" aria-label="Registro de auditoría">
        <div className="audit-log-page__filters">
          <Field
            id="audit-actor"
            label="Usuario"
            type="select"
            value={actorFilter}
            options={[{ value: '', label: 'Todos' }, ...actorOptions.map((option) => ({ value: option, label: option }))]}
            onChange={(event) => handleFilterChange(setActorFilter, event.target.value)}
          />
          <Field
            id="audit-field"
            label="Campo"
            type="select"
            value={fieldFilter}
            options={[{ value: '', label: 'Todos' }, ...fieldOptions.map((option) => ({ value: option.field, label: option.label }))]}
            onChange={(event) => handleFilterChange(setFieldFilter, event.target.value)}
          />
          <Field
            id="audit-from"
            label="Desde"
            type="input"
            inputType="date"
            value={fromDate}
            onChange={(event) => handleFilterChange(setFromDate, event.target.value)}
          />
          <Field
            id="audit-to"
            label="Hasta"
            type="input"
            inputType="date"
            value={toDate}
            onChange={(event) => handleFilterChange(setToDate, event.target.value)}
          />
          <span className="audit-log-page__filters-spacer" />
          <span className="audit-log-page__sort">Más recientes primero</span>
          {pageMeta && (
            <Paginador
              range={totalElements === 0
                ? '0 de 0'
                : `${Math.min((pageMeta.number - 1) * pageMeta.size + 1, totalElements)}–${Math.min(pageMeta.number * pageMeta.size, totalElements)} de ${totalElements}`}
              page={pageMeta.number}
              totalPages={pageMeta.totalPages}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          )}
        </div>

      {dateError && (
        <p className="audit-log-page__message audit-log-page__message--error" role="alert">{dateError}</p>
      )}

      {hasRequestError && !dateError && (
        <div className="audit-log-page__message audit-log-page__message--error" role="alert">
          <p>No se pudo cargar la auditoría.</p>
          <Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>
        </div>
      )}

      {loading && <output className="audit-log-page__message">Cargando auditoría…</output>}

      {!loading && !error && visibleItems.length === 0 && !dateError && (
        <output className="audit-log-page__message">
          No hay cambios registrados para este recurso.
        </output>
      )}

      {!loading && !error && visibleItems.length > 0 && (
        <div className="audit-log-page__table-wrap">
          <table className="audit-log-page__table">
            <colgroup>
              <col className="audit-log-page__date-column" />
              <col className="audit-log-page__author-column" />
              <col className="audit-log-page__action-column" />
              <col className="audit-log-page__field-column" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Fecha y hora</th>
                <th scope="col">Autor</th>
                <th scope="col">Acción</th>
                <th scope="col">Campo</th>
                <th scope="col">Valor anterior → nuevo</th>
              </tr>
            </thead>
            {groupedItems.map((group) => (
              <tbody key={group.month}>
                <tr className="audit-log-page__month">
                  <th scope="rowgroup" colSpan={5}>{group.month}</th>
                </tr>
                {group.entries.map((entry) => (
                  <AuditLogRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      </section>
    </section>
  )
}

function resourceTitle(
  state: { resource?: { name: string; employeeNumber: string | number } | null; loading: boolean },
  resourceId: string | undefined,
): string {
  if (state.resource) return `${state.resource.name} #${state.resource.employeeNumber}`
  if (state.loading) return 'Cargando recurso…'
  return `Recurso #${resourceId}`
}

function isAuditSelectorState(state: unknown): boolean {
  return typeof state === 'object'
    && state !== null
    && 'breadcrumbSource' in state
    && state.breadcrumbSource === 'audit-selector'
}

function AuditLogRow({ entry }: Readonly<{ entry: AuditLogEntry }>) {
  const [date, time] = formatAuditDateTime(entry.occurredAt, 'America/Bogota').split(', ')
  const initials = entry.actor
    .split(/[.\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase('es'))
    .join('')

  return (
    <tr className="audit-log-page__entry">
      <td>
        <span className="audit-log-page__date">{date}</span>
        <span className="audit-log-page__time">{time}</span>
      </td>
      <td>
        <span className="audit-log-page__author">
          <span className="audit-log-page__author-avatar" aria-hidden="true">{initials}</span>
          {entry.actor}
        </span>
      </td>
      <td><Chip>{entry.action === 'UPDATE' ? 'Edición' : 'Alta'}</Chip></td>
      <td>
        {entry.fields.map((field) => (
          <span className="audit-log-page__field" key={`${entry.id}-${field.field}`}>{field.label}</span>
        ))}
      </td>
      <td>
        {entry.fields.map((field) => (
          <span className="audit-log-page__value" key={`${entry.id}-${field.field}-value`}>
            <span className="audit-log-page__old-value">{formatAuditValue(field.oldValue)}</span>
            <span className="audit-log-page__value-arrow" aria-hidden="true">→</span>
            <strong>{formatAuditValue(field.newValue)}</strong>
          </span>
        ))}
      </td>
    </tr>
  )
}

function groupItemsByMonth(items: AuditLogEntry[]): Array<{ month: string; entries: AuditLogEntry[] }> {
  const groups = new Map<string, AuditLogEntry[]>()
  for (const item of items) {
    const month = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      month: 'long',
      year: 'numeric',
    }).format(new Date(item.occurredAt))
    const label = `${month.charAt(0).toLocaleUpperCase('es')}${month.slice(1)}`
    const entries = groups.get(label) ?? []
    entries.push(item)
    groups.set(label, entries)
  }
  return Array.from(groups, ([month, entries]) => ({ month, entries }))
}

export default AuditoriaPage
