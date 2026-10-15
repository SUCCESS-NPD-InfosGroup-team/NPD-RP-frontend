import { AuthContext } from './authContext'
import type { ReactNode } from 'react'
import {
  canRegisterResources,
  isUserRole,
} from '../components/layout/roleNavigation'

interface AuthProviderProps {
  role?: unknown
  displayName?: string
  children: ReactNode
}

export function AuthProvider({
  role: untrustedRole,
  displayName,
  children,
}: AuthProviderProps) {
  const role = isUserRole(untrustedRole) ? untrustedRole : null

  return (
    <AuthContext.Provider
      value={{
        role,
        displayName,
        canRegisterResources: canRegisterResources(role),
        canEditResources: canRegisterResources(role),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
