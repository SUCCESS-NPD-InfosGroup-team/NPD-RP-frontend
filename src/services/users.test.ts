import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'
import { createMockUsersApi, httpUsersApi } from './users'

vi.mock('./api', () => ({ apiFetch: vi.fn() }))

const mockedApiFetch = vi.mocked(apiFetch)

describe('users mock API', () => {
  it('lists the Figma users and creates an active account', async () => {
    const api = createMockUsersApi()
    const before = await api.listUsers()

    expect(before).toHaveLength(14)
    const created = await api.createUser({
      fullName: 'Nueva persona',
      email: 'nueva.persona@infosgroup.com',
      role: 'Guest',
    })

    expect(created).toMatchObject({
      fullName: 'Nueva persona',
      email: 'nueva.persona@infosgroup.com',
      role: 'Guest',
      status: 'active',
    })
    await expect(api.listUsers()).resolves.toHaveLength(15)
  })

  it('rejects duplicate email addresses case-insensitively', async () => {
    const api = createMockUsersApi()

    await expect(api.createUser({
      fullName: 'Otra persona',
      email: 'MARIA.PEREZ@INFOSGROUP.COM',
      role: 'Guest',
    })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe una cuenta con este correo.',
    })
  })

  describe('users HTTP API', () => {
    beforeEach(() => mockedApiFetch.mockReset())

    it('lists and creates users through the access module', async () => {
      const user = {
        id: '1',
        fullName: 'Nueva persona',
        email: 'nueva@infosgroup.com',
        role: 'Guest' as const,
        status: 'active' as const,
        lastAccess: 'Nunca',
      }
      mockedApiFetch
        .mockResolvedValueOnce(new Response(JSON.stringify([user])))
        .mockResolvedValueOnce(new Response(JSON.stringify(user)))

      await expect(httpUsersApi.listUsers()).resolves.toEqual([user])
      await expect(httpUsersApi.createUser({
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      })).resolves.toEqual(user)
      expect(mockedApiFetch).toHaveBeenNthCalledWith(1, 'access', '/users')
      expect(mockedApiFetch).toHaveBeenNthCalledWith(2, 'access', '/users', expect.objectContaining({ method: 'POST' }))
    })

    it.each([
      [400, 'Los datos enviados no son válidos. Revisa el formulario.', 400],
      [401, 'Tu sesión expiró. Inicia sesión nuevamente.', 401],
      [403, 'No tienes permiso para consultar usuarios.', 403],
      [409, 'Ya existe una cuenta con este correo.'],
      [502, 'El proveedor de identidad no está disponible. Intenta nuevamente.'],
      [503, 'El proveedor de identidad no está disponible. Intenta nuevamente.'],
      [500, 'No se pudo completar la solicitud. Intenta nuevamente.', 500],
      [418, 'No se pudo completar la solicitud. Intenta nuevamente.', 500],
    ])('maps HTTP status %s to a typed error', async (status, message, expectedStatus = status) => {
      mockedApiFetch.mockResolvedValueOnce(new Response(null, { status }))
      await expect(httpUsersApi.listUsers()).rejects.toMatchObject({
        status: expectedStatus,
        message,
      })
    })
  })

  it('can simulate authorization and identity-provider failures', async () => {
    await expect(createMockUsersApi(undefined, { createErrorStatus: 403 }).createUser({
      fullName: 'Sin permiso',
      email: 'sin.permiso@infosgroup.com',
      role: 'Guest',
    })).rejects.toMatchObject({ status: 403 })
    await expect(createMockUsersApi(undefined, { createErrorStatus: 503 }).createUser({
      fullName: 'Proveedor caído',
      email: 'proveedor@infosgroup.com',
      role: 'Guest',
    })).rejects.toMatchObject({ status: 503 })
  })
})
