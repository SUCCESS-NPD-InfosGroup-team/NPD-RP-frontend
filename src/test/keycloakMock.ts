// Shared fake of src/auth/keycloak.ts for tests: a signed-in Operations Administrator
import { vi } from 'vitest';

export const fakeKeycloak = {
  clientId: 'npd-frontend',
  authenticated: true,
  token: 'fake-access-token',
  tokenParsed: {
    preferred_username: 'juan.david',
    name: 'Juan David Vela Coronado',
    email: 'juan.david@example.test',
    realm_access: { roles: ['operations-administrator'] },
  } as Record<string, unknown> | undefined,
  updateToken: vi.fn<(minValidity?: number) => Promise<boolean>>().mockResolvedValue(true),
  login: vi.fn(async () => {}),
  logout: vi.fn<
    (options?: { redirectUri?: string }) => Promise<void>
  >().mockResolvedValue(),
  init: vi.fn(async () => true),
  onTokenExpired: undefined as (() => void) | undefined,
  onAuthLogout: undefined as (() => void) | undefined,
};

export const fakeAuthModule = {
  keycloak: fakeKeycloak,
  logoutAuth: () => fakeKeycloak.logout({ redirectUri: window.location.origin }),
  subscribeToSessionEnd: () => () => {},
  updateTokenOrLogout: (minValidity?: number) => fakeKeycloak.updateToken(minValidity),
};
