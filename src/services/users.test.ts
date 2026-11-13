import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { createMockUsersApi, httpUsersApi, MOCK_ROLES, roleName, UsersApiError } from './users'
import type { User } from './users.types'

vi.mock('./api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

const user: User = {
  id: 12,
  fullName: 'Ana María Ríos',
  email: 'ana.rios@infosgroup.com',
  role: 'npd-leader',
  state: 'PENDING',
  lastAccessAt: null,
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('users HTTP API', () => {
  beforeEach(() => mockedApiFetch.mockReset())

  it('lists the roles through the access module', async () => {
    mockedApiFetch.mockResolvedValueOnce(json({ items: MOCK_ROLES }))
    await expect(httpUsersApi.listRoles()).resolves.toEqual(MOCK_ROLES)
    expect(mockedApiFetch).toHaveBeenCalledWith('access', '/roles')
  })

  it('lists a page of users', async () => {
    const page = { items: [user], page: { number: 1, size: 25, totalElements: 26, totalPages: 2 } }
    mockedApiFetch.mockResolvedValueOnce(json(page))
    await expect(httpUsersApi.listUsers(1, 25)).resolves.toEqual(page)
    expect(mockedApiFetch).toHaveBeenCalledWith('access', '/users?page=1&size=25')
  })

  it('creates a user with a JSON body', async () => {
    mockedApiFetch.mockResolvedValueOnce(json(user, 201))
    const request = { fullName: user.fullName, email: user.email, role: user.role }
    await expect(httpUsersApi.createUser(request)).resolves.toEqual(user)
    expect(mockedApiFetch).toHaveBeenCalledWith('access', '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  })

  it('turns a ProblemDetails body into a UsersApiError', async () => {
    const problem = {
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 'Datos inválidos',
      detail: 'No se guardó el registro. Corrige los 1 campos marcados.',
      errors: [{ field: 'email', code: 'INVALID_FORMAT', message: 'Escribe un correo válido.' }],
    }
    mockedApiFetch.mockResolvedValueOnce(json(problem, 400))
    const error = await httpUsersApi.createUser({ fullName: 'x', email: 'x', role: 'guest' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UsersApiError)
    expect(error).toMatchObject(problem)
  })

  it('uses fallback texts when the error has no body', async () => {
    mockedApiFetch.mockResolvedValueOnce(new Response(null, { status: 502 }))
    await expect(httpUsersApi.listUsers(0, 25)).rejects.toMatchObject({
      status: 502,
      code: 'API_ERROR',
      title: 'No se pudo completar la solicitud',
      detail: 'Intenta nuevamente en unos minutos.',
    })
  })
})

describe('users mock API', () => {
  it('lists roles and users sorted by full name, paginated', async () => {
    const api = createMockUsersApi()
    await expect(api.listRoles()).resolves.toHaveLength(4)
    const first = await api.listUsers(0, 2)
    expect(first.items.map(({ fullName }) => fullName)).toEqual(['Ana María Ríos', 'Beatriz Gómez'])
    expect(first.page).toEqual({ number: 0, size: 2, totalElements: 3, totalPages: 2 })
    await expect(api.listUsers(1, 2)).resolves.toMatchObject({ items: [{ fullName: 'María Pérez' }] })
  })

  it('creates a pending user with the email in lower case', async () => {
    const api = createMockUsersApi()
    const created = await api.createUser({ fullName: '  Nueva Persona ', email: 'Nueva@InfosGroup.com', role: 'guest' })
    expect(created).toMatchObject({ id: 4, fullName: 'Nueva Persona', email: 'nueva@infosgroup.com', state: 'PENDING', lastAccessAt: null })
    await expect(api.listUsers(0, 25)).resolves.toMatchObject({ page: { totalElements: 4 } })
  })

  it('rejects a taken email with EMAIL_TAKEN', async () => {
    const api = createMockUsersApi([])
    await api.createUser({ fullName: 'A', email: 'a@infosgroup.com', role: 'guest' })
    await expect(api.createUser({ fullName: 'B', email: 'A@INFOSGROUP.COM', role: 'guest' }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_TAKEN' })
  })
})

describe('roleName', () => {
  it('maps a role code to its name, or falls back to the code', () => {
    expect(roleName(MOCK_ROLES, 'npd-leader')).toBe('Líder NPD')
    expect(roleName([], 'guest')).toBe('guest')
  })
})
