import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAuth } from './auth/keycloak'
import { AuthProvider } from './context/AuthContext'

const root = createRoot(document.getElementById('root')!)

// The app is only for signed-in users: nothing renders until Keycloak has a session
// (without one, initAuth redirects to the Keycloak login page)
function start() {
  initAuth()
    .then(() =>
      root.render(
        <StrictMode>
          <AuthProvider>
            <App />
          </AuthProvider>
        </StrictMode>,
      ),
    )
    .catch(() =>
      root.render(
        <div role="alert" style={{ padding: 16 }}>
          <p>No se pudo conectar con el servicio de autenticación.</p>
          <button type="button" onClick={start}>Reintentar</button>
        </div>,
      ),
    )
}

start()
