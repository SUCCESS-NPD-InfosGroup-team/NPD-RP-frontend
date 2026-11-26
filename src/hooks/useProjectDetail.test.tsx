import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectDetailApi } from '../services/projectDetail.api'
import { ApiRequestError } from '../services/projects.types'
import { useProjectDetail } from './useProjectDetail'

vi.mock('../services/projectDetail.api', () => ({
  projectDetailApi: {
    getProject: vi.fn(),
    getMembers: vi.fn(),
  },
}))

const mockedProjectDetailApi = vi.mocked(projectDetailApi)
const project = {
  id: 8,
  name: 'Caja de Ahorros',
  client: { id: 5, name: 'CAJA DE AHORROS', isInternal: false },
  active: true,
  startDate: '2024-10-01',
  contractEndDate: '2026-12-31',
  daysToContractEnd: 35,
  teamSize: 1,
  pendingConfirmation: 1,
  indefiniteCount: 0,
  nextAssignmentEnd: '2026-12-31',
  leads: [{ id: 12, name: 'Ricardo Him' }],
  version: 3,
  updatedAt: '2026-11-25T18:30:00Z',
}

describe('useProjectDetail', () => {
  beforeEach(() => {
    mockedProjectDetailApi.getProject.mockReset()
    mockedProjectDetailApi.getMembers.mockReset()
    mockedProjectDetailApi.getProject.mockResolvedValue(project)
    mockedProjectDetailApi.getMembers.mockResolvedValue({ items: [], total: 0 })
  })

  it('loads project and members in parallel', async () => {
    const { result } = renderHook(() => useProjectDetail('8'))

    await waitFor(() => {
      expect(mockedProjectDetailApi.getProject).toHaveBeenCalledWith('8')
      expect(mockedProjectDetailApi.getMembers).toHaveBeenCalledWith('8')
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.project).toEqual(project)
    expect(result.current.total).toBe(0)
    expect(result.current.empty).toBe(true)
  })

  it('exposes a NOT_FOUND response as a not-found state', async () => {
    mockedProjectDetailApi.getProject.mockRejectedValue(new ApiRequestError({
      status: 404,
      code: 'NOT_FOUND',
      detail: 'No existe el proyecto.',
    }))
    const { result } = renderHook(() => useProjectDetail('404'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.notFound).toBe(true)
    expect(result.current.error).toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(result.current.project).toBeNull()
  })

  it('exposes non-404 errors without treating them as not found', async () => {
    mockedProjectDetailApi.getMembers.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useProjectDetail('8'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.notFound).toBe(false)
    expect(result.current.error).toEqual(new Error('Network error'))
    expect(result.current.empty).toBe(false)
  })

  it('reloads both responses on demand', async () => {
    const { result } = renderHook(() => useProjectDetail('8'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.reload()
    })

    expect(mockedProjectDetailApi.getProject).toHaveBeenCalledTimes(2)
    expect(mockedProjectDetailApi.getMembers).toHaveBeenCalledTimes(2)
    expect(result.current.project).toEqual(project)
  })
})
