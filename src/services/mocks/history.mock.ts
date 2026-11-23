import type { AuditLogEntry, AuditLogFilters, AuditLogPage } from '../history.types'

const baseEntries: AuditLogEntry[] = [
  {
    id: 1,
    action: 'CREATE',
    actor: 'maria.perez',
    occurredAt: '2026-11-10T15:04:05Z',
    fields: [
      { field: 'name', label: 'Nombre', oldValue: null, newValue: 'Ana Torres' },
      { field: 'email', label: 'Correo', oldValue: null, newValue: 'ana@npd.com' },
      { field: 'position', label: 'Posición', oldValue: null, newValue: 'Analista' },
    ],
  },
  {
    id: 2,
    action: 'UPDATE',
    actor: 'maria.perez',
    occurredAt: '2026-11-10T15:04:05Z',
    fields: [{ field: 'assignment.endDate', label: 'Fecha final', oldValue: '2026-09-30', newValue: '2026-10-31' }],
  },
  {
    id: 3,
    action: 'UPDATE',
    actor: 'cristian.ruiz',
    occurredAt: '2026-11-08T12:00:00Z',
    fields: [{ field: 'status', label: 'Estado', oldValue: 'ACTIVO', newValue: 'LICENCIA' }],
  },
  {
    id: 4,
    action: 'UPDATE',
    actor: 'laura.gomez',
    occurredAt: '2026-11-01T09:30:00Z',
    fields: [{ field: 'level', label: 'Nivel', oldValue: '3', newValue: '4' }],
  },
  {
    id: 5,
    action: 'UPDATE',
    actor: 'maria.perez',
    occurredAt: '2026-10-29T10:00:00Z',
    fields: [{ field: 'projectId', label: 'Proyecto', oldValue: 'Cliente A', newValue: 'Cliente B' }],
  },
  {
    id: 6,
    action: 'UPDATE',
    actor: 'cristian.ruiz',
    occurredAt: '2026-10-20T17:10:00Z',
    fields: [{ field: 'assignment.clientRole', label: 'Rol de cliente', oldValue: 'Senior', newValue: 'Principal' }],
  },
]

const makeEntries = (resourceId: number | string): AuditLogEntry[] => {
  if (resourceId === 999 || resourceId === '999') return []
  const stable = [...baseEntries]
  if (resourceId === 7 || resourceId === '7') {
    return Array.from({ length: 31 }, (_, index) => {
      const source = stable[index % stable.length]
      return {
        ...source,
        id: 1000 + index,
        actor: [...new Set(['maria.perez', 'cristian.ruiz', 'laura.gomez'])][index % 3],
        occurredAt: `2026-11-${String((index % 28) + 1).padStart(2, '0')}T${String(8 + index % 12).padStart(2, '0')}:00:00Z`,
      }
    })
  }
  return stable
}

function matchesFilters(entry: AuditLogEntry, filters: AuditLogFilters): boolean {
  if (filters.actor && entry.actor !== filters.actor) return false
  if (filters.field) {
    if (!entry.fields.some((field) => field.field === filters.field)) return false
  }
  if (filters.from) {
    const entryDate = new Date(entry.occurredAt).getTime()
    if (entryDate < new Date(`${filters.from}T00:00:00Z`).getTime()) return false
  }
  if (filters.to) {
    const entryDate = new Date(entry.occurredAt).getTime()
    if (entryDate > new Date(`${filters.to}T23:59:59Z`).getTime()) return false
  }
  return true
}

export const historyMock = {
  async listAuditLog(resourceId: number | string, filters: AuditLogFilters = {}, page = 1): Promise<AuditLogPage> {
    const entries = makeEntries(resourceId).filter((entry) => matchesFilters(entry, filters))
    const pageSize = 25
    const totalPages = Math.max(1, Math.ceil(entries.length / pageSize))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const start = (safePage - 1) * pageSize
    const items = entries.slice(start, start + pageSize)

    const actors = Array.from(new Set(entries.map((entry) => entry.actor)))
    const fieldMap = new Map<string, { field: string; label: string }>()
    for (const entry of entries) {
      for (const field of entry.fields) {
        if (!fieldMap.has(field.field)) fieldMap.set(field.field, { field: field.field, label: field.label })
      }
    }
    const fields = Array.from(fieldMap.values()).sort((left, right) => left.label.localeCompare(right.label))

    return {
      items,
      page: {
        number: safePage,
        size: pageSize,
        totalElements: entries.length,
        totalPages,
      },
      actors,
      fields,
    }
  },
}
