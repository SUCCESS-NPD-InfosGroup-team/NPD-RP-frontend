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

describe('ResourceDetailDrawer', () => {
  beforeEach(() => {
    mockedUseResourceDetail.mockReturnValue({ loading: false, error: undefined, refetch: vi.fn() })
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
})
