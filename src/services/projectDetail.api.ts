import { apiFetch } from './api'
import { read } from './projects.api'
import type {
  ProjectDetail,
  ProjectDetailMembersResponse,
  UpdateProjectRequest,
  UpdateProjectResponse,
} from './projectDetail.types'

export const projectDetailApi = {
  async getProject(id: string): Promise<ProjectDetail> {
    const response = await apiFetch('planner', `/projects/${encodeURIComponent(id)}`)
    return read<ProjectDetail>(response)
  },

  async getMembers(id: string): Promise<ProjectDetailMembersResponse> {
    const response = await apiFetch('planner', `/projects/${encodeURIComponent(id)}/members`)
    return read<ProjectDetailMembersResponse>(response)
  },

  async updateProject(id: string, input: UpdateProjectRequest): Promise<UpdateProjectResponse> {
    const response = await apiFetch('planner', `/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return read<UpdateProjectResponse>(response)
  },

  async deactivateProject(id: string, version: number): Promise<ProjectDetail> {
    const response = await apiFetch('planner', `/projects/${encodeURIComponent(id)}/deactivation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    })
    return read<ProjectDetail>(response)
  },

  async reactivateProject(id: string, version: number): Promise<ProjectDetail> {
    const response = await apiFetch('planner', `/projects/${encodeURIComponent(id)}/reactivation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    })
    return read<ProjectDetail>(response)
  },
}

export type ProjectDetailApi = typeof projectDetailApi
