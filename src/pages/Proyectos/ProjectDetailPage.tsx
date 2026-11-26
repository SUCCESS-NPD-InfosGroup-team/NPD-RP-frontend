import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, Pencil, Plus, UserRoundPlus, UsersRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useProjectDetail } from '../../hooks/useProjectDetail'
import type { ProjectDetail, ProjectDetailMember } from '../../services/projectDetail.types'
import { downloadExcel, spreadsheetFileName, type SpreadsheetRow } from '../../utils/spreadsheetExport'
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
  const [exportingTeam, setExportingTeam] = useState(false)
  const [exportError, setExportError] = useState('')

  async function handleExportTeam(): Promise<void> {
    if (!project || empty || exportingTeam) return

    setExportingTeam(true)
    setExportError('')
    try {
      const rows: SpreadsheetRow[] = members.map((member) => ({
        Cliente: project.client.name,
        Proyecto: project.name,
        'N.º colaborador': member.employeeNumber,
        Colaborador: member.name,
        Nivel: member.level,
        'Rol en cliente': member.clientRole ?? 'Sin rol',
        'Líder NPD': member.leader?.name ?? '',
        Estado: member.status.label,
        Situación: member.situation.label,
        'Inicio de asignación': member.assignmentStart,
        'Fin de asignación': member.assignmentEnd ?? '',
        Indefinida: member.indefinite ? 'Sí' : 'No',
        'Días al fin de asignación': member.daysToAssignmentEnd ?? '',
      }))
      await downloadExcel(
        rows,
        spreadsheetFileName(`Equipo_proyecto_${project.id}`),
        'Equipo',
      )
    } catch {
      setExportError('No se pudo exportar el equipo. Intenta de nuevo.')
    } finally {
      setExportingTeam(false)
    }
  }

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
          <button
            className="project-detail__button"
            type="button"
            onClick={() => void handleExportTeam()}
            disabled={empty || exportingTeam}
            title={empty ? 'No hay colaboradores para exportar' : undefined}
          >
            <Download aria-hidden="true" /> {exportingTeam ? 'Exportando…' : 'Exportar equipo'}
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

      {exportError && <p className="project-detail__export-error" role="alert">{exportError}</p>}

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
            : 'fecha final vencida sin extender'}
          danger={project.pendingConfirmation > 0}
          noteDanger={project.pendingConfirmation > 0}
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
          <TeamTable members={members} />
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
  noteDanger = false,
}: Readonly<{
  label: string
  value: string
  note: ReactNode
  danger?: boolean
  noteDanger?: boolean
}>) {
  return (
    <article className="project-detail__summary-card">
      <h2>{label}</h2>
      <p className={danger ? 'project-detail__summary-value project-detail__summary-value--danger' : 'project-detail__summary-value'}>
        {value}
      </p>
      <span className={noteDanger ? 'project-detail__summary-note project-detail__summary-note--danger' : 'project-detail__summary-note'}>
        {note}
      </span>
    </article>
  )
}

