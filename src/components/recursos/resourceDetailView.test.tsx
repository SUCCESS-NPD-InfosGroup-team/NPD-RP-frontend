import { describe, expect, it } from 'vitest'
import { formatDaysToEnd, formatResourceDate, formatVacationMonth } from './resourceDetailView'

describe('resource detail formatting', () => {
  it('formats API dates in Spanish', () => {
    expect(formatResourceDate('2026-10-02')).toContain('02 oct 2026')
    expect(formatResourceDate(null)).toBe('Sin fecha')
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
    expect(formatVacationMonth(10)).toBe('Octubre')
    expect(formatVacationMonth(null)).toBe('No registrado')
  })
})
