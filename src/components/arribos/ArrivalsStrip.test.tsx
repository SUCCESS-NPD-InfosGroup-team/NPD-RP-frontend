import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArrivalEvent, ArrivalsStrip as Strip } from '../../services/arrivals.types'
import { ArrivalsStrip } from './ArrivalsStrip'

const getStrip = vi.fn<() => Promise<Strip>>()

vi.mock('../../services/arrivals', () => ({
  getArrivalsApi: () => Promise.resolve({ getStrip }),
}))

function event(overrides: Partial<ArrivalEvent>): ArrivalEvent {
  return {
    id: 'PROBATION_END-1',
    type: 'PROBATION_END',
    date: '2026-11-25',
    daysRemaining: 11,
    resource: { id: '1', employeeNumber: '1078', name: 'Iván Castrellón', clientRole: null },
    resourceCount: 1,
    client: 'TIGO',
    project: 'Portal',
    leader: 'Abdiel',
    notice: { status: 'NONE', audience: null, stage: null, date: null },
    ...overrides,
  }
}

const renderStrip = () => render(<MemoryRouter><ArrivalsStrip /></MemoryRouter>)

describe('ArrivalsStrip (HU-06 CA-01)', () => {
  beforeEach(() => getStrip.mockReset())

  it('shows the total, the link to Arribos and the nearest events like the mockup', async () => {
    getStrip.mockResolvedValue({
      windowDays: 30,
      total: 8,
      nearest: [
        event({}),
        event({ id: 'VACATION_START-2-2026', type: 'VACATION_START', date: '2026-12-03', daysRemaining: 19, resource: { id: '2', employeeNumber: '2', name: 'Eduardo Cedeño', clientRole: null }, client: 'COPA' }),
      ],
    })
    renderStrip()

    const all = await screen.findByRole('link', { name: /Ver los 8 eventos/ })
    expect(all).toHaveAttribute('href', '/arribos-proximos')
    expect(screen.getByText('Lo que vence en los próximos 30 días')).toBeInTheDocument()
    expect(screen.getByText('Fin de probatoria')).toBeInTheDocument()
    expect(screen.getByText('Iván Castrellón')).toBeInTheDocument()
    expect(screen.getByText('TIGO · 25 nov 2026')).toBeInTheDocument()
    expect(screen.getByText('Vacaciones')).toBeInTheDocument()
    expect(screen.getByText('COPA · 03 dic 2026')).toBeInTheDocument()
    // CA-05 of the list: 15 days or fewer in red
    expect(screen.getByText('11')).toHaveClass('arrivals-strip__count--urgent')
    expect(screen.getByText('19')).not.toHaveClass('arrivals-strip__count--urgent')
    expect(screen.getByRole('link', { name: /Fin de probatoria: Iván Castrellón/ })).toHaveAttribute('href', '/arribos-proximos')
  })

  it('names a contract end by its project and uses the singular for one event and one day', async () => {
    getStrip.mockResolvedValue({
      windowDays: 30,
      total: 1,
      nearest: [event({ id: 'CONTRACT_END-9', type: 'CONTRACT_END', daysRemaining: 1, resource: null, resourceCount: 4, project: 'Portal' })],
    })
    renderStrip()

    expect(await screen.findByRole('link', { name: /Ver el evento/ })).toBeInTheDocument()
    expect(screen.getByText('Portal')).toBeInTheDocument()
    expect(screen.getByText('DÍA')).toBeInTheDocument()
  })

  it('says nothing is due when there are no upcoming events, but still links to Arribos', async () => {
    getStrip.mockResolvedValue({ windowDays: 30, total: 2, nearest: [] })
    renderStrip()

    expect(await screen.findByText('Nada vence en los próximos 30 días.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver los 2 eventos/ })).toBeInTheDocument()
  })

  it('shows the loading state, then an error with a retry that asks again', async () => {
    getStrip.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ windowDays: 30, total: 0, nearest: [] })
    renderStrip()

    expect(screen.getByText('Cargando arribos próximos…')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver arribos próximos/ })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los arribos próximos.')

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('Nada vence en los próximos 30 días.')).toBeInTheDocument())
    expect(getStrip).toHaveBeenCalledTimes(2)
  })
})
