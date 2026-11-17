import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from '../../components/icons'
import { Paginador } from '../../components/ui/Paginador'
import { searchRecursos } from '../../services/api'
import type { RecursoApi, ResourceSearchResponse } from '../../types'
import './ResourceAuditSelector.css'

const PAGE_SIZE = 25

export function ResourceAuditSelector() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [retryCount, setRetryCount] = useState(0)
  const [data, setData] = useState<ResourceSearchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      const loadResources = async () => {
        try {
          const response = await searchRecursos({ search: query, estado: 'Todos' }, page, PAGE_SIZE)
          if (active) {
            setData(response)
            setError(false)
          }
        } catch {
          if (active) {
            setData(null)
            setError(true)
          }
        } finally {
          if (active) setLoading(false)
        }
      }

      void loadResources()
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [page, query, retryCount])

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    setPage(1)
    setData(null)
    setError(false)
    setLoading(true)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    setData(null)
    setLoading(true)
  }

  const retry = () => {
    setRetryCount((count) => count + 1)
    setData(null)
    setError(false)
    setLoading(true)
  }

  const items = data?.items ?? []
  const total = data?.page.totalElements ?? 0
  const range = total === 0
    ? '0 de 0'
    : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total}`

  return (
    <section className="resource-audit-selector">
      <header className="resource-audit-selector__heading">
        <h1>Auditoría</h1>
        <p>Busca el recurso cuyo historial quieres revisar.</p>
      </header>

      <div className="resource-audit-selector__card">
        <div className="resource-audit-selector__toolbar">
          <label className="resource-audit-selector__search">
            <span>Recurso</span>
            <span className="resource-audit-selector__search-control">
              <SearchIcon aria-hidden="true" />
              <input
                autoFocus
                type="search"
                value={query}
                placeholder="Nombre o número de empleado"
                onChange={(event) => handleQueryChange(event.target.value)}
              />
            </span>
          </label>
          <Paginador
            range={range}
            page={page}
            totalPages={Math.max(data?.page.totalPages ?? 1, 1)}
            onPageChange={handlePageChange}
          />
        </div>

        <div className="resource-audit-selector__table-wrap">
          <table className="resource-audit-selector__table" aria-label="Recursos disponibles para auditoría">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">N° empleado</th>
                <th scope="col">Cliente</th>
                <th scope="col">Proyecto</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            {!loading && !error && items.length > 0 && (
              <tbody>
                {items.map((resource) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    onSelect={() => navigate(`/auditoria/${resource.id}`, {
                      state: { breadcrumbSource: 'audit-selector' },
                    })}
                  />
                ))}
              </tbody>
            )}
          </table>

          {loading && <p className="resource-audit-selector__state" role="status">Cargando recursos…</p>}
          {!loading && error && (
            <div className="resource-audit-selector__state resource-audit-selector__state--error" role="alert">
              <p>No se pudieron cargar los recursos.</p>
              <button type="button" onClick={retry}>Reintentar</button>
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="resource-audit-selector__state" role="status">No se encontró ningún recurso</p>
          )}
        </div>
      </div>
    </section>
  )
}

function ResourceRow({
  resource,
  onSelect,
}: Readonly<{
  resource: RecursoApi
  onSelect: () => void
}>) {
  return (
    <tr
      aria-label={`Abrir auditoría de ${resource.name}`}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <td>
        <span className="resource-audit-selector__name">
          <span className="resource-audit-selector__avatar" aria-hidden="true">
            {getInitials(resource.name)}
          </span>
          {resource.name}
        </span>
      </td>
      <td>#{resource.employeeNumber}</td>
      <td>{resource.client?.name ?? '—'}</td>
      <td>{resource.project?.name ?? '—'}</td>
      <td>{getResourceStatusLabel(resource.status)}</td>
    </tr>
  )
}

function getResourceStatusLabel(status: RecursoApi['status']): string {
  if (typeof status === 'object') return status.label
  switch (status) {
    case 'ACTIVO':
      return 'Activo'
    case 'LICENCIA':
      return 'Licencia'
    case 'BAJA':
      return 'Baja'
    default:
      return status
  }
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase('es'))
    .join('')
}
