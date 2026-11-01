import { describe, expect, it } from 'vitest'
import { createMockUsersApi } from './users'

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
