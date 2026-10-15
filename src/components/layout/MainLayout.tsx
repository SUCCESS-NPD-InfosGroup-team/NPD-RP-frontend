import {
  Bell,
  BriefcaseBusiness,
  ChartColumn,
  ClipboardList,
  Clock3,
  LogOut,
  Search,
  UsersRound,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  canAccessNavigationItem,
  canRegisterResources,
  getNavigationForRole,
} from './roleNavigation'
import type { OperationsStatus } from '../../types'
import './MainLayout.css'

interface MainLayoutProps {
  onSearchResources?: (query: string) => void
  onRegisterResource?: () => void
  onLogout?: () => void | Promise<void>
  unreadNotificationCount?: number
  operationsStatus?: OperationsStatus
}

const iconById: Record<string, LucideIcon> = {
  resources: BriefcaseBusiness,
  dashboard: ChartColumn,
  vacations: Clock3,
  users: UsersRound,
  notifications: Bell,
  infosweb: ClipboardList,
}

export function MainLayout({
  onSearchResources,
  onRegisterResource,
  onLogout,
  unreadNotificationCount,
  operationsStatus,
}: Readonly<MainLayoutProps>) {
  const { roles, user, logout } = useAuth()
  const navigationItems = getNavigationForRole(roles)
  const handleLogout = onLogout ?? logout
  const canRegister = canRegisterResources(roles)

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to="/recursos" aria-label="NPD Planner, inicio">
          <span className="brand-mark" aria-hidden="true">IG</span>
          <span>NPD Planner</span>
        </NavLink>
        <nav className="header-navigation" aria-label="Navegación principal">
          <ul className="navigation-list">
            {navigationItems.map(({ id, label, path }) => {
              const Icon = iconById[id]

              return (
                <li key={id}>
                  <NavLink
                    className={({ isActive }) =>
                      `navigation-link${isActive ? ' is-active' : ''}`
                    }
                    to={path}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                    {id === 'infosweb' && (
                      <span className="development-badge">En desarrollo</span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="header-actions">
          {onSearchResources && (
            <form
              className="resource-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                const query = formData.get('query')

                if (typeof query === 'string') {
                  onSearchResources(query.trim())
                }
              }}
            >
              <label className="visually-hidden" htmlFor="resource-search">
                Buscar recurso
              </label>
              <Search aria-hidden="true" />
              <input
                id="resource-search"
                name="query"
                type="search"
                placeholder="Buscar recurso..."
              />
            </form>
          )}
          {canRegister && onRegisterResource && (
            <button
              className="register-resource"
              type="button"
              onClick={onRegisterResource}
            >
              <span aria-hidden="true">+</span>
              <span>Registrar recurso</span>
            </button>
          )}
          {canAccessNavigationItem(roles, 'notifications') && (
            <NavLink
              className="header-icon-button"
              to="/avisos"
              aria-label={getNotificationLabel(unreadNotificationCount)}
            >
              <Bell aria-hidden="true" />
              {unreadNotificationCount !== undefined && unreadNotificationCount > 0 && (
                <span className="notification-count" aria-hidden="true">
                  {unreadNotificationCount}
                </span>
              )}
            </NavLink>
          )}
          {user.fullName && (
            <span className="profile-avatar" aria-label={`Perfil de ${user.fullName}`}>
              {getInitials(user.fullName)}
            </span>
          )}
          <button
            className="header-icon-button"
            type="button"
            onClick={() => { void handleLogout() }}
            aria-label="Cerrar sesión"
          >
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      {operationsStatus && <OperationsBar status={operationsStatus} />}
    </div>
  )
}

function OperationsBar({ status }: Readonly<{ status: OperationsStatus }>) {
  const hasStatus = Object.values(status).some((value) => value !== undefined)

  if (!hasStatus) {
    return null
  }

  return (
    <footer className="operations-bar" aria-label="Estado de operaciones">
      {status.lastUpdatedAt && (
        <span>
          Última actualización: {formatDateTime(status.lastUpdatedAt)}
          {status.lastUpdatedBy && ` por ${status.lastUpdatedBy}`}
        </span>
      )}
      {status.activeResources !== undefined && (
        <span>{status.activeResources} recursos activos</span>
      )}
      {status.clientCount !== undefined && (
        <span>{status.clientCount} clientes</span>
      )}
      {status.nextNotificationAt && (
        <span>
          Próximo envío de avisos: {formatDateTime(status.nextNotificationAt)}
        </span>
      )}
      {status.sessionExpiresAt && (
        <span className="session-status">
          <Clock3 aria-hidden="true" />
          Sesión expira: {formatDateTime(status.sessionExpiresAt)}
        </span>
      )}
    </footer>
  )
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value)
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase('es'))
    .join('')
}

function getNotificationLabel(count?: number): string {
  if (count === undefined) {
    return 'Avisos'
  }

  return count === 1 ? 'Avisos: 1 sin leer' : `Avisos: ${count} sin leer`
}
