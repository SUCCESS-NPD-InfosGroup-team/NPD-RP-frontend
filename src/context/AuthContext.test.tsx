import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { fakeKeycloak } from '../test/keycloakMock'

vi.mock('../auth/keycloak', async () => (await import('../test/keycloakMock')).fakeAuthModule)

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('AuthContext', () => {
  const original = fakeKeycloak.tokenParsed

  afterEach(() => {
    fakeKeycloak.tokenParsed = original
  })

  it('exposes the user and realm roles from the token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toEqual({
      username: 'juan.david',
      fullName: 'Juan David Vela Coronado',
      email: 'juan.david@example.test',
    })
    expect(result.current.roles).toEqual(['operations-administrator'])
    expect(result.current.hasRole('operations-administrator')).toBe(true)
    expect(result.current.hasRole('guest')).toBe(false)
  })

  it('accepts roles from the realm claim', () => {
    fakeKeycloak.tokenParsed = {
      realm_access: { roles: ['guest'] },
    }

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.roles).toEqual(['guest'])
  })

  it('accepts roles from the configured frontend client claim', () => {
    fakeKeycloak.tokenParsed = {
      resource_access: {
        'npd-frontend': { roles: ['customer-success', 'npd-leader'] },
        'other-client': { roles: ['operations-administrator'] },
      },
    }

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.roles).toEqual(['customer-success', 'npd-leader'])
  })

  it('ignores a known role that appears only under another client', () => {
    fakeKeycloak.tokenParsed = {
      resource_access: {
        'other-client': { roles: ['operations-administrator'] },
      },
    }

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.roles).toEqual([])
    expect(result.current.hasRole('operations-administrator')).toBe(false)
  })

  it('accepts realm roles when resource access is absent', () => {
    fakeKeycloak.tokenParsed = {
      realm_access: { roles: ['guest'] },
    }

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.roles).toEqual(['guest'])
  })

  it('ignores malformed resource access values', () => {
    fakeKeycloak.tokenParsed = {
      resource_access: 'npd-frontend',
    }

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.roles).toEqual([])
  })

  it('ignores malformed roles under the configured client', () => {
    fakeKeycloak.tokenParsed = {
      resource_access: {
        'npd-frontend': { roles: 'operations-administrator' },
      },
    }

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.roles).toEqual([])
  })

  it('falls back to the username when the token has no name', () => {
    fakeKeycloak.tokenParsed = { preferred_username: 'sin.nombre' }

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user.fullName).toBe('sin.nombre')
    expect(result.current.roles).toEqual([])
  })

  it('refreshes the token before handing it out', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(result.current.getToken()).resolves.toBe('fake-access-token')
    expect(fakeKeycloak.updateToken).toHaveBeenCalledWith(30)
  })

  it('throws when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>')
  })
})
