import { describe, expect, it } from 'vitest'
import { arrivalsMock } from './arrivals.mock'

describe('arrivalsMock', () => {
  it('includes overdue events and summary counts independent of the type filter', async () => {
    const result = await arrivalsMock.listArrivals({ windowDays: 30 })
    expect(result.items.some((item) => item.type === 'PENDING_CONFIRMATION')).toBe(true)
    expect(result.summary.byType.VACATION_START).toBe(3)

    const filtered = await arrivalsMock.listArrivals({ windowDays: 30, type: 'VACATION_START' })
    expect(filtered.items.every((item) => item.type === 'VACATION_START')).toBe(true)
    expect(filtered.summary.total).toBe(result.summary.total)
  })

  it('applies client, leader, window and pagination filters', async () => {
    const byClient = await arrivalsMock.listArrivals({ windowDays: 30, clientId: 'client-bruma' })
    expect(byClient.items.every((item) => item.client === 'Bruma Foods')).toBe(true)

    const byLeader = await arrivalsMock.listArrivals({ windowDays: 30, leaderId: '1' })
    expect(byLeader.items.every((item) => item.leader === 'Noel Vega')).toBe(true)

    const later = await arrivalsMock.listArrivals({ windowDays: 30 }, 2)
    expect(later.items).toHaveLength(0)
    expect(later.totalPages).toBe(1)

    const ninety = await arrivalsMock.listArrivals({ windowDays: 90 })
    expect(ninety.total).toBeGreaterThan(byClient.total)
  })
  it('builds the strip like the backend: overdue ones in the total, not among the 4 nearest', async () => {
    const strip = await arrivalsMock.getStrip()
    const list = await arrivalsMock.listArrivals({ windowDays: 30 })
    expect(strip.windowDays).toBe(30)
    expect(strip.total).toBe(list.summary.total)
    expect(strip.nearest.length).toBeLessThanOrEqual(4)
    expect(strip.nearest.every((event) => event.type !== 'PENDING_CONFIRMATION' && event.daysRemaining >= 0)).toBe(true)
    expect(strip.nearest.map((event) => event.date)).toEqual([...strip.nearest.map((event) => event.date)].sort())
  })
})
