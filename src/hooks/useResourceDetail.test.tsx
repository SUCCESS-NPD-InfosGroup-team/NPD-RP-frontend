import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { resourcesApi } from '../services/resources.api'
import type { ResourceResponse } from '../services/resources.types'
import { useResourceDetail } from './useResourceDetail'

vi.mock('../services/resources.api', () => ({
  resourcesApi: {
    getResource: vi.fn(),
    fetchLastChange: vi.fn(),
  },
}))

const mockedGetResource = vi.mocked(resourcesApi.getResource)
const mockedFetchLastChange = vi.mocked(resourcesApi.fetchLastChange)

describe('useResourceDetail', () => {
  it('stays empty when no resource is selected', async () => {
    const { result } = renderHook(() => useResourceDetail(null))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.resource).toBeUndefined()
    expect(result.current.lastChange).toBeUndefined()
    expect(mockedGetResource).not.toHaveBeenCalled()
  })

  it('loads the resource and then its last change', async () => {
    const resource = { id: 7 } as Awaited<ReturnType<typeof resourcesApi.getResource>>
    mockedGetResource.mockResolvedValue(resource)
    mockedFetchLastChange.mockResolvedValue(null)

    const { result } = renderHook(() => useResourceDetail(7))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.resource).toBe(resource)
    expect(result.current.lastChange).toBeNull()
    expect(mockedFetchLastChange).toHaveBeenCalledWith(7, expect.any(AbortSignal))
  })

  it('does not request the last change when the resource fails', async () => {
    mockedGetResource.mockRejectedValue(new Error('404'))

    const { result } = renderHook(() => useResourceDetail(7))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toEqual(new Error('404'))
    expect(mockedFetchLastChange).not.toHaveBeenCalled()
  })

  it('keeps only the latest resource response', async () => {
    let resolveFirst: ((value: ResourceResponse | PromiseLike<ResourceResponse>) => void) | undefined
    mockedGetResource
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce({ id: 2 } as Awaited<ReturnType<typeof resourcesApi.getResource>>)
    mockedFetchLastChange.mockResolvedValue(null)

    const { result, rerender } = renderHook(({ id }: { id: number }) => useResourceDetail(id), {
      initialProps: { id: 1 },
    })
    rerender({ id: 2 })

    await waitFor(() => expect(result.current.resource?.id).toBe(2))
    resolveFirst?.({ id: 1 } as ResourceResponse)
    expect(result.current.resource?.id).toBe(2)
  })

  it('ignores an aborted request', async () => {
    mockedGetResource.mockRejectedValue(new DOMException('Aborted', 'AbortError'))

    const { result } = renderHook(() => useResourceDetail(7))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeUndefined()
  })

  it('refetches the selected resource', async () => {
    mockedGetResource.mockResolvedValue({ id: 7 } as ResourceResponse)
    mockedFetchLastChange.mockResolvedValue(null)
    const { result } = renderHook(() => useResourceDetail(7))

    await waitFor(() => expect(mockedGetResource).toHaveBeenCalledTimes(1))
    result.current.refetch()
    await waitFor(() => expect(mockedGetResource).toHaveBeenCalledTimes(2))
  })
})
