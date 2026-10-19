// src/components/avisos/AvisoEditor.tsx

import { useState } from 'react';
import type { AvisoConfig } from '../../types';

interface AvisoEditorProps {
  aviso: AvisoConfig;
  onSave: (aviso: AvisoConfig) => void;
}

// Reemplaza variables en el texto con los valores de preview
const reemplazarVariables = (texto: string, data: AvisoConfig['previewData']): string => {
  return texto
    .replace(/{cliente}/g, data.cliente)
    .replace(/{proyecto}/g, data.proyecto)
    .replace(/{fecha_fin}/g, data.fechaFin)
    .replace(/{dias_restantes}/g, String(data.diasRestantes))
    .replace(/{recurso}/g, 'Ana Torres')
    .replace(/{n_empleado}/g, '#1045')
    .replace(/{lider_npd}/g, 'Lorena Batista')
    .replace(/{tabla_recursos}/g, '(3 recursos asignados)')
    .replace(/{tabla_vacaciones}/g, '(5 colaboradores de vacaciones)');
};

export const AvisoEditor = ({ aviso, onSave }: AvisoEditorProps) => {
  const [formData, setFormData] = useState<AvisoConfig>(aviso);
  const [showSuccess, setShowSuccess] = useState(false);
  const [destinatarioNuevo, setDestinatarioNuevo] = useState('');
  const [ccNuevo, setCcNuevo] = useState('');

  // Actualizar el estado cuando cambia el aviso seleccionado
  const handleChange = <K extends keyof AvisoConfig>(field: K, value: AvisoConfig[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  };

  const handleDiscard = () => {
    setFormData(aviso);
  };

  const agregarDestinatario = (tipo: 'para' | 'cc') => {
    if (tipo === 'para' && destinatarioNuevo.trim()) {
      handleChange('destinatariosPara', [...formData.destinatariosPara, destinatarioNuevo.trim()]);
      setDestinatarioNuevo('');
    } else if (tipo === 'cc' && ccNuevo.trim()) {
      handleChange('destinatariosCC', [...formData.destinatariosCC, ccNuevo.trim()]);
      setCcNuevo('');
    }
  };

  const eliminarDestinatario = (tipo: 'para' | 'cc', index: number) => {
    if (tipo === 'para') {
      handleChange('destinatariosPara', formData.destinatariosPara.filter((_, i) => i !== index));
    } else {
      handleChange('destinatariosCC', formData.destinatariosCC.filter((_, i) => i !== index));
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '4px',
  };

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#666',
    letterSpacing: '0.5px',
    display: 'block',
    marginTop: '16px',
  };

  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#F3F4F6',
    color: '#333',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Columna izquierda: Configuración */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{formData.titulo}</h3>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
          Avisos para correo. Los cambios aplican a los próximos envíos en un nuevo despliegue.
        </p>

        {showSuccess && (
          <div style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontWeight: 'bold', fontSize: '13px' }}>
            ✅ Cambios guardados exitosamente
          </div>
        )}

        {/* Umbrales */}
        <label style={labelStyle}>UMBRALES (DÍAS ANTES)</label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              value={formData.umbral1}
              onChange={(e) => handleChange('umbral1', parseInt(e.target.value) || 0)}
              style={inputStyle}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Primer aviso</div>
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              value={formData.umbral2}
              onChange={(e) => handleChange('umbral2', parseInt(e.target.value) || 0)}
              style={inputStyle}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Segundo aviso</div>
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="time"
              value={formData.horaEnvio}
              onChange={(e) => handleChange('horaEnvio', e.target.value)}
              style={inputStyle}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Hora del envío</div>
          </div>
        </div>

        {/* Destinatarios Para */}
        <label style={labelStyle}>DESTINATARIOS · PARA</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', minHeight: '30px' }}>
          {formData.destinatariosPara.map((d, i) => (
            <span key={i} style={chipStyle}>
              {d}
              <button
                onClick={() => eliminarDestinatario('para', i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '14px', lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <input
            type="text"
            value={destinatarioNuevo}
            onChange={(e) => setDestinatarioNuevo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarDestinatario('para'))}
            placeholder="Agregar correo o rol"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => agregarDestinatario('para')}
            style={{ padding: '8px 12px', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Agregar
          </button>
        </div>

        {/* Destinatarios CC */}
        <label style={labelStyle}>COPIA (CC)</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', minHeight: '30px' }}>
          {formData.destinatariosCC.map((d, i) => (
            <span key={i} style={chipStyle}>
              {d}
              <button
                onClick={() => eliminarDestinatario('cc', i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '14px', lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <input
            type="text"
            value={ccNuevo}
            onChange={(e) => setCcNuevo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarDestinatario('cc'))}
            placeholder="Agregar correo o rol"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => agregarDestinatario('cc')}
            style={{ padding: '8px 12px', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Agregar
          </button>
        </div>

        {/* Plantilla */}
        <label style={labelStyle}>PLANTILLA DEL CORREO</label>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '2px', marginBottom: '8px' }}>
          En español. Usa marcadores entre llaves; se reemplazan con los datos de cada cliente.
        </p>

        <label style={{ ...labelStyle, marginTop: '8px' }}>Asunto</label>
        <input
          type="text"
          value={formData.asunto}
          onChange={(e) => handleChange('asunto', e.target.value)}
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: '12px' }}>Cuerpo</label>
        <textarea
          value={formData.cuerpo}
          onChange={(e) => handleChange('cuerpo', e.target.value)}
          rows={10}
          style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
        />

        <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '6px' }}>
          ⚠ El marcador {'{proyecto}'} no existe. ¿Quizá decía {'{proyecto}'}?
        </div>

        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
          {['{cliente}', '{proyecto}', '{fecha_fin}', '{dias_restantes}', '{tabla_recursos}', '{lider_npd}'].map((v) => (
            <button
              key={v}
              onClick={() => handleChange('cuerpo', formData.cuerpo + ' ' + v)}
              style={{
                padding: '4px 8px',
                border: '1px solid #DBEAFE',
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Columna derecha: Vista previa */}
      <div>
        <div style={{ position: 'sticky', top: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px', marginBottom: '8px' }}>
            VISTA PREVIA · CON DATOS DE {formData.previewData.cliente.toUpperCase()}
          </div>

          <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px' }}>
            <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                <strong>De:</strong> Operaciones NPD · operaciones.npd@infosgroup.com
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                <strong>Para:</strong> {formData.destinatariosPara.join(', ')}
              </div>
              {formData.destinatariosCC.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  <strong>CC:</strong> {formData.destinatariosCC.join(', ')}
                </div>
              )}
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', marginTop: '10px' }}>
                {reemplazarVariables(formData.asunto, formData.previewData)}
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#333', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {reemplazarVariables(formData.cuerpo, formData.previewData)}
            </div>

            {/* Tabla de ejemplo si el cuerpo incluye tabla_recursos o tabla_vacaciones */}
            {formData.cuerpo.includes('{tabla_recursos}') && (
              <div style={{ marginTop: '16px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', backgroundColor: '#F9FAFB', fontSize: '11px', fontWeight: 'bold', color: '#666', padding: '8px 12px' }}>
                  <span>RECURSOS</span>
                  <span>ROL</span>
                  <span>FIN</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '12px', padding: '8px 12px', borderTop: '1px solid #F3F4F6' }}>
                  <span>Ana Torres</span>
                  <span>QA Funcional</span>
                  <span>31/10/2026</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '12px', padding: '8px 12px', borderTop: '1px solid #F3F4F6' }}>
                  <span>Luis Barria</span>
                  <span>QA Automatizador</span>
                  <span>31/10/2026</span>
                </div>
              </div>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={handleDiscard}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: '#E85D04',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};