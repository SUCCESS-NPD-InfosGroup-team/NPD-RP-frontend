import { useCallback, useEffect, useState } from 'react'
import { resourcesApi } from '../services/resources.api'
import type { ResourceLastChange, ResourceResponse } from '../services/resources.types'

interface ResourceDetailState {
  resource: ResourceResponse | undefined
  lastChange: ResourceLastChange | null | undefined
  loading: boolean
  error: unknown
  lastChangeError: unknown
  refetch: () => void
}

export function useResourceDetail(id: number | string | null): ResourceDetailState {
  const [resource, setResource] = useState<ResourceResponse>()
  const [lastChange, setLastChange] = useState<ResourceLastChange | null>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>()
  const [lastChangeError, setLastChangeError] = useState<unknown>()
  const [reload, setReload] = useState(0)

  const refetch = useCallback(() => setReload((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    void (async () => {
      if (id === null) {
        setResource(undefined)
        setLastChange(undefined)
        setError(undefined)
        setLastChangeError(undefined)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(undefined)
      setLastChangeError(undefined)
      setResource(undefined)
      setLastChange(undefined)

      try {
        const resourceResponse = await resourcesApi.getResource(id, controller.signal)
        if (!active) return
        setResource(resourceResponse)

        try {
          const lastChangeResponse = await resourcesApi.fetchLastChange(id, controller.signal)
          if (!active) return
          setLastChange(lastChangeResponse)
        } catch (cause) {
          if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return
          setLastChangeError(cause)
        }
      } catch (cause) {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return
        setError(cause)
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [id, reload])

  return { resource, lastChange, loading, error, lastChangeError, refetch }
}
