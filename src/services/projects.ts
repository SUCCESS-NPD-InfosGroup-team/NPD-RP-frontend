import { projectsApi, type ProjectsApi } from './projects.api'

export type { ProjectsApi } from './projects.api'

export async function getProjectsApi(): Promise<ProjectsApi> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true') {
    const mock = await import('./mocks/projects.mock')
    return mock.projectsMock
  }
  return projectsApi
}
