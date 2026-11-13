import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Recurso } from '../../types'
import { ResourceDetailDrawer } from './ResourceDetailDrawer'

const mockedUseAuth = vi.hoisted(() => vi.fn())
const mockedUseResourceDetail = vi.hoisted(() => vi.fn())

vi.mock('../../context/AuthContext', () => ({ useAuth: mockedUseAuth }))
vi.mock('../../hooks/useResourceDetail', () => ({ useResourceDetail: mockedUseResourceDetail }))

const resource: Recurso = {
  id: '7',
  nEmpleado: '#1045',
  nombre: 'Ana Torres',
  rol: 'QA',
  cliente: 'BANESCO',
  proyecto: 'DEYEL',
  liderNPD: 'Lorena',
  nivel: 'N3',
  estado: 'Activo',
  fechaInicio: '2026-01-01',
  fechaFin: '2026-12-31',
}

const detail = {
  id: 7,
  employeeNumber: '1045',
  name: 'Ana Torres',
  email: 'ana@example.com',
  jobTitle: { id: 1, name: 'QA' },
  position: { id: 2, name: 'Analista' },
  level: 3,
  businessUnit: null,
  workMode: { id: 1, name: 'Remoto' },
  gender: null,
  talentReview: null,
  hireDate: '2026-01-03',
  probationEndDate: '2026-04-03',
  status: { code: 'ACTIVO' as const, label: 'Activo' },
  situation: { code: 'ASIGNADO' as const, label: 'Asignado' },
  assignment: {
    client: { id: 1, name: 'BANESCO' },
    project: { id: 2, name: 'DEYEL', contractEndDate: '2026-12-31' },
    leader: { id: 3, name: 'Lorena' },
    leaderEmployeeNumber: '631',
    clientRole: { id: 4, name: 'QA' },
    equipment: { id: 5, name: 'Laptop' },
    endDate: '2026-11-30',
    startDate: '2026-01-05',
    daysToEndDate: 15,
    indefinite: false,
    clientContactEmail: 'contact@example.com',
  },
  vacationMonth: 10,
  termination: null,
  fieldsToFix: [],
  version: 1,
  updatedAt: '2026-10-01T10:00:00Z',
  updatedBy: 'maria',
}

