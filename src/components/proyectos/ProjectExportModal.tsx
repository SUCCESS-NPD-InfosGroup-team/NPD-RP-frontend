import { Download } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { SpreadsheetExportFormat } from '../../utils/spreadsheetExport'
import './ProjectExportModal.css'

interface ProjectExportModalProps {
  open: boolean
  total: number
  filtersSummary: string
  format: SpreadsheetExportFormat
  exporting: boolean
  error?: string
  onFormatChange: (format: SpreadsheetExportFormat) => void
  onClose: () => void
  onConfirm: () => void
}

export function ProjectExportModal({
  open,
  total,
  filtersSummary,
  format,
  exporting,
  error,
  onFormatChange,
  onClose,
  onConfirm,
}: Readonly<ProjectExportModalProps>) {
  return (
    <Modal open={open} title="Exportar proyectos" onClose={onClose} className="project-export-dialog">
      <div className="project-export-dialog__body">
        <p className="project-export-dialog__filter-summary">
          {filtersSummary
            ? <>Se exportarán los proyectos con estos filtros: <strong>{filtersSummary}</strong>.</>
            : <>No hay filtros aplicados en <strong>Proyectos</strong>.</>}
        </p>
        <div className="project-export-dialog__count">
          <strong>{total}</strong>
          <span>{total === 1 ? 'proyecto se exportará' : 'proyectos se exportarán'}</span>
        </div>
        <fieldset className="project-export-dialog__formats">
          <legend>Formato</legend>
          <label
            htmlFor="project-export-format-xlsx"
            className={`project-export-dialog__format${format === 'xlsx' ? ' is-selected' : ''}`}
          >
            <input
              id="project-export-format-xlsx"
              type="radio"
              name="project-export-format"
              value="xlsx"
              checked={format === 'xlsx'}
              disabled={exporting}
              onChange={() => onFormatChange('xlsx')}
            />
            <span className="project-export-dialog__format-copy">
              <strong>.xlsx</strong>
              <small>Excel, con formato</small>
            </span>
          </label>
          <label
            htmlFor="project-export-format-csv"
            className={`project-export-dialog__format${format === 'csv' ? ' is-selected' : ''}`}
          >
            <input
              id="project-export-format-csv"
              type="radio"
              name="project-export-format"
              value="csv"
              checked={format === 'csv'}
              disabled={exporting}
              onChange={() => onFormatChange('csv')}
            />
            <span className="project-export-dialog__format-copy">
              <strong>.csv</strong>
              <small>Texto separado por comas</small>
            </span>
          </label>
        </fieldset>
        <p className="project-export-dialog__description">
          Una fila por proyecto: cliente, proyecto, inicio, fin de contrato, equipo, líderes, pendientes,
          próximo fin de asignación y estado. La exportación incluye todos los resultados filtrados.
        </p>
        {error && <p className="project-export-dialog__error" role="alert">{error}</p>}
      </div>
      <footer className="ui-modal__actions project-export-dialog__actions">
        <Button variant="secondary" disabled={exporting} onClick={onClose}>Cancelar</Button>
        <Button icon={<Download />} disabled={exporting || total === 0} onClick={onConfirm}>
          {exporting ? 'Exportando…' : 'Exportar todo'}
        </Button>
      </footer>
    </Modal>
  )
}
