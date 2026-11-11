import { Chip } from '../ui/Chip'
import { ARRIVAL_TYPES, type ArrivalsSummary, type ArrivalType } from '../../services/arrivals.types'
import { ARRIVAL_TYPE_META } from './arrivalsView'

interface ArrivalTypeCardsProps {
  summary?: ArrivalsSummary
  selected?: ArrivalType
  onSelect: (type: ArrivalType | undefined) => void
}

/** CA-03: each card shows the count of its type and works as a filter; selecting it again clears the filter */
export function ArrivalTypeCards({ summary, selected, onSelect }: Readonly<ArrivalTypeCardsProps>) {
  return (
    <div className="arrivals-page__cards" role="group" aria-label="Filtrar por tipo de evento">
      {ARRIVAL_TYPES.map((type) => {
        const meta = ARRIVAL_TYPE_META[type]
        const isSelected = selected === type
        return (
          <button
            key={type}
            type="button"
            className={`arrivals-page__card${isSelected ? ' arrivals-page__card--selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? undefined : type)}
          >
            <span className="arrivals-page__card-count">{summary?.byType[type] ?? '—'}</span>
            <span className="arrivals-page__card-body">
              <Chip tone={meta.tone}>{meta.label}</Chip>
              <span className="arrivals-page__card-note">{meta.note}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
