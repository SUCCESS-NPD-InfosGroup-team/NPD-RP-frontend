import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BulkAssignRow, useBulkAssign } from '../../hooks/useBulkAssign'
import { getResourcesApi } from '../../services/resources'
import type { CatalogItem, Catalogs } from '../../services/resources.types'
import { addDaysIso, todayIso } from '../../utils/dates'
import { formatResourceDateTime } from './resourceDetailView'
import { Button } from '../ui/Button'

type BulkAssignmentController = ReturnType<typeof useBulkAssign>

interface BulkAssignmentDataStepProps {
  assignment: BulkAssignmentController
}

function options(items: CatalogItem[]): Array<{ value: string; label: string }> {
  return items.map(({ id, name }) => ({ value: String(id), label: name }))
}

function errorFor(
  assignment: BulkAssignmentController,
  field: string,
  employeeId?: number,
): string | undefined {
  const errors = employeeId === undefined
    ? assignment.errors.defaults
    : assignment.errors.rows[employeeId] ?? []
  return errors.find((error) => error.field === field || error.field === `defaults.${field}`)?.message
}

function selectValue(value: number | undefined): string {
  return value === undefined ? '' : String(value)
}

function parseCatalogId(value: string): number | undefined {
  if (!value) return undefined
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
}

function formatConflictDate(value: string): string {
  return Number.isNaN(Date.parse(value)) ? value : formatResourceDateTime(value, 'UTC')
}

function SelectControl({
  id,
  label,
  value,
  choices,
  disabled,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  choices: Array<{ value: string; label: string }>
  disabled: boolean
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="bulk-assignment-data__field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Selecciona una opción</option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>{choice.label}</option>
        ))}
      </select>
      {error && <small className="bulk-assignment-data__field-error" id={`${id}-error`}>{error}</small>}
    </label>
  )
}

function DateControl({
  id,
  label,
  value,
  disabled,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="bulk-assignment-data__field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="date"
        min={addDaysIso(todayIso(), 1)}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <small className="bulk-assignment-data__field-error" id={`${id}-error`}>{error}</small>}
    </label>
  )
}

