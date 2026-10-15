const instance = vi.hoisted(() => ({
  init: vi.fn(),
  updateToken: vi.fn(),
  login: vi.fn(),
  onTokenExpired: undefined as (() => void) | undefined,
}))

vi.mock('keycloak-js', () => ({
  default: vi.fn(function Keycloak() {
    return instance
  }),
}))

describe('initAuth', () => {
  beforeEach(() => {
    vi.resetModules()
    instance.init.mockReset()
    instance.updateToken.mockReset()
    instance.login.mockReset()
    instance.onTokenExpired = undefined
  })

  it('requires login with PKCE and initializes only once', async () => {
    instance.init.mockResolvedValue(true)
    const { initAuth } = await import('./keycloak')

    await Promise.all([initAuth(), initAuth()])

    expect(instance.init).toHaveBeenCalledTimes(1)
    expect(instance.init).toHaveBeenCalledWith({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    })
  })

  it('refreshes an expired token and falls back to login when the refresh fails', async () => {
    instance.init.mockResolvedValue(true)
    instance.updateToken.mockRejectedValue(new Error('session ended'))
    const { initAuth } = await import('./keycloak')
    await initAuth()

    instance.onTokenExpired?.()
    await vi.waitFor(() => expect(instance.login).toHaveBeenCalled())
    expect(instance.updateToken).toHaveBeenCalled()
  })

  it('allows a retry when Keycloak is not reachable', async () => {
    instance.init.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(true)
    const { initAuth } = await import('./keycloak')

    await expect(initAuth()).rejects.toThrow('network')
    await expect(initAuth()).resolves.toBeUndefined()
    expect(instance.init).toHaveBeenCalledTimes(2)
  })
})
