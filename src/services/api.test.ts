import { apiFetch, MAX_PAGE_SIZE, searchAllRecursos, searchRecursos } from './api'
import { fakeKeycloak } from '../test/keycloakMock'
import { buildResource, buildResourceSearchResponse } from '../test/fixtures/resourceSearch'

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

  describe('searchRecursos', () => {
    const fetchMock = vi.fn<typeof fetch>()

    beforeEach(() => {
      fetchMock.mockReset()
      vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('omits status filters when listing all resources', async () => {
      fetchMock.mockResolvedValue(new Response(
        JSON.stringify(buildResourceSearchResponse([], { totalPages: 0 })),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ))

      await searchRecursos({ search: 'Ana', estado: 'Todos' }, 1, 25)

      expect(fetchMock.mock.calls[0][0])
        .toBe('/api/v1/planner/resources?page=0&size=25&q=Ana')
    })

    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

    it('sends every screen filter to the API (BUG-01)', async () => {
      fetchMock.mockResolvedValue(ok(buildResourceSearchResponse([])))

      await searchRecursos({
        search: ' zuniga ', cliente: '3', proyecto: '41', liderNPD: '755', rol: '7', nivel: '3',
        estado: 'Activo', situacion: 'PENDIENTE_CONFIRMACION',
      }, 2, 25)

      const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
      expect(url.pathname).toBe('/api/v1/planner/resources')
      expect(Object.fromEntries(['page', 'size', 'q', 'clientId', 'projectId', 'leaderId', 'clientRoleId', 'level', 'situation']
        .map((key) => [key, url.searchParams.get(key)]))).toEqual({
        page: '1', size: '25', q: 'zuniga', clientId: '3', projectId: '41', leaderId: '755',
        clientRoleId: '7', level: '3', situation: 'PENDIENTE_CONFIRMACION',
      })
      expect(url.searchParams.getAll('status')).toEqual(['ACTIVO', 'LICENCIA'])
    })

    it('leaves out the situation and level when they are not chosen', async () => {
      fetchMock.mockResolvedValue(ok(buildResourceSearchResponse([])))

      await searchRecursos({ situacion: 'Todos', nivel: '', estado: 'Activo' })

      const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
      expect(url.searchParams.has('situation')).toBe(false)
      expect(url.searchParams.has('level')).toBe(false)
    })

    it('throws when the API fails, so the screen can show the error (BUG-02)', async () => {
      fetchMock.mockResolvedValue(new Response('{}', { status: 500 }))

      await expect(searchRecursos({ estado: 'Activo' })).rejects.toThrow('Error al buscar recursos')
    })

    it('walks every page with the largest size the API accepts (BUG-06)', async () => {
      fetchMock
        .mockResolvedValueOnce(ok(buildResourceSearchResponse([buildResource({ id: 1 })], { totalPages: 3, totalElements: 3 })))
        .mockResolvedValueOnce(ok(buildResourceSearchResponse([buildResource({ id: 2 })], { totalPages: 3, totalElements: 3 })))
        .mockResolvedValueOnce(ok(buildResourceSearchResponse([buildResource({ id: 3 })], { totalPages: 3, totalElements: 3 })))

      const items = await searchAllRecursos({ estado: 'Activo', situacion: 'SIN_PROYECTO' })

      expect(items.map((item) => item.id)).toEqual([1, 2, 3])
      const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url), 'http://localhost').searchParams)
      expect(urls.map((params) => params.get('page'))).toEqual(['0', '1', '2'])
      expect(urls.every((params) => params.get('size') === String(MAX_PAGE_SIZE))).toBe(true)
      expect(urls.every((params) => params.get('situation') === 'SIN_PROYECTO')).toBe(true)
    })

    it('makes a single request when everything fits in one page', async () => {
      fetchMock.mockResolvedValue(ok(buildResourceSearchResponse([], { totalPages: 0 })))

      await expect(searchAllRecursos({ estado: 'Todos' })).resolves.toEqual([])
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  it('calls /api/v1/{module} with a fresh bearer token and keeps the caller headers', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('planner', 'resources', { headers: { Accept: 'application/json' } })

    expect(fakeKeycloak.updateToken).toHaveBeenCalledWith(30)
    const [url, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(url).toBe('/api/v1/planner/resources')
    expect(headers.get('Authorization')).toBe('Bearer fake-access-token')
    expect(headers.get('Accept')).toBe('application/json')
    expect(fakeKeycloak.login).not.toHaveBeenCalled()
  })

  it('sends the user to the login page on 401', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))

    const response = await apiFetch('access', '/users')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/access/users')
    expect(response.status).toBe(401)
    expect(fakeKeycloak.login).toHaveBeenCalled()
  })
})
