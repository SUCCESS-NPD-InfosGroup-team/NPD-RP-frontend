const AXIS_START = Date.UTC(2026, 8, 1)
const AXIS_END = Date.UTC(2027, 3, 1)

export interface AssignmentRailInput {
  startDate: string
  endDate: string | null
  indefinite: boolean
  today: string
}

export interface AssignmentRail {
  startPercent: number
  widthPercent: number
  todayPercent: number | null
}

function toUtcDate(value: string): number {
  return Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function percent(value: number): number {
  return ((value - AXIS_START) / (AXIS_END - AXIS_START)) * 100
}

export function calculateAssignmentRail({
  startDate,
  endDate,
  indefinite,
  today,
}: AssignmentRailInput): AssignmentRail {
  const startPercent = clampPercent(percent(toUtcDate(startDate)))
  const endPercent = indefinite || !endDate ? 100 : clampPercent(percent(toUtcDate(endDate)))
  const todayValue = percent(toUtcDate(today))

  return {
    startPercent,
    widthPercent: Math.max(endPercent - startPercent, 0),
    todayPercent: todayValue >= 0 && todayValue <= 100 ? todayValue : null,
  }
}
