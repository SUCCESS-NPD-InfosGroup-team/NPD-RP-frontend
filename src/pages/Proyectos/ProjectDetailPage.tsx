import { Download, Pencil, Plus, UserRoundPlus, UsersRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useProjectDetail } from '../../hooks/useProjectDetail'
import type { ProjectDetail, ProjectDetailMember } from '../../services/projectDetail.types'
import './ProjectDetailPage.css'

export function ProjectDetailPage() {
  const { projectId } = useParams()

  if (!projectId) {
    return (
      <section className="project-detail__state" role="alert">
        <h1>No se indicó el proyecto.</h1>
        <Link to="/proyectos">Volver a Proyectos</Link>
      </section>
    )
  }

  return <ProjectDetailContent projectId={projectId} />
}

function ProjectDetailContent({ projectId }: Readonly<{ projectId: string }>) {
  const { project, members, loading, error, notFound, empty, reload } = useProjectDetail(projectId)

  if (loading) {
    return <p className="project-detail__state" role="status">Cargando detalle del proyecto…</p>
  }

  if (notFound) {
    return (
      <section className="project-detail__state" role="alert">
        <h1>No existe el proyecto</h1>
        <p>El proyecto solicitado no está disponible.</p>
        <Link to="/proyectos">Volver a Proyectos</Link>
      </section>
    )
  }

  if (error || !project) {
    return (
      <section className="project-detail__state" role="alert">
        <h1>No se pudo cargar el proyecto</h1>
        <p>{error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}</p>
        <button className="project-detail__button" type="button" onClick={() => void reload()}>
          Reintentar
        </button>
      </section>
    )
  }

  return (
    <section className="project-detail" aria-label="Detalle del proyecto">
      <nav className="project-detail__breadcrumbs" aria-label="Ruta de navegación">
        <Link to="/proyectos">Proyectos</Link>
        <span aria-hidden="true">›</span>
        <span>{project.client.name}</span>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{project.name}</span>
      </nav>

      <header className="project-detail__header">
        <div className="project-detail__heading">
          <h1>{project.name}</h1>
          <p>
            {project.client.name.toLocaleUpperCase('es')} · inicio {formatDate(project.startDate)} (fecha de creación)
          </p>
        </div>
        <div className="project-detail__actions" aria-label="Acciones del proyecto">
          <button className="project-detail__button" type="button" disabled title="Disponible próximamente">
            <Download aria-hidden="true" /> Exportar equipo
          </button>
          <button className="project-detail__button" type="button" disabled title="Disponible próximamente">
            <Pencil aria-hidden="true" /> Editar proyecto
          </button>
          <button className="project-detail__button" type="button" disabled title="Disponible próximamente">
            <Plus aria-hidden="true" /> Registrar colaborador nuevo
          </button>
          <button className="project-detail__button project-detail__button--primary" type="button" disabled title="Disponible próximamente">
            <UserRoundPlus aria-hidden="true" /> Agregar colaboradores
          </button>
        </div>
      </header>

      <section className="project-detail__summary" aria-label="Resumen del proyecto">
        <SummaryCard
          label="EQUIPO"
          value={String(project.teamSize)}
          note={`${project.leads.length} ${project.leads.length === 1 ? 'líder NPD' : 'líderes NPD'}`}
        />
        <ContractSummary project={project} />
        <SummaryCard
          label="PENDIENTES DE CONFIRMACIÓN"
          value={String(project.pendingConfirmation)}
          note={project.pendingConfirmation === 0
            ? 'todas las fechas al día'
            : `${project.pendingConfirmation} por confirmar · fecha final vencida sin extender`}
          danger={project.pendingConfirmation > 0}
        />
        <SummaryCard
          label="PRÓXIMO FIN DE ASIGNACIÓN"
          value={formatDate(project.nextAssignmentEnd, false)}
          note={`${project.indefiniteCount} con fecha indefinida`}
        />
      </section>

      <ProjectTimeline project={project} members={members} />

      <section className="project-detail__team" aria-labelledby="project-detail-team-heading">
        <header className="project-detail__team-heading">
          <h2 id="project-detail-team-heading">Equipo ({project.teamSize})</h2>
          <p>Una persona está en un solo proyecto. Su líder, rol y fecha final son propios.</p>
        </header>

        {empty ? (
          <EmptyTeam project={project} />
        ) : (
          <>
            <p className="project-detail__team-help">
              Marca colaboradores para cambiar su líder o fecha final en bloque, moverlos o quitarlos.
            </p>
            <TeamTable members={members} />
          </>
        )}
      </section>
    </section>
  )
}

