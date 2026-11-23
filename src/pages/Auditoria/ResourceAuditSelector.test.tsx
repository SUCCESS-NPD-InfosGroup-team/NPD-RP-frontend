import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchRecursos } from '../../services/api'
import type { RecursoApi, ResourceSearchResponse } from '../../types'
import { buildResource, buildResourceSearchResponse } from '../../test/fixtures/resourceSearch'
import { ResourceAuditSelector } from './ResourceAuditSelector'

vi.mock('../../services/api', () => ({
  searchRecursos: vi.fn(),
}))

const resource = buildResource({
  id: 1045,
  level: 2,
  clientRole: 'Developer',
  leader: null,
  client: { id: 4, name: 'Acme' },
  project: { id: 8, name: 'Proyecto Uno' },
  projectId: 8,
})

function response(
  items: RecursoApi[],
  totalElements = items.length,
  totalPages = 1,
): ResourceSearchResponse {
  return buildResourceSearchResponse(items, { totalElements, totalPages })
}

function LocationOutput() {
  const location = useLocation()
  return (
    <>
      <div data-testid="current-path">{location.pathname}</div>
      <div data-testid="route-state">{JSON.stringify(location.state)}</div>
    </>
  )
}

function renderSelector() {
  return render(
    <MemoryRouter initialEntries={['/auditoria']}>
      <ResourceAuditSelector />
      <LocationOutput />
    </MemoryRouter>,
  )
}

async function advanceTimers(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

describe('ResourceAuditSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(searchRecursos).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the initial page without a query and displays its range', async () => {
    vi.mocked(searchRecursos).mockResolvedValue(response([resource], 27, 2))
    renderSelector()

    expect(screen.getByRole('searchbox', { name: 'Recurso' })).toHaveFocus()
    await advanceTimers(300)

    expect(searchRecursos).toHaveBeenCalledWith({ search: '', estado: 'Todos' }, 1, 25)
    expect(screen.getByRole('row', { name: /Ana Torres/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Ana Torres/ })).toHaveTextContent('Activo')
    expect(screen.getByText('1–25 de 27')).toBeInTheDocument()
  })

  it('debounces resource searches by 300 ms', async () => {
    vi.mocked(searchRecursos).mockResolvedValue(response([resource]))
    renderSelector()
    await advanceTimers(300)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Recurso' }), {
      target: { value: 'Ana' },
    })
    await advanceTimers(299)
    expect(searchRecursos).toHaveBeenCalledOnce()

    await advanceTimers(1)
    expect(searchRecursos).toHaveBeenCalledTimes(2)
    expect(searchRecursos).toHaveBeenLastCalledWith({ search: 'Ana', estado: 'Todos' }, 1, 25)
  })

  it('loads the requested page from the paginator', async () => {
    vi.mocked(searchRecursos)
      .mockResolvedValueOnce(response([resource], 26, 2))
      .mockResolvedValueOnce(response([], 26, 2))
    renderSelector()
    await advanceTimers(300)

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await advanceTimers(300)

    expect(searchRecursos).toHaveBeenLastCalledWith({ search: '', estado: 'Todos' }, 2, 25)
    expect(screen.getByText('26–26 de 26')).toBeInTheDocument()
  })

  it('shows the empty state when no resources match', async () => {
    vi.mocked(searchRecursos).mockResolvedValue(response([]))
    renderSelector()
    await advanceTimers(300)

    expect(screen.getByRole('status')).toHaveTextContent('No se encontró ningún recurso')
  })

  it('shows an error and retries the failed request', async () => {
    vi.mocked(searchRecursos)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(response([resource]))
    renderSelector()
    await advanceTimers(300)

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los recursos.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await advanceTimers(300)

    expect(searchRecursos).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('row', { name: /Ana Torres/ })).toBeInTheDocument()
  })

  it('opens a resource audit log with the keyboard', async () => {
    vi.mocked(searchRecursos).mockResolvedValue(response([resource]))
    renderSelector()
    await advanceTimers(300)

    const row = screen.getByRole('row', { name: 'Abrir auditoría de Ana Torres' })
    row.focus()
    expect(row).toHaveFocus()
    fireEvent.keyDown(row, { key: 'Enter' })

    expect(screen.getByTestId('current-path')).toHaveTextContent('/auditoria/1045')
    expect(screen.getByTestId('route-state')).toHaveTextContent('"breadcrumbSource":"audit-selector"')
  })
})
