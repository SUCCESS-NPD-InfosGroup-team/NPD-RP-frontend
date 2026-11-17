import { historyApi, type HistoryApi } from './history.api'

export type { HistoryApi } from './history.api'

export async function getHistoryApi(): Promise<HistoryApi> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true') {
    const mock = await import('./mocks/history.mock')
    return mock.historyMock
  }
  return historyApi
}
