// src/context/AuthContext.tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { keycloak } from '../auth/keycloak';
import type { AuthUser, Role } from '../types';

interface AuthContextValue {
  user: AuthUser;
  roles: string[];
  hasRole: (role: Role) => boolean;
  /** Returns a token valid for at least 30 more seconds, refreshing it if needed. */
  getToken: () => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Must be rendered after initAuth() resolved, so the session already exists. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => {
    const token = keycloak.tokenParsed ?? {};
    const roles = token.realm_access?.roles ?? [];
    const username = (token.preferred_username as string | undefined) ?? '';
    return {
      user: {
        username,
        fullName: (token.name as string | undefined) || username,
        email: token.email as string | undefined,
      },
      roles,
      hasRole: (role) => roles.includes(role),
      getToken: async () => {
        await keycloak.updateToken(30);
        return keycloak.token ?? '';
      },
      logout: () => keycloak.logout({ redirectUri: window.location.origin }),
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
