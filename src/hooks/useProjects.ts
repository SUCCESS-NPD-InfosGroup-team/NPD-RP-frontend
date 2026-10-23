import { useCallback, useEffect, useState } from 'react'
import { getProjectsApi, type ProjectsApi } from '../services/projects'
import type { Page, Project, ProjectFilters, ProjectsSummary } from '../services/projects.types'

export function useProjects(filters: ProjectFilters = {}) {
  const [api, setApi] = useState<ProjectsApi>()
  const [data, setData] = useState<Page<Project>>()
  const [summary, setSummary] = useState<ProjectsSummary>()
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>()

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const selectedApi = api ?? await getProjectsApi()
      setApi(selectedApi)
      const projectsPage = await selectedApi.listProjects(filters, page)
      setData(projectsPage)
      setSummary({
        activeProjects: projectsPage.total,
        activeClients: new Set(projectsPage.items.map((project) => project.client.id)).size,
        contractEndingSoon: projectsPage.items.filter((project) => project.contractEnd !== null).length,
        withoutTeam: projectsPage.items.filter((project) => project.teamSize === 0).length,
        unassignedPeople: 0,
      })
    } catch (cause) {
      setError(cause)
    } finally {
      setLoading(false)
    }
  }, [api, filters, page])

  useEffect(() => {
    const request = window.setTimeout(() => { void refetch() }, 0)
    return () => window.clearTimeout(request)
  }, [refetch])

  return { data, summary, loading, error, filters, page, setPage, refetch, api }
}
