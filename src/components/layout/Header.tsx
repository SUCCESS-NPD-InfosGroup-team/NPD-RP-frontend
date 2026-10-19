// src/components/layout/Header.tsx

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, LogOut, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RegistrarRecursoModal } from '../recursos/RegistarRecursoModal';

// Componente reutilizable para los enlaces de navegación con estado activo
const NavItem = ({ to, label, badge }: { to: string; label: string; badge?: string }) => {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        color: 'white',
        textDecoration: 'none',
        fontSize: '14px',
        padding: '8px 12px',
        borderRadius: '4px',
        fontWeight: isActive ? 'bold' : 'normal',
        backgroundColor: isActive ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
        borderBottom: isActive ? '2px solid white' : '2px solid transparent',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      })}
    >
      {label}
      {badge && (
        <span
          style={{
            fontSize: '0.65em',
            backgroundColor: 'black',
            padding: '2px 5px',
            borderRadius: '10px',
            marginLeft: '4px',
            fontWeight: 'normal',
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
};

export const Header = () => {
  const { user, logout, hasAccess } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <header
        style={{
          backgroundColor: '#E85D04',
          color: 'white',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ fontSize: '18px' }}>IG NPD Planner</h1>

          <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {hasAccess('Recursos') && <NavItem to="/recursos" label="Recursos" />}
            <NavItem to="/arribos-proximos" label="Arribos próximos" />
            {hasAccess('Tablero') && <NavItem to="/tablero" label="Tablero" />}
            {hasAccess('Vacaciones') && <NavItem to="/vacaciones" label="Vacaciones" />}
            {hasAccess('Infosweb') && <NavItem to="/infosweb" label="Infosweb" badge="En desarrollo" />}
            {hasAccess('Usuarios') && <NavItem to="/usuarios" label="Usuarios" />}
            {hasAccess('Usuarios') && <NavItem to="/auditoria" label="Auditoría" />}
            {hasAccess('Avisos') && <NavItem to="/avisos" label="Avisos" />}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '5px 10px', display: 'flex', alignItems: 'center' }}>
            <Search size={16} color="#666" />
            <input
              type="text"
              placeholder="Buscar recurso..."
              style={{ border: 'none', outline: 'none', marginLeft: '5px', width: '180px' }}
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              backgroundColor: '#1A365D',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            + Registrar recurso
          </button>

          <Bell size={20} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                backgroundColor: 'black',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {user.avatarInitials}
            </div>
            <button
              onClick={logout}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Modal de Registrar Recurso */}
      <RegistrarRecursoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};