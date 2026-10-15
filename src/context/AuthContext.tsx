// src/context/AuthContext.tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  keycloak,
  logoutAuth,
  subscribeToSessionEnd,
  updateTokenOrLogout,
} from '../auth/keycloak';
import type { AuthUser, Role } from '../types';

interface AuthContextValue {
  user: AuthUser;
  roles: string[];
  isAuthenticated: boolean;
  logoutInProgress: boolean;
  hasRole: (role: Role) => boolean;
  /** Returns a token valid for at least 30 more seconds, refreshing it if needed. */
  getToken: () => Promise<string>;
  logout: () => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRoleClaim(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.roles)) return [];
  return value.roles.filter((role: unknown): role is string => typeof role === 'string');
}

function getTokenRoles(token: unknown): string[] {
  if (!isRecord(token)) return [];

  const realmRoles = getRoleClaim(token.realm_access);
  const resourceAccess = token.resource_access;
  const clientAccess =
    typeof keycloak.clientId === 'string' && isRecord(resourceAccess)
      ? resourceAccess[keycloak.clientId]
      : undefined;
  const clientRoles = getRoleClaim(clientAccess);

  return [...new Set([...realmRoles, ...clientRoles])];
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Must be rendered after initAuth() resolved, so the session already exists. */
export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isAuthenticated, setIsAuthenticated] = useState(keycloak.authenticated);
  const [logoutInProgress, setLogoutInProgress] = useState(false);

  useEffect(
    () => subscribeToSessionEnd(() => setIsAuthenticated(false)),
    [],
  );

  const logout = useCallback(async () => {
    setLogoutInProgress(true);
    await logoutAuth();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const token = keycloak.tokenParsed ?? {};
    const roles = getTokenRoles(token);
    const username = (token.preferred_username as string | undefined) ?? '';
    return {
      user: {
        username,
        fullName: (token.name as string | undefined) || username,
        email: token.email as string | undefined,
      },
      roles,
      isAuthenticated,
      logoutInProgress,
      hasRole: (role) => roles.includes(role),
      getToken: async () => {
        await updateTokenOrLogout(30);
        return keycloak.token ?? '';
      },
      logout,
    };
  }, [isAuthenticated, logout, logoutInProgress]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
