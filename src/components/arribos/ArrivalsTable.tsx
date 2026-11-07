import { CheckIcon, ClockIcon } from '../icons'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import type { ArrivalEvent } from '../../services/arrivals.types'
import { formatShortDate } from '../../utils/dates'
import {
  ARRIVAL_TYPE_META,
  countLabel,
  describeNotice,
  describeRemaining,
  formatRemaining,
  groupByWeek,
  isUrgent,
} from './arrivalsView'

interface ArrivalsTableProps {
  events: ArrivalEvent[]
  /** Overridable so tests and previews do not depend on the real calendar */
  today?: string
  onViewResource?: (resourceId: string) => void
  onViewResources?: (eventId: string) => void
}

const COLUMNS = ['FALTAN', 'FECHA', 'TIPO', 'RECURSO', 'CLIENTE · PROYECTO', 'LÍDER NPD', 'AVISO POR CORREO', '']

export function ArrivalsTable({
  events,
  today,
  onViewResource,
  onViewResources,
}: Readonly<ArrivalsTableProps>) {
  return (
    <table className="arrivals-page__table">
      <thead>
        <tr>{COLUMNS.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
      </thead>
      {groupByWeek(events, today).map((group) => (
        <tbody key={group.key}>
          <tr className="arrivals-page__group">
            <th colSpan={COLUMNS.length} scope="colgroup">
              <strong>{group.label.toUpperCase()}</strong>
              {group.range && <span>{group.range}</span>}
            </th>
          </tr>
          {group.events.map((event) => (
            <ArrivalRow
              key={event.id}
              event={event}
              onViewResource={onViewResource}
              onViewResources={onViewResources}
            />
          ))}
        </tbody>
      ))}
    </table>
  )
}

function ArrivalRow({
  event,
  onViewResource,
  onViewResources,
}: Readonly<{
  event: ArrivalEvent
  onViewResource?: (resourceId: string) => void
  onViewResources?: (eventId: string) => void
}>) {
  const meta = ARRIVAL_TYPE_META[event.type]
  const notice = describeNotice(event.notice)
  return (
    <tr className="arrivals-page__row">
      <td>
        <span
          className={`arrivals-page__remaining${isUrgent(event.daysRemaining) ? ' arrivals-page__remaining--urgent' : ''}`}
          title={describeRemaining(event.daysRemaining)}
        >
          {formatRemaining(event.daysRemaining)}
        </span>
      </td>
      <td>{formatShortDate(event.date, true)}</td>
      <td><Chip tone={meta.tone}>{meta.label}</Chip></td>
      <td>
        {event.resource ? (
          <>
            <strong>{event.resource.name}</strong>
            <small>{`#${event.resource.employeeNumber} · ${event.resource.clientRole ?? 'Sin rol'}`}</small>
          </>
        ) : (
          <>
            <strong>{countLabel(event.resourceCount, 'recurso asignado', 'recursos asignados')}</strong>
            <small>Fin del contrato con el cliente</small>
          </>
        )}
      </td>
      <td>
        <strong>{event.client ?? '—'}</strong>
        <small>{event.project ?? 'Sin proyecto'}</small>
      </td>
      <td>{event.leader ?? '—'}</td>
      <td>
        <span className={`arrivals-page__notice arrivals-page__notice--${notice.tone}`}>
          {notice.tone === 'sent' && <CheckIcon />}
          {notice.tone === 'scheduled' && <ClockIcon />}
          <span>
            {notice.text}
            {notice.detail && <small>{notice.detail}</small>}
          </span>
        </span>
      </td>
      <td>
        {event.resource && onViewResource && (
          <Button
            variant="secondary"
            onClick={() => {
              if (event.resource) onViewResource(event.resource.id)
            }}
          >
            Ver detalle
          </Button>
        )}
        {!event.resource && onViewResources && (
          <Button variant="secondary" onClick={() => onViewResources(event.id)}>
            Ver recursos
          </Button>
        )}
      </td>
    </tr>
  )
}