export function BulkAssignmentDataStep({ assignment }: Readonly<BulkAssignmentDataStepProps>) {
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const fetchCatalogs = useCallback(async () => {
    const api = await getResourcesApi()
    return api.getCatalogs()
  }, [])

  const loadCatalogs = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setCatalogs(await fetchCatalogs())
    } catch {
      setLoadError('No se pudieron cargar los catálogos. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [fetchCatalogs])

  useEffect(() => {
    let active = true
    void fetchCatalogs()
      .then((response) => {
        if (active) setCatalogs(response)
      })
      .catch(() => {
        if (active) setLoadError('No se pudieron cargar los catálogos. Intenta de nuevo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fetchCatalogs])

  const leaderOptions = useMemo(() => options(catalogs?.npdLeads ?? []), [catalogs])
  const roleOptions = useMemo(() => options(catalogs?.clientRoles ?? []), [catalogs])
  const equipmentOptions = useMemo(() => options(catalogs?.equipment ?? []), [catalogs])
  const controlsDisabled = loading || Boolean(loadError)
  const { rows, updateRow } = assignment
  const canIdentifyConflicts = assignment.conflicts.length > 0
    && assignment.conflicts.every((conflict) => conflict.employeeId !== undefined
      && assignment.selectedPeople.some((person) => person.employeeId === conflict.employeeId))
  const conflictsByEmployeeId = new Map<number, (typeof assignment.conflicts)[number]>()
  if (canIdentifyConflicts) {
    assignment.conflicts.forEach((conflict) => {
      if (conflict.employeeId !== undefined) conflictsByEmployeeId.set(conflict.employeeId, conflict)
    })
  }

  useEffect(() => {
    if (!catalogs) return
    for (const row of rows) {
      if (row.clientRoleId !== undefined || !row.clientRoleName) continue
      const matchedRole = catalogs.clientRoles.find(
        (role) => role.name.trim().toLocaleLowerCase() === row.clientRoleName?.trim().toLocaleLowerCase(),
      )
      if (matchedRole) updateRow(row.employeeId, { clientRoleId: matchedRole.id })
    }
  }, [catalogs, rows, updateRow])

  function updateDefault(field: 'leaderId' | 'clientRoleId' | 'equipmentId', value: string): void {
    assignment.setDefaults({ [field]: parseCatalogId(value) })
  }

  function updateRowValue(
    row: BulkAssignRow,
    field: 'leaderId' | 'clientRoleId' | 'equipmentId',
    value: string,
  ): void {
    assignment.updateRow(row.employeeId, { [field]: parseCatalogId(value) })
  }

  return (
    <section className="bulk-assignment-data" aria-label="Datos de la asignación">
      <div className="bulk-assignment-data__project">
        <strong>{assignment.project?.name}</strong>
        <span>{assignment.project?.client.name}</span>
      </div>

      {assignment.conflicts.length > 0 && !canIdentifyConflicts && (
        <div className="bulk-assignment-data__conflict" role="alert">
          <p>
            El servidor no indicó a qué persona corresponde cada cambio. No se marcaron filas.
            Recarga los registros seleccionados antes de reintentar.
          </p>
          <ul>
            {assignment.conflicts.map((conflict, index) => (
              <li key={`${conflict.updatedAt}-${index}`}>
                Modificado por {conflict.updatedBy} · {formatConflictDate(conflict.updatedAt)}
                {' · '}versión actual {conflict.currentVersion}
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            disabled={assignment.isReloadingConflicts}
            onClick={() => void assignment.reloadConflictMember()}
          >
            {assignment.isReloadingConflicts ? 'Recargando…' : 'Recargar registro'}
          </Button>
        </div>
      )}
      {assignment.conflictReloadError && (
        <p className="bulk-assignment-data__conflict-error" role="alert">{assignment.conflictReloadError}</p>
      )}

      <section className="bulk-assignment-data__common" aria-labelledby="bulk-assignment-common-title">
        <div className="bulk-assignment-data__section-heading">
          <div>
            <h3 id="bulk-assignment-common-title">Valores para todos</h3>
            <p>Se pueden ajustar para cada colaborador en la tabla.</p>
          </div>
          <Button
            variant="secondary"
            disabled={assignment.rows.length === 0 || controlsDisabled}
            onClick={assignment.applyDefaultsToAll}
          >
            Aplicar a todos
          </Button>
        </div>

        {loading && <p className="bulk-assignment-data__notice" role="status">Cargando catálogos…</p>}
        {loadError && (
          <div className="bulk-assignment-data__notice bulk-assignment-data__notice--error" role="alert">
            <span>{loadError}</span>
            <Button variant="secondary" onClick={() => void loadCatalogs()}>Reintentar</Button>
          </div>
        )}
        {!loading && !loadError && !leaderOptions.length && (
          <p className="bulk-assignment-data__notice" role="status">No hay líderes NPD disponibles.</p>
        )}

        <div className="bulk-assignment-data__common-fields">
          <SelectControl
            id="bulk-default-leader"
            label="Líder NPD"
            value={selectValue(assignment.defaults.leaderId)}
            choices={leaderOptions}
            disabled={controlsDisabled || !leaderOptions.length}
            error={errorFor(assignment, 'leaderId')}
            onChange={(value) => updateDefault('leaderId', value)}
          />
          <SelectControl
            id="bulk-default-role"
            label="Rol en el cliente"
            value={selectValue(assignment.defaults.clientRoleId)}
            choices={roleOptions}
            disabled={controlsDisabled}
            error={errorFor(assignment, 'clientRoleId')}
            onChange={(value) => updateDefault('clientRoleId', value)}
          />
          <SelectControl
            id="bulk-default-equipment"
            label="Laptop"
            value={selectValue(assignment.defaults.equipmentId)}
            choices={equipmentOptions}
            disabled={controlsDisabled}
            error={errorFor(assignment, 'equipmentId')}
            onChange={(value) => updateDefault('equipmentId', value)}
          />
          <div className="bulk-assignment-data__date-field">
            <DateControl
              id="bulk-default-end-date"
              label="Fecha fin"
              value={assignment.defaults.endDate ?? ''}
              disabled={controlsDisabled || Boolean(assignment.defaults.indefinite)}
              error={errorFor(assignment, 'endDate')}
              onChange={(value) => assignment.setDefaults({
                endDate: value || undefined,
                indefinite: value ? false : undefined,
              })}
            />
            <label className="bulk-assignment-data__checkbox" htmlFor="bulk-default-indefinite">
              <input
                id="bulk-default-indefinite"
                type="checkbox"
                checked={assignment.defaults.indefinite === true}
                disabled={controlsDisabled}
                onChange={(event) => assignment.setDefaults({
                  indefinite: event.target.checked ? true : undefined,
                  endDate: event.target.checked ? undefined : assignment.defaults.endDate,
                })}
              />
              <span>Indefinido</span>
            </label>
          </div>
        </div>
        <p className="bulk-assignment-data__help">
          Si no indicas fecha ni marcas indefinido, se usará la fecha fin del contrato del cliente.
        </p>
      </section>

      <section className="bulk-assignment-data__members" aria-labelledby="bulk-assignment-members-title">
        <h3 id="bulk-assignment-members-title">Por colaborador ({assignment.selectedCount})</h3>
        <div className="bulk-assignment-data__table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Colaborador</th>
                <th scope="col">Líder NPD</th>
                <th scope="col">Rol en el cliente</th>
                <th scope="col">Laptop</th>
                <th scope="col">Fecha fin</th>
              </tr>
            </thead>
            <tbody>
              {assignment.rows.map((row) => {
                const person = assignment.selectedPeople.find((item) => item.employeeId === row.employeeId)
                const source = person?.currentClientName && person.currentProjectName
                  ? `Sale de ${person.currentClientName} · ${person.currentProjectName}`
                  : undefined
                const conflict = conflictsByEmployeeId.get(row.employeeId)
                return (
                  <tr className={conflict ? 'is-conflict' : undefined} key={row.employeeId}>
                    <th scope="row">
                      <strong>{row.name}</strong>
                      <small>{row.employeeNumber}</small>
                      {source && <small className="bulk-assignment-data__source">{source}</small>}
                      {conflict && (
                        <>
                          <small className="bulk-assignment-data__conflict-detail">
                            Modificado por {conflict.updatedBy} · {formatConflictDate(conflict.updatedAt)}
                            {' · '}versión actual {conflict.currentVersion}
                          </small>
                          <Button
                            variant="secondary"
                            aria-label={`Recargar registro de ${row.name}`}
                            disabled={assignment.isReloadingConflicts}
                            onClick={() => void assignment.reloadConflictMember(row.employeeId)}
                          >
                            {assignment.isReloadingConflicts ? 'Recargando…' : 'Recargar registro'}
                          </Button>
                        </>
                      )}
                    </th>
                    <td>
                      <SelectControl
                        id={`bulk-row-${row.employeeId}-leader`}
                        label={`Líder NPD para ${row.name}`}
                        value={selectValue(row.leaderId)}
                        choices={leaderOptions}
                        disabled={controlsDisabled || !leaderOptions.length}
                        error={errorFor(assignment, 'leaderId', row.employeeId)}
                        onChange={(value) => updateRowValue(row, 'leaderId', value)}
                      />
                    </td>
                    <td>
                      <SelectControl
                        id={`bulk-row-${row.employeeId}-role`}
                        label={`Rol en el cliente para ${row.name}`}
                        value={selectValue(row.clientRoleId)}
                        choices={roleOptions}
                        disabled={controlsDisabled}
                        error={errorFor(assignment, 'clientRoleId', row.employeeId)}
                        onChange={(value) => updateRowValue(row, 'clientRoleId', value)}
                      />
                    </td>
                    <td>
                      <SelectControl
                        id={`bulk-row-${row.employeeId}-equipment`}
                        label={`Laptop para ${row.name}`}
                        value={selectValue(row.equipmentId)}
                        choices={equipmentOptions}
                        disabled={controlsDisabled}
                        error={errorFor(assignment, 'equipmentId', row.employeeId)}
                        onChange={(value) => updateRowValue(row, 'equipmentId', value)}
                      />
                    </td>
                    <td>
                      <DateControl
                        id={`bulk-row-${row.employeeId}-end-date`}
                        label={`Fecha fin para ${row.name}`}
                        value={row.endDate ?? ''}
                        disabled={controlsDisabled || Boolean(row.indefinite)}
                        error={errorFor(assignment, 'endDate', row.employeeId)}
                        onChange={(value) => assignment.updateRow(row.employeeId, {
                          endDate: value || undefined,
                          indefinite: value ? false : undefined,
                        })}
                      />
                      <label className="bulk-assignment-data__checkbox" htmlFor={`bulk-row-${row.employeeId}-indefinite`}>
                        <input
                          id={`bulk-row-${row.employeeId}-indefinite`}
                          type="checkbox"
                          checked={row.indefinite === true}
                          disabled={controlsDisabled}
                          onChange={(event) => assignment.updateRow(row.employeeId, {
                            indefinite: event.target.checked ? true : undefined,
                            endDate: event.target.checked ? undefined : row.endDate,
                          })}
                        />
                        <span>Indefinido</span>
                      </label>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
