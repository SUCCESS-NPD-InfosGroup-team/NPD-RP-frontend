import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useProjects } from '../../hooks/useProjects'
import { Button } from '../../components/ui/Button'
import { DownloadIcon, PlusIcon } from '../../components/icons'
import { ProjectsTable } from '../../components/proyectos/ProjectsTable'
import '../../components/proyectos/ProjectsPage.css'

export function ProjectsPage() {
  const { roles } = useAuth()
  const filters = useMemo(() => ({}), [])
  const { data, summary, loading } = useProjects(filters)
  const canEdit = roles.includes('operations-administrator')

  return (
    <section className="screen projects-page">
      <header className="projects-page__header">
        <div>
          <h1 className="page-heading">Proyectos</h1>
          <p className="projects-page__subtitle">Gestiona los proyectos y sus equipos desde un solo lugar.</p>
        </div>
        <div className="projects-page__actions">
          <Button variant="secondary" icon={<DownloadIcon />}>Exportar</Button>
          {canEdit && <Button icon={<PlusIcon />}>Nuevo proyecto</Button>}
        </div>
      </header>
      <div className="projects-page__kpis">
        <Kpi label="PROYECTOS ACTIVOS" value={summary?.activeProjects} note={summary ? `de ${summary.activeClients} clientes` : '—'} />
        <Kpi label="FIN DE CONTRATO ≤ 30 DÍAS" value={summary?.contractEndingSoon} note="aviso a Sales a 30 y 15 días" danger />
        <Kpi label="SIN EQUIPO" value={summary?.withoutTeam} note="proyectos creados sin colaboradores" />
        <Kpi label="COLABORADORES SIN PROYECTO" value={summary?.unassignedPeople} note="disponibles para asignar" />
      </div>
      {loading && !data ? <div className="projects-page__empty">Cargando proyectos…</div> : <ProjectsTable projects={data?.items ?? []} canEdit={canEdit} />}
    </section>
  )
}

interface KpiProps { label: string; value?: number; note: string; danger?: boolean }
function Kpi({ label, value, note, danger = false }: Readonly<KpiProps>) {
  return <article className="projects-page__kpi"><div className="projects-page__kpi-label">{label}</div><div className={`projects-page__kpi-value${danger ? ' projects-page__kpi-value--danger' : ''}`}>{value ?? '—'}</div><div className="projects-page__kpi-note">{note}</div></article>
}
