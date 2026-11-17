import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { buildAuditLogQuery, historyApi } from './history.api'

vi.mock('./api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

describe('historyApi', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset()
  })

  it('builds the backend query for the filters and keeps page in 0-based format', () => {
    expect(buildAuditLogQuery({ actor: 'maria', field: 'status', from: '2026-11-01', to: '2026-11-30' }, 2))
      .toBe('page=1&size=25&actor=maria&field=status&from=2026-11-01&to=2026-11-30')
  })

  it('maps the backend page to the frontend page numbering', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      items: [{ id: 1, action: 'UPDATE', actor: 'maria.perez', occurredAt: '2026-11-10T15:04:05Z', fields: [{ field: 'name', label: 'Nombre', oldValue: 'Ana', newValue: 'Ana Torres' }] }],
      page: { number: 0, size: 25, totalElements: 1, totalPages: 1 },
      actors: ['maria.perez'],
      fields: [{ field: 'name', label: 'Nombre' }],
    })))

    await expect(historyApi.listAuditLog(7, { actor: 'maria.perez' }, 1)).resolves.toMatchObject({
      page: { number: 1, size: 25, totalElements: 1, totalPages: 1 },
      actors: ['maria.perez'],
      fields: [{ field: 'name', label: 'Nombre' }],
    })
    expect(mockedApiFetch).toHaveBeenCalledWith('history', '/resources/7/audit-log?page=0&size=25&actor=maria.perez')
  })

  it('propagates authorization errors for the audit log endpoint', async () => {
    mockedApiFetch.mockResolvedValue(new Response(JSON.stringify({
      code: 'FORBIDDEN',
      detail: 'No tienes acceso',
    }), { status: 403 }))

    await expect(historyApi.listAuditLog(7)).rejects.toMatchObject({ status: 403 })
  })
})
