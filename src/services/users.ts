import { apiFetch } from './api'
import type {
  CreateUserRequest,
  Page,
  Problem,
  Role,
  RoleCode,
  RolesResponse,
  User,
  UsersApi,
} from './users.types'

/** Error del backend con su ProblemDetails. Se decide por `code`, nunca por los textos. */
export class UsersApiError extends Error implements Problem {
  readonly status: number
  readonly code: string
  readonly title: string
  readonly detail: string
  readonly errors?: Problem['errors']

  constructor(problem: Problem) {
    super(problem.detail)
    this.name = 'UsersApiError'
    this.status = problem.status
    this.code = problem.code
    this.title = problem.title
    this.detail = problem.detail
    this.errors = problem.errors
  }
}

const FALLBACK_TITLE = 'No se pudo completar la solicitud'
const FALLBACK_DETAIL = 'Intenta nuevamente en unos minutos.'

async function read<T>(response: Response): Promise<T> {
  if (response.ok) return await response.json() as T
  const body = await response.json().catch(() => ({})) as Partial<Problem>
  throw new UsersApiError({
    status: response.status,
    code: body.code ?? 'API_ERROR',
    title: body.title ?? FALLBACK_TITLE,
    detail: body.detail ?? FALLBACK_DETAIL,
    errors: body.errors,
  })
}

export const httpUsersApi: UsersApi = {
  async listRoles() {
    const body = await read<RolesResponse>(await apiFetch('access', '/roles'))
    return body.items
  },
  async listUsers(page, size) {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    return read<Page<User>>(await apiFetch('access', `/users?${params.toString()}`))
  },
  async createUser(request) {
    return read<User>(await apiFetch('access', '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }))
  },
}

// --- Datos simulados para trabajar sin backend (VITE_USE_MOCK_API=true) ---

export const MOCK_ROLES: readonly Role[] = [
  { code: 'operations-administrator', name: 'Administrador de operaciones', description: 'Gestiona recursos, proyectos y usuarios de la plataforma.' },
  { code: 'npd-leader', name: 'Líder NPD', description: 'Consulta los recursos y proyectos.' },
  { code: 'customer-success', name: 'Customer Success', description: 'Consulta los recursos y proyectos.' },
  { code: 'guest', name: 'Invitado', description: 'Solo consulta la información de la plataforma.' },
]

export const MOCK_USERS: readonly User[] = [
  { id: 1, fullName: 'Ana María Ríos', email: 'ana.rios@infosgroup.com', role: 'npd-leader', state: 'PENDING', lastAccessAt: null },
  { id: 2, fullName: 'Beatriz Gómez', email: 'beatriz.gomez@infosgroup.com', role: 'guest', state: 'ACTIVE', lastAccessAt: '2026-11-02T15:04:11Z' },
  { id: 3, fullName: 'María Pérez', email: 'maria.perez@infosgroup.com', role: 'operations-administrator', state: 'ACTIVE', lastAccessAt: '2026-11-01T13:30:00Z' },
]

export function createMockUsersApi(initialUsers: readonly User[] = MOCK_USERS): UsersApi {
  let users = initialUsers.map((user) => ({ ...user }))
  return {
    listRoles: () => Promise.resolve(MOCK_ROLES.map((role) => ({ ...role }))),
    listUsers(page, size) {
      const sorted = [...users].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
      return Promise.resolve({
        items: sorted.slice(page * size, (page + 1) * size),
        page: { number: page, size, totalElements: sorted.length, totalPages: Math.ceil(sorted.length / size) },
      })
    },
    createUser(request: CreateUserRequest) {
      const email = request.email.trim().toLowerCase()
      if (users.some((user) => user.email === email)) {
        return Promise.reject(new UsersApiError({
          status: 409,
          code: 'EMAIL_TAKEN',
          title: 'Correo ya registrado',
          detail: `Ya existe un usuario con el correo ${email}.`,
        }))
      }
      const user: User = {
        id: Math.max(0, ...users.map(({ id }) => id)) + 1,
        fullName: request.fullName.trim(),
        email,
        role: request.role,
        state: 'PENDING',
        lastAccessAt: null,
      }
      users = [...users, user]
      return Promise.resolve({ ...user })
    },
  }
}

export const usersApi: UsersApi =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true' ? createMockUsersApi() : httpUsersApi

export function roleName(roles: readonly Role[], code: RoleCode): string {
  return roles.find((role) => role.code === code)?.name ?? code
}
