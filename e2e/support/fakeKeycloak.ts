import type { Page } from '@playwright/test'

/** Origen ficticio de Keycloak: Playwright intercepta todo lo que va ahí, nunca sale a la red */
export const KEYCLOAK_URL = 'https://keycloak.e2e'
const REALM = 'npd'
const CLIENT_ID = 'npd-frontend'

export type E2ERole = 'operations-administrator' | 'npd-leader' | 'customer-success' | 'guest'

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** keycloak-js no valida la firma, solo lee el payload; basta un JWT sin firmar real */
function jwt(payload: Record<string, unknown>): string {
  return `${base64url({ alg: 'RS256', typ: 'JWT' })}.${base64url(payload)}.e2e-signature`
}

/**
 * Inicia sesión con un rol sin un Keycloak real: responde al login (PKCE, response_mode=fragment)
 * devolviendo el `code` a la app y al token endpoint con tokens que llevan el rol en realm_access.
 */
export async function signInAs(page: Page, role: E2ERole, username = 'e2e.user'): Promise<void> {
  let nonce = ''

  await page.route(`${KEYCLOAK_URL}/**`, async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/protocol/openid-connect/auth')) {
      nonce = url.searchParams.get('nonce') ?? ''
      const redirect = new URL(url.searchParams.get('redirect_uri') ?? '/')
      redirect.hash = new URLSearchParams({
        state: url.searchParams.get('state') ?? '',
        session_state: 'e2e-session',
        code: 'e2e-code',
      }).toString()
      await route.fulfill({ status: 302, headers: { location: redirect.toString() } })
      return
    }

    if (url.pathname.endsWith('/protocol/openid-connect/token')) {
      const now = Math.floor(Date.now() / 1000)
      const common = {
        iss: `${KEYCLOAK_URL}/realms/${REALM}`,
        aud: CLIENT_ID,
        azp: CLIENT_ID,
        sub: `e2e-${role}`,
        iat: now,
        exp: now + 3600,
        sid: 'e2e-session',
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: jwt({ ...common, typ: 'Bearer', preferred_username: username, name: 'Usuaria E2E', realm_access: { roles: [role] } }),
          refresh_token: jwt({ ...common, typ: 'Refresh' }),
          id_token: jwt({ ...common, typ: 'ID', nonce, preferred_username: username }),
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_expires_in: 3600,
        }),
      })
      return
    }

    if (url.pathname.endsWith('/protocol/openid-connect/logout')) {
      await route.fulfill({ status: 302, headers: { location: url.searchParams.get('post_logout_redirect_uri') ?? '/' } })
      return
    }

    // 3p-cookies, login-status-iframe y demás: una página vacía
    await route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' })
  })

}
