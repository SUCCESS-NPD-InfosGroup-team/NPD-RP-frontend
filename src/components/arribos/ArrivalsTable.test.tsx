import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ArrivalsTable } from './ArrivalsTable'
import type { ArrivalEvent } from '../../services/arrivals.types'

const base: ArrivalEvent = {
  id: '1',
  type: 'PROBATION_END',
  date: '2026-10-18',
  daysRemaining: 11,
  resource: { id: '1078', employeeNumber: '1078', name: 'Iván Castrellón', clientRole: 'QA Funcional' },
  resourceCount: 1,
  client: 'TIGO',
  project: 'Tigo',
  leader: 'Abdiel Pinzón',
  notice: { status: 'SENT', audience: 'LEADER', stage: null, date: '2026-10-03' },
}

describe('ArrivalsTable', () => {
  it('renders grouped resource rows, urgency and sent notices', () => {
    render(<ArrivalsTable events={[base]} today="2026-10-07" />)
    expect(screen.getByText('PRÓXIMA SEMANA')).toBeInTheDocument()
    expect(screen.getByText('D-11')).toHaveClass('arrivals-page__remaining--urgent')
    expect(screen.getByText('Enviado al líder')).toBeInTheDocument()
    expect(screen.getByText('Iván Castrellón')).toBeInTheDocument()
  })

  it('renders project-level events and scheduled notices', () => {
    render(<ArrivalsTable events={[{
      ...base,
      id: '2',
      type: 'CONTRACT_END',
      date: '2026-10-31',
      daysRemaining: 24,
      resource: null,
      resourceCount: 2,
      notice: { status: 'SCHEDULED', audience: 'SALES', stage: null, date: '2026-10-17' },
    }]} today="2026-10-07" />)
    expect(screen.getByText('2 recursos asignados')).toBeInTheDocument()
    expect(screen.getByText('Fin del contrato con el cliente')).toBeInTheDocument()
    expect(screen.getByText('A Sales: 17 oct')).toBeInTheDocument()
  })

  it('calls the matching detail callback when provided', async () => {
    const onViewResource = vi.fn()
    const onViewResources = vi.fn()
    const user = userEvent.setup()
    render(
      <ArrivalsTable
        events={[base, { ...base, id: 'project', resource: null, resourceCount: 2 }]}
        today="2026-10-07"
        onViewResource={onViewResource}
        onViewResources={onViewResources}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Ver detalle' }))
    await user.click(screen.getByRole('button', { name: 'Ver recursos' }))
    expect(onViewResource).toHaveBeenCalledWith('1078')
    expect(onViewResources).toHaveBeenCalledWith('project')
  })
})
