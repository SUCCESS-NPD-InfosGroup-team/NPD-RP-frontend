import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectsTable } from './ProjectsTable'

const projects = [{
  id: 'project-1',
  name: 'Atlas',
  client: { id: 'client-1', name: 'Aurora', isInternal: true },
  teamSize: 0,
  members: [],
  leads: [],
  startDate: '2025-02-03',
  contractEnd: null,
  pendingCount: 0,
  active: true,
}]

describe('ProjectsTable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T20:00:00-05:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the no-team state and hides write actions for read-only users', () => {
    render(<ProjectsTable projects={projects} canEdit={false} onAddMembers={vi.fn()} />)
    expect(screen.getByText('EQUIPO')).toBeInTheDocument()
    expect(screen.getByText('Sin equipo')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /agregar colaboradores/i })).not.toBeInTheDocument()
  })

  it('renders the collaborator action for administrators', async () => {
    const onAddMembers = vi.fn()
    render(<ProjectsTable projects={[{ ...projects[0], teamSize: 2, members: [{ id: 'member-1', initials: 'AB' }], leads: ['Noel'] }]} canEdit onAddMembers={onAddMembers} />)
    expect(screen.getByRole('button', { name: /agregar colaboradores/i })).toBeInTheDocument()
    expect(screen.queryByText('AB')).not.toBeInTheDocument()
    await screen.getByRole('button', { name: /agregar colaboradores/i }).click()
    expect(onAddMembers).toHaveBeenCalledWith(expect.objectContaining({ id: 'project-1' }))
  })

  it('uses the API day count for current and expired contract badges', () => {
    render(<ProjectsTable projects={[
      { ...projects[0], id: 'today', name: 'Today', contractEnd: '2026-11-01', daysToContractEnd: 0 },
      { ...projects[0], id: 'expired', name: 'Expired', contractEnd: '2026-10-31', daysToContractEnd: -1 },
    ]} canEdit={false} onAddMembers={vi.fn()} />)

    expect(screen.getByText('D-0')).toBeInTheDocument()
    expect(screen.getByText('Vencido')).toBeInTheDocument()
  })
})
