import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useProjects } from '../../hooks/useProjects'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Paginador } from '../../components/ui/Paginador'
import { PlusIcon } from '../../components/icons'
import { ProjectsTable } from '../../components/proyectos/ProjectsTable'
import { NewProjectModal } from '../../components/proyectos/NewProjectModal'
import { ProjectExportModal } from '../../components/proyectos/ProjectExportModal'
import type { Client, Project } from '../../services/projects.types'
import { getProjectsApi } from '../../services/projects'
import { getResourcesApi } from '../../services/resources'
import type { CatalogItem } from '../../services/resources.types'
import { canCreateProjects } from '../../components/layout/roleNavigation'
import {
  downloadSpreadsheet,
  fetchAllPages,
  spreadsheetFileName,
  type SpreadsheetExportFormat,
} from '../../utils/spreadsheetExport'
import '../../components/proyectos/ProjectsPage.css'

export function ProjectsPage() {
  const { roles } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<SpreadsheetExportFormat>('xlsx')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [clientId, setClientId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [contractEnd, setContractEnd] = useState<'any' | 'next30' | 'none'>('any')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [highlightedProjectId, setHighlightedProjectId] = useState<string>()
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientsError, setClientsError] = useState(false)
  const [clientsRetry, setClientsRetry] = useState(0)
  const [npdLeads, setNpdLeads] = useState<CatalogItem[]>([])
  const [npdLeadsLoading, setNpdLeadsLoading] = useState(true)
  const [npdLeadsError, setNpdLeadsError] = useState(false)
  const [npdLeadsRetry, setNpdLeadsRetry] = useState(0)
  const filters = useMemo(() => ({
    search: search || undefined,
    clientId: clientId || undefined,
    leadId: leadId || undefined,
    contractEnd,
    includeInactive,
  }), [search, clientId, leadId, contractEnd, includeInactive])
  const {
    data,
    summary,
    loading,
    error,
    setPage: updatePage,
    api,
    refetch,
  } = useProjects(filters)
  const canManageProjects = canCreateProjects(roles)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      if (nextSearch === search) return
      setSearch(nextSearch)
      setPage(1)
      updatePage(1)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [searchInput, search, updatePage])

  useEffect(() => {
    if (!api) return
    let active = true
    void api.listClients()
      .then((result) => {
        if (active) setClients(result)
      })
      .catch(() => {
        if (active) {
          setClients([])
          setClientsError(true)
        }
      })
      .finally(() => {
        if (active) setClientsLoading(false)
      })
    return () => { active = false }
  }, [api, clientsRetry])

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
  }, [npdLeadsRetry])

  function resetToFirstPage(): void {
    setPage(1)
    updatePage(1)
  }

  function retryClients(): void {
    setClientsLoading(true)
    setClientsError(false)
    setClientsRetry((attempt) => attempt + 1)
  }

  function retryNpdLeads(): void {
    setNpdLeadsLoading(true)
    setNpdLeadsError(false)
    setNpdLeadsRetry((attempt) => attempt + 1)
  }

  const activeFilters = [
    search ? `Buscar: ${search}` : '',
    clientId ? `Cliente: ${clients.find((client) => client.id === clientId)?.name ?? clientId}` : '',
    leadId ? `Líder NPD: ${npdLeads.find((lead) => String(lead.id) === leadId)?.name ?? leadId}` : '',
    contractEnd === 'next30' ? 'Fin de contrato: próximos 30 días' : '',
    contractEnd === 'none' ? 'Sin fin de contrato' : '',
    includeInactive ? 'Incluye inactivos' : '',
  ].filter(Boolean).join(' · ')

  const projectCount = data?.total ?? 0
  const clientCount = summary?.activeClients ?? 0
  const pageSize = data?.pageSize ?? 25
  const range = projectCount > 0
    ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, projectCount)} de ${projectCount}`
    : '0 de 0'

  function openExportDialog(): void {
    setExportFormat('xlsx')
    setExportError('')
    setExportDialogOpen(true)
  }

  async function handleExport(): Promise<void> {
    if (!data?.total || exporting) return

    setExporting(true)
    setExportError('')
    try {
      const projectsApi = api ?? await getProjectsApi()
      const projects = await fetchAllPages(async (requestedPage) => {
        const result = await projectsApi.listProjects(filters, requestedPage)
        return {
          items: result.items,
          totalPages: result.totalPages ?? Math.ceil(result.total / result.pageSize),
        }
      })
      const rows = projects.map((project) => ({
        Cliente: project.client.name,
        Proyecto: project.name,
        Equipo: project.teamSize,
        'Líderes NPD': project.leads.join(', '),
        Inicio: project.startDate,
        'Fin de contrato': project.contractEnd ?? '',
        Pendientes: project.pendingCount,
        'Próximo fin de asignación': project.nextAssignmentEnd ?? '',
        Estado: project.active ? 'Activo' : 'Inactivo',
      }))
      await downloadSpreadsheet(
        rows,
        spreadsheetFileName('Proyectos', new Date(), exportFormat),
        'Proyectos',
        exportFormat,
      )
      setExportDialogOpen(false)
    } catch {
      setExportError('No se pudieron exportar los proyectos. Intenta de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  function handleProjectCreated(project: Project): void {
    setClients((current) => current.some((client) => client.id === project.client.id)
      ? current
      : [...current, { ...project.client, active: true }])
    setHighlightedProjectId(project.id)
    void refetch()
  }

  const subtitle = data
    ? `${projectCount} ${projectCount === 1 ? 'proyecto' : 'proyectos'} ${includeInactive ? '' : 'activos '}de ${clientCount} ${clientCount === 1 ? 'cliente' : 'clientes'}. Cada colaborador está en un solo proyecto; desde aquí armas y ajustas cada equipo.`
    : 'Cargando proyectos…'

  return (
    <section className="screen projects-page">
      <header className="projects-page__header">
        <div>
          <h1 className="page-heading">Proyectos</h1>
          <p className="projects-page__subtitle">{subtitle}</p>
        </div>
        <div className="projects-page__actions">
          <Button
            variant="secondary"
            icon={<Download />}
            disabled={loading || exporting || !projectCount}
            onClick={openExportDialog}
          >
            Exportar
          </Button>
          {canManageProjects && (
            <Button icon={<PlusIcon />} onClick={() => setNewProjectOpen(true)}>Nuevo proyecto</Button>
          )}
        </div>
      </header>

      <div className="projects-page__kpis">
        <Kpi
          label="PROYECTOS ACTIVOS"
          value={summary?.activeProjects}
          note={`de ${summary?.activeClients ?? 0} clientes`}
        />
        <Kpi
          label="FIN DE CONTRATO ≤ 30 DÍAS"
          value={summary?.contractEndingSoon}
          note="aviso a Sales a 30 y 15 días"
          danger
        />
        <Kpi
          label="SIN EQUIPO"
          value={summary?.withoutTeam}
          note="proyectos creados sin colaboradores"
        />
        <Kpi
          label="COLABORADORES SIN PROYECTO"
          value={summary?.unassignedPeople}
          note="disponibles para asignar"
        />
      </div>

      <div className="projects-page__filters">
        <label className="projects-page__search" htmlFor="project-search">
          <span>Buscar</span>
          <span className="projects-page__search-control">
            <Search aria-hidden="true" />
            <input
              id="project-search"
              type="search"
              value={searchInput}
              maxLength={150}
              placeholder="Cliente o proyecto..."
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </span>
        </label>
        <Field
          id="project-client"
          label="Cliente"
          type="select"
          value={clientId}
          onChange={(event) => {
            setClientId(event.target.value)
            resetToFirstPage()
          }}
          options={[{ value: '', label: 'Todos' }, ...clients.map((client) => ({ value: client.id, label: client.name }))]}
          disabled={clientsLoading || clientsError}
        />
        <Field
          id="project-lead"
          label="Líder NPD"
          type="select"
          value={leadId}
          onChange={(event) => {
            setLeadId(event.target.value)
            resetToFirstPage()
          }}
          options={[{ value: '', label: npdLeadsLoading ? 'Cargando líderes…' : 'Todos' }, ...npdLeads.map((lead) => ({ value: String(lead.id), label: lead.name }))]}
          state={npdLeadsError ? 'error' : 'default'}
          disabled={npdLeadsLoading || npdLeadsError}
          error={npdLeadsError ? 'No se pudieron cargar los líderes NPD.' : undefined}
        />
        <Field
          id="project-contract"
          label="Fin de contrato"
          type="select"
          value={contractEnd}
          onChange={(event) => {
            setContractEnd(event.target.value as typeof contractEnd)
            resetToFirstPage()
          }}
          options={[
            { value: 'any', label: 'Cualquier fecha' },
            { value: 'next30', label: 'Próximos 30 días' },
            { value: 'none', label: 'Sin fecha' },
          ]}
        />
        <label className="projects-page__checkbox">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => {
              setIncludeInactive(event.target.checked)
              resetToFirstPage()
            }}
          />
          <span>Incluir inactivos</span>
        </label>
      </div>
      {clientsError && (
        <p className="projects-page__filter-error" role="alert">
          No se pudieron cargar los clientes.
          <button type="button" onClick={retryClients}>Reintentar</button>
        </p>
      )}
      {npdLeadsError && (
        <p className="projects-page__filter-error" role="alert">
          No se pudieron cargar los líderes NPD.
          <button type="button" onClick={retryNpdLeads}>Reintentar</button>
        </p>
      )}

      <div className="projects-page__list-tools">
        <span className="projects-page__filter-summary">{activeFilters || 'Sin filtros'}</span>
        <div className="projects-page__list-tools-right">
          <span className="projects-page__grouping">Agrupado por <strong>Cliente</strong></span>
          {data && projectCount > 0 && (
            <Paginador
              range={range}
              page={page}
              totalPages={data.totalPages ?? Math.ceil(projectCount / pageSize)}
              onPageChange={(nextPage) => {
                setPage(nextPage)
                updatePage(nextPage)
              }}
            />
          )}
        </div>
      </div>

      {loading && !data && <div className="projects-page__empty">Cargando proyectos…</div>}
      {!(loading && !data) && Boolean(error) && (
        <div className="projects-page__empty projects-page__empty--error" role="alert">
          <span>No se pudieron cargar los proyectos.</span>
          <Button variant="secondary" onClick={() => void refetch()}>Reintentar</Button>
        </div>
      )}
      {!(loading && !data) && !error && (
        <ProjectsTable
          projects={data?.items ?? []}
          highlightedProjectId={highlightedProjectId}
          canManageProjects={canManageProjects}
        />
      )}

      <NewProjectModal
        open={newProjectOpen}
        clients={clients}
        onCreated={handleProjectCreated}
        onDuplicateProject={setHighlightedProjectId}
        onClose={() => setNewProjectOpen(false)}
      />
      <ProjectExportModal
        open={exportDialogOpen}
        total={projectCount}
        filtersSummary={activeFilters}
        format={exportFormat}
        exporting={exporting}
        error={exportError}
        onFormatChange={setExportFormat}
        onClose={() => {
          if (!exporting) setExportDialogOpen(false)
        }}
        onConfirm={() => void handleExport()}
      />
    </section>
  )
}

interface KpiProps {
  label: string
  value?: number
  note: string
  danger?: boolean
}

function Kpi({ label, value, note, danger = false }: Readonly<KpiProps>) {
  return (
    <article className="projects-page__kpi">
      <div className="projects-page__kpi-label">{label}</div>
      <div className={`projects-page__kpi-value${danger ? ' projects-page__kpi-value--danger' : ''}`}>
        {value ?? '—'}
      </div>
      <span className="projects-page__kpi-note">{note}</span>
    </article>
  )
}
