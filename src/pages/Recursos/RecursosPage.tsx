import { useLocation } from 'react-router-dom'
import type { CreatedResourceState } from './RegistrarRecursoPage'
import '../../components/recursos/RegisterResourcePage.css'

export function ResourcesPage() {
  const location = useLocation()
  const created = (location.state as Partial<CreatedResourceState> | null)?.createdResource

  return (
    <section className="screen">
      <h1 className="page-heading">Recursos</h1>
      {created && (
        <p className="resources-page__notice" role="status">Se registró a {created.name}.</p>
      )}
    </section>
  )
}
