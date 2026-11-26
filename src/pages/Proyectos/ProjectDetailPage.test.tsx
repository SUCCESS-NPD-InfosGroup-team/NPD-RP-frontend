import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectDetailApi } from '../../services/projectDetail.api'
import { ApiRequestError } from '../../services/projects.types'
import { ProjectDetailPage } from './ProjectDetailPage'

vi.mock('../../services/projectDetail.api', () => ({
  projectDetailApi: {
    getProject: vi.fn(),
    getMembers: vi.fn(),
  },
}))

const mockedProjectDetailApi = vi.mocked(projectDetailApi)
const project = {
  id: 8,
  name: 'Caja de Ahorros',
  client: { id: 5, name: 'CAJA DE AHORROS', isInternal: false },
  active: true,
  startDate: '2024-10-01',
  contractEndDate: '2026-12-31',
  daysToContractEnd: 18,
  teamSize: 1,
  pendingConfirmation: 1,
  indefiniteCount: 0,
  nextAssignmentEnd: '2026-12-31',
  leads: [{ id: 12, name: 'Ricardo Him' }],
  version: 3,
  updatedAt: '2026-11-25T18:30:00Z',
}
const member = {
  id: 31,
  employeeNumber: '987',
  name: 'José Samudio',
  level: 3,
  clientRole: null,
  leader: null,
  status: { code: 'LICENCIA' as const, label: 'Licencia' },
  situation: { code: 'PENDIENTE_CONFIRMACION' as const, label: 'Pendiente de confirmación' },
  assignmentStart: '2024-11-01',
  assignmentEnd: '2026-11-20',
  indefinite: false,
  daysToAssignmentEnd: -6,
  version: 2,
}

function renderProjectDetail() {
  return render(
    <MemoryRouter initialEntries={['/proyectos/8']}>
      <Routes>
        <Route path="/proyectos/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    mockedProjectDetailApi.getProject.mockReset()
    mockedProjectDetailApi.getMembers.mockReset()
    mockedProjectDetailApi.getProject.mockResolvedValue(project)
    mockedProjectDetailApi.getMembers.mockResolvedValue({ items: [member], total: 1 })
  })

  it('renders the project summary and ordered member columns from the contract', async () => {
    renderProjectDetail()

    expect(await screen.findByRole('heading', { name: 'Caja de Ahorros' })).toBeInTheDocument()
    expect(screen.getByText('D-18')).toHaveClass('project-detail__summary-value--danger')
    expect(screen.getByText('1 por confirmar · fecha final vencida sin extender')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: 'Equipo del proyecto' })
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual([
      'COLABORADOR',
      'ROL EN CLIENTE',
      'LÍDER NPD',
      'FECHA FINAL',
      'SITUACIÓN',
      'EQUIPO',
      'CONTACTO POR CLIENTE',
      'Acciones',
    ])

    const row = within(table).getByRole('row', { name: /José Samudio/ })
    expect(within(row).getByText('Sin rol')).toBeInTheDocument()
    expect(within(row).getByText('Vencido · 6 días')).toHaveClass('project-detail__days--danger')
    expect(within(row).getByText('Licencia')).toHaveClass('project-detail__chip--status-licencia')
    expect(within(row).getByText('Pendiente de confirmación')).toHaveClass(
      'project-detail__chip--situation-pendiente_confirmacion',
    )
    expect(within(row).getAllByText('—')).toHaveLength(3)
  })

  it('shows the empty-team mockup for an empty members response', async () => {
    mockedProjectDetailApi.getProject.mockResolvedValue({ ...project, teamSize: 0 })
    mockedProjectDetailApi.getMembers.mockResolvedValue({ items: [], total: 0 })

    renderProjectDetail()

    expect(await screen.findByText('Este proyecto todavía no tiene equipo')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Agregar colaboradores' }))
      .toHaveLength(2)
    screen.getAllByRole('button', { name: 'Agregar colaboradores' })
      .forEach((button) => expect(button).toBeDisabled())
    expect(screen.queryByRole('table', { name: 'Equipo del proyecto' })).not.toBeInTheDocument()
  })

  it('shows the 404 state separately', async () => {
    mockedProjectDetailApi.getProject.mockRejectedValue(new ApiRequestError({
      status: 404,
      code: 'NOT_FOUND',
      detail: 'No existe el proyecto.',
    }))

    renderProjectDetail()

    expect(await screen.findByRole('heading', { name: 'No existe el proyecto' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Proyectos' })).toHaveAttribute('href', '/proyectos')
  })

  it('allows retrying a failed request', async () => {
    mockedProjectDetailApi.getProject
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(project)

    renderProjectDetail()

    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    fireEvent.click(retry)

    await waitFor(() => expect(mockedProjectDetailApi.getProject).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('heading', { name: 'Caja de Ahorros' })).toBeInTheDocument()
  })
})
