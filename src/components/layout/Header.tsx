// src/components/layout/Header.tsx
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <span className="app-header__title">NPD Planner</span>
      <div className="app-header__user">
        <span>{user.fullName}</span>
        <button type="button" className="app-header__logout" onClick={() => void logout()}>
          <LogOut size={16} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
