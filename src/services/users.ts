import { apiFetch } from './api'
import type {
  CreateUserError,
  User,
  UserRole,
  UsersApi,
} from './users.types'

export const USER_ROLES: readonly UserRole[] = [
  'Operations administrator',
  'NPD Lead',
  'Customer Success',
  'Guest',
]

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  'Operations administrator': 'Registra y edita recursos, usuarios, vacaciones y avisos. Ve auditoría y riesgo.',
  'NPD Lead': 'Registra evaluaciones, reconocimientos e incidentes de sus colaboradores.',
  'Customer Success': 'Sales / Customer Success: sigue cuentas, renovaciones y cobertura.',
  Guest: 'Solo consulta y exporta. No ve evaluaciones, incidentes ni riesgo.',
}

export const MOCK_USERS: readonly User[] = [
  { id: '1', fullName: 'María Pérez', email: 'maria.perez@infosgroup.com', role: 'Operations administrator', status: 'active', lastAccess: 'Ahora' },
  { id: '2', fullName: 'Jorge Ríos', email: 'jorge.rios@infosgroup.com', role: 'Operations administrator', status: 'active', lastAccess: 'Hoy, 09:12' },
  { id: '3', fullName: 'Lorena Batista', email: 'lorena.batista@infosgroup.com', role: 'NPD Lead', status: 'active', lastAccess: 'Hoy, 08:47' },
  { id: '4', fullName: 'Ricardo Him', email: 'ricardo.him@infosgroup.com', role: 'NPD Lead', status: 'active', lastAccess: 'Ayer, 17:30' },
  { id: '5', fullName: 'Yaritza Castillo', email: 'yaritza.castillo@infosgroup.com', role: 'NPD Lead', status: 'active', lastAccess: '05 oct 2026' },
  { id: '6', fullName: 'Kathya Solís', email: 'kathya.solis@infosgroup.com', role: 'Customer Success', status: 'active', lastAccess: 'Hoy, 10:05' },
  { id: '7', fullName: 'Fernando Lee', email: 'fernando.lee@infosgroup.com', role: 'Guest', status: 'active', lastAccess: '28 sep 2026' },
  { id: '8', fullName: 'Omar Delgado', email: 'omar.delgado@infosgroup.com', role: 'NPD Lead', status: 'active', lastAccess: 'Hoy, 07:58' },
  { id: '9', fullName: 'Itzel Quintero', email: 'itzel.quintero@infosgroup.com', role: 'NPD Lead', status: 'active', lastAccess: '06 oct 2026' },
  { id: '10', fullName: 'Abdiel Pinzón', email: 'abdiel.pinzon@infosgroup.com', role: 'NPD Lead', status: 'active', lastAccess: '02 oct 2026' },
  { id: '11', fullName: 'Gisela Ortiz', email: 'gisela.ortiz@infosgroup.com', role: 'Customer Success', status: 'active', lastAccess: 'Ayer, 15:40' },
  { id: '12', fullName: 'Natalia Rivera', email: 'natalia.rivera@infosgroup.com', role: 'Customer Success', status: 'active', lastAccess: '01 oct 2026' },
  { id: '13', fullName: 'Alberto Chen', email: 'alberto.chen@infosgroup.com', role: 'Guest', status: 'active', lastAccess: '21 sep 2026' },
  { id: '14', fullName: 'Rosa Murillo', email: 'rosa.murillo@infosgroup.com', role: 'Customer Success', status: 'disabled', lastAccess: '30 jul 2026' },
]

export interface MockUsersApiOptions {
  createErrorStatus?: 403 | 502 | 503
}

class UsersApiError extends Error {
  readonly status: CreateUserError['status']

  constructor(
    status: CreateUserError['status'],
    message: string,
  ) {
    super(message)
    this.status = status
    this.name = 'UsersApiError'
  }
}

export function createMockUsersApi(
  initialUsers: readonly User[] = MOCK_USERS,
  options: MockUsersApiOptions = {},
): UsersApi {
  let users = initialUsers.map((user) => ({ ...user }))
  return {
    listUsers() {
      return Promise.resolve(users.map((user) => ({ ...user })))
    },
    createUser(request) {
      return Promise.resolve().then(() => {
        if (options.createErrorStatus) {
          throw new UsersApiError(
            options.createErrorStatus,
            options.createErrorStatus === 403
              ? 'No tienes permiso para crear usuarios.'
              : 'El proveedor de identidad no está disponible. Intenta nuevamente.',
          )
        }
        if (users.some((user) => user.email.toLowerCase() === request.email.toLowerCase())) {
          throw new UsersApiError(409, 'Ya existe una cuenta con este correo.')
        }
        const user: User = {
          id: `mock-${users.length + 1}`,
          ...request,
          status: 'active',
          lastAccess: 'Nunca',
        }
        users = [...users, user]
        return { ...user }
      })
    },
  }
}

function getSupportedStatus(status: number): CreateUserError['status'] {
  const supportedStatuses: CreateUserError['status'][] = [400, 401, 403, 409, 500, 502, 503]
  return supportedStatuses.includes(status as CreateUserError['status'])
    ? status as CreateUserError['status']
    : 500
}

function getErrorMessage(status: CreateUserError['status'], operation: 'list' | 'create'): string {
  switch (status) {
    case 400:
      return 'Los datos enviados no son válidos. Revisa el formulario.'
    case 401:
      return 'Tu sesión expiró. Inicia sesión nuevamente.'
    case 403:
      return operation === 'list'
        ? 'No tienes permiso para consultar usuarios.'
        : 'No tienes permiso para crear usuarios.'
    case 409:
      return 'Ya existe una cuenta con este correo.'
    case 502:
    case 503:
      return 'El proveedor de identidad no está disponible. Intenta nuevamente.'
    default:
      return 'No se pudo completar la solicitud. Intenta nuevamente.'
  }
}

function getError(response: Response, operation: 'list' | 'create'): CreateUserError {
  const status = getSupportedStatus(response.status)
  return new UsersApiError(status, getErrorMessage(status, operation))
}

export const httpUsersApi: UsersApi = {
  async listUsers() {
    const response = await apiFetch('access', '/users')
    if (!response.ok) throw getError(response, 'list')
    return await response.json() as User[]
  },
  async createUser(request) {
    const response = await apiFetch('access', '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!response.ok) throw getError(response, 'create')
    return await response.json() as User
  },
}

export const usersApi: UsersApi =
  import.meta.env.VITE_USE_MOCK_API === 'true' ? createMockUsersApi() : httpUsersApi
