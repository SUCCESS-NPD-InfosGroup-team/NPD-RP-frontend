import { useCallback, useEffect, useRef, useState } from 'react'
import { projectDetailApi } from '../services/projectDetail.api'
import type { ProjectDetail, ProjectDetailMember } from '../services/projectDetail.types'
import { ApiRequestError } from '../services/projects.types'

export function useProjectDetail(id: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [members, setMembers] = useState<ProjectDetailMember[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setLoading(true)
    setError(null)
    setProject(null)
    setMembers([])
    setTotal(null)

    try {
      const [projectResponse, membersResponse] = await Promise.all([
        projectDetailApi.getProject(id),
        projectDetailApi.getMembers(id),
      ])
      if (currentRequestId !== requestId.current) return

      setProject(projectResponse)
      setMembers(membersResponse.items)
      setTotal(membersResponse.total)
    } catch (cause) {
      if (currentRequestId !== requestId.current) return
      setError(cause)
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const request = window.setTimeout(() => { void reload() }, 0)
    return () => {
      window.clearTimeout(request)
      requestId.current += 1
    }
  }, [reload])

  const notFound = error instanceof ApiRequestError
    && error.status === 404
    && error.code === 'NOT_FOUND'

  return {
    project,
    members,
    total,
    loading,
    error,
    notFound,
    empty: total === 0 && members.length === 0 && project !== null,
    reload,
  }
}
