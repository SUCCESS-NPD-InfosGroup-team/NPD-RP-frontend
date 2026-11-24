// src/pages/Recursos/RegistrarRecursoPage.tsx
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RegisterResourceForm } from '../../components/recursos/RegisterResourceForm'
import { ProjectPickerDrawer } from '../../components/recursos/ProjectPickerDrawer'
import {
  NO_PROJECT,
  parseProjectParam,
  projectTitle,
  REGISTER_STEPS,
  registerNavigationState,
  registerResourcePath,
  type ProjectChoice,
  type ProjectParam,
  type RegisterNavigationState,
} from '../../components/recursos/registerProject'
import { Button } from '../../components/ui/Button'
import { Stepper } from '../../components/ui/Stepper'
import { AlertIcon, ChevRightIcon } from '../../components/icons'
import { getProjectsApi } from '../../services/projects'
import type { ProjectOption } from '../../services/projects.types'
import '../../components/recursos/RegisterResourcePage.css'

type ChoiceState =
  | { status: 'missing' }
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; choice: ProjectChoice }

/**
 * The project of /recursos/nuevo?proyecto=…: from the router state when step 1 just chose it, or
 * from GET /planner/projects/{id} when the page is opened or reloaded with the link.
 */
function useProjectChoice(param: ProjectParam, stated: ProjectOption | undefined): ChoiceState {
  const id = param.kind === 'project' ? param.id : undefined
  const statedMatches = Boolean(id && stated?.id === id)
  const [fetched, setFetched] = useState<{ id: string; project?: ProjectOption; failed?: boolean }>()

  useEffect(() => {
    if (!id || statedMatches) return
    let current = true
    void getProjectsApi()
      .then((api) => api.getProject(id))
      .then((project) => {
        if (current) setFetched(project.active ? { id, project } : { id, failed: true })
      })
      .catch(() => { if (current) setFetched({ id, failed: true }) })
    return () => { current = false }
  }, [id, statedMatches])

  if (param.kind === 'missing') return { status: 'missing' }
  if (param.kind === 'none') return { status: 'ready', choice: NO_PROJECT }
  if (statedMatches && stated) return { status: 'ready', choice: { kind: 'project', project: stated } }
  if (fetched?.id !== param.id) return { status: 'loading' }
  if (fetched.project) return { status: 'ready', choice: { kind: 'project', project: fetched.project } }
  return { status: 'unavailable' }
}

function Intro({ state }: Readonly<{ state: ChoiceState }>) {
  if (state.status !== 'ready') {
    return <p className="resource-form__intro">Elige el proyecto al que entra el colaborador.</p>
  }
  const required = <>Los campos con <span className="resource-form__required">*</span> son obligatorios.</>
  if (state.choice.kind === 'none') {
    return <p className="resource-form__intro">Se registra <strong>sin proyecto</strong>. {required}</p>
  }
  return <p className="resource-form__intro">Entra a <strong>{projectTitle(state.choice.project)}</strong>. {required}</p>
}

/**
 * /recursos/nuevo (HU-01, SCRUM-84): step 1 chooses the project in a drawer and step 2 fills the
 * collaborator with that project fixed. «Cambiar proyecto» reopens step 1 over the form and keeps
 * what was typed. Only the Operations administrator gets here (see AccessGuard).
 */
export function RegistrarRecursoPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [pickerOpen, setPickerOpen] = useState(false)
  const stated = (location.state as RegisterNavigationState | null)?.project
  const state = useProjectChoice(parseProjectParam(searchParams), stated)
  const backToRoster = () => navigate('/recursos')

  function choose(choice: ProjectChoice): void {
    setPickerOpen(false)
    // replace: the browser's back button leaves the registration instead of undoing the choice
    navigate(registerResourcePath(choice), { replace: true, state: registerNavigationState(choice) })
  }

  const step = state.status === 'ready' ? 1 : 0
  const currentChoice = state.status === 'ready' ? state.choice : undefined

  return (
    <div className="resource-form" style={{ padding: '20px' }}>
      <nav className="resource-form__breadcrumb" aria-label="Ruta">
        <Link to="/recursos">Recursos</Link>
        <ChevRightIcon />
        <span aria-current="page">Registrar recurso</span>
      </nav>
      <h1 className="page-heading">Registrar recurso</h1>
      <Stepper steps={REGISTER_STEPS} current={step} />
      <Intro state={state} />

      {state.status === 'loading' && <output className="resource-form__note">Cargando el proyecto…</output>}
      {state.status === 'unavailable' && (
        <div className="resource-form__summary" role="alert">
          <AlertIcon />
          <p>No se encontró el proyecto o ya no está activo. Elige otro para continuar.</p>
          <Button variant="secondary" onClick={() => setPickerOpen(true)}>Elegir proyecto</Button>
        </div>
      )}
      {state.status === 'ready' && (
        <RegisterResourceForm
          canCreateProjects
          projectChoice={state.choice}
          onChangeProject={() => setPickerOpen(true)}
          onProjectChoice={choose}
          onSaved={backToRoster}
          onCancel={backToRoster}
        />
      )}

      <ProjectPickerDrawer
        open={pickerOpen || state.status === 'missing'}
        canCreateProjects
        initialChoice={currentChoice}
        onContinue={choose}
        // Without a project there is no step 2 to go back to
        onClose={state.status === 'missing' ? backToRoster : () => setPickerOpen(false)}
      />
    </div>
  )
}

/** /recursos/:resourceId/editar (BUG-03, HU-02): same form, prefilled with GET and saved with PUT */
export const EditarRecursoPage = () => {
  const { resourceId } = useParams<{ resourceId: string }>()
  const navigate = useNavigate()
  const backToRoster = () => navigate('/recursos')

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px' }}>Editar Recurso</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Cada cambio queda en la auditoría con tu usuario, la fecha y los valores anteriores.
        </p>
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
