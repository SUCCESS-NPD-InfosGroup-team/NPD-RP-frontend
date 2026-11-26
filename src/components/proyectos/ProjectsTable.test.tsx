import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
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

function renderProjectsTable(props: ComponentProps<typeof ProjectsTable>) {
  return render(
    <MemoryRouter>
      <ProjectsTable {...props} />
    </MemoryRouter>,
  )
}

describe('ProjectsTable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 1, 20, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the no-team state and hides write actions for read-only users', () => {
    renderProjectsTable({ projects })
    expect(screen.getByText('EQUIPO')).toBeInTheDocument()
    expect(screen.getByText('Sin equipo')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /agregar colaboradores/i })).not.toBeInTheDocument()
  })

  it('keeps unavailable write actions visible but disabled for project managers', () => {
    const tableProps = {
      projects: [{ ...projects[0], teamSize: 2, members: [{ id: 'member-1', initials: 'AB' }], leads: ['Noel'] }],
    }
    const view = renderProjectsTable(tableProps)
    expect(screen.queryByRole('button', { name: /agregar colaboradores/i })).not.toBeInTheDocument()
    expect(screen.queryByText('AB')).not.toBeInTheDocument()

    view.rerender(
      <MemoryRouter>
        <ProjectsTable {...tableProps} canManageProjects />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /agregar colaboradores/i })).toBeDisabled()
  })

  it('shows reactivation as unavailable for inactive projects', () => {
    renderProjectsTable({ projects: [{ ...projects[0], active: false }], canManageProjects: true })

    expect(screen.getByText('Inactivo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reactivar atlas/i })).toBeDisabled()
  })

  it('uses the API day count for current and expired contract badges', () => {
    renderProjectsTable({ projects: [
      { ...projects[0], id: 'today', name: 'Today', contractEnd: '2026-11-01', daysToContractEnd: 0 },
      { ...projects[0], id: 'expired', name: 'Expired', contractEnd: '2026-10-31', daysToContractEnd: -1 },
    ] })

    expect(screen.getByText('D-0')).toBeInTheDocument()
    expect(screen.getByText('Vencido')).toBeInTheDocument()
  })

  it('highlights an existing project after a duplicate error', () => {
    renderProjectsTable({ projects, highlightedProjectId: 'project-1' })

    expect(screen.getByText('Atlas').closest('.projects-page__row')).toHaveClass('projects-page__row--highlighted')
  })

  it('links each project name to its detail route', () => {
    renderProjectsTable({ projects })

    expect(screen.getByRole('link', { name: 'Atlas' }))
      .toHaveAttribute('href', '/proyectos/project-1')
  })
})
