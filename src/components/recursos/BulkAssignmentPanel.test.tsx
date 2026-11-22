import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Client, ClientProject } from '../../services/projects.types'
import { getProjectsApi } from '../../services/projects'
import { useBulkAssign } from '../../hooks/useBulkAssign'
import { BulkAssignmentPanel } from './BulkAssignmentPanel'

vi.mock('../../services/projects', () => ({ getProjectsApi: vi.fn() }))
vi.mock('../../services/resources', () => ({ getResourcesApi: vi.fn() }))
vi.mock('../../services/bulkAssignment.api', () => ({
  bulkAssignmentApi: { assignMembers: vi.fn() },
  BulkAssignmentApiError: class BulkAssignmentApiError extends Error {},
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

function Harness({ open = true, onClose = vi.fn() }: { open?: boolean; onClose?: () => void }) {
  const assignment = useBulkAssign()
  const { togglePerson } = assignment
  useEffect(() => {
    togglePerson({
      employeeId: 890,
      employeeNumber: '1045',
      name: 'Ana Torres',
      statusCode: 'ACTIVO',
      version: 3,
    })
  }, [togglePerson])
  return <BulkAssignmentPanel open={open} assignment={assignment} onClose={onClose} />
}

describe('BulkAssignmentPanel · project step', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listClients.mockResolvedValue(clients)
    api.listClientProjects.mockImplementation(async (clientId) => (
      clientId === '3' ? banescoProjects : copaProjects
    ))
    vi.mocked(getProjectsApi).mockResolvedValue(api as never)
  })

  it('loads clients and their projects, filters the list and selects a project', async () => {
    const { rerender } = render(<Harness />)
    await screen.findByText('Programa de automatización (DEYEL)')

    expect(api.listClients).toHaveBeenCalledTimes(1)
    expect(api.listClientProjects).toHaveBeenCalledTimes(2)
    expect(screen.getByText(/fin de contrato 31 dic 2026/)).toBeInTheDocument()
    expect(screen.getByText(/sin fecha de fin de contrato/)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar proyecto' }), { target: { value: 'copa' } })
    expect(screen.queryByText('Programa de automatización (DEYEL)')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Copa Airlines - Comercial/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('region', { name: 'Datos de la asignación' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(screen.getByText('Copa Airlines - Comercial')).toBeInTheDocument()
    rerender(<Harness open={false} />)
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
})
