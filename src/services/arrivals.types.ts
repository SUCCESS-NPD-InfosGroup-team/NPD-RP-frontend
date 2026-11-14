/** Rows per page of the "Arribos próximos" list (T-6: 25 rows, Gmail-style pagination) */
export const ARRIVALS_PAGE_SIZE = 25

/** Event types of HE-01-HU-06. PENDING_CONFIRMATION = end date already passed and nobody extended it (RQ-10). */
export const ARRIVAL_TYPES = [
  'PENDING_CONFIRMATION',
  'ASSIGNMENT_END',
  'CONTRACT_END',
  'PROBATION_END',
  'VACATION_START',
] as const
export type ArrivalType = (typeof ARRIVAL_TYPES)[number]

/** "Ventana" filter: how many days ahead the list looks (CA-04) */
export const ARRIVAL_WINDOWS = [30, 60, 90] as const
export type ArrivalWindow = (typeof ARRIVAL_WINDOWS)[number]

export interface ArrivalFilters {
  windowDays: ArrivalWindow
  clientId?: string
  leaderId?: string
  type?: ArrivalType
}

export type NoticeStatus = 'SENT' | 'SCHEDULED' | 'NONE'
export type NoticeAudience = 'LEADER' | 'SALES' | 'CUSTOMER_SUCCESS' | 'SUMMARY'

/** State of the email notice linked to an event (CA-05: sent or scheduled) */
export interface ArrivalNotice {
  status: NoticeStatus
  audience: NoticeAudience | null
  /** 30 or 15 days before, for the two-step notices of assignment and contract ends */
  stage: 30 | 15 | null
  /** Day the notice was sent, or is scheduled to be sent (yyyy-MM-dd) */
  date: string | null
}

export interface ArrivalEvent {
  id: string
  type: ArrivalType
  /** yyyy-MM-dd */
  date: string
  /** Days until the event; negative once it has passed */
  daysRemaining: number
  /** null on project-level events (CONTRACT_END), which affect several people at once */
  resource: { id: string; employeeNumber: string; name: string; clientRole: string | null } | null
  /** People the event affects: 1 on resource events, N on CONTRACT_END */
  resourceCount: number
  client: string | null
  project: string | null
  leader: string | null
  notice: ArrivalNotice
}

/** Counts per type for the type cards. They ignore the type filter, so each card shows its own total. */
export interface ArrivalsSummary {
  total: number
  byType: Record<ArrivalType, number>
}

/**
 * Strip at the top of Recursos (HU-06 CA-01). `total` is the N of "Ver los N eventos" (same as the
 * Arribos list with a 30-day window, overdue ones included); `nearest` holds up to 4 events from today
 * on, without the overdue ones.
 */
export interface ArrivalsStrip {
  windowDays: number
  total: number
  nearest: ArrivalEvent[]
}

export interface ArrivalsPage {
  summary: ArrivalsSummary
  items: ArrivalEvent[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
