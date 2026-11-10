import { describe, expect, it } from 'vitest'
import { daysUntil, formatProjectDate, groupProjectsByClient } from './projectsView'

const project = (id: string, clientId: string) => ({
  id, name: id, client: { id: clientId, name: clientId, isInternal: false },
  teamSize: 0, members: [], leads: [], startDate: '2025-02-03', contractEnd: null,
  pendingCount: 0, active: true,
})

describe('projects view helpers', () => {
  it('calculates contract days and handles no date', () => {
    const today = new Date('2025-01-01T00:00:00Z')
    expect(daysUntil('2025-01-31T00:00:00Z', today)).toBe(30)
    expect(daysUntil('2025-02-01T00:00:00Z', today)).toBe(31)
    expect(daysUntil('2024-12-31T00:00:00Z', today)).toBe(-1)
    expect(daysUntil(null, today)).toBeNull()
  })
  it('formats dates and groups by client', () => {
    expect(formatProjectDate('2025-02-03')).toContain('03 feb')
    expect(formatProjectDate(null)).toBe('Sin fecha')
    expect(groupProjectsByClient([project('a', 'one'), project('b', 'one'), project('c', 'two')])).toHaveLength(2)
  })
})
