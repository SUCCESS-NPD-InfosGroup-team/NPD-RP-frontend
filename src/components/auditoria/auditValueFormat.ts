import { formatResourceDate } from '../recursos/resourceDetailView'

export function formatAuditValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const normalized = String(value).trim()
  if (!normalized) return '—'
  if (normalized === 'true') return 'Sí'
  if (normalized === 'false') return 'No'
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return formatResourceDate(normalized)
  return normalized
}

export function formatAuditDateTime(value: string, timeZone = 'UTC'): string {
  const date = new Date(value)
  const parts = new Intl.DateTimeFormat('es-CO', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  const hour = parts.find((part) => part.type === 'hour')?.value ?? ''
  const minute = parts.find((part) => part.type === 'minute')?.value ?? ''
  return `${day} ${month} ${year}, ${hour}:${minute}`
}
