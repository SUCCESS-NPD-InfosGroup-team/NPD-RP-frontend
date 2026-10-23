import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { UserPlusIcon } from '../icons'
import type { Project } from '../../services/projects.types'
import { daysUntil, formatProjectDate, groupProjectsByClient } from './projectsView'

interface ProjectsTableProps { projects: Project[]; canEdit: boolean }

export function ProjectsTable({ projects, canEdit }: Readonly<ProjectsTableProps>) {
  return (
    <div className="projects-page__table">
      <div className="projects-page__row projects-page__row--head">
        <span>PROYECTO</span><span>EQUIPO</span><span>LÍDERES NPD</span><span>INICIO</span>
        <span>FIN DE CONTRATO</span><span>PENDIENTES</span><span />
      </div>
      {groupProjectsByClient(projects).map(({ client, projects: clientProjects }) => (
        <div key={client.id}>
          <div className="projects-page__group">
            <span>{client.name.toUpperCase()}</span>
            {client.isInternal && <Chip tone="info">Interno</Chip>}
            <span className="projects-page__group-meta">{clientProjects.length} proyectos · {clientProjects.reduce((sum, project) => sum + project.teamSize, 0)} colaboradores</span>
          </div>
          {clientProjects.map((project) => {
            const remaining = daysUntil(project.contractEnd)
            return (
              <div className="projects-page__row" key={project.id}>
                <strong>{project.name}</strong>
                <span>{project.teamSize ? `${project.teamSize} ` : ''}{project.teamSize ? <span className="projects-page__members">{project.members.map(({ initials }) => initials).join(' ')}</span> : <Chip tone="warn">Sin equipo</Chip>}</span>
                <span>{project.leads.length ? project.leads.join(', ') : '—'}</span>
                <span>{formatProjectDate(project.startDate)}</span>
                <span>{remaining !== null && remaining <= 30 && remaining >= 0 ? <Chip tone="solid-danger">{`D-${remaining}`}</Chip> : formatProjectDate(project.contractEnd)}</span>
                <span>{project.pendingCount || '—'}</span>
                <span>{canEdit && <Button variant="ghost" icon={<UserPlusIcon />}>Agregar colaboradores</Button>}</span>
              </div>
            )
          })}
        </div>
      ))}
      {!projects.length && <div className="projects-page__empty">No hay proyectos para mostrar.</div>}
    </div>
  )
}
