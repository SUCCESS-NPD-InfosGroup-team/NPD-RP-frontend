// Contrato del módulo `access` del backend (FRONTEND-INTEGRATION.md, HU-02)

export type RoleCode = 'operations-administrator' | 'npd-leader' | 'customer-success' | 'guest'
export type UserState = 'PENDING' | 'ACTIVE' | 'DISABLED'

export interface Role {
  code: RoleCode
  name: string
  description: string
}

export interface RolesResponse {
  items: Role[]
}

export interface CreateUserRequest {
  fullName: string
  email: string
  role: RoleCode
}

export interface User {
  id: number
  fullName: string
  email: string
  role: RoleCode
  state: UserState
  /** ISO-8601 UTC; null hasta su primer acceso */
  lastAccessAt: string | null
}

export interface PageInfo {
  number: number
  size: number
  totalElements: number
  totalPages: number
}

export interface Page<T> {
  items: T[]
  page: PageInfo
}

export type CreateUserField = keyof CreateUserRequest

export interface FieldError {
  field: string
  code: string
  message: string
}

/** Cuerpo ProblemDetails (RFC 9457) de los errores del backend */
export interface Problem {
  status: number
  code: string
  title: string
  detail: string
  errors?: FieldError[]
}

export interface UsersApi {
  listRoles(): Promise<Role[]>
  /** `page` empieza en 0 */
  listUsers(page: number, size: number): Promise<Page<User>>
  createUser(request: CreateUserRequest): Promise<User>
}
