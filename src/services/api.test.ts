import { apiFetch } from './api'
import { fakeKeycloak } from '../test/keycloakMock'

vi.mock('../auth/keycloak', async () => (await import('../test/keycloakMock')).fakeAuthModule)

describe('apiFetch', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    fakeKeycloak.login.mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls /api with a fresh bearer token and keeps the caller headers', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('employees', { headers: { Accept: 'application/json' } })

    expect(fakeKeycloak.updateToken).toHaveBeenCalledWith(30)
    const [url, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(url).toBe('/api/v1/employees')
    expect(headers.get('Authorization')).toBe('Bearer fake-access-token')
    expect(headers.get('Accept')).toBe('application/json')
    expect(fakeKeycloak.login).not.toHaveBeenCalled()
  })

  it('sends the user to the login page on 401', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))

    const response = await apiFetch('/employees')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/employees')
    expect(response.status).toBe(401)
    expect(fakeKeycloak.login).toHaveBeenCalled()
  })
})
