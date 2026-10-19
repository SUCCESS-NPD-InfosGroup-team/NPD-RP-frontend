// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuditoriaProvider } from './context/AuditoriaContext';
import { AvisosProvider } from './context/AvisosContext';
import { RecursosProvider } from './context/RecursosContext';
import { VacacionesProvider } from './context/VacacionesContext';
import { UsuariosProvider } from './context/UsuariosContext';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/Login/LoginPage';
import { RecursosPage } from './pages/Recursos/RecursosPage';
import { InfoswebPage } from './pages/Infosweb/InfoswebPage';
import { TableroPage } from './pages/Tablero/TableroPage';
import { VacacionesPage } from './pages/Vacaciones/VacacionesPage';
import { UsuariosPage } from './pages/Usuarios/UsuariosPage';
import { AvisosPage } from './pages/Avisos/AvisosPage';
import { ArribosProximosPage } from './pages/ArribosProximos/ArribosProximosPage';
import { AuditoriaPage } from './pages/Auditoria/AuditoriaPage';

const ProtectedLayout = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <Header />
      {children}
    </>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<ProtectedLayout><Navigate to="/recursos" replace /></ProtectedLayout>} />
      <Route path="/recursos" element={<ProtectedLayout><RecursosPage /></ProtectedLayout>} />
      <Route path="/tablero" element={<ProtectedLayout><TableroPage /></ProtectedLayout>} />
      <Route path="/vacaciones" element={<ProtectedLayout><VacacionesPage /></ProtectedLayout>} />
      <Route path="/infosweb" element={<ProtectedLayout><InfoswebPage /></ProtectedLayout>} />
      <Route path="/usuarios" element={<ProtectedLayout><UsuariosPage /></ProtectedLayout>} />
      <Route path="/avisos" element={<ProtectedLayout><AvisosPage /></ProtectedLayout>} />
      <Route path="/arribos-proximos" element={<ProtectedLayout><ArribosProximosPage /></ProtectedLayout>} />
      <Route path="/auditoria" element={<ProtectedLayout><AuditoriaPage /></ProtectedLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AuditoriaProvider>
        <AvisosProvider>
          <RecursosProvider>
            <VacacionesProvider>
              <UsuariosProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </UsuariosProvider>
            </VacacionesProvider>
          </RecursosProvider>
        </AvisosProvider>
      </AuditoriaProvider>
    </AuthProvider>
  );
}

export default App;