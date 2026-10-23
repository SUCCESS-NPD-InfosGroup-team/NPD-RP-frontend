import { afterEach, describe, expect, it, vi } from 'vitest'
import { projectsApi } from './projects.api'

describe('getProjectsApi', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('uses the real API by default', async () => {
    vi.stubEnv('DEV', false)
    const { getProjectsApi } = await import('./projects')
    await expect(getProjectsApi()).resolves.toBe(projectsApi)
  })

  it('does not select the mock outside development', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_USE_MOCK_API', 'true')
    const { getProjectsApi } = await import('./projects')
    await expect(getProjectsApi()).resolves.toBe(projectsApi)
  })
})
