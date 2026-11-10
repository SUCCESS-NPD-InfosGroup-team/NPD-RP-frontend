// src/components/layout/Header.tsx
import { useAuth } from '../../context/AuthContext';
import { LogoutIcon } from '../icons';
import './Header.css';

export function Header() {
  const { user, logout, logoutInProgress } = useAuth();

  return (
    <header className="app-header">
      <span className="app-header__title">NPD Planner</span>
      <div className="app-header__user">
        <span>{user.fullName}</span>
        <button
          type="button"
          className="app-header__logout"
          onClick={() => void logout()}
          disabled={logoutInProgress}
        >
          <LogoutIcon />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
