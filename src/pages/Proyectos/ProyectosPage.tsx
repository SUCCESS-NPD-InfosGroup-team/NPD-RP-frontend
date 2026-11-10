import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useProjects } from '../../hooks/useProjects'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Paginador } from '../../components/ui/Paginador'
import { PlusIcon } from '../../components/icons'
import { ProjectsTable } from '../../components/proyectos/ProjectsTable'
import { NewProjectModal } from '../../components/proyectos/NewProjectModal'
import type { Client } from '../../services/projects.types'
import { getResourcesApi } from '../../services/resources'
import type { CatalogItem } from '../../services/resources.types'
import { canCreateProjects } from '../../components/layout/roleNavigation'
import '../../components/proyectos/ProjectsPage.css'

export function ProjectsPage() {
  const { roles } = useAuth()
  const [clientId, setClientId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [contractEnd, setContractEnd] = useState<'any' | 'next30'>('any')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [highlightedProjectId, setHighlightedProjectId] = useState<string>()
  const [clients, setClients] = useState<Client[]>([])
  const [npdLeads, setNpdLeads] = useState<CatalogItem[]>([])
  const [npdLeadsLoading, setNpdLeadsLoading] = useState(true)
  const [npdLeadsError, setNpdLeadsError] = useState(false)
  const filters = useMemo(() => ({
    clientId: clientId || undefined,
    leadId: leadId || undefined,
    contractEnd,
    includeInactive,
  }), [clientId, leadId, contractEnd, includeInactive])
  const { data, summary, loading, error, setPage: updatePage, api, refetch } = useProjects(filters)
  // Frontend checks are UX only; the API remains the authority for authorization.
  const canEdit = canCreateProjects(roles)
  useEffect(() => {
    const reset = window.setTimeout(() => { setPage(1); updatePage(1) }, 0)
    return () => window.clearTimeout(reset)
  }, [clientId, leadId, contractEnd, includeInactive, updatePage])
  useEffect(() => {
    if (api) void api.listClients().then(setClients).catch(() => setClients([]))
  }, [api])
  useEffect(() => {
    let active = true
    void getResourcesApi()
      .then((resourcesApi) => resourcesApi.getNpdLeads())
      .then((leads) => {
        if (active) setNpdLeads(leads)
      })
      .catch(() => {
        if (active) {
          setNpdLeads([])
          setNpdLeadsError(true)
        }
      })
      .finally(() => {
        if (active) setNpdLeadsLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <section className="screen projects-page">
      <header className="projects-page__header">
        <div>
          <h1 className="page-heading">Proyectos</h1>
          <p className="projects-page__subtitle">Gestiona los proyectos y sus equipos desde un solo lugar.</p>
        </div>
        <div className="projects-page__actions">
          {/* TODO SCRUM-158: restore when the export endpoint exists. */}
          {canEdit && <Button icon={<PlusIcon />} onClick={() => setNewProjectOpen(true)}>Nuevo proyecto</Button>}
        </div>
      </header>
      <div className="projects-page__kpis">
        <Kpi label="PROYECTOS ACTIVOS" value={summary?.activeProjects} note="total de proyectos activos" />
        <Kpi label="FIN DE CONTRATO ≤ 30 DÍAS" value={summary?.contractEndingSoon} note="aviso a Sales a 30 y 15 días" danger />
        {/* TODO SCRUM-157: restore unsupported team and unassigned-resource KPIs. */}
      </div>
      <div className="projects-page__filters">
        {/* TODO SCRUM-162: restore when the projects API supports text search. */}
        <Field id="project-client" label="Cliente" type="select" value={clientId} onChange={(event) => setClientId(event.target.value)} options={[{ value: '', label: 'Todos los clientes' }, ...clients.map((client) => ({ value: client.id, label: client.name }))]} />
        <Field id="project-lead" label="Líder NPD" type="select" value={leadId} onChange={(event) => setLeadId(event.target.value)} options={[{ value: '', label: npdLeadsLoading ? 'Cargando líderes…' : 'Todos los líderes' }, ...npdLeads.map((lead) => ({ value: String(lead.id), label: lead.name }))]} state={npdLeadsError ? 'error' : 'default'} disabled={npdLeadsLoading || npdLeadsError} error={npdLeadsError ? 'No se pudieron cargar los líderes NPD.' : undefined} />
        {/* TODO SCRUM-163: restore when the API supports filtering projects without a contract end date. */}
        <Field id="project-contract" label="Fin de contrato" type="select" value={contractEnd} onChange={(event) => setContractEnd(event.target.value as typeof contractEnd)} options={[{ value: 'any', label: 'Cualquier fecha' }, { value: 'next30', label: 'Próximos 30 días' }]} />
        <label className="projects-page__checkbox">
          <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
          Incluir inactivos
        </label>
      </div>
      {loading && !data
        ? <div className="projects-page__empty">Cargando proyectos…</div>
        : error
          ? <div className="projects-page__empty projects-page__empty--error" role="alert">No se pudieron cargar los proyectos. Intenta nuevamente.</div>
          : <ProjectsTable projects={data?.items ?? []} highlightedProjectId={highlightedProjectId} />}
      {data && data.total > 0 && <Paginador range={`${(page - 1) * 25 + 1}–${Math.min(page * 25, data.total)} de ${data.total}`} page={page} totalPages={data.totalPages ?? Math.ceil(data.total / 25)} onPageChange={(nextPage) => { setPage(nextPage); updatePage(nextPage) }} />}
      <NewProjectModal open={newProjectOpen} clients={clients} onCreated={() => void refetch()} onDuplicateProject={setHighlightedProjectId} onClose={() => setNewProjectOpen(false)} />
    </section>
  )
}

interface KpiProps { label: string; value?: number; note: string; danger?: boolean }
function Kpi({ label, value, note, danger = false }: Readonly<KpiProps>) {
  return <article className="projects-page__kpi"><div className="projects-page__kpi-label">{label}</div><div className={`projects-page__kpi-value${danger ? ' projects-page__kpi-value--danger' : ''}`}>{value ?? '—'}</div><div className="projects-page__kpi-note">{note}</div></article>
}
