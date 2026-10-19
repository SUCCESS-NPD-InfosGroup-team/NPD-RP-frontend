// src/types/index.ts

// --- TIPOS PARA LA HU-03 Y HU-02 ---

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

export interface Filters {
  search?: string;
  cliente?: string;
  proyecto?: string;
  liderNPD?: string;
  rol?: string;
  nivel?: string;
  estado?: string;
}

export interface AuthUser {
  username: string;
  fullName: string;
  email?: string;
}