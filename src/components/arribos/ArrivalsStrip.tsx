import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '../icons'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { useArrivalsStrip } from '../../hooks/useArrivalsStrip'
import type { ArrivalEvent } from '../../services/arrivals.types'
import { formatShortDate } from '../../utils/dates'
import { ARRIVAL_TYPE_META, countLabel, isUrgent } from './arrivalsView'
import './ArrivalsStrip.css'

export const ARRIVALS_PATH = '/arribos-proximos'

/** Window the strip summarises until the API answers (the backend always uses 30 days) */
const DEFAULT_WINDOW_DAYS = 30

/**
 * Strip at the top of Recursos (HU-06 CA-01): how many events are due soon and the 4 nearest ones,
 * with the link "Ver los N eventos →" to the Arribos screen.
 */
export function ArrivalsStrip() {
  const { data, loading, error, refetch } = useArrivalsStrip()
  const windowDays = data?.windowDays ?? DEFAULT_WINDOW_DAYS

  return (
    <section className="arrivals-strip" aria-labelledby="arrivals-strip-title">
      <div className="arrivals-strip__summary">
        <div>
          <h2 id="arrivals-strip-title" className="arrivals-strip__title">Arribos próximos</h2>
          <p className="arrivals-strip__subtitle">Lo que vence en los próximos {windowDays} días</p>
        </div>
        <Link className="arrivals-strip__all" to={ARRIVALS_PATH}>
          {data ? `Ver ${data.total === 1 ? 'el evento' : `los ${data.total} eventos`}` : 'Ver arribos próximos'}
          <ArrowRightIcon />
        </Link>
      </div>

      <div className="arrivals-strip__events">
        {error ? (
          <div className="arrivals-strip__message arrivals-strip__message--error" role="alert">
            <span>No se pudieron cargar los arribos próximos.</span>
            <Button variant="secondary" onClick={refetch}>Reintentar</Button>
          </div>
        ) : loading && !data ? (
          <div className="arrivals-strip__message">Cargando arribos próximos…</div>
        ) : data?.nearest.length ? (
          data.nearest.map((event) => <StripEvent key={event.id} event={event} />)
        ) : (
          <div className="arrivals-strip__message">Nada vence en los próximos {windowDays} días.</div>
        )}
      </div>
    </section>
  )
}

function StripEvent({ event }: Readonly<{ event: ArrivalEvent }>) {
  const meta = ARRIVAL_TYPE_META[event.type]
  // A contract end affects the whole team: it has no person, so the project names it
  const who = event.resource?.name ?? event.project ?? 'Proyecto'
  const where = [event.client, formatShortDate(event.date, true)].filter(Boolean).join(' · ')
  const days = countLabel(event.daysRemaining, 'día', 'días')

  return (
    <Link className="arrivals-strip__event" to={ARRIVALS_PATH} aria-label={`${meta.label}: ${who}, ${where}, faltan ${days}`}>
      <span className="arrivals-strip__days">
        <strong className={isUrgent(event.daysRemaining) ? 'arrivals-strip__count arrivals-strip__count--urgent' : 'arrivals-strip__count'}>
          {event.daysRemaining}
        </strong>
        <small>{event.daysRemaining === 1 ? 'DÍA' : 'DÍAS'}</small>
      </span>
      <span className="arrivals-strip__body">
        <Chip tone={meta.tone}>{meta.label}</Chip>
        <strong className="arrivals-strip__who">{who}</strong>
        <small className="arrivals-strip__where">{where}</small>
      </span>
    </Link>
  )
}
