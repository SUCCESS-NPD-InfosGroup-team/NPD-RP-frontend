// src/types/index.ts

export type Role = 
  | 'Operations administrator' 
  | 'NPD Lead' 
  | 'Customer Success' 
  | 'Guest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
  status: 'Activo' | 'Desactivado';
}

// ==========================================
// TIPOS REALES DE LA API (Basados en Scalar)
// ==========================================

export interface RecursoApi {
  id: number;
  employeeNumber: string;
  name: string;
  level: number;
  clientRole: string | null;
  leader: { id: number; name: string } | null;
  client?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  version: number;
}

export interface ResourceSearchResponse {
  items: RecursoApi[];
  groups: Record<string, { items: RecursoApi[]; total: number }>;
  page: number;
  totalPages: number;
  totalElements: number;
}

// ==========================================
// INTERFACES INTERNAS DEL FRONTEND
// ==========================================

export interface Recurso {
  id: string;
  nEmpleado: string;      // Número de empleado (CA-07)
  nombre: string;
  rol: string;
  cliente: string;
  proyecto: string;
  liderNPD: string;       // Lead
  nivel: string;
  estado: string;         // Activo, Inactivo, etc.
  fechaInicio: string;
  fechaFin: string;
  version?: number;       // Opcional para no romper mocks/componentes antiguos (BUG-03)
}

export interface Vacacion {
  id: string;
  nEmpleado: string;
  colaborador: string;
  cliente: string;
  liderNPD: string;
  fechaInicio: string;
  fechaFin: string;
  nota?: string;
}

export interface AuditEntry {
  id: string;
  fecha: string; // ISO completo con hora: 2026-10-02T10:14:00
  autor: string;
  autorInitials: string;
  accion: 'Alta' | 'Edición' | 'Baja' | 'Descarga';
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  recursoId?: string;
  recursoNombre?: string;
}

// --- INTERFAZ PARA LOS FILTROS DE BÚSQUEDA (HU-03) ---
export interface Filters {
  search?: string;       // Búsqueda por número de empleado (CA-07)
  cliente?: string;
  proyecto?: string;
  liderNPD?: string;
  rol?: string;
  nivel?: string;
  estado?: string;
}

export type PermissionLevel =
  | 'Completo'
  | 'Solo lectura'
  | 'Sin acceso'
  | 'Solo colaboradores'
  | 'Solo los de su equipo'
  | 'Solo consulta'
  | 'Parcialmente';

export interface PermissionRow {
  module: string;
  submodule: string;
  operationsAdmin: PermissionLevel;
  npdLead: PermissionLevel;
  customerSuccess: PermissionLevel;
  guest: PermissionLevel;
}

export interface AvisoConfig {
  id: string;
  titulo: string;
  descripcion: string;
  activo: boolean;
  umbral1: number;
  umbral2: number;
  horaEnvio: string;
  destinatariosPara: string[];
  destinatariosCC: string[];
  asunto: string;
  cuerpo: string;
  previewData: {
    cliente: string;
    proyecto: string;
    fechaFin: string;
    diasRestantes: number;
  };
}