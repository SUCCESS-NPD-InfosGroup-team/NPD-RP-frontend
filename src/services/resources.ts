import { resourcesApi, type ResourcesApi } from './resources.api'

export type { ResourcesApi } from './resources.api'

export async function getResourcesApi(): Promise<ResourcesApi> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true') {
    const mock = await import('./mocks/resources.mock')
    return mock.resourcesMock
  }
  return resourcesApi
}
