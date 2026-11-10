// src/pages/Avisos/AvisosPage.tsx

import { useState } from 'react';
import { useAvisos } from '../../context/AvisosContext';
import { AvisoEditor } from '../../components/avisos/AvisoEditor';

export const AvisosPage = () => {
  const { avisos, updateAviso } = useAvisos();
  const [avisoSeleccionado, setAvisoSeleccionado] = useState(avisos[0]);

  // Mantener sincronizado el aviso seleccionado cuando se actualiza
  const avisoActual = avisos.find((a) => a.id === avisoSeleccionado.id) || avisos[0];

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px' }}>Avisos por correo</h2>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
          Umbrales, destinatarios y plantillas. Los cambios aplican a los próximos envíos en un nuevo despliegue.
        </p>
      </div>

      {/* Grid principal: sidebar + editor */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Sidebar */}
        <div>
          {avisos.map((aviso) => (
            <button
              key={aviso.id}
              onClick={() => setAvisoSeleccionado(aviso)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                marginBottom: '8px',
                backgroundColor:
                  avisoSeleccionado.id === aviso.id ? '#FFF7ED' : 'white',
                border:
                  avisoSeleccionado.id === aviso.id
                    ? '2px solid #E85D04'
                    : '1px solid #E5E7EB',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{aviso.titulo}</span>
                {aviso.activo && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#166534',
                      backgroundColor: '#DCFCE7',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    Activo
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>{aviso.descripcion}</div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <AvisoEditor key={avisoActual.id} aviso={avisoActual} onSave={updateAviso} />
      </div>
    </div>
  );
};