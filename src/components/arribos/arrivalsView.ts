import type { ChipTone } from '../ui/Chip'
import type { ArrivalEvent, ArrivalNotice, ArrivalType } from '../../services/arrivals.types'
import { addDaysIso, formatShortDate, todayIso } from '../../utils/dates'

export interface ArrivalTypeMeta {
  label: string
  tone: ChipTone
  /** Who gets the notice, as shown on the type card */
  note: string
}

export const ARRIVAL_TYPE_META: Record<ArrivalType, ArrivalTypeMeta> = {
  PENDING_CONFIRMATION: { label: 'Pendiente de confirmación', tone: 'solid-danger', note: 'Fecha final vencida' },
  ASSIGNMENT_END: { label: 'Fin de asignación', tone: 'danger', note: 'Aviso a Customer Success' },
  CONTRACT_END: { label: 'Fin de contrato', tone: 'warn', note: 'Aviso a Sales' },
  PROBATION_END: { label: 'Fin de probatoria', tone: 'orange', note: 'Día 90 · aviso al líder' },
  VACATION_START: { label: 'Vacaciones', tone: 'info', note: 'Resumen quincenal' },
}

/** CA-05: days remaining are shown in red when 15 or fewer */
export const URGENT_DAYS = 15

export function formatRemaining(days: number): string {
  return days >= 0 ? `D-${days}` : `D+${Math.abs(days)}`
}

export function isUrgent(days: number): boolean {
  return days <= URGENT_DAYS
}

export function describeRemaining(days: number): string {
  if (days < 0) return `Venció hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`
  return `Faltan ${days} ${days === 1 ? 'día' : 'días'}`
}

export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** "miércoles 07 oct 2026" */
export function formatToday(now = new Date()): string {
  const weekday = new Intl.DateTimeFormat('es', { weekday: 'long' }).format(now)
  return `${weekday} ${formatShortDate(todayIso(now), true)}`
}

function daysBetween(fromIso: string, toIso: string): number {
  const toUtc = (iso: string) => {
    const [year, month, day] = iso.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86_400_000)
}

/** Monday of the week the date falls in (weeks run Monday to Sunday) */
function mondayOf(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7
  return addDaysIso(iso, -weekday)
}

export interface WeekGroup {
  key: string
  label: string
  /** "12 oct – 18 oct"; null for the overdue group */
  range: string | null
  events: ArrivalEvent[]
}

const OVERDUE_LABEL = 'Vencidas · por confirmar'

function weekLabel(offset: number): string {
  if (offset <= 0) return 'Esta semana'
  if (offset === 1) return 'Próxima semana'
  return `En ${offset} semanas`
}

/** CA-02 / CA-05: "Pendiente de confirmación" goes first, the rest is grouped by week */
export function groupByWeek(events: ArrivalEvent[], today = todayIso()): WeekGroup[] {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))
  const groups: WeekGroup[] = []
  const overdue = sorted.filter((event) => event.type === 'PENDING_CONFIRMATION')
  if (overdue.length) groups.push({ key: 'overdue', label: OVERDUE_LABEL, range: null, events: overdue })

  const thisMonday = mondayOf(today)
  const weeks = new Map<number, WeekGroup>()
  for (const event of sorted) {
    if (event.type === 'PENDING_CONFIRMATION') continue
    const monday = mondayOf(event.date)
    const offset = Math.max(daysBetween(thisMonday, monday) / 7, 0)
    const group = weeks.get(offset) ?? {
      key: `week-${offset}`,
      label: weekLabel(offset),
      range: `${formatShortDate(addDaysIso(thisMonday, offset * 7))} – ${formatShortDate(addDaysIso(thisMonday, offset * 7 + 6))}`,
      events: [],
    }
    group.events.push(event)
    weeks.set(offset, group)
  }
  return [...groups, ...[...weeks.entries()].sort(([a], [b]) => a - b).map(([, group]) => group)]
}

export interface NoticeView {
  tone: 'sent' | 'scheduled' | 'none'
  text: string
  detail?: string
}

const AUDIENCE_TARGET = { LEADER: 'al líder', SALES: 'a Sales', CUSTOMER_SUCCESS: 'a Customer Success' } as const

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Email notice column: sent (green check) or scheduled (clock) */
export function describeNotice(notice: ArrivalNotice): NoticeView {
  if (notice.status === 'NONE') return { tone: 'none', text: '—' }
  const sent = notice.status === 'SENT'
  const date = notice.date ? formatShortDate(notice.date) : ''
  const tone = sent ? 'sent' : 'scheduled'

  if (notice.audience === 'SUMMARY') {
    return sent
      ? { tone, text: 'Resumen enviado', detail: date }
      : { tone, text: `Resumen del ${date}`.trim() }
  }
  if (notice.stage) {
    return sent
      ? { tone, text: `${notice.stage} días enviado`, detail: date }
      : { tone, text: `${notice.stage} días: ${date}`.trim() }
  }
  const target = notice.audience ? AUDIENCE_TARGET[notice.audience] : ''
  return sent
    ? { tone, text: `Enviado ${target}`.trim(), detail: date }
    : { tone, text: `${capitalize(target)}: ${date}`.trim() }
}
