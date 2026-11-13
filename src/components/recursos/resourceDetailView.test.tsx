import { describe, expect, it } from 'vitest'
import {
  formatDaysToEnd,
  formatResourceDate,
  formatResourceDateTime,
  formatVacationMonth,
} from './resourceDetailView'

describe('resource detail formatting', () => {
  it('formats API dates in Spanish', () => {
    expect(formatResourceDate('2026-10-02')).toContain('02 oct 2026')
    expect(formatResourceDate(null)).toBe('Sin fecha')
  })

  it('formats change timestamps in the local timezone', () => {
    const formatted = formatResourceDateTime('2026-10-02T15:14:00Z')
    const parts = new Intl.DateTimeFormat('es-PA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date('2026-10-02T15:14:00Z'))
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''

    expect(formatted).toBe(`${part('day')} ${part('month').replace('sept', 'sep').replace('.', '')} ${part('year')}, ${part('hour')}:${part('minute')}`)
    expect(formatted).toMatch(/^\d{2} [a-z]{3} 2026, \d{2}:\d{2}$/)
  })

  it.each([
    [15, 'En 15 días'],
    [1, 'En 1 día'],
    [0, 'Vence hoy'],
    [-7, 'Venció hace 7 días'],
    [-1, 'Venció hace 1 día'],
    [null, 'Sin fecha final'],
  ] as const)('formats days value %s', (value, expected) => {
    expect(formatDaysToEnd(value)).toBe(expected)
  })

  it('formats vacation month or its empty state', () => {
    expect(formatVacationMonth(10)).toBe('OCT · calculado, cada año')
    expect(formatVacationMonth(null)).toBe('—')
  })
})
