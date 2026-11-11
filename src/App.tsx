import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import {
  canAccessNavigationItem,
  NAVIGATION_ITEMS,
} from './components/layout/roleNavigation'
import { MainLayout } from './components/layout/MainLayout'
import type { OperationsStatus } from './types'
import { ResourcesPage } from './pages/Recursos/ResourcesPage'
import { RegistrarRecursoPage } from './pages/Recursos/RegistrarRecursoPage'
import { ArribosProximosPage } from './pages/ArribosProximos/ArribosProximosPage'
import { ProjectsPage } from './pages/Proyectos/ProyectosPage'
import { UsuariosPage } from './pages/Usuarios/UsuariosPage'

export interface AppProps {
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

  if (item.id === 'resources') {
    return <ResourcesPage />
  }
  if (item.id === 'projects') {
    return <ProjectsPage />
  }
  if (item.id === 'arrivals') {
    return <ArribosProximosPage />
  }
  if (item.id === 'users') {
    return <UsuariosPage />
  }

  return (
    <section className="screen">
      <h1 className="page-heading">{item.label}</h1>
    </section>
  )
}

export default function App({
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
          {/*Route Register BUG 05*/}
          <Route path="recursos/nuevo" element={<RegistrarRecursoPage />} />
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