function ContractSummary({ project }: Readonly<{ project: ProjectDetail }>) {
  const days = project.daysToContractEnd
  const notice = 'aviso a Sales a 30 y 15 días'
  const note = days === null
    ? 'Sin fecha de fin'
    : days < 0
      ? `Vencido · ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`
      : days <= 30
        ? <><span className="project-detail__summary-note-days">D-{days}</span> · {notice}</>
        : `en ${days} días · ${notice}`

  return (
    <SummaryCard
      label="FIN DE CONTRATO"
      value={formatDate(project.contractEndDate)}
      note={note}
      noteDanger={days !== null && days < 0}
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
  const daysInRange = getDaysBetween(rangeStart, rangeEnd)
  const todayPosition = getTimelinePosition(new Date(), rangeStart, daysInRange)
  const monthPositions = months.map((month, index) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    return {
      date: month,
      left: getTimelinePosition(month, rangeStart, daysInRange),
      width: index === months.length - 1
        ? 100 - getTimelinePosition(month, rangeStart, daysInRange)
        : getTimelinePosition(nextMonth, rangeStart, daysInRange) - getTimelinePosition(month, rangeStart, daysInRange),
    }
  })
  const rows = [
    {
      id: 'project',
      name: `CONTRATO ${project.client.name.toLocaleUpperCase('es')}`,
      startDate: project.startDate,
      endDate: project.contractEndDate,
      kind: 'project' as const,
      indefinite: false,
    },
    ...members.map((member) => ({
      id: String(member.id),
      name: member.name,
      startDate: member.assignmentStart,
      endDate: member.assignmentEnd,
      kind: member.situation.code === 'PENDIENTE_CONFIRMACION' ? 'pending' as const : 'member' as const,
      indefinite: member.indefinite,
    })),
  ]

  return (
    <section className="project-detail__timeline" aria-labelledby="project-detail-timeline-heading">
      <header className="project-detail__timeline-heading">
        <h2 id="project-detail-timeline-heading">Línea de tiempo</h2>
        <p>Contrato con el cliente y fecha final de cada colaborador</p>
      </header>
      <div className="project-detail__timeline-grid">
        <div className="project-detail__timeline-months" aria-hidden="true">
          <span className="project-detail__timeline-month-heading">COLABORADOR</span>
          <div className="project-detail__timeline-month-track">
            {monthPositions.map(({ date, left, width }) => (
              <span
                className="project-detail__timeline-month"
                data-month-start={formatIsoDate(date)}
                key={date.toISOString()}
                style={{ left: `${left}%`, width: `${width}%` }}
              >
                {formatMonth(date)}
              </span>
            ))}
            {todayPosition !== null && (
              <span
                className="project-detail__timeline-today-label"
                style={{ left: `${todayPosition}%` }}
              >
                HOY {formatToday()}
              </span>
            )}
            {todayPosition !== null && (
              <span
                className="project-detail__timeline-today"
                data-testid="timeline-today-marker"
                style={{ left: `${todayPosition}%` }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
        <div className="project-detail__timeline-rows">
          {rows.map((row) => {
            const bar = getTimelineBar(row.startDate, row.endDate, row.indefinite, row.kind, rangeStart, rangeEnd, daysInRange)
            const barLabel = bar ? getTimelineBarLabel(row.startDate, rangeStart) : null
            const endDate = row.endDate ? parseIsoDate(row.endDate) : null
            const endPosition = endDate ? getTimelinePosition(endDate, rangeStart, daysInRange) : null
            const pendingLabelPosition = endPosition === null
              ? null
              : bar
                ? bar.left + bar.width
                : Math.min(Math.max(0, endPosition), 100)
            const alertPositions = endDate
              ? getAlertPositions(endDate, rangeStart, daysInRange).filter(({ left }) =>
                row.kind === 'project' || (bar !== null && left >= bar.left && left <= bar.left + bar.width),
              )
              : []

            return (
              <div className="project-detail__timeline-row" key={row.id}>
                <span className="project-detail__timeline-name">{row.name}</span>
                <div className="project-detail__timeline-track">
                  {monthPositions.map(({ date, left }) => (
                    <span
                      className="project-detail__timeline-month-divider"
                      key={date.toISOString()}
                      style={{ left: `${left}%` }}
                      aria-hidden="true"
                    />
                  ))}
                  {todayPosition !== null && (
                    <span
                      className="project-detail__timeline-today"
                      style={{ left: `${todayPosition}%` }}
                      aria-hidden="true"
                    />
                  )}
                  {row.kind === 'project' && endPosition !== null && (
                    <>
                      <span
                        className="project-detail__timeline-contract-line"
                        style={{ width: `${Math.min(Math.max(endPosition, 0), 100)}%` }}
                        aria-hidden="true"
                      />
                      <span
                        className="project-detail__timeline-contract-label"
                        style={{ left: `calc(${endPosition}% - 120px)` }}
                      >
                        Fin de contrato {formatDate(row.endDate, false)}
                      </span>
                    </>
                  )}
                  {bar && row.kind !== 'project' && (
                    <span
                      className={`project-detail__timeline-bar project-detail__timeline-bar--${row.kind}`}
                      style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                      title={`desde ${formatMonthYear(row.startDate)}${row.endDate ? ` · ${formatDate(row.endDate)}` : ''}`}
                    >
                      {barLabel}
                    </span>
                  )}
                  {row.kind !== 'project' && endPosition !== null && row.kind !== 'pending' && (
                    <span
                      className="project-detail__timeline-end-date"
                      data-testid={`timeline-end-${row.id}`}
                      style={{ left: `calc(${endPosition}% + 12px)` }}
                    >
                      {formatDate(row.endDate, false)}
                    </span>
                  )}
                  {row.kind === 'pending' && pendingLabelPosition !== null && (
                    <span
                      className="project-detail__timeline-pending-label"
                      style={{ left: `calc(${pendingLabelPosition}% + 6px)` }}
                    >
                      Venció {formatDate(row.endDate, false)} · confirmar
                    </span>
                  )}
                  {row.indefinite && (
                    <span
                      className="project-detail__timeline-indefinite"
                      data-testid={`timeline-indefinite-${row.id}`}
                      style={{ left: '100%' }}
                      aria-label={`Fecha final indefinida: ${row.name}`}
                    />
                  )}
                  {alertPositions.map(({ days, left }) => (
                    <span
                      className={`project-detail__timeline-alert project-detail__timeline-alert--${row.kind}`}
                      data-testid={`timeline-alert-${row.id}-${days}`}
                      key={days}
                      style={{ left: `${left}%` }}
                      title={`${days} días antes de la fecha final`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function TeamTable({ members }: Readonly<{ members: ProjectDetailMember[] }>) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const selectAllRef = useRef<HTMLInputElement>(null)
  const unavailableColumns = [
    { key: 'team', label: 'EQUIPO' },
    { key: 'client-contact', label: 'CONTACTO POR CLIENTE' },
  ]
  const selectedCount = members.filter((member) => selectedIds.has(member.id)).length
  const allSelected = members.length > 0 && selectedCount === members.length
  const partiallySelected = selectedCount > 0 && !allSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partiallySelected
  }, [partiallySelected])

  function toggleMember(memberId: number, checked: boolean) {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (checked) next.add(memberId)
      else next.delete(memberId)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(members.map((member) => member.id)) : new Set())
  }

  // TODO(SCRUM-188): Connect these placeholders when the members API provides both values.

  return (
    <>
      <div className="project-detail__team-help">
        <span>Marca colaboradores para cambiar su líder o fecha final en bloque, moverlos o quitarlos.</span>
        {selectedCount > 0 && (
          <button
            className="project-detail__bulk-action"
            type="button"
            disabled
            title="Disponible en SCRUM-128"
          >
            Editar en bloque
          </button>
        )}
      </div>
      <div className="project-detail__table-wrap">
        <table className="project-detail__table" aria-label="Equipo del proyecto">
          <colgroup>
            <col className="project-detail__column-select" />
            <col className="project-detail__column-name" />
            <col className="project-detail__column-role" />
            <col className="project-detail__column-leader" />
            <col className="project-detail__column-end" />
            <col className="project-detail__column-situation" />
            <col className="project-detail__column-team" />
            <col className="project-detail__column-contact" />
            <col className="project-detail__column-actions" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">
                <span className="project-detail__visually-hidden">Seleccionar</span>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Seleccionar todos los colaboradores"
                  checked={allSelected}
                  onChange={(event) => toggleAll(event.currentTarget.checked)}
                />
              </th>
              <th scope="col">COLABORADOR</th>
              <th scope="col">ROL EN CLIENTE</th>
              <th scope="col">LÍDER NPD</th>
              <th scope="col">FECHA FINAL</th>
              <th scope="col">SITUACIÓN</th>
              {unavailableColumns.map((column) => (
                <th scope="col" key={column.key}>{column.label}</th>
              ))}
              <th scope="col"><span className="project-detail__visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                className={member.status.code === 'LICENCIA' ? 'project-detail__table-row--license' : undefined}
                key={member.id}
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar a ${member.name}`}
                    checked={selectedIds.has(member.id)}
                    onChange={(event) => toggleMember(member.id, event.currentTarget.checked)}
                  />
                </td>
                <td>
                  <strong className="project-detail__member-name">{member.name}</strong>
                  <span className="project-detail__member-meta">
                    <span>#{member.employeeNumber} · Nivel {member.level ?? '—'}</span>
                    {member.status.code === 'LICENCIA' && (
                      <span className="project-detail__chip project-detail__chip--status-licencia">
                        Licencia
                      </span>
                    )}
                  </span>
                </td>
                <td>{member.clientRole ?? 'Sin rol'}</td>
                <td>{member.leader?.name ?? '—'}</td>
                <td>
                  <AssignmentEnd member={member} />
                </td>
                <td>
                  <span className={`project-detail__chip project-detail__chip--situation-${member.situation.code.toLocaleLowerCase('es')}`}>
                    {member.situation.code === 'ASIGNADO' ? 'Asignado' : 'Pendiente de confirmación'}
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
    </>
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
  return formatted.replace(/\./g, '').replace(/\bsept\b/g, 'sep')
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

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function formatMonth(value: Date): string {
  const month = new Intl.DateTimeFormat('es', { month: 'short' }).format(value)
  return `${month.replace(/\./g, '').toLocaleUpperCase('es')} ${String(value.getFullYear()).slice(-2)}`
}

function formatMonthYear(value: string): string {
  const date = parseIsoDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('es', { month: 'short', year: 'numeric' })
    .format(date)
    .replace(/\./g, '')
}

function formatIsoDate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

function formatToday(): string {
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short' })
    .format(new Date())
    .replace(/\./g, '')
    .toLocaleUpperCase('es')
}

function getDaysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return (endUtc - startUtc) / MILLISECONDS_PER_DAY
}

function getTimelinePosition(value: Date, rangeStart: Date, daysInRange: number): number {
  const daysFromStart = getDaysBetween(rangeStart, value)
  return (daysFromStart / daysInRange) * 100
}

function getTimelineBarLabel(startValue: string, rangeStart: Date): string | null {
  const startDate = parseIsoDate(startValue)
  if (!startDate) return null

  return startDate < rangeStart
    ? `desde ${formatMonthYear(startValue)}`
    : formatDate(startValue, false)
}

function getTimelineBar(
  startValue: string,
  endValue: string | null,
  indefinite: boolean,
  kind: 'project' | 'member' | 'pending',
  rangeStart: Date,
  rangeEnd: Date,
  daysInRange: number,
): { left: number; width: number } | null {
  const startDate = parseIsoDate(startValue)
  const endDate = indefinite ? rangeEnd : endValue ? parseIsoDate(endValue) : null
  if (!startDate || !endDate || startDate > rangeEnd) return null

  const visibleStart = startDate < rangeStart ? rangeStart : startDate
  if (endDate < rangeStart && startDate < rangeStart) return null
  const visibleEnd = endDate > rangeEnd ? rangeEnd : endDate
  const left = getTimelinePosition(visibleStart, rangeStart, daysInRange)
  const right = getTimelinePosition(visibleEnd, rangeStart, daysInRange)
  if (right < left) return kind === 'pending' ? { left, width: 1.5 } : null
  return { left, width: Math.max(right - left, 1.5) }
}

function getAlertPositions(
  endDate: Date,
  rangeStart: Date,
  daysInRange: number,
): Array<{ days: 15 | 30; left: number }> {
  const percentPerDay = 100 / daysInRange
  const endPosition = getTimelinePosition(endDate, rangeStart, daysInRange)
  return ([30, 15] as const)
    .map((days) => ({ days, left: endPosition - (days * percentPerDay) }))
    .filter(({ left }) => left >= 0 && left <= 100)
}
