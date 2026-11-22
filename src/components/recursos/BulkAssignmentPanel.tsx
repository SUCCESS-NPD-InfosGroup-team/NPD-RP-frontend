import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { getProjectsApi } from '../../services/projects'
import type { Client, ClientProject, Project } from '../../services/projects.types'
import { formatShortDate } from '../../utils/dates'
import { useBulkAssign, type BulkAssignProject } from '../../hooks/useBulkAssign'
import { BulkAssignmentDataStep } from './BulkAssignmentDataStep'
import { NewProjectModal } from '../proyectos/NewProjectModal'
import { Button } from '../ui/Button'
import './BulkAssignmentPanel.css'

type BulkAssignmentController = ReturnType<typeof useBulkAssign>

interface BulkAssignmentPanelProps {
  open: boolean
  assignment: BulkAssignmentController
  onClose: () => void
}

interface ProjectGroup {
  client: Client
  projects: ClientProject[]
}

export function BulkAssignmentPanel({
  open,
  assignment,
  onClose,
}: Readonly<BulkAssignmentPanelProps>) {
  const [clients, setClients] = useState<Client[]>([])
  const [projectsByClient, setProjectsByClient] = useState<Map<string, ClientProject[]>>(() => new Map())
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<BulkAssignProject | null>(null)
  const [projectSelectionError, setProjectSelectionError] = useState('')
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const createProjectButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const clientsCache = useRef<Client[] | null>(null)
  const projectCache = useRef(new Map<string, ClientProject[]>())
  const loadingRef = useRef(false)
  const newProjectOpenRef = useRef(newProjectOpen)

  useEffect(() => {
    newProjectOpenRef.current = newProjectOpen
  }, [newProjectOpen])

  const loadProjects = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoadingProjects(true)
    setProjectsError('')
    try {
      const api = await getProjectsApi()
      let availableClients = clientsCache.current
      if (availableClients === null) {
        availableClients = await api.listClients()
        clientsCache.current = availableClients
        setClients(availableClients)
      }

      const uncachedClients = availableClients.filter((client) => !projectCache.current.has(client.id))
      await Promise.all(uncachedClients.map(async (client) => {
        const projects = await api.listClientProjects(client.id)
        projectCache.current.set(client.id, projects)
        setProjectsByClient(new Map(projectCache.current))
      }))
    } catch {
      setProjectsError('No se pudieron cargar los proyectos. Intenta de nuevo.')
    } finally {
      loadingRef.current = false
      setLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    if (open && assignment.step === 'project' && clientsCache.current === null) {
      void loadProjects()
    }
  }, [assignment.step, loadProjects, open])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (newProjectOpenRef.current || !dialogRef.current) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose, open])

  const groups = useMemo<ProjectGroup[]>(() => clients.map((client) => ({
    client,
    projects: (projectsByClient.get(client.id) ?? []).filter((project) => {
      const query = projectSearch.trim().toLocaleLowerCase()
      return !query || `${client.name} ${project.name}`.toLocaleLowerCase().includes(query)
    }),
  })).filter((group) => group.projects.length > 0), [clients, projectSearch, projectsByClient])
  const hasProjects = clients.some((client) => (projectsByClient.get(client.id)?.length ?? 0) > 0)

  function chooseProject(client: Client, project: ClientProject): void {
    const id = Number(project.id)
    const clientId = Number(client.id)
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(clientId) || clientId <= 0) {
      setProjectSelectionError('El proyecto no tiene un identificador válido. Recarga la lista e inténtalo de nuevo.')
      return
    }
    setSelectedProject({
      id,
      name: project.name,
      client: { id: clientId, name: client.name },
      teamSize: project.teamSize,
      contractEndDate: project.contractEndDate,
    })
    setProjectSelectionError('')
  }

  function handleCreated(project: Project): void {
    const projectId = Number(project.id)
    const clientId = Number(project.client.id)
    if (!Number.isSafeInteger(projectId) || projectId <= 0 || !Number.isSafeInteger(clientId) || clientId <= 0) {
      setProjectSelectionError('El proyecto creado no tiene un identificador válido.')
      return
    }

    const client: Client = { ...project.client, active: true }
    const nextClients = clientsCache.current ?? clients
    if (!nextClients.some((item) => item.id === client.id)) {
      const updatedClients = [...nextClients, client]
      if (clientsCache.current !== null) clientsCache.current = updatedClients
      setClients(updatedClients)
    }
    const clientProjects = projectCache.current.get(client.id) ?? []
    const nextProjects = clientProjects.some((item) => item.id === project.id)
      ? clientProjects
      : [...clientProjects, {
        id: project.id,
        name: project.name,
        teamSize: project.teamSize,
        contractEndDate: project.contractEnd,
      }]
    projectCache.current.set(client.id, nextProjects)
    setProjectsByClient(new Map(projectCache.current))
    setProjectSearch('')
    setNewProjectOpen(false)
  }

  function continueToAssignment(): void {
    if (!selectedProject) {
      setProjectSelectionError('Elige un proyecto para continuar.')
      return
    }
    assignment.chooseProject(selectedProject)
  }

  if (!open) return null

  const isProjectStep = assignment.step === 'project'
  const visibleProjectCount = groups.reduce((count, group) => count + group.projects.length, 0)

  return (
    <div className="bulk-assignment-panel__layer">
      <button
        className="bulk-assignment-panel__backdrop"
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        aria-label="Cerrar asignación"
        onClick={onClose}
      />
      <dialog
        ref={dialogRef}
        className="bulk-assignment-panel"
        open
        aria-modal="true"
        aria-labelledby="bulk-assignment-title"
        tabIndex={-1}
      >
        <header className="bulk-assignment-panel__header">
          <div>
            <h2 id="bulk-assignment-title">Asignar a proyecto</h2>
            <ol className="bulk-assignment-panel__steps" aria-label="Pasos de la asignación">
              <li aria-current={isProjectStep ? 'step' : undefined} className={isProjectStep ? 'is-current' : ''}>
                1 · Proyecto
              </li>
              <li aria-current={!isProjectStep ? 'step' : undefined} className={!isProjectStep ? 'is-current' : ''}>
                2 · Datos de la asignación
              </li>
            </ol>
          </div>
          <button
            ref={closeButtonRef}
            className="bulk-assignment-panel__close"
            type="button"
            aria-label="Cerrar asignación"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <main className="bulk-assignment-panel__body">
          {isProjectStep ? (
            <>
              <div className="bulk-assignment-panel__people">
                <strong>Colaboradores ({assignment.selectedCount})</strong>
                {assignment.selectedPeople.map((person) => (
                  <span className="bulk-assignment-panel__person-chip" key={person.employeeId}>{person.name}</span>
                ))}
              </div>

              <div className="bulk-assignment-panel__project-toolbar">
                <label className="bulk-assignment-panel__search">
                  <Search aria-hidden="true" />
                  <span className="visually-hidden">Buscar proyecto</span>
                  <input
                    type="search"
                    placeholder="Cliente o proyecto"
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                  />
                </label>
                <Button
                  ref={createProjectButtonRef}
                  variant="secondary"
                  onClick={() => setNewProjectOpen(true)}
                >
                  + Crear proyecto
                </Button>
              </div>

              {loadingProjects && (
                <p className="bulk-assignment-panel__loading" role="status">Cargando proyectos…</p>
              )}
              {projectsError && (
                <div className="bulk-assignment-panel__error" role="alert">
                  <span>{projectsError}</span>
                  <Button variant="secondary" onClick={() => void loadProjects()}>Reintentar</Button>
                </div>
              )}
              {projectSelectionError && <p className="bulk-assignment-panel__error-text" role="alert">{projectSelectionError}</p>}

              {!loadingProjects && !projectsError && !hasProjects && (
                <p className="bulk-assignment-panel__empty">
                  {clients.length ? 'No hay proyectos activos disponibles.' : 'No hay clientes activos disponibles.'}
                </p>
              )}
              {!loadingProjects && hasProjects && visibleProjectCount === 0 && (
                <p className="bulk-assignment-panel__empty">No hay proyectos que coincidan con la búsqueda.</p>
              )}

              <div className="bulk-assignment-panel__project-list" aria-label="Proyectos disponibles">
                {groups.map(({ client, projects }) => (
                  <section className="bulk-assignment-panel__project-group" key={client.id}>
                    <h3>{client.name}</h3>
                    {projects.map((project) => {
                      const projectId = Number(project.id)
                      const selected = selectedProject?.id === projectId
                      return (
                        <label
                          className={`bulk-assignment-panel__project-option${selected ? ' is-selected' : ''}`}
                          key={project.id}
                        >
                          <input
                            type="radio"
                            name="bulk-assignment-project"
                            value={project.id}
                            checked={selected}
                            onChange={() => chooseProject(client, project)}
                          />
                          <span>
                            <strong>{project.name}</strong>
                            <small>
                              {project.teamSize} colaboradores
                              {' · '}
                              {project.contractEndDate
                                ? `fin de contrato ${formatShortDate(project.contractEndDate, true)}`
                                : 'sin fecha de fin de contrato'}
                            </small>
                          </span>
                        </label>
                      )
                    })}
                  </section>
                ))}
              </div>
            </>
          ) : <BulkAssignmentDataStep assignment={assignment} />}
        </main>

        <footer className="bulk-assignment-panel__footer">
          <p aria-live="polite">
            {isProjectStep ? (selectedProject ? `Proyecto: ${selectedProject.name}` : 'Elige un proyecto') : ''}
          </p>
          {isProjectStep ? (
            <div className="bulk-assignment-panel__footer-actions">
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button onClick={continueToAssignment} disabled={!selectedProject}>Continuar</Button>
            </div>
          ) : (
            <div className="bulk-assignment-panel__footer-actions">
              <Button variant="secondary" onClick={assignment.backToProjectStep}>Atrás</Button>
            </div>
          )}
        </footer>
      </dialog>

      <NewProjectModal
        open={newProjectOpen}
        clients={clients}
        onCreated={handleCreated}
        onClose={() => {
          setNewProjectOpen(false)
          createProjectButtonRef.current?.focus()
        }}
      />
    </div>
  )
}
