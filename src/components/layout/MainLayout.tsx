import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiFetch, searchRecursos } from '../../services/api'
import { getProjectsApi } from '../../services/projects'
import {
  BellIcon,
  ChartIcon,
  EditIcon,
  FolderIcon,
  LogoutIcon,
  PlusIcon,
  PlaneIcon,
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

interface ExtendedOperationsStatus extends OperationsStatus {
  projectCount?: number
}

interface MainLayoutProps {
  onRegisterResource?: () => void
  onLogout?: () => void | Promise<void>
  unreadNotificationCount?: number
  operationsStatus?: ExtendedOperationsStatus
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
  onRegisterResource,
  onLogout,
  unreadNotificationCount,
  operationsStatus,
}: Readonly<MainLayoutProps>) {
  const { roles, user, logout, logoutInProgress } = useAuth()
  const navigate = useNavigate()
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
        {/* Sin aria-label: el nombre accesible es el texto visible «NPD Planner» (WCAG 2.5.3) */}
        <NavLink className="brand" to="/recursos">
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
          {/* TODO SCRUM-161: restore global search when resource API search is available. */}
          {canRegister && (
            <button
              className="register-resource"
              type="button"
              onClick={() => (onRegisterResource ? onRegisterResource() : navigate('/recursos/nuevo'))}
            >
              <PlusIcon />
              <span>Registrar recurso</span>
            </button>
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

function OperationsBar({ status }: Readonly<{ status?: ExtendedOperationsStatus }>) {
  const [fetchedStatus, setFetchedStatus] = useState<Partial<ExtendedOperationsStatus>>({})

  useEffect(() => {
    if (status) return
    let active = true

    const loadStatus = async () => {
      try {
        const [projectsApi, activeResPage] = await Promise.all([
          getProjectsApi(),
          searchRecursos(
            {
              search: '',
              cliente: 'Todos',
              proyecto: 'Todos',
              liderNPD: 'Todos',
              rol: 'Todos',
              nivel: '',
              estado: 'Activo',
              situacion: 'Todos',
            },
            1,
            1,
          ),
        ])

        const kpis = await projectsApi.getKpis()

        let backendMeta: Partial<ExtendedOperationsStatus> = {}
        try {
          const metaRes = await apiFetch('planner', '/operations-status')
          if (metaRes.ok) {
            const raw = (await metaRes.json()) as {
              lastUpdatedAt?: string | null
              lastUpdatedBy?: string | null
              nextNotificationAt?: string | null
            }
            backendMeta = {
              lastUpdatedAt: raw.lastUpdatedAt ? new Date(raw.lastUpdatedAt) : undefined,
              lastUpdatedBy: raw.lastUpdatedBy ?? undefined,
              nextNotificationAt: raw.nextNotificationAt ? new Date(raw.nextNotificationAt) : undefined,
            }
          }
        } catch {
          // Si el endpoint aún no existe en backend, mantiene los conteos reales
        }

        if (!active) return
        setFetchedStatus({
          activeResources: activeResPage.page.totalElements,
          projectCount: kpis.activeProjects,
          clientCount: kpis.activeClients,
          ...backendMeta,
        })
      } catch {
        // Mantiene estado por defecto sin romper la vista
      }
    }

    void loadStatus()
    return () => {
      active = false
    }
  }, [status])

  const effective = status ?? fetchedStatus

  return (
    <footer className="operations-bar" aria-label="Estado de operaciones">
      <span className="operations-status-item">
        <EditIcon />
        <span>Última actualización de datos:</span>{' '}
        <strong>
          {isValidDate(effective.lastUpdatedAt)
            ? formatDateTime(effective.lastUpdatedAt)
            : '—'}
        </strong>{' '}
        <span>por</span>{' '}
        <strong>{effective.lastUpdatedBy?.trim() || '—'}</strong>
      </span>
      <span className="operations-status-item">
        <strong>{effective.activeResources ?? '—'}</strong>{' '}
        <span>recursos activos ·</span>{' '}
        <strong>{effective.projectCount ?? '—'}</strong>{' '}
        <span>proyectos ·</span>{' '}
        <strong>{effective.clientCount ?? '—'}</strong>{' '}
        <span>clientes</span>
      </span>
      <span className="operations-status-item">
        <span>Próximo envío de avisos:</span>{' '}
        <strong>
          {isValidDate(effective.nextNotificationAt)
            ? formatDateTime(effective.nextNotificationAt)
            : '—'}
        </strong>
      </span>
    </footer>
  )
}

function formatDateTime(value: Date): string {
  if (!isValidDate(value)) {
    return '—'
  }

  const datePart = new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value)
  const timePart = new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value)

  return `${datePart} · ${timePart}`
}

function isValidDate(value?: Date): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime())
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