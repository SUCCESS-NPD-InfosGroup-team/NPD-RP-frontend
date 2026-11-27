import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Stepper } from '../ui/Stepper'
import { AlertIcon, PlusIcon, SearchIcon, XIcon } from '../icons'
import { NewProjectModal } from '../proyectos/NewProjectModal'
import { getProjectsApi } from '../../services/projects'
import type { Client, Project, ProjectOption } from '../../services/projects.types'
import {
  groupProjectsByClient,
  NO_PROJECT,
  projectOptionDetail,
  projectTitle,
  REGISTER_STEPS,
  sameChoice,
  toProjectOption,
  type ProjectChoice,
} from './registerProject'
import './ProjectPickerDrawer.css'

interface ProjectPickerDrawerProps {
  open: boolean
  canCreateProjects: boolean
  /** The choice made before, preselected when coming back with «Cambiar proyecto» */
  initialChoice?: ProjectChoice
  onContinue: (choice: ProjectChoice) => void
  onClose: () => void
}

type LoadState = 'loading' | 'ready' | 'error'

/**
 * Step 1 of «Registrar recurso» (SCRUM-84, CA-01 and CA-14): the project the collaborator joins,
 * chosen among the active projects grouped by client, a project created on the spot, or
 * «Sin proyecto por ahora».
 */
export function ProjectPickerDrawer({ open, ...props }: Readonly<ProjectPickerDrawerProps>) {
  // Mounted only while open, so every opening starts from the given choice and a fresh list
  return open ? <ProjectPickerPanel {...props} /> : null
}

function ProjectPickerPanel({ canCreateProjects, initialChoice, onContinue, onClose }: Readonly<Omit<ProjectPickerDrawerProps, 'open'>>) {
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ProjectChoice | undefined>(initialChoice)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  const loadProjects = useCallback(async () => {
    setLoadState('loading')
    try {
      setProjects(await (await getProjectsApi()).listActiveProjects())
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    const load = async () => { await loadProjects() }
    void load()
  }, [loadProjects])

  useEffect(() => {
    if (!canCreateProjects) return
    void getProjectsApi()
      .then((api) => api.listClients())
      .then(setClients)
      .catch(() => setClients([]))
  }, [canCreateProjects])

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (newProjectOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, newProjectOpen])

  function handleProjectCreated(project: Project): void {
    const option = toProjectOption(project)
    // Added to the list as it was created (active, no team yet) and selected right away
    setProjects((previous) => [...previous.filter((item) => item.id !== option.id), option])
    setSelected({ kind: 'project', project: option })
    setSearch('')
  }

  const groups = groupProjectsByClient(projects, search)
  const continueChoice = () => { if (selected) onContinue(selected) }

  return (
    <div className="project-picker__layer">
      <button className="project-picker__backdrop" type="button" tabIndex={-1} aria-hidden="true" aria-label="Cerrar" onClick={onClose} />
      <dialog open className="project-picker" aria-modal="true" aria-labelledby="project-picker-title">
        <header className="project-picker__header">
          <div>
            <h2 id="project-picker-title">Registrar recurso</h2>
            <Stepper steps={REGISTER_STEPS} current={0} />
          </div>
          <button ref={closeRef} className="project-picker__close" type="button" aria-label="Cerrar" onClick={onClose}>
            <XIcon />
          </button>
        </header>

        <div className="project-picker__body">
          <p className="project-picker__intro">
            Elige el proyecto al que entra el colaborador. Si todavía no tiene uno, regístralo sin proyecto y asígnalo
            después desde <strong>Proyectos</strong>.
          </p>

          <fieldset className="project-picker__options">
            <legend className="project-picker__sr-only">Proyecto del colaborador</legend>
            <label className={`project-picker__option${selected?.kind === 'none' ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="register-project"
                checked={selected?.kind === 'none'}
                onChange={() => setSelected(NO_PROJECT)}
              />
              <span className="project-picker__option-text">
                <strong>Sin proyecto por ahora</strong>
                <small>Aparecerá primero al agregar colaboradores a un proyecto</small>
              </span>
              <Chip tone="warn">Sin proyecto</Chip>
            </label>

            <div className="project-picker__tools">
              <label className="project-picker__search">
                <SearchIcon />
                <span className="project-picker__sr-only">Buscar cliente o proyecto</span>
                <input
                  type="search"
                  placeholder="Cliente o proyecto"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              {canCreateProjects && (
                <Button variant="secondary" icon={<PlusIcon />} onClick={() => setNewProjectOpen(true)}>Crear proyecto</Button>
              )}
            </div>

            <ProjectGroups
              loadState={loadState}
              groups={groups}
              searching={search.trim() !== ''}
              selected={selected}
              onSelect={(project) => setSelected({ kind: 'project', project })}
              onRetry={() => void loadProjects()}
            />
          </fieldset>
        </div>

        <footer className="project-picker__footer">
          <p aria-live="polite">{selectionLabel(selected)}</p>
          <div>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button disabled={!selected} onClick={continueChoice}>Continuar</Button>
          </div>
        </footer>
      </dialog>

      <NewProjectModal
        open={newProjectOpen}
        clients={clients}
        onCreated={handleProjectCreated}
        onClose={() => setNewProjectOpen(false)}
      />
    </div>
  )
}

function selectionLabel(selected: ProjectChoice | undefined): string {
  if (!selected) return 'Elige un proyecto o «Sin proyecto por ahora».'
  return selected.kind === 'none' ? 'Sin proyecto por ahora' : projectTitle(selected.project)
}

interface ProjectGroupsProps {
  loadState: LoadState
  groups: ReturnType<typeof groupProjectsByClient>
  searching: boolean
  selected: ProjectChoice | undefined
  onSelect: (project: ProjectOption) => void
  onRetry: () => void
}

function ProjectGroups({ loadState, groups, searching, selected, onSelect, onRetry }: Readonly<ProjectGroupsProps>) {
  if (loadState === 'loading') return <output className="project-picker__note">Cargando proyectos…</output>
  if (loadState === 'error') {
    return (
      <div className="project-picker__error" role="alert">
        <AlertIcon />
        <p>No se pudieron cargar los proyectos.</p>
        <Button variant="secondary" onClick={onRetry}>Reintentar</Button>
      </div>
    )
  }
  if (groups.length === 0) {
    return (
      <p className="project-picker__note">
        {searching ? 'Ningún cliente o proyecto coincide con la búsqueda.' : 'No hay proyectos activos. Usa «Crear proyecto».'}
      </p>
    )
  }
  return (
    <>
      {groups.map((group) => (
        <section key={group.client.id} className="project-picker__group" aria-label={group.client.name}>
          <h3>{group.client.name}</h3>
          {group.projects.map((project) => {
            const checked = sameChoice(selected, { kind: 'project', project })
            return (
              <label key={project.id} className={`project-picker__option${checked ? ' is-selected' : ''}`}>
                <input type="radio" name="register-project" checked={checked} onChange={() => onSelect(project)} />
                <span className="project-picker__option-text">
                  <strong>{project.name}</strong>
                  <small>{projectOptionDetail(project)}</small>
                </span>
              </label>
            )
          })}
        </section>
      ))}
    </>
  )
}
