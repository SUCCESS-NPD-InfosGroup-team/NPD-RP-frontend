// src/auth/keycloak.ts
import Keycloak from 'keycloak-js';

// Defaults match the local docker-compose (infra repo); override with VITE_KEYCLOAK_* in .env
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8081',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'npd',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'npd-frontend',
});

const LOGOUT_CHANNEL_NAME = 'npd-auth';
const LOGOUT_MESSAGE: Readonly<{ type: 'logout' }> = { type: 'logout' };

interface LogoutMessage {
  type: 'logout';
}

const sessionEndListeners = new Set<() => void>();
let initPromise: Promise<void> | undefined;
let logoutChannel: BroadcastChannel | undefined;
let lifecycleInstalled = false;
let sessionEnded = false;
let loginRedirectStarted = false;
let logoutPromise: Promise<void> | undefined;
let keycloakLogoutStarted = false;
let authLogoutEvents = 0;

function clearSessionMemory(): void {
  keycloak.authenticated = false;
  keycloak.token = undefined;
  keycloak.tokenParsed = undefined;
  keycloak.refreshToken = undefined;
  keycloak.refreshTokenParsed = undefined;
  keycloak.idToken = undefined;
  keycloak.idTokenParsed = undefined;
  keycloak.subject = undefined;
  keycloak.realmAccess = undefined;
  keycloak.resourceAccess = undefined;
  keycloak.onTokenExpired = undefined;
}

function notifySessionEnded(): void {
  for (const listener of sessionEndListeners) {
    listener();
  }
}

function getLogoutChannel(): BroadcastChannel | undefined {
  if (typeof BroadcastChannel === 'undefined') {
    return undefined;
  }

  if (!logoutChannel) {
    logoutChannel = new BroadcastChannel(LOGOUT_CHANNEL_NAME);
    logoutChannel.onmessage = (event: MessageEvent<unknown>) => {
      if (isLogoutMessage(event.data)) {
        void startKeycloakLogout(false, false);
      }
    };
  }

  return logoutChannel;
}

function isLogoutMessage(value: unknown): value is LogoutMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'logout'
  );
}

function publishLogout(): void {
  getLogoutChannel()?.postMessage(LOGOUT_MESSAGE);
}

function redirectToLogin(): void {
  if (loginRedirectStarted) {
    return;
  }

  loginRedirectStarted = true;
  void keycloak.login().catch((error: unknown) => {
    console.error('Unable to redirect to Keycloak login.', error);
    loginRedirectStarted = false;
    window.location.assign(window.location.origin);
  });
}

function endSession(broadcast: boolean, redirect: boolean): void {
  const isFirstEnd = !sessionEnded;
  sessionEnded = true;
  clearSessionMemory();

  if (isFirstEnd) {
    if (broadcast) {
      publishLogout();
    }
    notifySessionEnded();
  }

  if (redirect) {
    redirectToLogin();
  }
}

export function handlePageShow(
  event: Pick<PageTransitionEvent, 'persisted'>,
  reload: () => void = () => window.location.reload(),
): void {
  if (event.persisted && !(keycloak.authenticated && keycloak.token)) {
    endSession(false, false);
    reload();
  }
}

function installAuthLifecycle(): void {
  if (lifecycleInstalled) {
    return;
  }

  lifecycleInstalled = true;
  getLogoutChannel();
  window.addEventListener('pageshow', handlePageShow);
  keycloak.onAuthLogout = () => {
    authLogoutEvents += 1;
    const wasAuthenticated = keycloak.authenticated;
    endSession(true, wasAuthenticated);
  };
}

export function subscribeToSessionEnd(listener: () => void): () => void {
  sessionEndListeners.add(listener);
  return () => {
    sessionEndListeners.delete(listener);
  };
}

export async function updateTokenOrLogout(minValidity?: number): Promise<boolean> {
  const previousAuthLogoutEvents = authLogoutEvents;

  try {
    return await keycloak.updateToken(minValidity);
  } catch (error) {
    const keycloakWillRedirect = authLogoutEvents !== previousAuthLogoutEvents;
    endSession(true, !keycloakWillRedirect);
    throw error;
  }
}

export function logoutAuth(): Promise<void> {
  return startKeycloakLogout(true, true);
}

function startKeycloakLogout(
  broadcast: boolean,
  fallbackToLogin: boolean,
): Promise<void> {
  if (keycloakLogoutStarted) {
    return logoutPromise ?? Promise.resolve();
  }

  keycloakLogoutStarted = true;
  loginRedirectStarted = false;
  const isFirstEnd = !sessionEnded;
  sessionEnded = true;

  if (broadcast) {
    publishLogout();
  }
  clearSessionMemory();
  if (isFirstEnd) {
    notifySessionEnded();
  }

  logoutPromise = (async () => {
    try {
      await keycloak.logout({ redirectUri: window.location.origin });
    } catch (error: unknown) {
      console.error('Keycloak logout failed.', error);
      if (fallbackToLogin) {
        redirectToLogin();
      }
    }
  })();

  return logoutPromise;
}

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
      sessionEnded = false;
      loginRedirectStarted = false;
      keycloakLogoutStarted = false;
      installAuthLifecycle();
      keycloak.onTokenExpired = () => {
        void updateTokenOrLogout().catch((error: unknown) => {
          console.error('Unable to refresh the Keycloak session.', error);
        });
      };
    })
    .catch((error: unknown) => {
      // Allow a retry after a failure (e.g. Keycloak not reachable yet)
      initPromise = undefined;
      throw error;
    });
  return initPromise;
}
