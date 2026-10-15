// src/auth/keycloak.ts
import Keycloak from 'keycloak-js';

// Defaults match the local docker-compose (infra repo); override with VITE_KEYCLOAK_* in .env
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8081',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'npd',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'npd-frontend',
});

let initPromise: Promise<void> | undefined;

/**
 * Starts the session before the app renders. Without a session Keycloak redirects
 * to its login page, so the app never renders for anonymous users.
 * Runs only once: keycloak-js throws if init is called twice.
 */
export function initAuth(): Promise<void> {
  initPromise ??= keycloak
    .init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      // The session iframe relies on third-party cookies, which browsers block
      checkLoginIframe: false,
    })
    .then(() => {
      keycloak.onTokenExpired = () => {
        keycloak.updateToken().catch(() => keycloak.login());
      };
    })
    .catch((error: unknown) => {
      // Allow a retry after a failure (e.g. Keycloak not reachable yet)
      initPromise = undefined;
      throw error;
    });
  return initPromise;
}
