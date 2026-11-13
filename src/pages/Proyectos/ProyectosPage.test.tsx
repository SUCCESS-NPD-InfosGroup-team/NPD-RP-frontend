import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ProjectsPage } from './ProyectosPage'
import { useAuth } from '../../context/AuthContext'
import { useProjects } from '../../hooks/useProjects'
import { getResourcesApi } from '../../services/resources'

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useProjects', () => ({ useProjects: vi.fn() }))
vi.mock('../../services/resources', () => ({ getResourcesApi: vi.fn() }))
vi.mock('../../components/proyectos/NewProjectModal', () => ({
  NewProjectModal: () => null,
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseProjects = vi.mocked(useProjects)
const mockedGetResourcesApi = vi.mocked(getResourcesApi)

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
    mockedGetResourcesApi.mockResolvedValue({
      getNpdLeads: vi.fn().mockResolvedValue([
        { id: 1, name: 'Noel Vega' },
        { id: 2, name: 'Mara Sol' },
      ]),
      getCatalogs: vi.fn(),
      createResource: vi.fn(),
      getResource: vi.fn(),
      fetchLastChange: vi.fn(),
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

  it('hides KPIs that the projects API cannot calculate', () => {
    render(<ProjectsPage />)

    expect(screen.queryByText('SIN EQUIPO')).not.toBeInTheDocument()
    expect(screen.queryByText('COLABORADORES SIN PROYECTO')).not.toBeInTheDocument()
    expect(screen.queryByText('de 0 clientes')).not.toBeInTheDocument()
  })

  it('hides the paginator when there are no projects', () => {
    render(<ProjectsPage />)

    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument()
  })

  it('shows the paginator when projects exist', () => {
    mockedUseProjects.mockReturnValue({
      data: {
        items: [{
          id: 'project-1',
          name: 'Atlas',
          client: { id: 'client-1', name: 'Aurora', isInternal: false },
          teamSize: 1,
          members: [],
          leads: [],
          leadIds: [],
          startDate: '2026-01-01',
          contractEnd: null,
          pendingCount: 0,
          active: true,
        }],
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      },
      summary: {
        activeProjects: 1,
        activeClients: 1,
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

    render(<ProjectsPage />)

    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeInTheDocument()
  })

  it('loads all NPD leads from the API instead of the current project page', async () => {
    let page = 1
    mockedUseProjects.mockImplementation(() => ({
      data: {
        page,
        pageSize: 25,
        total: 2,
        totalPages: 2,
        items: [{
          id: `project-${page}`,
          name: 'Atlas',
          client: { id: 'client-1', name: 'Aurora', isInternal: false },
          teamSize: 1,
          members: [],
          leads: [page === 1 ? 'Solo en esta página' : 'Solo en otra página'],
          leadIds: [99],
          startDate: '2026-01-01',
          contractEnd: null,
          pendingCount: 0,
          active: true,
        }],
      },
      summary: {
        activeProjects: 2,
        activeClients: 1,
        contractEndingSoon: 0,
        withoutTeam: 0,
        unassignedPeople: 0,
      },
      loading: false,
      error: undefined,
      filters: {},
      page,
      setPage: vi.fn(),
      refetch: vi.fn(),
      api: undefined,
    }))
    const view = render(<ProjectsPage />)

    expect(await screen.findByRole('option', { name: 'Noel Vega' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Mara Sol' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Solo en esta página' })).not.toBeInTheDocument()
    page = 2
    view.rerender(<ProjectsPage />)
    expect(screen.getByRole('option', { name: 'Noel Vega' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Solo en otra página' })).not.toBeInTheDocument()
  })
})
