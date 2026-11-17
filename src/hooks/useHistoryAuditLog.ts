import { useCallback, useEffect, useMemo, useState } from 'react'
import { getHistoryApi } from '../services/history'
import type { AuditLogFilters, AuditLogPage } from '../services/history.types'

interface HistoryAuditLogState {
  data?: AuditLogPage
  loading: boolean
  error?: unknown
}

export function useHistoryAuditLog(resourceId: number | string | null | undefined, filters: AuditLogFilters, page = 1) {
  const [state, setState] = useState<HistoryAuditLogState>({ loading: resourceId !== null && resourceId !== undefined })
  const [reloadKey, setReloadKey] = useState(0)

  const memoizedFilters = useMemo(() => filters, [filters])

  useEffect(() => {
    if (resourceId === null || resourceId === undefined) {
      return
    }

    let active = true
    const request = window.setTimeout(() => {
      setState((previous) => ({ ...previous, loading: true, error: undefined }))
      void getHistoryApi()
        .then((api) => api.listAuditLog(resourceId, memoizedFilters, page))
        .then((data) => {
          if (active) setState({ data, loading: false })
        })
        .catch((error: unknown) => {
          if (active) setState((previous) => ({ ...previous, loading: false, error }))
        })
    }, 0)

    return () => {
      active = false
      window.clearTimeout(request)
    }
  }, [memoizedFilters, page, reloadKey, resourceId])

  const refetch = useCallback(() => setReloadKey((value) => value + 1), [])

  return { ...state, refetch }
}

export default useHistoryAuditLog
