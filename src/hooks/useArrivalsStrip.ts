import { useCallback, useEffect, useState } from 'react'
import { getArrivalsApi } from '../services/arrivals'
import type { ArrivalsStrip } from '../services/arrivals.types'

interface ArrivalsStripState {
  data?: ArrivalsStrip
  loading: boolean
  error?: unknown
}

/** Strip of "Arribos próximos" at the top of Recursos (HU-06 CA-01) */
export function useArrivalsStrip() {
  const [state, setState] = useState<ArrivalsStripState>({ loading: true })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    // Deferred so the state updates never run synchronously inside the effect (same pattern as useArrivals)
    const request = window.setTimeout(() => {
      setState((previous) => ({ ...previous, loading: true, error: undefined }))
      getArrivalsApi()
        .then((api) => api.getStrip())
        .then((data) => { if (active) setState({ data, loading: false }) })
        .catch((error: unknown) => {
          if (active) setState((previous) => ({ ...previous, loading: false, error }))
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(request)
    }
  }, [reloadKey])

  const refetch = useCallback(() => setReloadKey((key) => key + 1), [])

  return { ...state, refetch }
}