function SummaryCard({
  label,
  value,
  note,
  danger = false,
}: Readonly<{ label: string; value: string; note: string; danger?: boolean }>) {
  return (
    <article className="project-detail__summary-card">
      <h2>{label}</h2>
      <p className={danger ? 'project-detail__summary-value project-detail__summary-value--danger' : 'project-detail__summary-value'}>
        {value}
      </p>
      <span>{note}</span>
    </article>
  )
}

function ContractSummary({ project }: Readonly<{ project: ProjectDetail }>) {
  const days = project.daysToContractEnd
  const isDanger = days !== null && days <= 30
  const value = days === null
    ? formatDate(project.contractEndDate)
    : days < 0
      ? `Vencido · ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`
      : days <= 30
        ? `D-${days}`
        : formatDate(project.contractEndDate)
  const note = days === null
    ? 'Sin fecha de fin'
    : days < 0
      ? formatDate(project.contractEndDate)
      : `en ${days} días · aviso a Sales a 30 y 15 días`

  return (
    <SummaryCard
      label="FIN DE CONTRATO"
      value={value}
      note={note}
      danger={isDanger}
    />
  )
}

function ProjectTimeline({
  project,
  members,
}: Readonly<{ project: ProjectDetail; members: ProjectDetailMember[] }>) {
  const months = getVisibleMonths()
  const rangeStart = months[0]
  const rangeEnd = new Date(months[months.length - 1].getFullYear(), months[months.length - 1].getMonth() + 1, 1)
  const todayPosition = getPosition(new Date(), rangeStart, rangeEnd)
  const rows = [
    {
      id: 'project',
      name: `CONTRATO ${project.client.name.toLocaleUpperCase('es')}`,
      startDate: project.startDate,
      endDate: project.contractEndDate,
      label: `Fin de contrato ${formatDate(project.contractEndDate, false)}`,
      kind: 'project',
    },
    ...members.map((member) => ({
      id: String(member.id),
      name: member.name,
      startDate: member.assignmentStart,
      endDate: member.assignmentEnd,
      label: `desde ${formatDate(member.assignmentStart, false)}`,
      kind: member.situation.code === 'PENDIENTE_CONFIRMACION' ? 'pending' : 'member',
    })),
  ]

  return (
    <section className="project-detail__timeline" aria-labelledby="project-detail-timeline-heading">
      <header className="project-detail__timeline-heading">
        <h2 id="project-detail-timeline-heading">Línea de tiempo</h2>
        <p>Contrato con el cliente y fecha final de cada colaborador</p>
      </header>
      <div className="project-detail__timeline-months" aria-hidden="true">
        <span />
        <div className="project-detail__timeline-month-grid">
          {months.map((month) => <span key={month.toISOString()}>{formatMonth(month)}</span>)}
          {todayPosition !== null && (
            <span
              className="project-detail__timeline-today-label"
              style={{ left: `${todayPosition}%` }}
            >
              HOY {formatToday()}
            </span>
          )}
        </div>
      </div>
      <div className="project-detail__timeline-rows">
        {rows.map((row) => {
          const bar = getBarPosition(row.startDate, row.endDate, rangeStart, rangeEnd)
          return (
            <div className="project-detail__timeline-row" key={row.id}>
              <span className="project-detail__timeline-name">{row.name}</span>
              <div className="project-detail__timeline-track">
                {bar && (
                  <span
                    className={`project-detail__timeline-bar project-detail__timeline-bar--${row.kind}`}
                    style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                    title={`${row.label}${row.endDate ? ` · ${formatDate(row.endDate)}` : ''}`}
                  >
                    {row.label}
                  </span>
                )}
                {todayPosition !== null && (
                  <span
                    className="project-detail__timeline-today"
                    style={{ left: `${todayPosition}%` }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TeamTable({ members }: Readonly<{ members: ProjectDetailMember[] }>) {
  const unavailableColumns = [
    { key: 'team', label: 'EQUIPO' },
    { key: 'client-contact', label: 'CONTACTO POR CLIENTE' },
  ]
  // TODO(SCRUM-188): Connect these placeholders when the members API provides both values.

  return (
    <div className="project-detail__table-wrap">
      <table className="project-detail__table" aria-label="Equipo del proyecto">
        <thead>
          <tr>
            <th scope="col">COLABORADOR</th>
            <th scope="col">ROL EN CLIENTE</th>
            <th scope="col">LÍDER NPD</th>
            <th scope="col">FECHA FINAL</th>
            <th scope="col">SITUACIÓN</th>
            {unavailableColumns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}
            <th scope="col"><span className="project-detail__visually-hidden">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>
                <strong>{member.name}</strong>
                <span className="project-detail__member-meta">
                  #{member.employeeNumber} · Nivel {member.level}
                  <span className={`project-detail__chip project-detail__chip--status-${member.status.code.toLocaleLowerCase('es')}`}>
                    {member.status.label}
                  </span>
                </span>
              </td>
              <td>{member.clientRole ?? 'Sin rol'}</td>
              <td>{member.leader?.name ?? '—'}</td>
              <td>
                <AssignmentEnd member={member} />
              </td>
              <td>
                <span className={`project-detail__chip project-detail__chip--situation-${member.situation.code.toLocaleLowerCase('es')}`}>
                  {member.situation.label}
                </span>
              </td>
              {unavailableColumns.map((column) => <td key={column.key}>—</td>)}
              <td>
                <button className="project-detail__edit" type="button" disabled title="Disponible próximamente">
                  <Pencil aria-hidden="true" /> Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AssignmentEnd({ member }: Readonly<{ member: ProjectDetailMember }>) {
  if (member.indefinite || member.assignmentEnd === null) {
    return <span>Indefinido</span>
  }

  const days = member.daysToAssignmentEnd
  if (days === null || days > 30) return <span>{formatDate(member.assignmentEnd)}</span>

  const label = days < 0
    ? `Vencido · ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`
    : `D-${days}`

  return <span className="project-detail__days--danger">{label}</span>
}

function EmptyTeam({ project }: Readonly<{ project: ProjectDetail }>) {
  return (
    <div className="project-detail__empty-team">
      <span className="project-detail__empty-icon"><UsersRound aria-hidden="true" /></span>
      <h3>Este proyecto todavía no tiene equipo</h3>
      <p>
        Se creó el {formatDate(project.startDate)}. Agrega colaboradores: los que no tienen
        proyecto aparecen primero, y también puedes mover a alguien de otro proyecto.
      </p>
      <div className="project-detail__empty-actions">
        <button className="project-detail__button" type="button" disabled title="Disponible próximamente">
          <Plus aria-hidden="true" /> Registrar colaborador nuevo
        </button>
        <button className="project-detail__button project-detail__button--primary" type="button" disabled title="Disponible próximamente">
          <UserRoundPlus aria-hidden="true" /> Agregar colaboradores
        </button>
        <button className="project-detail__button project-detail__button--danger" type="button" disabled title="Disponible próximamente">
          Desactivar proyecto
        </button>
      </div>
    </div>
  )
}

function formatDate(value: string | null, includeYear = true): string {
  if (value === null) return '—'
  const date = parseIsoDate(value)
  if (!date) return '—'
  const formatted = new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date)
  return formatted.replace(/\./g, '')
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function getVisibleMonths(today = new Date()): Date[] {
  const firstMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  return Array.from({ length: 7 }, (_, index) =>
    new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1))
}

function formatMonth(value: Date): string {
  const month = new Intl.DateTimeFormat('es', { month: 'short' }).format(value)
  return `${month.replace(/\./g, '').toLocaleUpperCase('es')} ${String(value.getFullYear()).slice(-2)}`
}

function formatToday(): string {
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short' })
    .format(new Date())
    .replace(/\./g, '')
    .toLocaleUpperCase('es')
}

function getPosition(value: Date, start: Date, end: Date): number | null {
  const position = ((value.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100
  if (position < 0 || position > 100) return null
  return position
}

function getBarPosition(
  startValue: string,
  endValue: string | null,
  rangeStart: Date,
  rangeEnd: Date,
): { left: number; width: number } | null {
  const startDate = parseIsoDate(startValue)
  const endDate = endValue ? parseIsoDate(endValue) : rangeEnd
  if (!startDate || !endDate || endDate < rangeStart || startDate > rangeEnd) return null
  const visibleStart = startDate < rangeStart ? rangeStart : startDate
  const visibleEnd = endDate > rangeEnd ? rangeEnd : endDate
  const left = getPosition(visibleStart, rangeStart, rangeEnd)
  const right = getPosition(visibleEnd, rangeStart, rangeEnd)
  if (left === null || right === null || right < left) return null
  return { left, width: Math.max(right - left, 1) }
}
