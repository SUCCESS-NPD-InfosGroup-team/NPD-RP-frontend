// src/context/AuthContext.tsx

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Role } from '../types';
import { getMockUsers } from '../services/mockData';

interface AuthContextType {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
  hasAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (role: Role) => {
    // 🛠️ AQUÍ ESTABA EL ERROR: Cambiamos MOCK_USERS por getMockUsers()
    const foundUser = getMockUsers().find((u) => u.role === role);
    if (foundUser) setUser(foundUser);
  };

  const logout = () => setUser(null);

  const hasAccess = (module: string): boolean => {
    if (!user) return false;
    if (user.role === 'Operations administrator') return true;
    if (user.role === 'Guest' && module === 'Recursos') return true;
    if (
      (user.role === 'NPD Lead' || user.role === 'Customer Success') &&
      ['Recursos', 'Vacaciones'].includes(module)
    )
      return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};