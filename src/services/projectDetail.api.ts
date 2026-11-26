import { apiFetch } from './api'
import { read } from './projects.api'
import type { ProjectDetail, ProjectDetailMembersResponse } from './projectDetail.types'

export const projectDetailApi = {
  async getProject(id: string): Promise<ProjectDetail> {
    const response = await apiFetch('planner', `/projects/${encodeURIComponent(id)}`)
    return read<ProjectDetail>(response)
  },

  async getMembers(id: string): Promise<ProjectDetailMembersResponse> {
    const response = await apiFetch('planner', `/projects/${encodeURIComponent(id)}/members`)
    return read<ProjectDetailMembersResponse>(response)
  },
}

export type ProjectDetailApi = typeof projectDetailApi
