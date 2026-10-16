// src/services/api.ts
import { keycloak, updateTokenOrLogout } from '../auth/keycloak';

/**
 * fetch against the backend with the user's token. Paths are relative to /api,
 * which Vite proxies to the backend, so the browser never needs CORS.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await updateTokenOrLogout(30);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${keycloak.token}`);

  const response = await fetch(`/api${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
  if (response.status === 401) {
    // Session revoked or expired in Keycloak: send the user back to the login page
    await keycloak.login();
  }
  return response;
}
