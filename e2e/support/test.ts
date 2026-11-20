import { test as base, expect } from '@playwright/test'
import { FakeApi } from './fakeApi'
import { signInAs, type E2ERole } from './fakeKeycloak'

interface Fixtures {
  api: FakeApi
  /** Inicia sesión con el rol y abre la ruta. Por defecto Operations administrator */
  open: (path: string, role?: E2ERole) => Promise<void>
}

export const test = base.extend<Fixtures>({
  api: async ({ page }, provide) => {
    const api = new FakeApi()
    await api.install(page)
    await provide(api)
    // Ningún endpoint que la pantalla llame puede quedar sin simular: sería un error de contrato
    expect(api.unhandled, 'endpoints llamados que el backend no tiene').toEqual([])
  },
  // Depende de `api` para que el backend simulado esté instalado antes de abrir la app
  open: async ({ page, api }, provide) => {
    await provide(async (path, role = 'operations-administrator') => {
      expect(api.unhandled).toEqual([])
      await signInAs(page, role)
      await page.goto(path)
    })
  },
})

export { expect }
