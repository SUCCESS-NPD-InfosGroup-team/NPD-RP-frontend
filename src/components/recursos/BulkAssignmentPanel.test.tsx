import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Client, ClientProject } from '../../services/projects.types'
import { getProjectsApi } from '../../services/projects'
import { bulkAssignmentApi, BulkAssignmentApiError } from '../../services/bulkAssignment.api'
import { getResourcesApi } from '../../services/resources'
import type { BulkAssignmentResponse } from '../../services/bulkAssignment.types'
import { useBulkAssign } from '../../hooks/useBulkAssign'
import { BulkAssignmentPanel } from './BulkAssignmentPanel'

vi.mock('../../services/projects', () => ({ getProjectsApi: vi.fn() }))
vi.mock('../../services/resources', () => ({ getResourcesApi: vi.fn() }))
vi.mock('../../services/bulkAssignment.api', () => ({
  bulkAssignmentApi: { assignMembers: vi.fn() },
  BulkAssignmentApiError: class BulkAssignmentApiError extends Error {
    readonly status: number
    readonly code: string
    readonly problem?: { code: string; errors?: Array<{ field: string; code: string; message: string; employeeId?: number; index?: number }> }

    constructor(status: number, problem?: { code: string; errors?: Array<{
      field: string
      code: string
      message: string
      employeeId?: number
      index?: number
    }> }) {
      super('No se pudo completar la asignación.')
      this.status = status
      this.code = problem?.code ?? 'API_ERROR'
      this.problem = problem
    }
  },
}))
vi.mock('../proyectos/NewProjectModal', () => ({
  NewProjectModal: ({
    open,
    clients,
    onCreated,
    onClose,
  }: {
    open: boolean
    clients: Client[]
    onCreated: (project: {
      id: string
      name: string
      client: { id: string; name: string; isInternal: boolean }
      teamSize: number
      members: []
      leads: []
      startDate: string
      contractEnd: string | null
      pendingCount: number
      active: boolean
    }) => void
    onClose: () => void
  }) => (
    open ? (
      <div role="dialog" aria-label="Nuevo proyecto">
        <span>{clients.length} clientes</span>
        <button type="button" onClick={() => onCreated({
          id: '61',
          name: 'Proyecto nuevo',
          client: { id: '6', name: 'Cliente nuevo', isInternal: false },
          teamSize: 0,
          members: [],
          leads: [],
          startDate: '2026-11-21',
          contractEnd: null,
          pendingCount: 0,
          active: true,
        })}>Crear ejemplo</button>
        <button type="button" onClick={onClose}>Cancelar modal</button>
      </div>
    ) : null
  ),
}))

const clients: Client[] = [
  { id: '3', name: 'BANESCO', isInternal: false, active: true },
  { id: '4', name: 'COPA', isInternal: false, active: true },
]
const banescoProjects: ClientProject[] = [
  { id: '41', name: 'Programa de automatización (DEYEL)', teamSize: 8, contractEndDate: '2026-12-31' },
]
const copaProjects: ClientProject[] = [
  { id: '51', name: 'Copa Airlines - Comercial', teamSize: 2, contractEndDate: null },
]
const api = {
  listClients: vi.fn<() => Promise<Client[]>>(),
  listClientProjects: vi.fn<(clientId: string) => Promise<ClientProject[]>>(),
}
const assignmentResult: BulkAssignmentResponse = {
  project: { id: 41, name: 'Programa de automatización (DEYEL)' },
  client: { id: 3, name: 'BANESCO' },
  assigned: 1,
  added: 0,
  moved: 1,
  members: [],
}
const assignMembers = vi.mocked(bulkAssignmentApi.assignMembers)

function Harness({
  open = true,
  onClose = vi.fn(),
  onAssigned,
}: {
  open?: boolean
  onClose?: () => void
  onAssigned?: (result: BulkAssignmentResponse) => void
}) {
  const assignment = useBulkAssign()
  const { togglePerson } = assignment
  useEffect(() => {
    togglePerson({
      employeeId: 890,
      employeeNumber: '1045',
      name: 'Ana Torres',
      statusCode: 'ACTIVO',
      version: 3,
      leaderId: 755,
    })
  }, [togglePerson])
  return <BulkAssignmentPanel open={open} assignment={assignment} onClose={onClose} onAssigned={onAssigned} />
}

