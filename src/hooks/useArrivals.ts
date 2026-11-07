import { useCallback, useEffect, useState } from 'react'
import { getArrivalsApi } from '../services/arrivals'
import type { ArrivalFilters, ArrivalsPage } from '../services/arrivals.types'

interface ArrivalsState {
  data?: ArrivalsPage
  loading: boolean
  error?: unknown
}

/** `filters` must be memoized by the caller: a new object on every render refetches in a loop. */
export function useArrivals(filters: ArrivalFilters, page: number) {
  const [state, setState] = useState<ArrivalsState>({ loading: true })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    // Deferred so the state updates never run synchronously inside the effect (same pattern as useProjects)
    const request = window.setTimeout(() => {
      setState((previous) => ({ ...previous, loading: true, error: undefined }))
      getArrivalsApi()
        .then((api) => api.listArrivals(filters, page))
        .then((data) => { if (active) setState({ data, loading: false }) })
        .catch((error: unknown) => {
          if (active) setState((previous) => ({ ...previous, loading: false, error }))
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(request)
    }
  }, [filters, page, reloadKey])

  const refetch = useCallback(() => setReloadKey((key) => key + 1), [])

  return { ...state, refetch }
}
