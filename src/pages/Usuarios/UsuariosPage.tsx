// src/pages/Usuarios/UsuariosPage.tsx

import { useState } from 'react';
import { useUsuarios } from '../../context/UsuariosContext';
import { CrearUsuarioModal } from '../../components/usuarios/CrearUsuarioModal';
import { MatrizPermisos } from '../../components/usuarios/MatrizPermisos';

type Tab = 'usuarios' | 'matriz';

export const UsuariosPage = () => {
  const { usuarios, toggleStatus } = useUsuarios();
  const [tab, setTab] = useState<Tab>('usuarios');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroRol, setFiltroRol] = useState('Todos');

  const usuariosFiltrados = usuarios.filter((u) => filtroRol === 'Todos' || u.role === filtroRol);

  const getRoleBadgeColor = (role: string) => {
    if (role === 'Operations administrator') return { bg: '#FED7AA', color: '#9A3412' };
    if (role === 'NPD Lead') return { bg: '#DBEAFE', color: '#1E40AF' };
    if (role === 'Customer Success') return { bg: '#E9D5FF', color: '#6B21A8' };
    return { bg: '#E5E7EB', color: '#374151' };
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Usuarios y roles</h2>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            Cuentas de la plataforma, su rol y su acceso. Una persona tiene un solo rol.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            backgroundColor: '#E85D04',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          + Crear usuario
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #E5E7EB', marginBottom: '20px' }}>
        <button
          onClick={() => setTab('usuarios')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: tab === 'usuarios' ? '3px solid #E85D04' : '3px solid transparent',
            color: tab === 'usuarios' ? '#E85D04' : '#666',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          Usuarios ({usuarios.length})
        </button>
        <button
          onClick={() => setTab('matriz')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: tab === 'matriz' ? '3px solid #E85D04' : '3px solid transparent',
            color: tab === 'matriz' ? '#E85D04' : '#666',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          Matriz de permisos
        </button>
      </div>

      {/* Contenido de la tab */}
      {tab === 'usuarios' && (
        <>
          {/* Filtros */}
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Nombre o correo"
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '180px' }}
            >
              <option value="Todos">Rol: Todos</option>
              <option value="Operations administrator">Operations administrator</option>
              <option value="NPD Lead">NPD Lead</option>
              <option value="Customer Success">Customer Success</option>
              <option value="Guest">Guest</option>
            </select>
            <select style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '120px' }}>
              <option>Estado: Todos</option>
              <option>Activo</option>
              <option>Desactivado</option>
            </select>
          </div>

          {/* Tabla de usuarios */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px' }}>USUARIO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px' }}>ROL</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px' }}>ESTADO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px' }}>ÚLTIMO ACCESO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const badge = getRoleBadgeColor(u.role);
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              backgroundColor: '#1F2937',
                              color: 'white',
                              borderRadius: '50%',
                              width: '36px',
                              height: '36px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 'bold',
                            }}
                          >
                            {u.avatarInitials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{u.name}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            backgroundColor: u.status === 'Activo' ? '#DCFCE7' : '#FEE2E2',
                            color: u.status === 'Activo' ? '#166534' : '#991B1B',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>
                        {u.status === 'Activo' ? 'Hoy' : '30 jul 2026'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => toggleStatus(u.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {u.status === 'Activo' ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
            {usuariosFiltrados.length} usuarios · {usuarios.filter((u) => u.status === 'Activo').length} activos
          </p>
        </>
      )}

      {tab === 'matriz' && <MatrizPermisos />}

      {/* Modal */}
      <CrearUsuarioModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};