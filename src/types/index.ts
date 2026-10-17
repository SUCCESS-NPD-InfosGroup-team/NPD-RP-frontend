// src/types/index.ts

/** Realm roles of the `npd` realm in Keycloak. Finer permissions live in the backend. */
export type Role = 'operations-administrator' | 'npd-leader' | 'customer-success' | 'guest';

export interface AuthUser {
  username: string;
  fullName: string;
  email?: string;
}

export interface OperationsStatus {
  lastUpdatedAt?: Date
  lastUpdatedBy?: string
  activeResources?: number
  clientCount?: number
  nextNotificationAt?: Date
  sessionExpiresAt?: Date
}
