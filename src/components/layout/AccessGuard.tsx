import { canRegisterResources } from './roleNavigation'
import { RegistrarRecursoPage } from '../../pages/Recursos/RegistrarRecursoPage'

export function NoAccess() {
  return (
    <section className="no-access" role="alert">
      <h1>No tienes acceso a esta pantalla</h1>
      <p>Tu perfil no tiene permiso para consultar esta sección.</p>
    </section>
  )
}

/** /recursos/nuevo: solo el Operations administrator puede registrar recursos. */
export function RegisterResourceRoute({ roles }: Readonly<{ roles: readonly string[] }>) {
  return canRegisterResources(roles) ? <RegistrarRecursoPage /> : <NoAccess />
}
