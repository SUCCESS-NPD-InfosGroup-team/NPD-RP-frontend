import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import { ProjectsPage } from './ProyectosPage'
import { useAuth } from '../../context/AuthContext'
import { useProjects } from '../../hooks/useProjects'
import { getResourcesApi } from '../../services/resources'
import { projectDetailApi } from '../../services/projectDetail.api'

const exportMocks = vi.hoisted(() => ({
  jsonToSheet: vi.fn((rows: unknown[]) => ({ rows })),
  bookNew: vi.fn(() => ({})),
  appendSheet: vi.fn(),
  write: vi.fn(() => new Uint8Array([1])),
  sheetToCsv: vi.fn(() => 'Cliente,Proyecto\r\nCliente de prueba,Proyecto uno'),
  saveAs: vi.fn(),
}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: exportMocks.jsonToSheet,
    book_new: exportMocks.bookNew,
    book_append_sheet: exportMocks.appendSheet,
    sheet_to_csv: exportMocks.sheetToCsv,
  },
  write: exportMocks.write,
}))
vi.mock('file-saver', () => ({ saveAs: exportMocks.saveAs }))
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useProjects', () => ({ useProjects: vi.fn() }))
vi.mock('../../services/resources', () => ({ getResourcesApi: vi.fn() }))
vi.mock('../../services/projectDetail.api', () => ({
  projectDetailApi: {
    getProject: vi.fn(),
    reactivateProject: vi.fn(),
  },
}))
vi.mock('../../components/proyectos/NewProjectModal', () => ({
  NewProjectModal: () => null,
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseProjects = vi.mocked(useProjects)
const mockedGetResourcesApi = vi.mocked(getResourcesApi)
const mockedProjectDetailApi = vi.mocked(projectDetailApi)
const projectsApi = {
  listProjects: vi.fn(),
  listClients: vi.fn(),
}

function renderProjectsPage() {
  return render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  )
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    projectsApi.listProjects.mockReset()
    projectsApi.listClients.mockReset()
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
      api: projectsApi as never,
    })
    projectsApi.listClients.mockResolvedValue([
      { id: '4', name: 'Cliente de prueba', isInternal: false, active: true },
    ])
    mockedGetResourcesApi.mockResolvedValue({
      getNpdLeads: vi.fn().mockResolvedValue([
        { id: 1, name: 'Noel Vega' },
        { id: 2, name: 'Mara Sol' },
      ]),
      getClientRoles: vi.fn(),
      getCatalogs: vi.fn(),
      createResource: vi.fn(),
      updateResource: vi.fn(),
      getResource: vi.fn(),
      fetchLastChange: vi.fn(),
    })
  })

  it('shows the export action disabled when there are no projects', () => {
    renderProjectsPage()

    expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled()
  })

  it('reactivates a listed project with its current version and refreshes projects', async () => {
    const inactiveProject = {
      id: '8',
      name: 'Atlas',
      client: { id: '4', name: 'Cliente de prueba', isInternal: false },
      teamSize: 0,
      members: [],
      leads: [],
      startDate: '2025-02-03',
      contractEnd: null,
      pendingCount: 0,
      active: false,
    }
    const refetch = vi.fn().mockResolvedValue(undefined)
    mockedUseProjects.mockReturnValue({
      data: {
        items: [inactiveProject],
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
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
      filters: { includeInactive: true },
      page: 1,
      setPage: vi.fn(),
      refetch,
      api: projectsApi as never,
    })
    mockedProjectDetailApi.getProject.mockResolvedValue({
      id: 8,
      name: 'Atlas',
      client: { id: 4, name: 'Cliente de prueba', isInternal: false },
      active: false,
      startDate: '2025-02-03',
      contractEndDate: null,
      daysToContractEnd: null,
      teamSize: 0,
      pendingConfirmation: 0,
      indefiniteCount: 0,
      nextAssignmentEnd: null,
      leads: [],
      version: 7,
      updatedAt: '2026-11-25T18:30:00Z',
    })
    mockedProjectDetailApi.reactivateProject.mockResolvedValue({
      id: 8,
      name: 'Atlas',
      client: { id: 4, name: 'Cliente de prueba', isInternal: false },
      active: true,
      startDate: '2025-02-03',
      contractEndDate: null,
      daysToContractEnd: null,
      teamSize: 0,
      pendingConfirmation: 0,
      indefiniteCount: 0,
      nextAssignmentEnd: null,
      leads: [],
      version: 8,
      updatedAt: '2026-11-26T18:30:00Z',
    })

    renderProjectsPage()
    fireEvent.click(screen.getByRole('button', { name: 'Reactivar Atlas' }))

    await waitFor(() => {
      expect(mockedProjectDetailApi.getProject).toHaveBeenCalledWith('8')
      expect(mockedProjectDetailApi.reactivateProject).toHaveBeenCalledWith('8', 7)
      expect(refetch).toHaveBeenCalledOnce()
    })
  })

  it('exports every project page using the active filters', async () => {
    const makeProject = (id: string, name: string) => ({
      id,
      name,
      client: { id: '4', name: 'Cliente de prueba', isInternal: false },
      teamSize: 2,
      members: [],
      leads: ['Líder de prueba'],
      leadIds: [3],
      startDate: '2026-01-01',
      contractEnd: '2026-12-31',
      pendingCount: 1,
      active: true,
    })
    projectsApi.listProjects
      .mockResolvedValueOnce({
        items: [makeProject('project-1', 'Proyecto uno')],
        page: 1,
        pageSize: 25,
        total: 26,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [makeProject('project-2', 'Proyecto dos')],
        page: 2,
        pageSize: 25,
        total: 26,
        totalPages: 2,
      })
    mockedUseProjects.mockReturnValue({
      data: {
        items: [makeProject('project-1', 'Proyecto uno')],
        page: 1,
        pageSize: 25,
        total: 26,
        totalPages: 2,
      },
      summary: {
        activeProjects: 26,
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
      api: projectsApi as never,
    })

    renderProjectsPage()
    await screen.findByRole('option', { name: 'Cliente de prueba' })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar todo' }))

    await waitFor(() => expect(exportMocks.saveAs).toHaveBeenCalledOnce())
    expect(projectsApi.listProjects).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ clientId: '4' }),
      1,
    )
    expect(projectsApi.listProjects).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ clientId: '4' }),
      2,
    )
    expect(exportMocks.jsonToSheet).toHaveBeenCalledWith([
      expect.objectContaining({ Cliente: 'Cliente de prueba', Proyecto: 'Proyecto uno' }),
      expect.objectContaining({ Cliente: 'Cliente de prueba', Proyecto: 'Proyecto dos' }),
    ])
  })

  it('uses the backend-supported search filter', async () => {
    renderProjectsPage()

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'Atlas' } })

    await waitFor(() => {
      expect(mockedUseProjects).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Atlas' }))
    })
  })

  it('exposes the backend-supported no-contract-end filter', () => {
    renderProjectsPage()

    expect(screen.getByRole('option', { name: 'Sin fecha' })).toBeInTheDocument()
  })

  it('shows all KPIs returned by the projects API', () => {
    renderProjectsPage()

    expect(screen.getByText('SIN EQUIPO')).toBeInTheDocument()
    expect(screen.getByText('COLABORADORES SIN PROYECTO')).toBeInTheDocument()
    expect(screen.getByText('de 0 clientes')).toBeInTheDocument()
  })

  it('exports CSV with a safe filename and protects formula-like project names', async () => {
    projectsApi.listProjects.mockResolvedValueOnce({
      items: [{
        id: 'project-1',
        name: '=HYPERLINK("https://example.test")',
        client: { id: '4', name: 'Cliente de prueba', isInternal: false },
        teamSize: 1,
        members: [],
        leads: [],
        startDate: '2026-01-01',
        contractEnd: null,
        pendingCount: 0,
        active: true,
      }],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    })
    mockedUseProjects.mockReturnValue({
      data: {
        items: [{
          id: 'project-1',
          name: 'Proyecto uno',
          client: { id: '4', name: 'Cliente de prueba', isInternal: false },
          teamSize: 1,
          members: [],
          leads: [],
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
      api: projectsApi as never,
    })

    renderProjectsPage()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    fireEvent.click(screen.getByRole('radio', { name: /csv/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Exportar todo' }))

    await waitFor(() => expect(exportMocks.saveAs).toHaveBeenCalledOnce())
    expect(exportMocks.jsonToSheet).toHaveBeenCalledWith([
      expect.objectContaining({ Proyecto: '\'=HYPERLINK("https://example.test")' }),
    ])
    expect(exportMocks.sheetToCsv).toHaveBeenCalledOnce()
    expect(exportMocks.saveAs.mock.calls[0][1]).toMatch(/^Proyectos_\d{4}-\d{2}-\d{2}\.csv$/)
    expect((exportMocks.saveAs.mock.calls[0][0] as Blob).type).toBe('text/csv;charset=utf-8')
  })

  it('hides the paginator when there are no projects', () => {
    renderProjectsPage()

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

    renderProjectsPage()

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
    const view = renderProjectsPage()

    expect(await screen.findByRole('option', { name: 'Noel Vega' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Mara Sol' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Solo en esta página' })).not.toBeInTheDocument()
    page = 2
    view.rerender(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('option', { name: 'Noel Vega' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Solo en otra página' })).not.toBeInTheDocument()
  })
})
