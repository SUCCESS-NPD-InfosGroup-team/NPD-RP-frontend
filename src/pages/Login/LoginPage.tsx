// src/pages/Login/LoginPage.tsx

import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const navigate = useNavigate();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    // Como usamos Keycloak, el login real lo maneja el AuthProvider.
    // Aquí solo redirigimos a la app (Keycloak interceptará si no hay sesión).
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
              marginBottom: '20px',
              marginTop: '5px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />

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
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};