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
  it('counts only projects ending within the next 30 days', async () => {
    mockedGetProjectsApi.mockResolvedValue({
      listProjects: vi.fn().mockResolvedValue({
        items: [
          { id: '1', name: 'Today', client: { id: '1', name: 'A', isInternal: false }, teamSize: 1, members: [], leads: [], startDate: '2026-01-01', contractEnd: '2026-11-01', daysToContractEnd: 0, pendingCount: 0, active: true },
          { id: '2', name: 'Thirty', client: { id: '2', name: 'B', isInternal: false }, teamSize: 1, members: [], leads: [], startDate: '2026-01-01', contractEnd: '2026-12-01', daysToContractEnd: 30, pendingCount: 0, active: true },
          { id: '3', name: 'Later', client: { id: '3', name: 'C', isInternal: false }, teamSize: 1, members: [], leads: [], startDate: '2026-01-01', contractEnd: '2027-01-01', daysToContractEnd: 31, pendingCount: 0, active: true },
          { id: '4', name: 'Unknown', client: { id: '4', name: 'D', isInternal: false }, teamSize: 1, members: [], leads: [], startDate: '2026-01-01', contractEnd: null, daysToContractEnd: null, pendingCount: 0, active: true },
        ],
        page: 1,
        pageSize: 25,
        total: 4,
        totalPages: 1,
      }),
      listClients: vi.fn(),
      createProject: vi.fn(),
      createClient: vi.fn(),
      listClientProjects: vi.fn(),
    })

    render(<SummaryProbe />)

    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
  })
})
