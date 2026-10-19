// src/components/usuarios/MatrizPermisos.tsx

import type { PermissionLevel, PermissionRow } from '../../types';

const PERMISSIONS: PermissionRow[] = [
  // Iniciar sesión
  { module: 'Iniciar sesión', submodule: 'Correo y contraseña de Infosgroup', operationsAdmin: 'Completo', npdLead: 'Completo', customerSuccess: 'Completo', guest: 'Completo' },
  { module: 'Iniciar sesión', submodule: 'Entrar a la plataforma', operationsAdmin: 'Completo', npdLead: 'Completo', customerSuccess: 'Completo', guest: 'Completo' },

  // Recursos
  { module: 'Recursos · Roster y Tabla', submodule: 'Roster filtrable del planer (Gantt)', operationsAdmin: 'Completo', npdLead: 'Solo lectura', customerSuccess: 'Solo lectura', guest: 'Solo lectura' },
  { module: 'Recursos · Roster y Tabla', submodule: 'Buscar, filtrar y ver el Gantt', operationsAdmin: 'Completo', npdLead: 'Solo lectura', customerSuccess: 'Solo lectura', guest: 'Solo lectura' },
  { module: 'Recursos · Roster y Tabla', submodule: 'Exportar .xlsx / .csv (con las columnas)', operationsAdmin: 'Completo', npdLead: 'Solo lectura', customerSuccess: 'Solo lectura', guest: 'Solo lectura' },

  // Detalle del recurso
  { module: 'Detalle del recurso', submodule: 'Panel con todos los datos del planer', operationsAdmin: 'Completo', npdLead: 'Solo lectura', customerSuccess: 'Solo lectura', guest: 'Solo lectura' },
  { module: 'Detalle del recurso', submodule: 'Ver todos los cambios del registro', operationsAdmin: 'Completo', npdLead: 'Solo lectura', customerSuccess: 'Solo lectura', guest: 'Solo lectura' },

  // Arribos próximos
  { module: 'Arribos próximos', submodule: 'Fines de asignación, contrato, probatoria y vacaciones', operationsAdmin: 'Completo', npdLead: 'Solo lectura', customerSuccess: 'Solo lectura', guest: 'Solo lectura' },
  { module: 'Arribos próximos', submodule: 'Ver todos los eventos', operationsAdmin: 'Completo', npdLead: 'Solo lectura', customerSuccess: 'Solo lectura', guest: 'Solo lectura' },
  { module: 'Arribos próximos', submodule: 'Exportar .xlsx / .csv', operationsAdmin: 'Completo', npdLead: 'Solo lectura', customerSuccess: 'Solo lectura', guest: 'Solo lectura' },

  // Registrar/editar recurso
  { module: 'Registrar / editar recurso', submodule: 'Formulario de alta y edición', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },
  { module: 'Registrar / editar recurso', submodule: 'Registrar un recurso', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },
  { module: 'Registrar / editar recurso', submodule: 'Editar un recurso', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },

  // Tablero
  { module: 'Tablero y reporte mensual', submodule: 'KPIs, vencimientos y salidas del mes', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },
  { module: 'Tablero y reporte mensual', submodule: 'Gráficas, filtrar y bajar la lista de un segmento', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },
  { module: 'Tablero y reporte mensual', submodule: 'Descargar el reporte mensual (Excel y PDF)', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },

  // Auditoría
  { module: 'Auditoría de registros', submodule: 'Historial de cambios', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },
  { module: 'Auditoría de registros', submodule: 'Ver el historial de cambios', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },

  // Vacaciones
  { module: 'Vacaciones', submodule: 'Quién sale en los próximos meses', operationsAdmin: 'Completo', npdLead: 'Solo colaboradores', customerSuccess: 'Solo lectura', guest: 'Sin acceso' },
  { module: 'Vacaciones', submodule: 'Ver el calendario', operationsAdmin: 'Completo', npdLead: 'Solo colaboradores', customerSuccess: 'Solo lectura', guest: 'Sin acceso' },
  { module: 'Vacaciones', submodule: 'Exportar .xlsx / .csv', operationsAdmin: 'Completo', npdLead: 'Solo colaboradores', customerSuccess: 'Solo lectura', guest: 'Sin acceso' },
  { module: 'Vacaciones', submodule: 'Registrar vacaciones', operationsAdmin: 'Completo', npdLead: 'Solo colaboradores', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },

  // Usuarios
  { module: 'Usuarios y roles', submodule: 'Cuentas de la plataforma', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },
  { module: 'Usuarios y roles', submodule: 'Crear, editar y desactivar usuarios', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },

  // Avisos
  { module: 'Avisos por correo', submodule: 'Umbrales, destinatarios y plantillas', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },
  { module: 'Avisos por correo', submodule: 'Configurar avisos', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },

  // Infosweb
  { module: 'Infosweb', submodule: 'Estado de la integración', operationsAdmin: 'Completo', npdLead: 'Sin acceso', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },

  // Historial del colaborador
  { module: 'Historial del colaborador', submodule: 'Última de riesgo: evaluaciones, reconocimientos, incidentes y cambios de rol', operationsAdmin: 'Completo', npdLead: 'Solo colaboradores', customerSuccess: 'Solo lectura', guest: 'Sin acceso' },
  { module: 'Historial del colaborador', submodule: 'Ver la línea de tiempo', operationsAdmin: 'Completo', npdLead: 'Solo colaboradores', customerSuccess: 'Solo lectura', guest: 'Sin acceso' },
  { module: 'Historial del colaborador', submodule: 'Registrar evaluaciones, reconocimientos e incidentes', operationsAdmin: 'Completo', npdLead: 'Solo colaboradores', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },
  { module: 'Historial del colaborador', submodule: 'Ver incidentes (información restringida)', operationsAdmin: 'Completo', npdLead: 'Solo colaboradores', customerSuccess: 'Sin acceso', guest: 'Sin acceso' },

  // Riesgo de retención
  { module: 'Riesgo de retención (IA)', submodule: 'Fees y riesgo, recomendaciones y proyección', operationsAdmin: 'Completo', npdLead: 'Solo colaboradores', customerSuccess: 'Parcialmente', guest: 'Sin acceso' },
];

