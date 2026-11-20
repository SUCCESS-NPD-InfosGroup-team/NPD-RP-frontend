import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

/**
 * E2E del módulo Recursos. Keycloak y la API se simulan en el navegador (e2e/support), así que
 * corren en CI sin backend ni Keycloak. `PW_CHROME_CHANNEL=chrome` usa el Chrome instalado.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHROME_CHANNEL } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      VITE_KEYCLOAK_URL: 'https://keycloak.e2e',
      VITE_KEYCLOAK_REALM: 'npd',
      VITE_KEYCLOAK_CLIENT_ID: 'npd-frontend',
      VITE_USE_MOCK_API: 'false',
    },
  },
})
