import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import { fakeKeycloak } from '../../test/keycloakMock'
import App from '../../App'
import { Header } from './Header'
import {
  canRegisterResources,
  canAccessNavigationItem,
  getNavigationForRole,
  NAVIGATION_ITEMS,
} from './roleNavigation'
import type { OperationsStatus, Role } from '../../types'

vi.mock('../../auth/keycloak', async () => (await import('../../test/keycloakMock')).fakeAuthModule)

const roleCases: Array<[Role, string[]]> = [
  [
    'operations-administrator',
    ['Recursos', 'Tablero', 'Vacaciones', 'Infosweb', 'Usuarios', 'Avisos'],
  ],
  ['guest', ['Recursos']],
  ['customer-success', ['Recursos', 'Vacaciones']],
  ['npd-leader', ['Recursos', 'Vacaciones']],
]

interface AppOptions {
  onSearchResources?: (query: string) => void
  onRegisterResource?: () => void
  onLogout?: () => void | Promise<void>
  unreadNotificationCount?: number
  displayName?: string
  operationsStatus?: OperationsStatus
}

function setAuthState(role: unknown, displayName = 'Juan David Vela Coronado') {
  const roles: unknown[] = Array.isArray(role)
    ? role
    : role === undefined || role === null
      ? []
      : [role]
  fakeKeycloak.tokenParsed = {
    preferred_username: 'juan.david',
    name: displayName,
    email: 'juan.david@example.test',
    realm_access: { roles },
  }
}

function renderForRole(role: unknown, path = '/recursos', options: AppOptions = {}) {
  const { displayName, ...appOptions } = options
  setAuthState(role, displayName)
  window.history.replaceState(null, '', path)
  return render(
    <AuthProvider>
      <App {...appOptions} />
    </AuthProvider>,
  )
}

