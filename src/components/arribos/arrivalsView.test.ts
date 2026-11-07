import { describe, expect, it } from 'vitest'
import {
  countLabel,
  describeNotice,
  describeRemaining,
  formatRemaining,
  formatToday,
  groupByWeek,
  isUrgent,
} from './arrivalsView'
import type { ArrivalEvent } from '../../services/arrivals.types'

const event = (id: string, type: ArrivalEvent['type'], date: string, daysRemaining: number): ArrivalEvent => ({
  id,
  type,
  date,
  daysRemaining,
  resource: { id: id, employeeNumber: '1078', name: 'Iván', clientRole: 'QA' },
  resourceCount: 1,
  client: 'Aurora Labs',
  project: 'Atlas Norte',
  leader: 'Noel Vega',
  notice: { status: 'NONE', audience: null, stage: null, date: null },
})

describe('arrivalsView', () => {
  it('formats remaining days, urgency and counts', () => {
    expect(formatRemaining(11)).toBe('D-11')
    expect(formatRemaining(-5)).toBe('D+5')
    expect(isUrgent(15)).toBe(true)
    expect(isUrgent(16)).toBe(false)
    expect(describeRemaining(-1)).toBe('Venció hace 1 día')
    expect(describeRemaining(2)).toBe('Faltan 2 días')
    expect(countLabel(1, 'evento', 'eventos')).toBe('1 evento')
    expect(countLabel(2, 'evento', 'eventos')).toBe('2 eventos')
  })

  it('formats today using the local Spanish calendar', () => {
    expect(formatToday(new Date(2026, 9, 7))).toBe('miércoles 07 oct 2026')
  })

  it('groups overdue confirmations first and upcoming events by week', () => {
    const groups = groupByWeek([
      event('later', 'ASSIGNMENT_END', '2026-10-19', 12),
      event('overdue', 'PENDING_CONFIRMATION', '2026-10-02', -5),
      event('next', 'CONTRACT_END', '2026-10-12', 5),
    ], '2026-10-07')

    expect(groups.map((group) => group.label)).toEqual([
      'Vencidas · por confirmar',
      'Próxima semana',
      'En 2 semanas',
    ])
    expect(groups[0].events[0].id).toBe('overdue')
    expect(groups[1].range).toBe('12 oct – 18 oct')
  })

  it('describes sent and scheduled notices for every audience', () => {
    expect(describeNotice({ status: 'NONE', audience: null, stage: null, date: null }))
      .toEqual({ tone: 'none', text: '—' })
    expect(describeNotice({ status: 'SENT', audience: 'LEADER', stage: null, date: '2026-10-03' }))
      .toEqual({ tone: 'sent', text: 'Enviado al líder', detail: '03 oct' })
    expect(describeNotice({ status: 'SCHEDULED', audience: 'LEADER', stage: null, date: '2026-10-17' }))
      .toEqual({ tone: 'scheduled', text: 'Al líder: 17 oct' })
    expect(describeNotice({ status: 'SENT', audience: 'SALES', stage: 30, date: '2026-10-01' }))
      .toEqual({ tone: 'sent', text: '30 días enviado', detail: '01 oct' })
    expect(describeNotice({ status: 'SCHEDULED', audience: 'CUSTOMER_SUCCESS', stage: null, date: '2026-10-17' }))
      .toEqual({ tone: 'scheduled', text: 'A Customer Success: 17 oct' })
    expect(describeNotice({ status: 'SCHEDULED', audience: 'SUMMARY', stage: null, date: '2026-10-15' }))
      .toEqual({ tone: 'scheduled', text: 'Resumen del 15 oct' })
  })
})
