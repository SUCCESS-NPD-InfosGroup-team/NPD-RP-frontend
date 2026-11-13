import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useProjects } from './useProjects'
import { getProjectsApi } from '../services/projects'

vi.mock('../services/projects', () => ({ getProjectsApi: vi.fn() }))

const mockedGetProjectsApi = vi.mocked(getProjectsApi)

function SummaryProbe() {
  const { summary } = useProjects()
  return <output>{summary?.contractEndingSoon ?? 'loading'}</output>
}

describe('useProjects', () => {
  it('uses backend KPIs instead of deriving totals from the visible page', async () => {
    const listProjects = vi.fn().mockResolvedValue({
      items: [
        { id: '1', name: 'Today', client: { id: '1', name: 'A', isInternal: false }, teamSize: 1, members: [], leads: [], startDate: '2026-01-01', contractEnd: '2026-11-01', daysToContractEnd: 0, pendingCount: 0, active: true },
      ],
      page: 1,
      pageSize: 25,
      total: 40,
      totalPages: 2,
    })
    const getKpis = vi.fn().mockResolvedValue({
      activeProjects: 40,
      activeClients: 15,
      contractEndingSoon: 3,
      withoutTeam: 2,
      unassignedPeople: 5,
    })
    mockedGetProjectsApi.mockResolvedValue({
      listProjects,
      getKpis,
      listClients: vi.fn(),
      createProject: vi.fn(),
      listClientProjects: vi.fn(),
    })

    render(<SummaryProbe />)

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    expect(getKpis).toHaveBeenCalledWith({})
    expect(listProjects).toHaveBeenCalledWith({}, 1)
  })
})
