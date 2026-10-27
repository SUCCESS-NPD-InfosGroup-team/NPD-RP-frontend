import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ChevRightIcon } from '../../components/icons'
import { canCreateProjects, canRegisterResources } from '../../components/layout/roleNavigation'
import { RegisterResourceForm } from '../../components/recursos/RegisterResourceForm'

export interface CreatedResourceState {
  createdResource: { id: number; name: string }
}

export function RegisterResourcePage() {
  const { roles } = useAuth()
  const navigate = useNavigate()

  // Frontend checks are UX only; the API remains the authority for authorization.
  if (!canRegisterResources(roles)) {
    return (
      <section className="no-access" role="alert">
        <h1>No tienes acceso a esta pantalla</h1>
        <p>Solo Operations administrator puede registrar recursos.</p>
      </section>
    )
  }

  return (
    <section className="screen resource-form">
      <nav className="resource-form__breadcrumb" aria-label="Ruta de navegación">
        <Link to="/recursos">Recursos</Link>
        <ChevRightIcon />
        <span aria-current="page">Registrar recurso</span>
      </nav>
      <h1 className="page-heading">Registrar recurso</h1>
      <p className="resource-form__subtitle">Registra al colaborador y, si ya tiene uno, su proyecto. Los campos con * son obligatorios.</p>
      <RegisterResourceForm
        canCreateProjects={canCreateProjects(roles)}
        onCancel={() => navigate('/recursos')}
        onCreated={(resource) => navigate('/recursos', {
          state: { createdResource: { id: resource.id, name: resource.name } } satisfies CreatedResourceState,
        })}
      />
    </section>
  )
}
