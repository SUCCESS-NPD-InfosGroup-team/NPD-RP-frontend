import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { fakeKeycloak } from './test/keycloakMock'

vi.mock('./auth/keycloak', async () => (await import('./test/keycloakMock')).fakeAuthModule)

const routeCases = [
  ['/recursos', 'Recursos'],
  ['/arribos-proximos', 'Arribos próximos'],
  ['/tablero', 'Tablero'],
  ['/vacaciones', 'Vacaciones'],
  ['/usuarios', 'Usuarios'],
  ['/avisos', 'Avisos'],
  ['/auditoria', 'Auditoría'],
  ['/infosweb', 'Infosweb'],
] as const

function setRoles(role: unknown) {
  const roles = Array.isArray(role) ? role : role === undefined ? [] : [role]
  fakeKeycloak.authenticated = true
  fakeKeycloak.tokenParsed = {
    ...fakeKeycloak.tokenParsed,
    realm_access: { roles },
  }
}

function renderAtPath(role: unknown, path: string) {
  setRoles(role)
  window.history.replaceState(null, '', path)
  return render(<AuthProvider><App /></AuthProvider>)
}

describe('App', () => {
  it('renders the signed-in user in the shared layout', () => {
    renderAtPath('operations-administrator', '/recursos')

    expect(screen.getByRole('heading', { name: 'Recursos' })).toBeInTheDocument()
    expect(screen.getByLabelText('Perfil de Juan David Vela Coronado'))
      .toHaveTextContent('JD')
  })

  it('logs out through Keycloak and returns to the app origin', async () => {
    renderAtPath('operations-administrator', '/recursos')
    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(fakeKeycloak.logout).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    })
  })

  it('disables logout while the Keycloak request is pending', async () => {
    let resolveLogout: (() => void) | undefined
    fakeKeycloak.logout.mockImplementation(
      () => new Promise<void>((resolve) => { resolveLogout = resolve }),
    )
    renderAtPath('operations-administrator', '/recursos')
    const logoutButton = screen.getByRole('button', { name: /cerrar sesión/i })

    await userEvent.click(logoutButton)
    await userEvent.click(logoutButton)

    expect(fakeKeycloak.logout).toHaveBeenCalledOnce()
    expect(logoutButton).toBeDisabled()
    resolveLogout?.()
  })

  it('does not render the previous interface without an authenticated session', () => {
    fakeKeycloak.authenticated = false

    render(<AuthProvider><App /></AuthProvider>)

    expect(screen.queryByRole('navigation', { name: 'Navegación principal' }))
      .not.toBeInTheDocument()
  })
})

describe('App routes', () => {
  it.each(routeCases)('renders the shared layout at %s', (path, title) => {
    renderAtPath('operations-administrator', path)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegación principal' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByText(/María Pérez|161 recursos|28:41|Vista previa/))
      .not.toBeInTheDocument()
  })

  it('redirects the root route to resources', () => {
    renderAtPath('guest', '/')

    expect(screen.getByRole('heading', { name: 'Recursos' })).toBeInTheDocument()
  })

  it('does not render nonfunctional controls without connected implementations', () => {
    renderAtPath('operations-administrator', '/recursos')

    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar recurso' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it.each([
    ['guest', '/tablero'],
    ['guest', '/vacaciones'],
    ['customer-success', '/usuarios'],
    ['customer-success', '/avisos'],
    ['npd-leader', '/tablero'],
    ['npd-leader', '/auditoria'],
  ] as const)('denies direct access for %s at %s', (role, path) => {
    renderAtPath(role, path)

    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta pantalla' }))
      .toBeInTheDocument()
  })

  it.each([undefined, null, '', 'unknown-role'])(
    'denies direct access when role is absent or invalid: %s',
    (role) => {
      renderAtPath(role, '/recursos')

      expect(screen.getByRole('heading', { name: 'No tienes acceso a esta pantalla' }))
        .toBeInTheDocument()
    },
  )

  it('shows a not-found state for an unknown route', () => {
    renderAtPath('guest', '/no-existe')

    expect(screen.getByRole('heading', { name: 'Pantalla no encontrada' }))
      .toBeInTheDocument()
  })
})
