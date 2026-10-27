import type { CSSProperties } from 'react'
import { addDaysIso, formatShortDate as shortDate, SHORT_MONTHS as MONTHS } from '../../utils/dates'

const WINDOW_MONTHS = 7
/** End-of-assignment notices go out 30 and 15 days before the end date */
const NOTICE_DAYS = [30, 15]

export interface RosterPreviewProps {
  today: string
  hireDate?: string
  probationEnd?: string
  onProbation: boolean
  /** Undefined when the person is registered without a project */
  project?: { name?: string; endDate?: string; indefinite: boolean }
}

const toTime = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))

function monthStart(iso: string, offset: number): number {
  return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1 + offset, 1)
}

/**
 * Seven months starting the month before the hire date, moved forward when the hire date is so old
 * that today would fall outside.
 */
function previewWindow(hireDate: string, today: string): { start: number; end: number } {
  const start = Math.max(monthStart(hireDate, -1), monthStart(today, -3))
  const date = new Date(start)
  return { start, end: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + WINDOW_MONTHS, 1) }
}

export function RosterPreview({ today, hireDate, probationEnd, onProbation, project }: Readonly<RosterPreviewProps>) {
  if (!hireDate) {
    return (
      <aside className="roster-preview" aria-labelledby="roster-preview-title">
        <h2 id="roster-preview-title">Así quedará en el roster</h2>
        <p className="roster-preview__empty">Escribe el inicio de contrato para ver la línea de tiempo.</p>
      </aside>
    )
  }

  const { start, end } = previewWindow(hireDate, today)
  const firstMonth = new Date(start).getUTCMonth()
  const months = Array.from({ length: WINDOW_MONTHS }, (_, index) => MONTHS[(firstMonth + index) % 12])
  const percent = (iso: string) => ((toTime(iso) - start) / (end - start)) * 100
  const clamp = (value: number) => Math.min(100, Math.max(0, value))
  const visible = (iso?: string): iso is string => iso !== undefined && percent(iso) >= 0 && percent(iso) <= 100
  const at = (iso: string): CSSProperties => ({ left: `${percent(iso)}%` })

  const hireLeft = clamp(percent(hireDate))
  const barEnd = project?.endDate && !project.indefinite ? clamp(percent(project.endDate)) : 100
  const notices = project?.endDate && !project.indefinite
    ? NOTICE_DAYS.map((days) => addDaysIso(project.endDate as string, -days))
    : []

  return (
    <aside className="roster-preview" aria-labelledby="roster-preview-title">
      <h2 id="roster-preview-title">Así quedará en el roster</h2>
      <div className="roster-preview__months" aria-hidden="true">
        <span />
        {months.map((month, index) => <span key={`${month}-${index}`}>{month}</span>)}
      </div>
      <div className="roster-preview__row">
        <span className="roster-preview__label">Contrato</span>
        <div className="roster-preview__track">
          <span className="roster-preview__line" style={{ left: `${hireLeft}%` }} />
          {visible(hireDate) && <span className="roster-preview__start" style={at(hireDate)} title={`Inicio de contrato ${shortDate(hireDate, true)}`} />}
          {onProbation && visible(probationEnd) && (
            <span className="roster-preview__probation" style={at(probationEnd)} title={`Fin de periodo de prueba ${shortDate(probationEnd, true)}`} />
          )}
          {visible(today) && <span className="roster-preview__today" style={at(today)} />}
        </div>
      </div>
      <div className="roster-preview__row">
        <span className="roster-preview__label">Proyecto</span>
        <div className="roster-preview__track">
          {project ? (
            <span
              className={`roster-preview__bar${barEnd === 100 ? ' is-open' : ''}`}
              style={{ left: `${hireLeft}%`, width: `${Math.max(barEnd - hireLeft, 0)}%` }}
            >
              {shortDate(hireDate)}
              {notices.filter(visible).map((notice) => (
                <span
                  key={notice}
                  className="roster-preview__notice"
                  style={{ left: `${((percent(notice) - hireLeft) / Math.max(barEnd - hireLeft, 1)) * 100}%` }}
                />
              ))}
            </span>
          ) : (
            <span className="roster-preview__none">Sin proyecto</span>
          )}
          {visible(today) && <span className="roster-preview__today" style={at(today)} />}
        </div>
      </div>
      <ul className="roster-preview__legend">
        <li>
          <span className="roster-preview__chip">Probatoria</span>
          {onProbation && probationEnd
            ? `Día 90 el ${shortDate(probationEnd, true)}, desde el contrato`
            : 'No está en periodo de prueba'}
        </li>
        {project && (
          <li>
            <span className="roster-preview__chip roster-preview__chip--danger">Avisos fin</span>
            {notices.length > 0
              ? `${notices.map((notice) => shortDate(notice)).join(' y ')}${project.name ? ` · ${project.name}` : ''}`
              : project.indefinite ? 'Sin avisos: la asignación es indefinida' : 'Se calculan con la fecha final'}
          </li>
        )}
      </ul>
      <p className="roster-preview__note">
        La barra empieza en la fecha más tardía entre el inicio del proyecto y el inicio de contrato, y termina en la fecha final.
      </p>
    </aside>
  )
}
