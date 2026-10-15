export type UserRole =
  | 'operations-administrator'
  | 'guest'
  | 'sales-customer-success'
  | 'npd-lead'

export interface AuthContextValue {
  role: UserRole | null
  displayName?: string
  canRegisterResources: boolean
  canEditResources: boolean
}

export interface OperationsStatus {
  lastUpdatedAt?: Date
  lastUpdatedBy?: string
  activeResources?: number
  clientCount?: number
  nextNotificationAt?: Date
  sessionExpiresAt?: Date
}