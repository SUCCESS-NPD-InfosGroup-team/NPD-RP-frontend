import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  BellIcon,
  ChartIcon,
  ClockIcon,
  EditIcon,
  FolderIcon,
  LogoutIcon,
  PlusIcon,
  PlaneIcon,
  SearchIcon,
  ShieldIcon,
  SunIcon,
  SyncIcon,
} from '../icons'
import {
  canAccessNavigationItem,
  canRegisterResources,
  getNavigationForRole,
} from './roleNavigation'
import type { NavigationItemId } from './roleNavigation'
import type { OperationsStatus } from '../../types'
import './MainLayout.css'

interface MainLayoutProps {
  onSearchResources?: (query: string) => void
  onRegisterResource?: () => void
  onLogout?: () => void | Promise<void>
  unreadNotificationCount?: number
  operationsStatus?: OperationsStatus
}

const iconById: Record<NavigationItemId, ComponentType> = {
  resources: PlaneIcon,
  projects: FolderIcon,
  arrivals: PlaneIcon,
  dashboard: ChartIcon,
  vacations: SunIcon,
  users: ShieldIcon,
  notifications: BellIcon,
  audit: ShieldIcon,
  infosweb: SyncIcon,
}

export function MainLayout({
  onSearchResources,
  onRegisterResource,
  onLogout,
  unreadNotificationCount,
  operationsStatus,
}: Readonly<MainLayoutProps>) {
  const { roles, user, logout, logoutInProgress } = useAuth()
  const [providedLogoutInProgress, setProvidedLogoutInProgress] = useState(false)
  const navigationItems = getNavigationForRole(roles)
  const handleLogout = onLogout ?? logout
  const isLogoutInProgress = logoutInProgress || providedLogoutInProgress
  const canRegister = canRegisterResources(roles)

  async function handleLogoutClick(): Promise<void> {
    if (isLogoutInProgress) {
      return
    }

    if (onLogout) {
      setProvidedLogoutInProgress(true)
      try {
        await handleLogout()
      } finally {
        setProvidedLogoutInProgress(false)
      }
      return
    }

    await handleLogout()
  }

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
          {navigationItems.length > 0 && (
            <form
              className="resource-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                const query = formData.get('query')

                if (typeof query === 'string' && onSearchResources) {
                  onSearchResources(query.trim())
                }
              }}
            >
              <label className="visually-hidden" htmlFor="resource-search">
                Buscar recurso o N° empleado
              </label>
              <SearchIcon />
              <input
                id="resource-search"
                name="query"
                type="search"
                placeholder="Buscar recurso o N° empleado"
              />
            </form>
          )}
          {canRegister && (
            <>
              {/* TODO: Connect resource registration to its feature flow. */}
              <button
                className="register-resource"
                type="button"
                onClick={() => onRegisterResource?.()}
              >
                <PlusIcon />
                <span>Registrar recurso</span>
              </button>
            </>
          )}
          {canAccessNavigationItem(roles, 'notifications') && (
            <NavLink
              className="header-icon-button"
              to="/avisos"
              aria-label={getNotificationLabel(unreadNotificationCount)}
            >
              <BellIcon />
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
            onClick={() => { void handleLogoutClick() }}
            aria-label="Cerrar sesión"
            disabled={isLogoutInProgress}
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      <OperationsBar status={operationsStatus} />
    </div>
  )
}

function OperationsBar({ status }: Readonly<{ status?: OperationsStatus }>) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!isValidDate(status?.sessionExpiresAt)) {
      return
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [status?.sessionExpiresAt])

  return (
    <footer className="operations-bar" aria-label="Estado de operaciones">
      <span className="operations-status-item">
        <EditIcon />
        <span>Última actualización de datos:</span>{' '}
        <strong>
          {isValidDate(status?.lastUpdatedAt)
            ? formatDateTime(status.lastUpdatedAt)
            : '—'}
        </strong>{' '}
        <span>por</span>{' '}
        <strong>{status?.lastUpdatedBy?.trim() || '—'}</strong>
      </span>
      <span className="operations-status-item">
        <strong>{status?.activeResources ?? '—'}</strong>
        {' '}
        <span>recursos activos ·</span>{' '}
        <strong>{status?.clientCount ?? '—'}</strong>{' '}
        <span>clientes</span>
      </span>
      <span className="operations-status-item">
        <span>Próximo envío de avisos:</span>{' '}
        <strong>
          {isValidDate(status?.nextNotificationAt)
            ? formatDateTime(status.nextNotificationAt)
            : '—'}
        </strong>
      </span>
      <span className="session-status">
        <ClockIcon />
        <span>La sesión expira en</span>{' '}
        <strong>
          {isValidDate(status?.sessionExpiresAt)
            ? formatSessionTime(status.sessionExpiresAt, now)
            : '—'}
        </strong>{' '}
        <span>sin actividad</span>
      </span>
    </footer>
  )
}

function formatDateTime(value: Date): string {
  if (!isValidDate(value)) {
    return '—'
  }

  return new Intl.DateTimeFormat('es', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value)
}

function isValidDate(value?: Date): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function formatSessionTime(expiresAt: Date, now: number): string {
  const totalSeconds = Math.floor(Math.max(0, expiresAt.getTime() - now) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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
