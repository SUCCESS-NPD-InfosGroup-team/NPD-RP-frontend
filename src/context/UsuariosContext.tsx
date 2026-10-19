// src/context/UsuariosContext.tsx

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User, Role } from '../types';
// 🛠️ Cambiamos la importación a la función
import { getMockUsers } from '../services/mockData';

interface UsuariosContextType {
  usuarios: User[];
  addUsuario: (usuario: User) => void;
  updateUsuario: (usuario: User) => void;
  deleteUsuario: (id: string) => void;
  toggleStatus: (id: string) => void;
}

const UsuariosContext = createContext<UsuariosContextType | undefined>(undefined);

export function UsuariosProvider({ children }: { children: ReactNode }) {
  // 🛠️ Usamos la función getMockUsers() con paréntesis
  const [usuarios, setUsuarios] = useState<User[]>(getMockUsers());

  const addUsuario = (usuario: User) => {
    setUsuarios((prev) => [...prev, usuario]);
  };

  const updateUsuario = (usuario: User) => {
    setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? usuario : u)));
  };

  const deleteUsuario = (id: string) => {
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  };

  const toggleStatus = (id: string) => {
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === 'Activo' ? 'Desactivado' : 'Activo' } : u
      )
    );
  };

  return (
    <UsuariosContext.Provider value={{ usuarios, addUsuario, updateUsuario, deleteUsuario, toggleStatus }}>
      {children}
    </UsuariosContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUsuarios() {
  const context = useContext(UsuariosContext);
  if (!context) throw new Error('useUsuarios debe usarse dentro de UsuariosProvider');
  return context;
}

// Re-export Role para conveniencia
export type { Role };