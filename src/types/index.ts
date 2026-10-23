// src/types/index.ts

/** Realm roles of the `npd` realm in Keycloak. Finer permissions live in the backend. */
export type Role = 'operations-administrator' | 'npd-leader' | 'customer-success' | 'guest';

export interface AuthUser {
  username: string;
  fullName: string;
  email?: string;
}

export interface OperationsStatus {
  lastUpdatedAt?: Date;
  lastUpdatedBy?: string;
  activeResources?: number;
  clientCount?: number;
  nextNotificationAt?: Date;
  sessionExpiresAt?: Date;
}

//TIPOS (HU-02 y HU-03) Hamedpj

export interface Recurso {
  id: string;
  nEmpleado: string;
  nombre: string;
  rol: string;
  cliente: string;
  proyecto: string;
  liderNPD: string;
  nivel: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface Filters {
  search?: string;
  cliente?: string;
  proyecto?: string;
  liderNPD?: string;
  rol?: string;
  nivel?: string;
  estado?: string;
}