describe('role-based navigation', () => {
  it('prevents repeated logout clicks in the shared header', async () => {
    let resolveLogout: (() => void) | undefined
    fakeKeycloak.logout.mockImplementation(
      () => new Promise<void>((resolve) => { resolveLogout = resolve }),
    )

    render(
      <AuthProvider>
        <Header />
      </AuthProvider>,
    )

    const logoutButton = screen.getByRole('button', { name: /cerrar sesión/i })
    await userEvent.click(logoutButton)

    expect(logoutButton).toBeDisabled()
    expect(fakeKeycloak.logout).toHaveBeenCalledOnce()
    resolveLogout?.()
  })

  it.each(roleCases)('shows only the permitted menu entries for %s', (role, labels) => {
    renderForRole(role)
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' })

    for (const label of labels) {
      expect(within(navigation).getByRole('link', { name: new RegExp(label) }))
        .toBeInTheDocument()
    }

    const allLabels = roleCases[0][1]
    for (const label of allLabels) {
      if (!labels.includes(label)) {
        expect(within(navigation).queryByRole('link', { name: new RegExp(label) }))
          .not.toBeInTheDocument()
      }
    }
  })

  it('shows the resource registration action to Operations administrator', () => {
    renderForRole('operations-administrator', '/recursos', {
      onRegisterResource: vi.fn(),
    })
    expect(screen.getByRole('button', { name: /Registrar recurso/ })).toBeInTheDocument()
  })

  it.each(['guest', 'customer-success', 'npd-leader'] as Role[])(
    'hides resource registration from %s',
    (role) => {
      renderForRole(role, '/recursos', { onRegisterResource: vi.fn() })
      expect(screen.queryByRole('button', { name: /Registrar recurso/ }))
        .not.toBeInTheDocument()
    },
  )

  it('calls the real resource registration handler', async () => {
    const user = userEvent.setup()
    const onRegister = vi.fn()
    renderForRole('operations-administrator', '/recursos', {
      onRegisterResource: onRegister,
    })

    await user.click(screen.getByRole('button', { name: /Registrar recurso/ }))
    expect(onRegister).toHaveBeenCalledOnce()
  })

  it('submits resource search to the supplied search handler', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    renderForRole('guest', '/recursos', { onSearchResources: onSearch })

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar recurso o N° empleado' }),
      '  Ana Pérez  ',
    )
    await user.keyboard('{Enter}')

    expect(onSearch).toHaveBeenCalledWith('Ana Pérez')
  })

  it.each(roleCases)('shows search for every role with navigation access: %s', (role) => {
    renderForRole(role)

    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Buscar recurso o N° empleado' }))
      .toHaveAttribute('placeholder', 'Buscar recurso o N° empleado')
  })

  it('does nothing when search is submitted without a handler', async () => {
    const user = userEvent.setup()
    renderForRole('guest')
    const search = screen.getByRole('searchbox', { name: 'Buscar recurso o N° empleado' })

    await user.type(search, 'Ana Pérez')
    await user.keyboard('{Enter}')

    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(search).toHaveValue('Ana Pérez')
  })

  it('shows resource registration for Operations administrator without a handler', () => {
    renderForRole('operations-administrator')

    expect(screen.getByRole('button', { name: /Registrar recurso/ }))
      .not.toBeDisabled()
  })

  it('does not render search for a role without navigation access', () => {
    renderForRole(undefined)

    expect(screen.queryByRole('search')).not.toBeInTheDocument()
  })

  it('does not invent notification or user data', () => {
    renderForRole('operations-administrator')

    expect(screen.getAllByRole('link', { name: 'Avisos' })).toHaveLength(2)
    expect(screen.queryByText('4', { selector: '.notification-count' }))
      .not.toBeInTheDocument()
  })

  it('does not show a notification badge for a real zero count', () => {
    renderForRole('operations-administrator', '/recursos', {
      unreadNotificationCount: 0,
    })

    expect(screen.queryByText('0', { selector: '.notification-count' }))
      .not.toBeInTheDocument()
  })

  it('invokes the supplied logout callback', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    renderForRole('guest', '/recursos', { onLogout })

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('shows a notification count only when unread-count data is provided', () => {
    const { rerender } = renderForRole('operations-administrator', '/recursos', {
      unreadNotificationCount: 3,
    })

    expect(screen.getByRole('link', { name: 'Avisos: 3 sin leer' }))
      .toBeInTheDocument()
    expect(screen.getByText('3', { selector: '.notification-count' }))
      .toBeInTheDocument()

    rerender(
      <AuthProvider>
        <App />
      </AuthProvider>,
    )
    expect(screen.getAllByRole('link', { name: 'Avisos' })).toHaveLength(2)
    expect(screen.queryByText('4', { selector: '.notification-count' }))
      .not.toBeInTheDocument()
  })

  it('shows supplied operations data and token profile information', () => {
    renderForRole('guest', '/recursos', {
      displayName: 'Ana Pérez',
      operationsStatus: {
        activeResources: 42,
        lastUpdatedAt: new Date('2026-10-15T10:00:00Z'),
        lastUpdatedBy: 'Ana Pérez',
      },
    })

    expect(screen.getByText('42 recursos activos')).toBeInTheDocument()
    expect(screen.getByText(/Ana Pérez/)).toBeInTheDocument()
    expect(screen.getByLabelText('Perfil de Ana Pérez')).toHaveTextContent('AP')
    expect(screen.queryByText(/161 recursos|16 clientes|28:41|María Pérez/))
      .not.toBeInTheDocument()
  })

  it('omits the operations bar when no real status data is connected', () => {
    renderForRole('guest', '/recursos', { operationsStatus: {} })

    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('marks the current menu entry as the current page', () => {
    renderForRole('guest', '/recursos')

    const currentLink = screen.getByRole('link', { name: /Recursos/ })
    expect(currentLink).toHaveAttribute('aria-current', 'page')
    expect(currentLink).toHaveClass('is-active')
  })

  it('keeps the requested presentation order for the administrator menu', () => {
    expect(getNavigationForRole('operations-administrator').map(({ label }) => label))
      .toEqual(['Recursos', 'Tablero', 'Vacaciones', 'Infosweb', 'Usuarios', 'Avisos'])
  })

  it('keeps arrivals and audit out of the top navigation in the mockup', () => {
    renderForRole('operations-administrator')

    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(navigation).queryByRole('link', { name: /Arribos próximos/ }))
      .not.toBeInTheDocument()
    expect(within(navigation).queryByRole('link', { name: /Auditoría/ }))
      .not.toBeInTheDocument()
  })

  it('places main navigation in the top bar without a side panel', () => {
    renderForRole('guest')

    expect(
      within(screen.getByRole('banner')).getByRole('navigation', {
        name: 'Navegación principal',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it.each(roleCases)('grants resource registration to %s when permitted', (role) => {
    setAuthState(role)

    function PermissionProbe() {
      const { roles } = useAuth()
      return (
        <output>
          {canRegisterResources(roles) ? 'registrable' : 'read only'}
        </output>
      )
    }

    render(<AuthProvider><PermissionProbe /></AuthProvider>)
    expect(
      screen.getByText(
        role === 'operations-administrator' ? 'registrable' : 'read only',
      ),
    ).toBeInTheDocument()
  })

  it('returns exactly the permitted navigation items for each role', () => {
    for (const [role, expectedLabels] of roleCases) {
      expect(getNavigationForRole(role).map(({ label }) => label)).toEqual(expectedLabels)
    }

    expect(NAVIGATION_ITEMS).toHaveLength(8)
    expect(canAccessNavigationItem('npd-leader', 'vacations')).toBe(true)
    expect(canAccessNavigationItem('customer-success', 'dashboard')).toBe(false)
    expect(canAccessNavigationItem('operations-administrator', 'audit')).toBe(true)
  })

  it('combines navigation permissions for multiple roles in token claims', () => {
    expect(getNavigationForRole(['guest', 'customer-success']).map(({ label }) => label))
      .toEqual(['Recursos', 'Vacaciones'])
    expect(canAccessNavigationItem(['guest', 'operations-administrator'], 'dashboard'))
      .toBe(true)
    expect(canRegisterResources(['guest', 'operations-administrator'])).toBe(true)
  })

  it.each([undefined, null, '', 'unknown-role', 'guest;admin'])(
    'fails closed for an absent or unknown role: %s',
    (role) => {
      expect(getNavigationForRole(role).map(({ label }) => label)).toEqual([])
      expect(canAccessNavigationItem(role, 'resources')).toBe(false)
      expect(canRegisterResources(role)).toBe(false)
    },
  )

  it('renders no links and denies a direct route when the role is absent', () => {
    renderForRole(undefined, '/tablero')

    expect(
      within(screen.getByRole('navigation', { name: 'Navegación principal' }))
        .queryAllByRole('link'),
    ).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta pantalla' }))
      .toBeInTheDocument()
  })

  it('does not turn a URL action parameter into registration permission', () => {
    renderForRole('guest', '/recursos?accion=registrar')

    expect(screen.getByRole('heading', { name: 'Recursos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Registrar recurso/ }))
      .not.toBeInTheDocument()
  })
})

describe('authentication context', () => {
  it('reports an explicit error when used outside its provider', () => {
    function ContextProbe() {
      useAuth()
      return null
    }

    expect(() => render(<ContextProbe />)).toThrow(
      'useAuth must be used inside <AuthProvider>',
    )
  })
})
