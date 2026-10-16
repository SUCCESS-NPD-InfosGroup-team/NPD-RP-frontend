vi.mock('keycloak-js', async () => {
  const { fakeKeycloak } = await import('../test/keycloakMock')
  return {
    default: vi.fn(function Keycloak() {
      return fakeKeycloak
    }),
  }
})

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = []
  readonly name: string
  readonly messages: unknown[] = []
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null

  constructor(name: string) {
    this.name = name
    MockBroadcastChannel.instances.push(this)
  }

  postMessage(message: unknown): void {
    this.messages.push(message)
  }

  dispatchMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data }))
  }
}

type AuthModule = typeof import('./keycloak')

let fakeKeycloak: AuthModule['keycloak']
let auth: AuthModule

async function initialize(): Promise<void> {
  vi.mocked(fakeKeycloak.init).mockResolvedValue(true)
  await auth.initAuth()
}

describe('Keycloak session lifecycle', () => {
  beforeEach(async () => {
    vi.resetModules()
    MockBroadcastChannel.instances = []
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)

    auth = await import('./keycloak')
    fakeKeycloak = auth.keycloak
    vi.mocked(fakeKeycloak.init).mockReset()
    vi.mocked(fakeKeycloak.updateToken).mockReset()
    vi.mocked(fakeKeycloak.updateToken).mockResolvedValue(true)
    vi.mocked(fakeKeycloak.login).mockReset()
    vi.mocked(fakeKeycloak.login).mockResolvedValue()
    vi.mocked(fakeKeycloak.logout).mockReset()
    vi.mocked(fakeKeycloak.logout).mockResolvedValue()
    fakeKeycloak.authenticated = true
    fakeKeycloak.token = 'fake-access-token'
    fakeKeycloak.tokenParsed = {
      preferred_username: 'juan.david',
      realm_access: { roles: ['operations-administrator'] },
    }
    fakeKeycloak.onTokenExpired = undefined
    fakeKeycloak.onAuthLogout = undefined
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('requires login with PKCE and keeps the session iframe disabled', async () => {
    await initialize()

    expect(fakeKeycloak.init).toHaveBeenCalledOnce()
    expect(fakeKeycloak.init).toHaveBeenCalledWith({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    })
    expect(fakeKeycloak.onAuthLogout).toEqual(expect.any(Function))
  })

  it('publishes only a logout type and uses the fixed origin as the redirect URI', async () => {
    await initialize()

    await auth.logoutAuth()

    expect(fakeKeycloak.logout).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    })
    expect(MockBroadcastChannel.instances[0].name).toBe('npd-auth')
    expect(MockBroadcastChannel.instances[0].messages).toEqual([{ type: 'logout' }])
    expect(fakeKeycloak.authenticated).toBe(false)
    expect(fakeKeycloak.token).toBeUndefined()
  })

  it('ignores repeated logout clicks while the Keycloak request is pending', async () => {
    await initialize()

    let resolveLogout: (() => void) | undefined
    vi.mocked(fakeKeycloak.logout).mockImplementation(
      () => new Promise<void>((resolve) => { resolveLogout = resolve }),
    )

    const firstRequest = auth.logoutAuth()
    const secondRequest = auth.logoutAuth()

    expect(fakeKeycloak.logout).toHaveBeenCalledOnce()
    expect(MockBroadcastChannel.instances[0].messages).toEqual([{ type: 'logout' }])
    resolveLogout?.()
    await Promise.all([firstRequest, secondRequest])
  })

  it('clears local session state and redirects to login when logout fails', async () => {
    await initialize()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fakeKeycloak.logout).mockRejectedValue(new Error('Keycloak unavailable'))

    await auth.logoutAuth()

    expect(fakeKeycloak.authenticated).toBe(false)
    expect(fakeKeycloak.token).toBeUndefined()
    expect(fakeKeycloak.login).toHaveBeenCalledOnce()
  })

  it('logs out once without republishing when another tab publishes logout', async () => {
    await initialize()
    const channel = MockBroadcastChannel.instances[0]

    channel.dispatchMessage({ type: 'logout' })
    channel.dispatchMessage({ type: 'logout' })

    expect(fakeKeycloak.authenticated).toBe(false)
    expect(fakeKeycloak.token).toBeUndefined()
    expect(fakeKeycloak.logout).toHaveBeenCalledOnce()
    expect(fakeKeycloak.logout).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    })
    expect(fakeKeycloak.login).not.toHaveBeenCalled()
    expect(channel.messages).toEqual([])
  })

  it('reloads a persisted page when its session is no longer valid', async () => {
    await initialize()
    fakeKeycloak.authenticated = false
    fakeKeycloak.token = undefined
    const reload = vi.fn()

    auth.handlePageShow({ persisted: true }, reload)

    expect(reload).toHaveBeenCalledOnce()
  })

  it('treats onAuthLogout as a session end and redirects to login', async () => {
    await initialize()

    fakeKeycloak.onAuthLogout?.()

    expect(fakeKeycloak.authenticated).toBe(false)
    expect(fakeKeycloak.login).toHaveBeenCalledOnce()
    expect(MockBroadcastChannel.instances[0].messages).toEqual([{ type: 'logout' }])
  })

  it('treats a failed token refresh as logout without retrying redirects', async () => {
    await initialize()
    vi.mocked(fakeKeycloak.updateToken).mockRejectedValue(new Error('session ended'))

    await expect(auth.updateTokenOrLogout(30)).rejects.toThrow('session ended')

    expect(fakeKeycloak.authenticated).toBe(false)
    expect(fakeKeycloak.login).toHaveBeenCalledOnce()
    expect(MockBroadcastChannel.instances[0].messages).toEqual([{ type: 'logout' }])
  })

  it('does not read or write browser storage during logout', async () => {
    await initialize()
    const storageMethods = ['getItem', 'setItem', 'removeItem', 'clear'] as const
    const spies = storageMethods.map((method) =>
      vi.spyOn(Storage.prototype, method),
    )

    await auth.logoutAuth()

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled()
    }
  })

  it('continues logout when BroadcastChannel is unavailable', async () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    await initialize()

    await expect(auth.logoutAuth()).resolves.toBeUndefined()
    expect(fakeKeycloak.logout).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    })
  })

  it('allows a retry when Keycloak is not reachable during initialization', async () => {
    vi.mocked(fakeKeycloak.init)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(true)

    await expect(auth.initAuth()).rejects.toThrow('network')
    await expect(auth.initAuth()).resolves.toBeUndefined()
    expect(fakeKeycloak.init).toHaveBeenCalledTimes(2)
  })
})
