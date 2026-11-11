import { arrivalsApi, type ArrivalsApi } from './arrivals.api'

export type { ArrivalsApi } from './arrivals.api'

export async function getArrivalsApi(): Promise<ArrivalsApi> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true') {
    const mock = await import('./mocks/arrivals.mock')
    return mock.arrivalsMock
  }
  return arrivalsApi
}