function getLevelStyle(level: PermissionLevel) {
  if (level === 'Completo') return { color: '#166534', fontWeight: 'bold' as const, symbol: '✓' };
  if (level === 'Sin acceso') return { color: '#999', fontWeight: 'normal' as const, symbol: '—' };
  if (level === 'Solo lectura') return { color: '#1E40AF', fontWeight: 'normal' as const, symbol: '✓' };
  if (level === 'Solo colaboradores') return { color: '#92400E', fontWeight: 'normal' as const, symbol: '✓' };
  if (level === 'Solo los de su equipo') return { color: '#92400E', fontWeight: 'normal' as const, symbol: '✓' };
  if (level === 'Solo consulta') return { color: '#1E40AF', fontWeight: 'normal' as const, symbol: '✓' };
  if (level === 'Parcialmente') return { color: '#92400E', fontWeight: 'normal' as const, symbol: '✓' };
  return { color: '#333', fontWeight: 'normal' as const, symbol: '✓' };
}

export const MatrizPermisos = () => {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
      {/* Leyenda superior */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '2px solid #E5E7EB',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#166534', fontWeight: 'bold' }}>✓ Completo</span>
          <span style={{ color: '#666' }}>= ve y modifica</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#1E40AF' }}>✓ Solo lectura</span>
          <span style={{ color: '#666' }}>= ve y exporta</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#92400E' }}>✓ Solo colaboradores</span>
          <span style={{ color: '#666' }}>= solo los de su equipo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#999' }}>— Sin acceso</span>
          <span style={{ color: '#666' }}>= la pantalla no aparece en su menú</span>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '900px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px' }}>
                PANTALLA Y ACCIONES
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px', borderLeft: '1px solid #E5E7EB' }}>
                OPERATIONS ADMIN
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px', borderLeft: '1px solid #E5E7EB' }}>
                NPD LEAD
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px', borderLeft: '1px solid #E5E7EB' }}>
                CUSTOMER SUCCESS
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: '#666', letterSpacing: '0.5px', borderLeft: '1px solid #E5E7EB' }}>
                GUEST
              </th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((row, i) => {
              const isNewModule = i === 0 || PERMISSIONS[i - 1].module !== row.module;

              return (
                <>
                  {isNewModule && (
                    <tr key={`module-${i}`} style={{ backgroundColor: '#FFF7ED' }}>
                      <td colSpan={5} style={{ padding: '10px 16px', fontWeight: 'bold', fontSize: '12px', color: '#9A3412', letterSpacing: '0.5px', borderTop: '2px solid #E5E7EB' }}>
                        {row.module.toUpperCase()}
                      </td>
                    </tr>
                  )}
                  <tr key={row.submodule} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 16px', color: '#333', paddingLeft: '32px' }}>
                      {row.submodule}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', borderLeft: '1px solid #F3F4F6', ...getLevelStyle(row.operationsAdmin) }}>
                      {getLevelStyle(row.operationsAdmin).symbol} {row.operationsAdmin !== 'Completo' && row.operationsAdmin !== 'Sin acceso' ? row.operationsAdmin : ''}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', borderLeft: '1px solid #F3F4F6', ...getLevelStyle(row.npdLead) }}>
                      {getLevelStyle(row.npdLead).symbol} {row.npdLead !== 'Completo' && row.npdLead !== 'Sin acceso' ? row.npdLead : ''}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', borderLeft: '1px solid #F3F4F6', ...getLevelStyle(row.customerSuccess) }}>
                      {getLevelStyle(row.customerSuccess).symbol} {row.customerSuccess !== 'Completo' && row.customerSuccess !== 'Sin acceso' ? row.customerSuccess : ''}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', borderLeft: '1px solid #F3F4F6', ...getLevelStyle(row.guest) }}>
                      {getLevelStyle(row.guest).symbol} {row.guest !== 'Completo' && row.guest !== 'Sin acceso' ? row.guest : ''}
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};