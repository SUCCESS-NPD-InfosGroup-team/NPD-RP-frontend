import { RotateCcw, UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Chip } from '../ui/Chip'
import { Button } from '../ui/Button'
import type { Project } from '../../services/projects.types'
import { formatProjectDate, groupProjectsByClient } from './projectsView'

interface ProjectsTableProps {
  projects: Project[]
  highlightedProjectId?: string
  canManageProjects?: boolean
}

function contractEndCell(remaining: number | null | undefined, contractEnd: string | null) {
  if (remaining === null || remaining === undefined || remaining > 30) return formatProjectDate(contractEnd)
  if (remaining < 0) return <Chip tone="solid-danger">Vencido</Chip>
  return <Chip tone="solid-danger">{`D-${remaining}`}</Chip>
}

export function ProjectsTable({
  projects,
  highlightedProjectId,
  canManageProjects = false,
}: Readonly<ProjectsTableProps>) {
  return (
    <div className="projects-page__table" role="table" aria-label="Proyectos por cliente">
      <div className="projects-page__row projects-page__row--head" role="row">
        <span role="columnheader">PROYECTO</span><span role="columnheader">EQUIPO</span>
        <span role="columnheader">LÍDERES NPD</span><span role="columnheader">INICIO</span>
        <span role="columnheader">FIN DE CONTRATO</span><span role="columnheader">PENDIENTES</span>
        <span role="columnheader" aria-label="Acciones" />
      </div>
      {groupProjectsByClient(projects).map(({ client, projects: clientProjects }) => (
        <div key={client.id} role="rowgroup">
          <div className="projects-page__group">
            <span>{client.name.toUpperCase()}</span>
            {client.isInternal && <Chip tone="info">Interno</Chip>}
            <span className="projects-page__group-meta">
              {clientProjects.length} {clientProjects.length === 1 ? 'proyecto' : 'proyectos'} ·{' '}
              {clientProjects.reduce((sum, project) => sum + project.teamSize, 0)} colaboradores
            </span>
          </div>
          {clientProjects.map((project) => {
            const remaining = project.daysToContractEnd
            return (
              <div
                className={[
                  'projects-page__row',
                  project.id === highlightedProjectId ? 'projects-page__row--highlighted' : '',
                  !project.active ? 'projects-page__row--inactive' : '',
                ].filter(Boolean).join(' ')}
                key={project.id}
                role="row"
              >
                <Link
                  className="projects-page__project-name projects-page__project-link"
                  to={`/proyectos/${encodeURIComponent(project.id)}`}
                >
                  {project.name}
                  {!project.active && <Chip>Inactivo</Chip>}
                </Link>
                <span>
                  {project.teamSize
                    ? <strong>{project.teamSize}</strong>
                    : <Chip tone="warn">Sin equipo</Chip>}
                  {/* TODO SCRUM-169: restore member initials when the API provides them. */}
                </span>
                <span>{project.leads.length ? project.leads.join(', ') : '—'}</span>
                <span>{formatProjectDate(project.startDate)}</span>
                <span>{contractEndCell(remaining, project.contractEnd)}</span>
                <span>
                  {project.pendingCount > 0
                    ? <Chip tone="solid-danger">{`${project.pendingCount} por confirmar`}</Chip>
                    : '—'}
                </span>
                <span className="projects-page__row-actions">
                  {canManageProjects && (
                    <Button
                      variant="ghost"
                      className="projects-page__row-action"
                      icon={project.active ? <UserRoundPlus /> : <RotateCcw />}
                      disabled
                      title={project.active
                        ? 'La asignación estará disponible cuando exista el endpoint del backend.'
                        : 'La reactivación estará disponible cuando exista el endpoint del backend.'}
                      aria-label={project.active
                        ? `Agregar colaboradores a ${project.name} (no disponible todavía)`
                        : `Reactivar ${project.name} (no disponible todavía)`}
                    >
                      {project.active ? 'Agregar colaboradores' : 'Reactivar'}
                    </Button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      ))}
      {!projects.length && <div className="projects-page__empty">No hay proyectos que coincidan con los filtros.</div>}
    </div>
  )
}
