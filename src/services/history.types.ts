export type AuditLogAction = 'CREATE' | 'UPDATE'

export interface AuditLogFieldOption {
  field: string
  label: string
}

export interface AuditLogFieldValue {
  field: string
  label: string
  oldValue: string | null
  newValue: string | null
}

export interface AuditLogEntry {
  id: number
  action: AuditLogAction
  actor: string
  occurredAt: string
  fields: AuditLogFieldValue[]
}

export interface AuditLogFilters {
  actor?: string
  field?: string
  from?: string
  to?: string
}

export interface AuditLogPage {
  items: AuditLogEntry[]
  page: {
    number: number
    size: number
    totalElements: number
    totalPages: number
  }
  actors: string[]
  fields: AuditLogFieldOption[]
}
