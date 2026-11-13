import { describe, expect, it } from 'vitest'
import { calculateAssignmentRail } from './resourceAssignmentRail'

describe('calculateAssignmentRail', () => {
  it('clamps a start before the axis and an end after it', () => {
    const rail = calculateAssignmentRail({
      startDate: '2026-08-15',
      endDate: '2027-05-15',
      indefinite: false,
      today: '2026-12-01',
    })

    expect(rail.startPercent).toBe(0)
    expect(rail.widthPercent).toBe(100)
    expect(rail.todayPercent).toBeCloseTo(42.92, 1)
  })

  it('extends an indefinite assignment to the end of the axis', () => {
    const rail = calculateAssignmentRail({
      startDate: '2026-10-01',
      endDate: null,
      indefinite: true,
      today: '2027-01-01',
    })

    expect(rail.startPercent).toBeCloseTo(14.13, 1)
    expect(rail.widthPercent).toBeCloseTo(85.87, 1)
  })

  it('hides the today mark outside the axis', () => {
    expect(calculateAssignmentRail({
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      indefinite: false,
      today: '2027-04-02',
    }).todayPercent).toBeNull()
  })

})
