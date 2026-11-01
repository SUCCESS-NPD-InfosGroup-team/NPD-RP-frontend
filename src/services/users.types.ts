export type UserRole =
  | 'Operations administrator'
  | 'NPD Lead'
  | 'Customer Success'
  | 'Guest'

export type UserStatus = 'active' | 'disabled'

export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  lastAccess: string
}

export interface CreateUserRequest {
  fullName: string
  email: string
  role: UserRole
}

export interface CreateUserError {
  status: 403 | 409 | 502 | 503
  message: string
}

export interface UsersApi {
  listUsers(): Promise<User[]>
  createUser(request: CreateUserRequest): Promise<User>
}
