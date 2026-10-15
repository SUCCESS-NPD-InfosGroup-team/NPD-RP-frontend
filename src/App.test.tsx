import { render, screen } from '@testing-library/react'
import App from './App'

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

function renderAtPath(role: unknown, path: string) {
  window.history.replaceState(null, '', path)
  return render(<App role={role} />)
}

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
    window.history.replaceState(null, '', '/')
    render(<App role="guest" />)

    expect(screen.getByRole('heading', { name: 'Recursos' })).toBeInTheDocument()
  })

  it('does not render nonfunctional controls without connected implementations', () => {
    renderAtPath('operations-administrator', '/recursos')

    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar recurso' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('shows an access-denied screen for a route outside the role menu', () => {
    renderAtPath('guest', '/tablero')

    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta pantalla' }))
      .toBeInTheDocument()
  })

  it.each([
    ['guest', '/tablero'],
    ['guest', '/vacaciones'],
    ['sales-customer-success', '/usuarios'],
    ['sales-customer-success', '/avisos'],
    ['npd-lead', '/tablero'],
    ['npd-lead', '/auditoria'],
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
