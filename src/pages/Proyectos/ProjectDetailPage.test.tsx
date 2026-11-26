import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
const assignedMember = {
  ...member,
  id: 32,
  employeeNumber: '1042',
  name: 'Ana Ríos',
  level: 2,
  clientRole: 'Analista',
  leader: { id: 15, name: 'María Díaz' },
  status: { code: 'ACTIVO' as const, label: 'Activo' },
  situation: { code: 'ASIGNADO' as const, label: 'Asignado' },
  assignmentStart: '2026-09-01',
  assignmentEnd: '2026-12-31',
  daysToAssignmentEnd: 35,
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
    const summary = screen.getByRole('region', { name: 'Resumen del proyecto' })
    expect(within(summary).getByText('31 dic 2026')).toBeInTheDocument()
    expect(within(summary).getByText('D-18')).toHaveClass('project-detail__summary-note-days')
    expect(within(summary).getByText('fecha final vencida sin extender'))
      .toHaveClass('project-detail__summary-note--danger')

    const table = screen.getByRole('table', { name: 'Equipo del proyecto' })
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual([
      'Seleccionar',
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
    expect(within(row).getByText('José Samudio')).toHaveClass('project-detail__member-name')
    expect(within(row).getByText('#987 · Nivel 3')).toBeInTheDocument()
    expect(within(row).getByText('Sin rol')).toBeInTheDocument()
    expect(within(row).getByText('Vencido · 6 días')).toHaveClass('project-detail__days--danger')
    expect(within(row).getByText('Licencia')).toHaveClass('project-detail__chip--status-licencia')
    expect(within(row).queryByText('Activo')).not.toBeInTheDocument()
    expect(within(row).getByText('Pendiente de confirmación')).toHaveClass(
      'project-detail__chip--situation-pendiente_confirmacion',
    )
    expect(within(row).getAllByText('—')).toHaveLength(3)
  })

  it('toggles row selection and keeps the batch action disabled', async () => {
    mockedProjectDetailApi.getProject.mockResolvedValue({ ...project, teamSize: 2 })
    mockedProjectDetailApi.getMembers.mockResolvedValue({ items: [member, assignedMember], total: 2 })

    renderProjectDetail()

    const selectAll = await screen.findByRole('checkbox', { name: 'Seleccionar todos los colaboradores' })
    const selectAna = screen.getByRole('checkbox', { name: 'Seleccionar a Ana Ríos' })
    fireEvent.click(selectAna)

    expect(selectAll).toBePartiallyChecked()
    expect(screen.getByRole('button', { name: 'Editar en bloque' })).toBeDisabled()

    fireEvent.click(selectAll)
    expect(selectAll).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Seleccionar a José Samudio' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Editar en bloque' })).toBeDisabled()
  })

  it('renders assigned and active chips without showing an Activo chip', async () => {
    mockedProjectDetailApi.getProject.mockResolvedValue({ ...project, teamSize: 2 })
    mockedProjectDetailApi.getMembers.mockResolvedValue({ items: [member, assignedMember], total: 2 })

    renderProjectDetail()

    const row = await screen.findByRole('row', { name: /Ana Ríos/ })
    expect(within(row).getByText('#1042 · Nivel 2')).toBeInTheDocument()
    expect(within(row).getByText('Asignado')).toHaveClass('project-detail__chip--situation-asignado')
    expect(within(row).queryByText('Activo')).not.toBeInTheDocument()
    expect(within(row).queryByText('Licencia')).not.toBeInTheDocument()
  })

  it('shows timeline labels, contract alerts, and overdue confirmations', async () => {
    const overduePending = {
      ...member,
      assignmentStart: '2026-11-13',
      assignmentEnd: '2026-09-30',
      daysToAssignmentEnd: -57,
    }
    mockedProjectDetailApi.getMembers.mockResolvedValue({ items: [overduePending, assignedMember], total: 2 })

    renderProjectDetail()

    expect(await screen.findByText('Fin de contrato 31 dic')).toBeInTheDocument()
    expect(screen.getByText('Venció 30 sep · confirmar')).toBeInTheDocument()
    expect(screen.queryByTitle('desde nov 2026 · 30 sep 2026')).not.toBeInTheDocument()
    expect(screen.getByTestId('timeline-alert-project-30')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-alert-project-15')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-end-32')).toHaveTextContent('31 dic')
    expect(screen.getByTestId('timeline-end-32').getAttribute('style')).toContain('%')
    expect(screen.getByTestId('timeline-end-32').getAttribute('style')).toContain('+ 12px')
  })

  it('keeps the contract row without a date and extends indefinite assignments to the track end', async () => {
    const indefiniteMember = {
      ...assignedMember,
      id: 33,
      name: 'Carlos Gómez',
      assignmentEnd: null,
      indefinite: true,
      daysToAssignmentEnd: null,
    }
    mockedProjectDetailApi.getProject.mockResolvedValue({
      ...project,
      contractEndDate: null,
      daysToContractEnd: null,
    })
    mockedProjectDetailApi.getMembers.mockResolvedValue({ items: [indefiniteMember], total: 1 })

    renderProjectDetail()

    expect(await screen.findByText('CONTRATO CAJA DE AHORROS')).toBeInTheDocument()
    expect(screen.getByText('Sin fecha de fin')).toBeInTheDocument()
    expect(screen.queryByText(/^Fin de contrato/)).not.toBeInTheDocument()
    expect(screen.getByTestId('timeline-indefinite-33').style.left).toBe('100%')
  })

  it('positions month and today marks using the seven-month day scale', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 7, 12))

    try {
      const { container } = renderProjectDetail()
      await act(async () => {
        await vi.runOnlyPendingTimersAsync()
      })

      const monthDays = [0, 30, 61, 91, 122, 153, 181]
      const monthWidths = [30, 31, 30, 31, 31, 28, 31]
      const months = [
        '2026-09-01',
        '2026-10-01',
        '2026-11-01',
        '2026-12-01',
        '2027-01-01',
        '2027-02-01',
        '2027-03-01',
      ]
      const percentPerDay = 100 / 212

      months.forEach((month, index) => {
        const element = container.querySelector<HTMLElement>(`[data-month-start="${month}"]`)
        expect(element).not.toBeNull()
        expect(element?.style.left).toContain('%')
        expect(element?.style.width).toContain('%')
        expect(Number.parseFloat(element?.style.left ?? ''))
          .toBeCloseTo(monthDays[index] * percentPerDay, 6)
        expect(Number.parseFloat(element?.style.width ?? ''))
          .toBeCloseTo(monthWidths[index] * percentPerDay, 6)
      })

      const todayMarker = screen.getByTestId('timeline-today-marker')
      expect(todayMarker.style.left).toContain('%')
      expect(Number.parseFloat(todayMarker.style.left))
        .toBeCloseTo(36 * percentPerDay, 6)
    } finally {
      vi.useRealTimers()
    }
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
