import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevRightIcon } from '../../components/icons'
import { ArrivalsTable } from '../../components/arribos/ArrivalsTable'
import { ArrivalTypeCards } from '../../components/arribos/ArrivalTypeCards'
import { ARRIVAL_TYPE_META, countLabel, formatToday } from '../../components/arribos/arrivalsView'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Paginador } from '../../components/ui/Paginador'
import { useArrivals } from '../../hooks/useArrivals'
import { getProjectsApi } from '../../services/projects'
import { getResourcesApi } from '../../services/resources'
import type { Client } from '../../services/projects.types'
import type { CatalogItem } from '../../services/resources.types'
import {
  ARRIVALS_PAGE_SIZE,
  ARRIVAL_WINDOWS,
  type ArrivalType,
  type ArrivalWindow,
} from '../../services/arrivals.types'
import '../../components/arribos/ArribosPage.css'

export function ArribosProximosPage() {
  const [windowDays, setWindowDays] = useState<ArrivalWindow>(30)
  const [clientId, setClientId] = useState('')
  const [leaderId, setLeaderId] = useState('')
  const [type, setType] = useState<ArrivalType>()
  const [page, setPage] = useState(1)
  const [clients, setClients] = useState<Client[]>([])
  const [leaders, setLeaders] = useState<CatalogItem[]>([])
  const [leadersLoading, setLeadersLoading] = useState(true)
  const [leadersError, setLeadersError] = useState(false)

  const filters = useMemo(() => ({
    windowDays,
    clientId: clientId || undefined,
    leaderId: leaderId || undefined,
    type,
  }), [windowDays, clientId, leaderId, type])
  const { data, loading, error, refetch } = useArrivals(filters, page)

  useEffect(() => {
    let active = true
    void getProjectsApi()
      .then((api) => api.listClients())
      .then((items) => { if (active) setClients(items) })
      .catch(() => { if (active) setClients([]) })
    void getResourcesApi()
      .then((api) => api.getNpdLeads())
      .then((items) => { if (active) setLeaders(items) })
      .catch(() => {
        if (active) {
          setLeaders([])
          setLeadersError(true)
        }
      })
      .finally(() => { if (active) setLeadersLoading(false) })
    return () => { active = false }
  }, [])

  // Any filter change goes back to the first page
  function changeFilter(apply: () => void) {
    apply()
    setPage(1)
  }

  const activeFilters = [
    type && `Tipo: ${ARRIVAL_TYPE_META[type].label}`,
    clientId && `Cliente: ${clients.find((client) => client.id === clientId)?.name ?? clientId}`,
    leaderId && `Líder NPD: ${leaders.find((leader) => String(leader.id) === leaderId)?.name ?? leaderId}`,
  ].filter(Boolean)
  const total = data?.total ?? 0
  const from = (page - 1) * ARRIVALS_PAGE_SIZE + 1

  return (
    <section className="screen arrivals-page">
      <nav className="arrivals-page__crumbs" aria-label="Ruta de navegación">
        <Link to="/recursos">Recursos</Link>
        <ChevRightIcon />
        <span aria-current="page">Arribos próximos</span>
      </nav>
      <header className="arrivals-page__header">
        <div>
          <h1 className="page-heading">Arribos próximos</h1>
          <p className="arrivals-page__subtitle">
            Fines de asignación, de contrato y de probatoria, y vacaciones que empiezan. Hoy es {formatToday()}.
          </p>
        </div>
        {/* TODO SCRUM-158: add "Exportar" (CA-08, with the pre-export notice) when the export endpoint exists. */}
      </header>

      <ArrivalTypeCards
        summary={data?.summary}
        selected={type}
        onSelect={(next) => changeFilter(() => setType(next))}
      />

      <div className="arrivals-page__panel">
        <div className="arrivals-page__filters">
          <Field
            id="arrivals-window"
            label="Ventana"
            type="select"
            value={String(windowDays)}
            onChange={(event) => changeFilter(() => setWindowDays(Number(event.target.value) as ArrivalWindow))}
            options={ARRIVAL_WINDOWS.map((days) => ({ value: String(days), label: `Próximos ${days} días` }))}
          />
          <Field
            id="arrivals-client"
            label="Cliente"
            type="select"
            value={clientId}
            onChange={(event) => changeFilter(() => setClientId(event.target.value))}
            options={[{ value: '', label: 'Todos' }, ...clients.map((client) => ({ value: client.id, label: client.name }))]}
          />
          <Field
            id="arrivals-leader"
            label="Líder NPD"
            type="select"
            value={leaderId}
            onChange={(event) => changeFilter(() => setLeaderId(event.target.value))}
            options={[
              { value: '', label: leadersLoading ? 'Cargando líderes…' : 'Todos' },
              ...leaders.map((leader) => ({ value: String(leader.id), label: leader.name })),
            ]}
            state={leadersError ? 'error' : 'default'}
            disabled={leadersLoading || leadersError}
            error={leadersError ? 'No se pudieron cargar los líderes NPD.' : undefined}
          />
        </div>

        <div className="arrivals-page__applied">
          {activeFilters.length ? (
            <>
              <span>Filtros: {activeFilters.join(' · ')}</span>
              <Button
                variant="ghost"
                onClick={() => changeFilter(() => { setType(undefined); setClientId(''); setLeaderId('') })}
              >
                Limpiar filtros
              </Button>
            </>
          ) : (
            <span>Sin filtros · todos los tipos, clientes y líderes</span>
          )}
        </div>

        <div className="arrivals-page__bar">
          <span>
            <strong>{countLabel(total, 'evento', 'eventos')}</strong>
            {` en los próximos ${windowDays} días · ordenados por fecha`}
          </span>
          {total > 0 && (
            <Paginador
              range={`${from}–${Math.min(page * ARRIVALS_PAGE_SIZE, total)} de ${total}`}
              page={page}
              totalPages={data?.totalPages ?? Math.ceil(total / ARRIVALS_PAGE_SIZE)}
              onPageChange={setPage}
            />
          )}
        </div>

        {error ? (
          <div className="arrivals-page__empty arrivals-page__empty--error" role="alert">
            <p>No se pudieron cargar los arribos próximos.</p>
            <Button variant="secondary" onClick={refetch}>Reintentar</Button>
          </div>
        ) : loading && !data ? (
          <div className="arrivals-page__empty">Cargando arribos próximos…</div>
        ) : data?.items.length ? (
          <ArrivalsTable events={data.items} />
        ) : (
          <div className="arrivals-page__empty">No hay eventos con estos filtros en los próximos {windowDays} días.</div>
        )}
      </div>
    </section>
  )
}
