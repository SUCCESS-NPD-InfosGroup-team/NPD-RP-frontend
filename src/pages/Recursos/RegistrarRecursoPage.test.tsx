import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { AuthProvider } from '../../context/AuthContext'
import { fakeKeycloak } from '../../test/keycloakMock'
import { getResourcesApi, type ResourcesApi } from '../../services/resources'
import { getProjectsApi, type ProjectsApi } from '../../services/projects'

vi.mock('../../auth/keycloak', async () => (await import('../../test/keycloakMock')).fakeAuthModule)
vi.mock('../../services/resources', () => ({ getResourcesApi: vi.fn() }))
vi.mock('../../services/projects', () => ({ getProjectsApi: vi.fn() }))

function renderAtPath(role: string, path: string) {
  fakeKeycloak.tokenParsed = { ...fakeKeycloak.tokenParsed, realm_access: { roles: [role] } }
  window.history.replaceState(null, '', path)
  return render(<AuthProvider><App /></AuthProvider>)
}

describe('RegisterResourcePage', () => {
  beforeEach(() => {
    vi.mocked(getResourcesApi).mockResolvedValue({
      getCatalogs: vi.fn().mockRejectedValue(new Error('offline')),
      createResource: vi.fn(),
      getResource: vi.fn(),
    } as unknown as ResourcesApi)
    vi.mocked(getProjectsApi).mockResolvedValue({
      listClients: vi.fn().mockResolvedValue([]),
      listClientProjects: vi.fn().mockResolvedValue([]),
    } as unknown as ProjectsApi)
  })

  it('opens from the header button for Operations administrators', async () => {
    renderAtPath('operations-administrator', '/recursos')
    await userEvent.click(screen.getByRole('button', { name: /Registrar recurso/ }))
    expect(screen.getByRole('heading', { name: 'Registrar recurso' })).toBeInTheDocument()
    expect(await screen.findByText('No se pudieron cargar las listas del formulario.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(window.location.pathname).toBe('/recursos')
  })

  it('denies access to other roles', () => {
    renderAtPath('guest', '/recursos/nuevo')
    expect(screen.getByRole('alert')).toHaveTextContent('Solo Operations administrator puede registrar recursos.')
    expect(screen.queryByRole('button', { name: /Registrar recurso/ })).not.toBeInTheDocument()
  })

  it('confirms the new record on the resources screen', () => {
    fakeKeycloak.tokenParsed = { ...fakeKeycloak.tokenParsed, realm_access: { roles: ['operations-administrator'] } }
    window.history.replaceState({ usr: { createdResource: { id: 1102, name: 'Laura Gómez' } }, key: 'x', idx: 0 }, '', '/recursos')
    render(<AuthProvider><App /></AuthProvider>)
    expect(screen.getByRole('status')).toHaveTextContent('Se registró a Laura Gómez.')
  })
})
