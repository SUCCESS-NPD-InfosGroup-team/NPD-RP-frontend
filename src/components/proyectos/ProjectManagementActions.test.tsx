import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectDetailApi } from '../../services/projectDetail.api'
import type { ProjectDetail } from '../../services/projectDetail.types'
import { ProjectManagementActions } from './ProjectManagementActions'

vi.mock('../../services/projectDetail.api', () => ({
  projectDetailApi: {
    updateProject: vi.fn(),
    deactivateProject: vi.fn(),
  },
}))

const mockedProjectDetailApi = vi.mocked(projectDetailApi)
const project: ProjectDetail = {
  id: 8,
  name: 'Caja de Ahorros',
  client: { id: 5, name: 'CAJA DE AHORROS', isInternal: false },
  active: true,
  startDate: '2024-10-01',
  contractEndDate: '2026-12-31',
  daysToContractEnd: 35,
  teamSize: 1,
  pendingConfirmation: 0,
  indefiniteCount: 0,
  nextAssignmentEnd: '2026-12-31',
  leads: [{ id: 12, name: 'Ricardo Him' }],
  version: 3,
  updatedAt: '2026-11-25T18:30:00Z',
}

function renderActions(
  overrides: Partial<ProjectDetail> = {},
  canManage = true,
) {
  const onUpdated = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  render(
    <ProjectManagementActions
      project={{ ...project, ...overrides }}
      canManage={canManage}
      onUpdated={onUpdated}
    />,
  )
  return { onUpdated }
}

describe('ProjectManagementActions', () => {
  beforeEach(() => {
    mockedProjectDetailApi.updateProject.mockReset()
    mockedProjectDetailApi.deactivateProject.mockReset()
  })

  it('hides project actions for other roles and inactive projects', () => {
    const { rerender } = render(
      <ProjectManagementActions project={project} canManage={false} onUpdated={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: 'Editar proyecto' })).not.toBeInTheDocument()

    rerender(
      <ProjectManagementActions project={project} canManage onUpdated={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Editar proyecto' }))
    expect(screen.queryByRole('button', { name: 'Desactivar proyecto' })).not.toBeInTheDocument()

    rerender(
      <ProjectManagementActions project={{ ...project, active: false }} canManage onUpdated={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: 'Editar proyecto' })).not.toBeInTheDocument()
  })

  it('shows the Figma edit form, keeps the client read-only, and saves editable project fields', async () => {
    mockedProjectDetailApi.updateProject.mockResolvedValue({
      project: { ...project, name: 'Proyecto nuevo', version: 4 },
      membersEndDateMoved: 0,
    })
    const { onUpdated } = renderActions()
    fireEvent.click(screen.getByRole('button', { name: 'Editar proyecto' }))

    const dialog = screen.getByRole('dialog', { name: 'Editar proyecto' })
    expect(within(dialog).getByLabelText('Cliente')).toHaveAttribute('readonly')
    expect(within(dialog).getByText('El cliente no cambia. Para otro cliente, crea un proyecto nuevo y mueve al equipo.'))
      .toBeInTheDocument()
    expect(within(dialog).getByText('Único dentro del cliente.')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText(/Nombre del proyecto/), {
      target: { value: 'Proyecto nuevo' },
    })
    fireEvent.change(within(dialog).getByLabelText('Fin de contrato con el cliente'), {
      target: { value: '2027-01-31' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(mockedProjectDetailApi.updateProject).toHaveBeenCalledWith('8', {
      name: 'Proyecto nuevo',
      contractEndDate: '2027-01-31',
      version: 3,
    }))
    expect(onUpdated).toHaveBeenCalledOnce()
  })

  it('shows the Figma validation for a changed contract end date in the past', () => {
    renderActions()
    fireEvent.click(screen.getByRole('button', { name: 'Editar proyecto' }))
    const dateInput = screen.getByLabelText('Fin de contrato con el cliente')
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } })

    expect(dateInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Ya pasó. Usa una fecha futura o deja el campo vacío.')).toBeInTheDocument()
    expect(mockedProjectDetailApi.updateProject).not.toHaveBeenCalled()
  })

  it('hides deactivation for projects with a team', () => {
    renderActions()
    fireEvent.click(screen.getByRole('button', { name: 'Editar proyecto' }))

    expect(screen.queryByRole('button', { name: 'Desactivar proyecto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '¿Desactivar Caja de Ahorros?' })).not.toBeInTheDocument()
    expect(mockedProjectDetailApi.deactivateProject).not.toHaveBeenCalled()
  })

  it('deactivates an empty project after confirming', async () => {
    mockedProjectDetailApi.deactivateProject.mockResolvedValue({
      ...project,
      active: false,
      teamSize: 0,
      version: 4,
    })
    const { onUpdated } = renderActions({ teamSize: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Editar proyecto' }))

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar proyecto' }))
    const dialog = screen.getByRole('dialog', { name: '¿Desactivar Caja de Ahorros?' })
    expect(within(dialog).getByText(/inactivo y en solo lectura/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desactivar proyecto' }))

    await waitFor(() => expect(mockedProjectDetailApi.deactivateProject).toHaveBeenCalledWith('8', 3))
    expect(onUpdated).toHaveBeenCalledOnce()
  })

  it('surfaces save failures in the edit form', async () => {
    mockedProjectDetailApi.updateProject.mockRejectedValue(new Error('El nombre ya existe.'))
    renderActions()
    fireEvent.click(screen.getByRole('button', { name: 'Editar proyecto' }))
    fireEvent.change(screen.getByLabelText(/Nombre del proyecto/), {
      target: { value: 'Nombre duplicado' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El nombre ya existe.')
  })
})
