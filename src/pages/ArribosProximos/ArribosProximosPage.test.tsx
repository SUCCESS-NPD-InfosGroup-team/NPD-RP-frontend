import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useArrivals } from '../../hooks/useArrivals'
import { ApiRequestError } from '../../services/projects.types'
import type { ArrivalEvent, ArrivalsPage, ArrivalsSummary } from '../../services/arrivals.types'
import { ArribosProximosPage } from './ArribosProximosPage'

const serviceMocks = vi.hoisted(() => ({
  useArrivals: vi.fn(),
  getArrivalsApi: vi.fn(),
  listClients: vi.fn(),
  getNpdLeads: vi.fn(),
}))

vi.mock('../../hooks/useArrivals', () => ({ useArrivals: serviceMocks.useArrivals }))
vi.mock('../../services/arrivals', () => ({ getArrivalsApi: serviceMocks.getArrivalsApi }))
vi.mock('../../services/projects', () => ({
  getProjectsApi: () => Promise.resolve({ listClients: serviceMocks.listClients }),
}))
vi.mock('../../services/resources', () => ({
  getResourcesApi: () => Promise.resolve({ getNpdLeads: serviceMocks.getNpdLeads }),
}))
const spreadsheetMocks = vi.hoisted(() => ({ saveAs: vi.fn() }))
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn((rows: unknown[]) => ({ rows })),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => new Uint8Array([1])),
}))
vi.mock('file-saver', () => ({ saveAs: spreadsheetMocks.saveAs }))
vi.mock('../../components/recursos/ResourceDetailDrawer', () => ({
  ResourceDetailDrawer: ({ resource, onClose }: { resource: { nombre: string }; onClose: () => void }) => (
    <div role="dialog">
      <span>{resource.nombre}</span>
      <button onClick={onClose}>Cerrar detalle del recurso</button>
    </div>
  ),
}))

const mockedUseArrivals = vi.mocked(useArrivals)

const summary: ArrivalsSummary = {
  total: 1,
  byType: { PENDING_CONFIRMATION: 0, ASSIGNMENT_END: 1, CONTRACT_END: 0, PROBATION_END: 0, VACATION_START: 0 },
}

const pageData: ArrivalsPage = {
  summary,
  items: [],
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 0,
}

const event: ArrivalEvent = {
  id: 'event-1',
  type: 'ASSIGNMENT_END',
  date: '2026-11-18',
  daysRemaining: 5,
  resource: { id: 'test-resource-1', employeeNumber: 'TEST-001', name: 'Recurso de prueba', clientRole: 'QA de prueba' },
  resourceCount: 1,
  client: 'Cliente de prueba',
  project: 'Proyecto de prueba',
  leader: 'Líder de prueba',
  notice: { status: 'NONE', audience: null, stage: null, date: null },
}

function configureArrivals(overrides: Partial<ReturnType<typeof useArrivals>> = {}) {
  const refetch = vi.fn()
  mockedUseArrivals.mockReturnValue({ loading: false, refetch, ...overrides })
  return refetch
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ArribosProximosPage />
    </MemoryRouter>,
  )
}

describe('ArribosProximosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serviceMocks.getArrivalsApi.mockReset()
    serviceMocks.listClients.mockReset().mockResolvedValue([
      { id: '4', name: 'Cliente de prueba', isInternal: false, active: true },
    ])
    serviceMocks.getNpdLeads.mockReset().mockResolvedValue([{ id: 3, name: 'Líder de prueba' }])
    configureArrivals({
      error: new ApiRequestError({ status: 404, code: 'NOT_FOUND', detail: 'No handler found.' }),
    })
  })

  it('explains when the backend arrivals endpoint is not available', async () => {
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La consulta de arribos próximos aún no está disponible en el backend.',
    )
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('shows a general error for other failures and retries the request', () => {
    const refetch = configureArrivals({ error: new Error('network failure') })
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los arribos próximos.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('shows the loading state and then the empty state', () => {
    configureArrivals({ loading: true })
    const view = renderPage()
    expect(screen.getByText('Cargando arribos próximos…')).toBeInTheDocument()

    configureArrivals({ data: pageData })
    view.rerender(
      <MemoryRouter>
        <ArribosProximosPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('No hay eventos con estos filtros en los próximos 30 días.')).toBeInTheDocument()
  })

  it('renders events and requests another page', async () => {
    configureArrivals({
      data: { ...pageData, items: [event], total: 26, totalPages: 2 },
    })
    renderPage()

    expect(await screen.findByText('Recurso de prueba')).toBeInTheDocument()
    expect(screen.getAllByText('Cliente de prueba')).toHaveLength(2)
    const nextPageButtons = screen.getAllByRole('button', { name: 'Página siguiente' })
    expect(nextPageButtons).toHaveLength(2)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    fireEvent.click(nextPageButtons[1])
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    await waitFor(() => expect(mockedUseArrivals).toHaveBeenLastCalledWith(
      expect.objectContaining({ windowDays: 30 }),
      2,
    ))
    scrollTo.mockRestore()
  })

  it('exports all arrival pages with the active filters', async () => {
    configureArrivals({
      data: { ...pageData, items: [event], total: 26, totalPages: 2 },
    })
    const listArrivals = vi.fn()
      .mockResolvedValueOnce({ ...pageData, items: [event], total: 26, totalPages: 2 })
      .mockResolvedValueOnce({ ...pageData, items: [{ ...event, id: 'event-2' }], total: 26, totalPages: 2 })
    serviceMocks.getArrivalsApi.mockResolvedValue({ listArrivals })

    renderPage()
    await screen.findByRole('option', { name: 'Cliente de prueba' })
    fireEvent.change(screen.getByLabelText('Ventana'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: /Fin de asignación/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }))

    await waitFor(() => expect(spreadsheetMocks.saveAs).toHaveBeenCalledOnce())
    expect(listArrivals).toHaveBeenNthCalledWith(1, {
      windowDays: 60,
      clientId: '4',
      leaderId: undefined,
      type: 'ASSIGNMENT_END',
    }, 1)
    expect(listArrivals).toHaveBeenNthCalledWith(2, {
      windowDays: 60,
      clientId: '4',
      leaderId: undefined,
      type: 'ASSIGNMENT_END',
    }, 2)
  })

  it('opens the resource detail drawer from an arrivals row', async () => {
    configureArrivals({
      data: { ...pageData, items: [event], total: 1, totalPages: 1 },
    })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Recurso de prueba')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle del recurso' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('combines filters, resets pagination, and clears selected filters', async () => {
    configureArrivals({ data: pageData })
    renderPage()

    await screen.findByRole('option', { name: 'Cliente de prueba' })
    await screen.findByRole('option', { name: 'Líder de prueba' })
    fireEvent.change(screen.getByLabelText('Ventana'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Líder NPD'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /Fin de asignación/i }))

    await waitFor(() => expect(mockedUseArrivals).toHaveBeenLastCalledWith({
      windowDays: 60,
      clientId: '4',
      leaderId: '3',
      type: 'ASSIGNMENT_END',
    }, 1))
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(mockedUseArrivals).toHaveBeenLastCalledWith({
      windowDays: 60,
      clientId: undefined,
      leaderId: undefined,
      type: undefined,
    }, 1))
  })

  it('shows a leader selector error when its lookup fails', async () => {
    serviceMocks.getNpdLeads.mockRejectedValueOnce(new Error('network failure'))
    renderPage()

    expect(await screen.findByText('No se pudieron cargar los líderes NPD.')).toBeInTheDocument()
    expect(screen.getByLabelText('Líder NPD')).toBeDisabled()
  })
})