describe('ResourceDetailDrawer', () => {
  beforeEach(() => {
    mockedUseResourceDetail.mockReturnValue({ resource: detail, loading: false, error: undefined, refetch: vi.fn() })
    mockedUseAuth.mockReturnValue({ roles: ['guest'] })
  })

  it('opens with focus on close and closes with Escape', () => {
    const onClose = vi.fn()
    render(<ResourceDetailDrawer resource={resource} onClose={onClose} onEdit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Cerrar detalle del recurso' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the overlay is clicked and shows the loading state', () => {
    mockedUseResourceDetail.mockReturnValue({ loading: true, error: undefined, refetch: vi.fn() })
    const onClose = vi.fn()
    render(<ResourceDetailDrawer resource={resource} onClose={onClose} onEdit={vi.fn()} />)

    expect(screen.getByLabelText('Cargando detalle')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement, { target: screen.getByRole('dialog').parentElement })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows only the actions allowed for the Operations administrator', () => {
    mockedUseAuth.mockReturnValue({ roles: ['operations-administrator'] })
    const onEdit = vi.fn()
    render(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={onEdit} />)

    expect(screen.getByRole('button', { name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Auditoría' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Editar registro' }))
    expect(onEdit).toHaveBeenCalledWith(resource)
  })

  it('shows retry state and no actions for a guest', () => {
    const refetch = vi.fn()
    mockedUseResourceDetail.mockReturnValue({ loading: false, error: new Error('503'), refetch })
    render(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Editar registro' })).not.toBeInTheDocument()
  })

  it('renders the current Figma section order and definition rows', () => {
    render(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={vi.fn()} />)

    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent)
    expect(headings).toEqual(['Ana Torres', 'Proyecto', 'Contrato', 'Colaborador', 'Último cambio'])
    expect(screen.getByText('#1045 · Nivel 3 · Remoto')).toBeInTheDocument()
    expect(screen.getByText('En 15 días')).toBeInTheDocument()
    expect(screen.getByText('Lorena · cód. 631')).toBeInTheDocument()
    expect(screen.getByText('Equipo / laptop')).toBeInTheDocument()
    expect(screen.getByText('Inicio de contrato')).toBeInTheDocument()
    expect(screen.getByText('Día 90 de probatoria')).toBeInTheDocument()
    expect(screen.getByText('Puesto')).toBeInTheDocument()
    expect(screen.getByText('Modalidad laboral')).toBeInTheDocument()
    expect(screen.getAllByRole('term')).toHaveLength(16)
    expect(screen.getByText('Octubre')).toBeInTheDocument()
    expect(screen.getByText(/Fin de contrato/)).toBeInTheDocument()
  })

  it('renders the no-project state', () => {
    mockedUseResourceDetail.mockReturnValue({
      resource: { ...detail, assignment: null },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })
    render(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={vi.fn()} />)

    expect(screen.getByText('Sin proyecto')).toBeInTheDocument()
  })

  it('renders the last change and formats changed dates', () => {
    mockedUseResourceDetail.mockReturnValue({
      resource: detail,
      lastChange: {
        action: 'UPDATE',
        actor: 'maria.perez',
        occurredAt: '2026-10-02T15:14:00Z',
        fields: [{
          field: 'assignment.endDate',
          label: 'Fecha final',
          oldValue: '2026-09-30',
          newValue: '2026-10-31',
        }],
      },
      lastChangeError: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })
    render(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Último cambio' })).toBeInTheDocument()
    expect(screen.getByText(/maria\.perez cambió Fecha final de 30 sept 2026 a 31 oct 2026/)).toBeInTheDocument()
  })

  it('renders a created resource change with empty previous values', () => {
    mockedUseResourceDetail.mockReturnValue({
      resource: detail,
      lastChange: {
        action: 'CREATE',
        actor: 'maria.perez',
        occurredAt: '2026-10-02T15:14:00Z',
        fields: [{ field: 'name', label: 'Nombre', oldValue: null, newValue: 'Ana Torres' }],
      },
      lastChangeError: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })
    render(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={vi.fn()} />)

    expect(screen.getByText(/Registro creado/)).toBeInTheDocument()
  })

  it('shows the empty and independent error states for last change', () => {
    mockedUseResourceDetail.mockReturnValue({
      resource: detail,
      lastChange: null,
      lastChangeError: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })
    const { rerender } = render(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByText('Sin cambios registrados')).toBeInTheDocument()

    const refetch = vi.fn()
    mockedUseResourceDetail.mockReturnValue({
      resource: detail,
      lastChange: undefined,
      lastChangeError: new Error('503'),
      loading: false,
      error: undefined,
      refetch,
    })
    rerender(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('shows the last-change loading state while the history request is pending', () => {
    mockedUseResourceDetail.mockReturnValue({
      resource: detail,
      lastChange: undefined,
      lastChangeError: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })
    render(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={vi.fn()} />)

    expect(screen.getByText('Cargando cambios…')).toBeInTheDocument()
  })

  it('renders indefinite assignment and empty optional values', () => {
    mockedUseResourceDetail.mockReturnValue({
      resource: {
        ...detail,
        email: null,
        jobTitle: null,
        position: null,
        level: null,
        probationEndDate: null,
        vacationMonth: null,
        assignment: {
          ...detail.assignment,
          indefinite: true,
          endDate: null,
          daysToEndDate: null,
          leaderEmployeeNumber: null,
          clientRole: null,
          equipment: null,
          clientContactEmail: null,
          startDate: null,
          project: { ...detail.assignment.project, contractEndDate: null },
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })
    render(<ResourceDetailDrawer resource={resource} onClose={vi.fn()} onEdit={vi.fn()} />)

    expect(screen.getByText('Sin fecha final')).toBeInTheDocument()
    expect(screen.getAllByText('No especificado').length).toBeGreaterThan(0)
    expect(screen.getByText('No aplica')).toBeInTheDocument()
  })
})
