import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryAuditLog } from '../../hooks/useHistoryAuditLog'
import { useResourceDetail } from '../../hooks/useResourceDetail'
import type { AuditLogEntry, AuditLogPage } from '../../services/history.types'
import { AuditoriaPage } from './AuditoriaPage'

const mocks = vi.hoisted(() => ({
  useHistoryAuditLog: vi.fn(),
  useResourceDetail: vi.fn(),
  getHistoryApi: vi.fn(),
  jsonToSheet: vi.fn((rows: unknown[]) => ({ rows })),
  bookNew: vi.fn(() => ({})),
  appendSheet: vi.fn(),
  write: vi.fn(() => new Uint8Array([1])),
  saveAs: vi.fn(),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ roles: ['operations-administrator'] }),
}))
vi.mock('../../hooks/useHistoryAuditLog', () => ({ useHistoryAuditLog: mocks.useHistoryAuditLog }))
vi.mock('../../hooks/useResourceDetail', () => ({ useResourceDetail: mocks.useResourceDetail }))
vi.mock('../../services/history', () => ({ getHistoryApi: mocks.getHistoryApi }))
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: mocks.jsonToSheet,
    book_new: mocks.bookNew,
    book_append_sheet: mocks.appendSheet,
  },
  write: mocks.write,
}))
vi.mock('file-saver', () => ({ saveAs: mocks.saveAs }))

const firstEntry: AuditLogEntry = {
  id: 21,
  action: 'UPDATE',
  actor: 'maria.perez',
  occurredAt: '2026-10-02T15:14:00Z',
  fields: [{
    field: 'assignment.endDate',
    label: 'Fecha final',
    oldValue: '2026-09-30',
    newValue: '2026-10-31',
  }],
}

const auditPage: AuditLogPage = {
  items: [firstEntry],
  page: { number: 1, size: 25, totalElements: 26, totalPages: 2 },
  actors: ['maria.perez'],
  fields: [{ field: 'assignment.endDate', label: 'Fecha final' }],
}

describe('AuditoriaPage export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useHistoryAuditLog.mockReturnValue({
      data: auditPage,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } satisfies ReturnType<typeof useHistoryAuditLog>)
    mocks.useResourceDetail.mockReturnValue({
      resource: { name: 'Ana Torres', employeeNumber: '1045' },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } satisfies ReturnType<typeof useResourceDetail>)
    mocks.getHistoryApi.mockResolvedValue({
      listAuditLog: vi.fn()
        .mockResolvedValueOnce(auditPage)
        .mockResolvedValueOnce({
          ...auditPage,
          items: [{ ...firstEntry, id: 22 }],
        }),
    })
  })

  it('exports every audit page with the active filters', async () => {
    const api = await mocks.getHistoryApi()
    const listAuditLog = api.listAuditLog
    mocks.getHistoryApi.mockResolvedValue({ listAuditLog })

    render(
      <MemoryRouter initialEntries={['/auditoria/1045']}>
        <Routes>
          <Route path="/auditoria/:resourceId" element={<AuditoriaPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'maria.perez' } })
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }))

    await waitFor(() => expect(mocks.saveAs).toHaveBeenCalledOnce())
    expect(listAuditLog).toHaveBeenNthCalledWith(
      1,
      '1045',
      { actor: 'maria.perez', field: undefined, from: undefined, to: undefined },
      1,
    )
    expect(listAuditLog).toHaveBeenNthCalledWith(
      2,
      '1045',
      { actor: 'maria.perez', field: undefined, from: undefined, to: undefined },
      2,
    )
    expect(mocks.jsonToSheet).toHaveBeenCalledWith([
      expect.objectContaining({ Autor: 'maria.perez', Campo: 'Fecha final', 'ID auditoría': 21 }),
      expect.objectContaining({ Autor: 'maria.perez', Campo: 'Fecha final', 'ID auditoría': 22 }),
    ])
  })

  it('shows pagination above and below the audit entries', () => {
    render(
      <MemoryRouter initialEntries={['/auditoria/1045']}>
        <Routes>
          <Route path="/auditoria/:resourceId" element={<AuditoriaPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('navigation', { name: 'Paginación' })).toHaveLength(2)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    fireEvent.click(screen.getAllByRole('button', { name: 'Página siguiente' })[1])

    expect(mocks.useHistoryAuditLog).toHaveBeenLastCalledWith(
      '1045',
      { actor: undefined, field: undefined, from: undefined, to: undefined },
      2,
    )
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    scrollTo.mockRestore()
  })
})
