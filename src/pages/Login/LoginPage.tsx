// src/pages/Login/LoginPage.tsx

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role>('Operations administrator');

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    login(selectedRole);
    navigate('/recursos');
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Lado izquierdo naranja */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#E85D04',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>
          Cada recurso,
          <br /> en su vuelo.
        </h1>
        <p style={{ fontSize: '1.1em', lineHeight: '1.5' }}>
          El planificador de NPD en un solo lugar: asignaciones por cliente,
          vencimientos que llegan solos y un historial de cada cambio.
        </p>
      </div>

      {/* Lado derecho formulario */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F5F5F5',
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            width: '400px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ marginBottom: '10px' }}>Iniciar sesión</h2>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            Usa tu cuenta corporativa de Infosgroup.
          </p>

          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Correo corporativo</label>
          <input
            type="email"
            placeholder="nombre@infosgroup.com"
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '15px',
              marginTop: '5px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />

          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Contraseña</label>
          <input
            type="password"
            placeholder="Tu contraseña"
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '15px',
              marginTop: '5px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />

          <label style={{ fontSize: '12px', color: '#E85D04', fontWeight: 'bold' }}>
            Simular Rol (solo para pruebas):
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '20px',
              marginTop: '5px',
              border: '1px solid #E85D04',
              borderRadius: '4px',
            }}
          >
            <option value="Operations administrator">Operations administrator</option>
            <option value="NPD Lead">NPD Lead</option>
            <option value="Customer Success">Customer Success</option>
            <option value="Guest">Guest</option>
          </select>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#E85D04',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1em',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
};