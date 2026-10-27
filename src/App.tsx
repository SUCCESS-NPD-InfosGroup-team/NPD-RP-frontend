import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import {
  canAccessNavigationItem,
  NAVIGATION_ITEMS,
} from './components/layout/roleNavigation'
import { MainLayout } from './components/layout/MainLayout'
import type { OperationsStatus } from './types'
// 1. Importamos tu página (¡Ojo con la "s"!)
import { ResourcesPage } from './pages/Recursos/ResourcesPage'

export interface AppProps {
  onSearchResources?: (query: string) => void
  onRegisterResource?: () => void
  onLogout?: () => void | Promise<void>
  unreadNotificationCount?: number
  operationsStatus?: OperationsStatus
}

interface ScreenProps {
  roles: readonly string[]
  item: (typeof NAVIGATION_ITEMS)[number]
}

function Screen({ roles, item }: Readonly<ScreenProps>) {
  if (!canAccessNavigationItem(roles, item.id)) {
    return (
      <section className="no-access" role="alert">
        <h1>No tienes acceso a esta pantalla</h1>
        <p>Tu perfil no tiene permiso para consultar esta sección.</p>
      </section>
    )
  }

  // 2. LA MAGIA: Si la sección es "Recursos", renderizamos tu tabla
  if (item.label === 'Recursos') {
    return <ResourcesPage />
  }

  return (
    <section className="screen">
      <h1 className="page-heading">{item.label}</h1>
    </section>
  )
}

export default function App({
  onSearchResources,
  onRegisterResource,
  onLogout,
  unreadNotificationCount,
  operationsStatus,
}: Readonly<AppProps>) {
  const { roles, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return null
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <MainLayout
              onSearchResources={onSearchResources}
              onRegisterResource={onRegisterResource}
              onLogout={onLogout}
              unreadNotificationCount={unreadNotificationCount}
              operationsStatus={operationsStatus}
            />
          }
        >
          <Route index element={<Navigate to="/recursos" replace />} />
          {NAVIGATION_ITEMS.map((item) => (
            <Route
              key={item.id}
              path={item.path.slice(1)}
              element={<Screen roles={roles} item={item} />}
            />
          ))}
          <Route
            path="*"
            element={
              <section className="no-access">
                <h1>Pantalla no encontrada</h1>
                <p>La dirección solicitada no corresponde a una pantalla disponible.</p>
              </section>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}