const RESOURCE_DATE_FORMATTER = new Intl.DateTimeFormat('es-PA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function normalizeShortMonth(value: string): string {
  return value.replace('sept', 'sep')
}

export function formatResourceDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha'
  return normalizeShortMonth(RESOURCE_DATE_FORMATTER.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)).replace('.', ''))
}

export function formatResourceDateTime(value: string): string {
  const parts = new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('day')} ${normalizeShortMonth(part('month')).replace('.', '')} ${part('year')}, ${part('hour')}:${part('minute')}`
}

export function formatDaysToEnd(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Sin fecha final'
  if (value < 0) return `Venció hace ${Math.abs(value)} ${Math.abs(value) === 1 ? 'día' : 'días'}`
  if (value === 0) return 'Vence hoy'
  return `En ${value} ${value === 1 ? 'día' : 'días'}`
}

export function formatVacationMonth(value: number | null | undefined): string {
  if (!value) return '—'
  const month = normalizeShortMonth(new Intl.DateTimeFormat('es-PA', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, value - 1, 1)))
    .replace('.', ''))
  return `${month.toUpperCase()} · calculado, cada año`
}
