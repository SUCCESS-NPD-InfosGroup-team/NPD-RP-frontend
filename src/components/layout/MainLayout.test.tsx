import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../../context/AuthProvider'
import { useAuth } from '../../context/authContext'
import App from '../../App'
import {
  canRegisterResources,
  canAccessNavigationItem,
  getNavigationForRole,
  NAVIGATION_ITEMS,
} from './roleNavigation'
import type { OperationsStatus, UserRole } from '../../types'

const roleCases: Array<[UserRole, string[]]> = [
  [
    'operations-administrator',
    ['Recursos', 'Tablero', 'Vacaciones', 'Usuarios', 'Avisos', 'Infosweb'],
  ],
  ['guest', ['Recursos']],
  ['sales-customer-success', ['Recursos', 'Vacaciones']],
  ['npd-lead', ['Recursos', 'Vacaciones']],
]

interface AppOptions {
  onSearchResources?: (query: string) => void
  onRegisterResource?: () => void
  onLogout?: () => void
  unreadNotificationCount?: number
  displayName?: string
  operationsStatus?: OperationsStatus
}

function renderForRole(role: unknown, path = '/recursos', options: AppOptions = {}) {
  window.history.replaceState(null, '', path)
  return render(<App role={role} {...options} />)
}

describe('role-based navigation', () => {
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
    const onRegister = vi.fn()
    renderForRole('operations-administrator', '/recursos', {
      onRegisterResource: onRegister,
    })
    expect(screen.getByRole('button', { name: /Registrar recurso/ })).toBeInTheDocument()
  })

  it.each([
    'guest',
    'sales-customer-success',
    'npd-lead',
  ] as UserRole[])('hides resource registration from %s', (role) => {
    renderForRole(role, '/recursos', { onRegisterResource: vi.fn() })
    expect(screen.queryByRole('button', { name: /Registrar recurso/ })).not.toBeInTheDocument()
  })

  it('calls the real resource registration handler instead of navigating to a query action', async () => {
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

    await user.type(screen.getByRole('searchbox', { name: 'Buscar recurso' }), '  Ana Pérez  ')
    await user.keyboard('{Enter}')

    expect(onSearch).toHaveBeenCalledWith('Ana Pérez')
  })

  it('does not render search when no search implementation is connected', () => {
    renderForRole('guest')

    expect(screen.queryByRole('search')).not.toBeInTheDocument()
  })

  it('invokes the supplied logout callback', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    renderForRole('guest', '/recursos', { onLogout })

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('shows a notification count only when real unread-count data is provided', () => {
    const { rerender } = renderForRole('operations-administrator', '/recursos', {
      unreadNotificationCount: 3,
    })

    expect(screen.getByRole('link', { name: 'Avisos: 3 sin leer' }))
      .toBeInTheDocument()
    expect(screen.getByText('3', { selector: '.notification-count' }))
      .toBeInTheDocument()

    rerender(<App role="operations-administrator" />)
    expect(screen.getAllByRole('link', { name: 'Avisos' })).toHaveLength(2)
    expect(screen.queryByText('4', { selector: '.notification-count' }))
      .not.toBeInTheDocument()
  })

  it('shows only supplied operations data and profile information', () => {
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

    expect(screen.getByRole('link', { name: /Recursos/ }))
      .toHaveAttribute('aria-current', 'page')
  })

  it('keeps arrivals and audit out of the top navigation in the mockup', () => {
    renderForRole('operations-administrator')

    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(navigation).queryByRole('link', { name: /Arribos próximos/ }))
      .not.toBeInTheDocument()
    expect(within(navigation).queryByRole('link', { name: /Auditoría/ }))
      .not.toBeInTheDocument()
  })

  it('places the main navigation in the top bar without a side panel', () => {
    renderForRole('guest')

    expect(
      within(screen.getByRole('banner')).getByRole('navigation', {
        name: 'Navegación principal',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it.each(roleCases)('grants resource management only to %s when appropriate', (role) => {
    function PermissionProbe() {
      const { canEditResources, canRegisterResources } = useAuth()
      const permissions = [canEditResources, canRegisterResources]
      return <output>{permissions.every(Boolean) ? 'editable and registrable' : 'read only'}</output>
    }

    render(
      <AuthProvider role={role}>
        <PermissionProbe />
      </AuthProvider>,
    )

    expect(
      screen.getByText(
        role === 'operations-administrator' ? 'editable and registrable' : 'read only',
      ),
    )
      .toBeInTheDocument()
  })

  it('returns only the role-permitted navigation items', () => {
    for (const [role, expectedLabels] of roleCases) {
      expect(getNavigationForRole(role).map(({ label }) => label)).toEqual(expectedLabels)
    }

    expect(NAVIGATION_ITEMS).toHaveLength(8)
    expect(canAccessNavigationItem('npd-lead', 'vacations')).toBe(true)
    expect(canAccessNavigationItem('sales-customer-success', 'dashboard')).toBe(false)
    expect(canAccessNavigationItem('operations-administrator', 'audit')).toBe(true)
  })

  it.each([undefined, null, '', 'unknown-role', 'guest;admin'])(
    'fails closed for an absent or unknown role: %s',
    (role) => {
      expect(getNavigationForRole(role).map(({ label }) => label)).toEqual([])
      expect(canAccessNavigationItem(role, 'resources')).toBe(false)
      expect(canRegisterResources(role)).toBe(false)
    },
  )

  it.each([
    ['operations-administrator', true],
    ['guest', false],
    ['sales-customer-success', false],
    ['npd-lead', false],
  ] as Array<[UserRole, boolean]>)(
    'shows resource registration only for %s',
    (role, permitted) => {
      expect(canRegisterResources(role)).toBe(permitted)
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
    expect(screen.queryByRole('link', { name: /Registrar recurso/ })).not.toBeInTheDocument()
  })
})

describe('authentication context', () => {
  it('reports an explicit error when used outside its provider', () => {
    function ContextProbe() {
      useAuth()
      return null
    }

    expect(() => render(<ContextProbe />)).toThrow(
      'useAuth debe usarse dentro de AuthProvider',
    )
  })
})
