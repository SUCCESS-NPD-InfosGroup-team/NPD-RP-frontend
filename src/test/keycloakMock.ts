// Shared fake of src/auth/keycloak.ts for tests: a signed-in Operations Administrator
import { vi } from 'vitest';

export const fakeKeycloak = {
  token: 'fake-access-token',
  tokenParsed: {
    preferred_username: 'juan.david',
    name: 'Juan David Vela Coronado',
    email: 'juan.david@example.test',
    realm_access: { roles: ['operations-administrator'] },
  } as Record<string, unknown> | undefined,
  updateToken: vi.fn(async () => true),
  login: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
};
