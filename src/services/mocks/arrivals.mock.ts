// TEMPORAL SCRUM-178: eliminar al conectar la API real (SCRUM-181)
import { addDaysIso, todayIso } from '../../utils/dates'
import {
  ARRIVALS_PAGE_SIZE,
  ARRIVAL_TYPES,
  type ArrivalEvent,
  type ArrivalFilters,
  type ArrivalNotice,
  type ArrivalsPage,
  type ArrivalsStrip,
  type ArrivalsSummary,
  type ArrivalType,
} from '../arrivals.types'

interface MockRecord {
  event: ArrivalEvent
  clientId: string
  leaderId: number
}

// Client and leader ids match the projects and resources mocks, so the page filters work in dev
const CLIENTS = {
  aurora: { id: 'client-aurora', name: 'Aurora Labs' },
  bruma: { id: 'client-bruma', name: 'Bruma Foods' },
  cobalto: { id: 'client-cobalto', name: 'Cobalto Retail' },
}
const LEADERS = {
  noel: { id: 1, name: 'Noel Vega' },
  mara: { id: 2, name: 'Mara Sol' },
}

const noNotice: ArrivalNotice = { status: 'NONE', audience: null, stage: null, date: null }

function record(
  offset: number,
  type: ArrivalType,
  who: { number: string; name: string; role: string } | { count: number },
  client: keyof typeof CLIENTS,
  project: string,
  leader: keyof typeof LEADERS,
  notice: (date: (days: number) => string) => ArrivalNotice = () => noNotice,
): MockRecord {
  const day = (days: number) => addDaysIso(todayIso(), days)
  const resource = 'number' in who
    ? { id: who.number, employeeNumber: who.number, name: who.name, clientRole: who.role }
    : null
  return {
    clientId: CLIENTS[client].id,
    leaderId: LEADERS[leader].id,
    event: {
      id: `${type}-${offset}-${'number' in who ? who.number : 'project'}`,
      type,
      date: day(offset),
      daysRemaining: offset,
      resource,
      resourceCount: 'count' in who ? who.count : 1,
      client: CLIENTS[client].name,
      project,
      leader: LEADERS[leader].name,
      notice: notice(day),
    },
  }
}

const records: MockRecord[] = [
  record(-5, 'PENDING_CONFIRMATION', { number: '876', name: 'Andrés Sanjur', role: 'QA Funcional' }, 'bruma', 'Bruma Digital', 'mara'),
  record(11, 'PROBATION_END', { number: '1078', name: 'Iván Castrellón', role: 'QA Funcional' }, 'aurora', 'Atlas Norte', 'noel',
    (day) => ({ status: 'SENT', audience: 'LEADER', stage: null, date: day(-4) })),
  record(12, 'VACATION_START', { number: '801', name: 'Gabriela Saavedra', role: 'QA Funcional' }, 'cobalto', 'Cobalto Core', 'mara',
    (day) => ({ status: 'SCHEDULED', audience: 'SUMMARY', stage: null, date: day(8) })),
  record(14, 'VACATION_START', { number: '957', name: 'Héctor Jaén', role: 'QA Funcional' }, 'cobalto', 'Cobalto Core', 'mara',
    (day) => ({ status: 'SCHEDULED', audience: 'SUMMARY', stage: null, date: day(8) })),
  record(19, 'VACATION_START', { number: '905', name: 'Eduardo Cedeño', role: 'QA Funcional' }, 'aurora', 'Atlas Norte', 'noel',
    (day) => ({ status: 'SCHEDULED', audience: 'SUMMARY', stage: null, date: day(8) })),
  record(24, 'CONTRACT_END', { count: 2 }, 'bruma', 'Bruma Digital', 'mara',
    (day) => ({ status: 'SENT', audience: 'SALES', stage: 30, date: day(-6) })),
  record(24, 'ASSIGNMENT_END', { number: '1045', name: 'Ana Torres', role: 'QA Funcional' }, 'bruma', 'Bruma Digital', 'mara',
    (day) => ({ status: 'SENT', audience: 'CUSTOMER_SUCCESS', stage: 30, date: day(-6) })),
  record(24, 'ASSIGNMENT_END', { number: '1052', name: 'Luis Barría', role: 'QA Automatizador' }, 'bruma', 'Bruma Digital', 'mara',
    (day) => ({ status: 'SENT', audience: 'CUSTOMER_SUCCESS', stage: 30, date: day(-6) })),
  record(25, 'PROBATION_END', { number: '1045', name: 'Ana Torres', role: 'QA Funcional' }, 'bruma', 'Bruma Digital', 'mara',
    (day) => ({ status: 'SCHEDULED', audience: 'LEADER', stage: null, date: day(10) })),
  record(45, 'ASSIGNMENT_END', { number: '932', name: 'Lineth Ortega', role: 'QA Funcional' }, 'aurora', 'Atlas Norte', 'noel'),
  record(75, 'CONTRACT_END', { count: 3 }, 'cobalto', 'Cobalto Core', 'mara'),
]

function emptySummary(): ArrivalsSummary {
  return {
    total: 0,
    byType: Object.fromEntries(ARRIVAL_TYPES.map((type) => [type, 0])) as ArrivalsSummary['byType'],
  }
}

export const arrivalsMock = {
  async listArrivals(filters: ArrivalFilters, page = 1): Promise<ArrivalsPage> {
    // Overdue events ("Pendiente de confirmación") are always listed, whatever the window
    const base = records.filter(({ event, clientId, leaderId }) => (
      (event.type === 'PENDING_CONFIRMATION' || event.daysRemaining <= filters.windowDays)
      && (!filters.clientId || clientId === filters.clientId)
      && (!filters.leaderId || String(leaderId) === filters.leaderId)
    ))
    const summary = base.reduce((counts, { event }) => {
      counts.total += 1
      counts.byType[event.type] += 1
      return counts
    }, emptySummary())
    const items = base
      .filter(({ event }) => !filters.type || event.type === filters.type)
      .map(({ event }) => event)
      .sort((a, b) => a.date.localeCompare(b.date))
    return {
      summary,
      items: items.slice((page - 1) * ARRIVALS_PAGE_SIZE, page * ARRIVALS_PAGE_SIZE),
      page,
      pageSize: ARRIVALS_PAGE_SIZE,
      total: items.length,
      totalPages: Math.ceil(items.length / ARRIVALS_PAGE_SIZE),
    }
  },

  /** Same rules as GET /upcoming-events/summary: overdue ones count in the total but are not shown */
  async getStrip(): Promise<ArrivalsStrip> {
    const windowDays = 30
    const page = await this.listArrivals({ windowDays })
    const nearest = records
      .map(({ event }) => event)
      .filter((event) => event.type !== 'PENDING_CONFIRMATION' && event.daysRemaining >= 0 && event.daysRemaining <= windowDays)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
    return { windowDays, total: page.summary.total, nearest }
  },
}
