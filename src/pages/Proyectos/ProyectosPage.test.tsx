import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ProjectsPage } from './ProyectosPage'
import { useAuth } from '../../context/AuthContext'
import { useProjects } from '../../hooks/useProjects'

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useProjects', () => ({ useProjects: vi.fn() }))
vi.mock('../../components/proyectos/NewProjectModal', () => ({
  NewProjectModal: () => null,
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseProjects = vi.mocked(useProjects)

describe('ProjectsPage', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      roles: ['operations-administrator'],
    } as ReturnType<typeof useAuth>)
    mockedUseProjects.mockReturnValue({
      data: {
        items: [],
        page: 1,
        pageSize: 25,
        total: 0,
        totalPages: 0,
      },
      summary: {
        activeProjects: 0,
        activeClients: 0,
        contractEndingSoon: 0,
        withoutTeam: 0,
        unassignedPeople: 0,
      },
      loading: false,
      error: undefined,
      filters: {},
      page: 1,
      setPage: vi.fn(),
      refetch: vi.fn(),
      api: undefined,
    })
  })

  it('hides the unsupported export action', () => {
    render(<ProjectsPage />)

    expect(screen.queryByRole('button', { name: 'Exportar' })).not.toBeInTheDocument()
  })

  it('hides the unsupported text search field', () => {
    render(<ProjectsPage />)

    expect(screen.queryByLabelText('Buscar')).not.toBeInTheDocument()
  })

  it('hides the unsupported no-contract-end option', () => {
    render(<ProjectsPage />)

    expect(screen.queryByRole('option', { name: 'Sin fecha' })).not.toBeInTheDocument()
  })
})
