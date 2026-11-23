// src/pages/Recursos/RegistrarRecursoPage.tsx
import { useNavigate, useParams } from 'react-router-dom'
import { RegisterResourceForm } from '../../components/recursos/RegisterResourceForm'

interface ResourceFormPageProps {
  title: string
  description: string
  resourceId?: string
}

/**
 * Pantalla del formulario de recurso. Registrar (HU-01) y editar (HU-02) usan el mismo
 * formulario: con `resourceId` lo precarga con GET y guarda con PUT.
 * Las rutas solo la abren para el Operations administrator (ver AccessGuard).
 */
function ResourceFormPage({ title, description, resourceId }: Readonly<ResourceFormPageProps>) {
  const navigate = useNavigate()
  const backToRoster = () => navigate('/recursos')

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px' }}>{title}</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>{description}</p>
      </div>
      <RegisterResourceForm
        canCreateProjects
        resourceId={resourceId}
        onSaved={backToRoster}
        onCancel={backToRoster}
      />
    </div>
  )
}

export const RegistrarRecursoPage = () => (
  <ResourceFormPage
    title="Registrar Recurso"
    description="Completa el formulario para añadir un nuevo colaborador al sistema."
  />
)

/** /recursos/:resourceId/editar (BUG-03, HU-02) */
export const EditarRecursoPage = () => {
  const { resourceId } = useParams<{ resourceId: string }>()
  return (
    <ResourceFormPage
      title="Editar Recurso"
      description="Cada cambio queda en la auditoría con tu usuario, la fecha y los valores anteriores."
      resourceId={resourceId}
    />
  )
}