describe('BulkAssignmentPanel · project step', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listClients.mockResolvedValue(clients)
    api.listClientProjects.mockImplementation(async (clientId) => (
      clientId === '3' ? banescoProjects : copaProjects
    ))
    vi.mocked(getProjectsApi).mockResolvedValue(api as never)
    vi.mocked(getResourcesApi).mockResolvedValue({
      getCatalogs: vi.fn().mockResolvedValue({
        npdLeads: [{ id: 755, name: 'María Pérez' }],
        clientRoles: [],
        equipment: [],
      }),
    } as never)
    assignMembers.mockResolvedValue(assignmentResult)
  })

  it('loads clients and their projects, filters the list and selects a project', async () => {
    const { rerender } = render(<Harness />)
    await screen.findByText('Programa de automatización (DEYEL)')

    const panel = screen.getByRole('dialog', { name: 'Asignar a proyecto' })
    const body = panel.querySelector('.bulk-assignment-panel__body')
    const footer = panel.querySelector('.bulk-assignment-panel__footer')
    const nextButton = screen.getByRole('button', { name: 'Siguiente' })

    expect(panel).toHaveClass('bulk-assignment-panel--right-720')
    expect(body).toHaveClass('bulk-assignment-panel__body')
    expect(body).not.toContainElement(footer)
    expect(body?.nextElementSibling).toBe(footer)
    expect(nextButton).toBeDisabled()
    expect(screen.getByText('Elige un proyecto para 1 colaboradores')).toBeInTheDocument()

    expect(api.listClients).toHaveBeenCalledTimes(1)
    expect(api.listClientProjects).toHaveBeenCalledTimes(2)
    expect(screen.getByText(/fin de contrato 31 dic 2026/)).toBeInTheDocument()
    expect(screen.getByText(/sin fecha de fin de contrato/)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar proyecto' }), { target: { value: 'copa' } })
    expect(screen.queryByText('Programa de automatización (DEYEL)')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Copa Airlines - Comercial/ }))
    expect(nextButton).toBeEnabled()
    expect(screen.getByText('1 a Copa Airlines - Comercial')).toBeInTheDocument()
    fireEvent.click(nextButton)

    expect(screen.getByRole('region', { name: 'Datos de la asignación' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(screen.getByText('Copa Airlines - Comercial')).toBeInTheDocument()
    rerender(<Harness open={false} />)
  })

  it('cancels the project step without advancing when no project is selected', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await screen.findByText('Programa de automatización (DEYEL)')

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows loading and empty states, and reuses the loaded project cache when reopened', async () => {
    let resolveClients: (value: Client[]) => void = () => undefined
    api.listClients.mockImplementationOnce(() => new Promise((resolve) => { resolveClients = resolve }))
    api.listClientProjects.mockResolvedValue([])
    const { rerender } = render(<Harness />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando proyectos')
    await waitFor(() => expect(api.listClients).toHaveBeenCalledTimes(1))
    await act(async () => resolveClients([]))
    expect(await screen.findByText('No hay clientes activos disponibles.')).toBeInTheDocument()

    rerender(<Harness open={false} />)
    rerender(<Harness />)
    await waitFor(() => expect(api.listClients).toHaveBeenCalledTimes(1))
  })

  it('shows a retryable network error and reloads only missing project data', async () => {
    api.listClientProjects
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(banescoProjects)
      .mockResolvedValueOnce(copaProjects)
    render(<Harness />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudieron cargar los proyectos')
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Programa de automatización (DEYEL)')).toBeInTheDocument()
    expect(api.listClients).toHaveBeenCalledTimes(1)
    expect(api.listClientProjects).toHaveBeenCalledTimes(3)
  })

  it('reuses NewProjectModal and presents selected collaborators', async () => {
    const { rerender } = render(<Harness />)
    await screen.findByText('Programa de automatización (DEYEL)')

    expect(screen.getByText('Colaboradores (1)')).toBeInTheDocument()
    expect(screen.getByText('Ana Torres')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+ Crear proyecto' }))
    expect(screen.getByRole('dialog', { name: 'Nuevo proyecto' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Crear ejemplo' }))
    expect(await screen.findByText('Proyecto nuevo')).toBeInTheDocument()
    rerender(<Harness open={false} />)
  })

  it('closes on Escape and retries when the client list fails', async () => {
    const onClose = vi.fn()
    api.listClients.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(clients)
    render(<Harness onClose={onClose} />)

    const alert = await screen.findByRole('alert')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Programa de automatización (DEYEL)')).toBeInTheDocument()
    expect(api.listClients).toHaveBeenCalledTimes(2)
  })

  it('submits once, reports the result and closes the panel on success', async () => {
    const onAssigned = vi.fn()
    const onClose = vi.fn()
    render(<Harness onAssigned={onAssigned} onClose={onClose} />)
    await screen.findByText('Programa de automatización (DEYEL)')

    fireEvent.click(screen.getByRole('radio', { name: /Programa de automatización/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByRole('region', { name: 'Datos de la asignación' })
    fireEvent.click(screen.getByRole('button', { name: 'Asignar 1' }))

    await waitFor(() => expect(onAssigned).toHaveBeenCalledWith(assignmentResult))
    expect(assignMembers).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the panel open and shows mapped validation errors', async () => {
    assignMembers.mockRejectedValueOnce(new BulkAssignmentApiError(400, {
      code: 'VALIDATION_FAILED',
      errors: [{
        field: 'leaderId',
        code: 'REQUIRED',
        message: 'Required field.',
        employeeId: 890,
      }],
    }))
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await screen.findByText('Programa de automatización (DEYEL)')

    fireEvent.click(screen.getByRole('radio', { name: /Programa de automatización/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByRole('region', { name: 'Datos de la asignación' })
    fireEvent.click(screen.getByRole('button', { name: 'Asignar 1' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Corrige los campos marcados')
    expect(screen.getByText('Este campo es obligatorio.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('offers retry for a network failure and completes the same assignment', async () => {
    assignMembers.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(assignmentResult)
    const onAssigned = vi.fn()
    render(<Harness onAssigned={onAssigned} />)
    await screen.findByText('Programa de automatización (DEYEL)')

    fireEvent.click(screen.getByRole('radio', { name: /Programa de automatización/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByRole('region', { name: 'Datos de la asignación' })
    fireEvent.click(screen.getByRole('button', { name: 'Asignar 1' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Revisa tu conexión')
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(onAssigned).toHaveBeenCalledWith(assignmentResult))
    expect(assignMembers).toHaveBeenCalledTimes(2)
  })
})
