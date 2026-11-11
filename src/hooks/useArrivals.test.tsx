import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useMemo } from 'react'
import { useArrivals } from './useArrivals'
import { getArrivalsApi } from '../services/arrivals'

vi.mock('../services/arrivals', () => ({ getArrivalsApi: vi.fn() }))

const mockedGetArrivalsApi = vi.mocked(getArrivalsApi)

function Probe() {
  const filters = useMemo(() => ({ windowDays: 30 as const }), [])
  const { data, loading, error, refetch } = useArrivals(filters, 1)
  return (
    <>
      <output>{loading ? 'loading' : error ? 'error' : data?.total ?? 'empty'}</output>
      <button onClick={refetch}>reload</button>
    </>
  )
}

describe('useArrivals', () => {
  it('loads data and refetches', async () => {
    const listArrivals = vi.fn().mockResolvedValue({
      summary: { total: 0, byType: { PENDING_CONFIRMATION: 0, ASSIGNMENT_END: 0, CONTRACT_END: 0, PROBATION_END: 0, VACATION_START: 0 } },
      items: [], page: 1, pageSize: 25, total: 0, totalPages: 0,
    })
    mockedGetArrivalsApi.mockResolvedValue({ listArrivals })
    render(<Probe />)
    await waitFor(() => expect(screen.getByText('0')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'reload' }))
    await waitFor(() => expect(listArrivals).toHaveBeenCalledTimes(2))
  })

  it('keeps the previous data and exposes errors', async () => {
    const listArrivals = vi.fn()
      .mockResolvedValueOnce({
        summary: { total: 0, byType: { PENDING_CONFIRMATION: 0, ASSIGNMENT_END: 0, CONTRACT_END: 0, PROBATION_END: 0, VACATION_START: 0 } },
        items: [], page: 1, pageSize: 25, total: 3, totalPages: 1,
      })
      .mockRejectedValueOnce(new Error('failed'))
    mockedGetArrivalsApi.mockResolvedValue({ listArrivals })
    render(<Probe />)
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    screen.getByRole('button', { name: 'reload' }).click()
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument())
  })
})
