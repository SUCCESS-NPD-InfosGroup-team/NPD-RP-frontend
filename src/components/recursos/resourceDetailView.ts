const RESOURCE_DATE_FORMATTER = new Intl.DateTimeFormat('es-PA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatResourceDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha'
  return RESOURCE_DATE_FORMATTER.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)).replace('.', '')
}

export function formatDaysToEnd(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Sin fecha final'
  if (value < 0) return `Venció hace ${Math.abs(value)} ${Math.abs(value) === 1 ? 'día' : 'días'}`
  if (value === 0) return 'Vence hoy'
  return `En ${value} ${value === 1 ? 'día' : 'días'}`
}

export function formatVacationMonth(value: number | null | undefined): string {
  if (!value) return 'No registrado'
  return new Intl.DateTimeFormat('es-PA', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, value - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase())
}
