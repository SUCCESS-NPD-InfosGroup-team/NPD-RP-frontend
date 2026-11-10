// src/components/avisos/AvisoEditor.tsx

import { useState } from 'react';
import type { AvisoConfig } from '../../types';

interface AvisoEditorProps {
  aviso: AvisoConfig;
  onSave: (aviso: AvisoConfig) => void;
}

// 1. Función auxiliar (sin duplicados)
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

// 2. Componente reutilizable para inputs (evita duplicación de estilos)
const InputField = ({ id, label, type = 'text', value, onChange, placeholder, isTextArea = false }: {
  id: string; label: string; type?: string; value: string | number; 
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string; isTextArea?: boolean;
}) => {
  const inputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #ddd', 
    borderRadius: '4px', fontSize: '14px', marginTop: '4px',
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      <label htmlFor={id} style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px', display: 'block', marginTop: '16px' }}>
        {label}
      </label>
      {isTextArea ? (
        <textarea id={id} value={value} onChange={onChange} rows={10} style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }} />
      ) : (
        <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );
};

export const AvisoEditor = ({ aviso, onSave }: AvisoEditorProps) => {
  const [formData, setFormData] = useState<AvisoConfig>(aviso);
  const [showSuccess, setShowSuccess] = useState(false);
  const [destinatarioNuevo, setDestinatarioNuevo] = useState('');
  const [ccNuevo, setCcNuevo] = useState('');

  const handleChange = <K extends keyof AvisoConfig>(field: K, value: AvisoConfig[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  };

  const handleDiscard = () => setFormData(aviso);

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

  // 3. Función reutilizable para renderizar destinatarios (elimina la duplicación)
  const renderDestinatarios = (tipo: 'para' | 'cc') => {
    const list = tipo === 'para' ? formData.destinatariosPara : formData.destinatariosCC;
    const setList = tipo === 'para' ? setDestinatarioNuevo : setCcNuevo;
    const value = tipo === 'para' ? destinatarioNuevo : ccNuevo;
    const label = tipo === 'para' ? 'DESTINATARIOS · PARA' : 'COPIA (CC)';
    const id = tipo === 'para' ? 'destinatario-para' : 'destinatario-cc';

    return (
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor={id} style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px', display: 'block', marginTop: '16px' }}>
          {label}
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', minHeight: '30px' }}>
          {list.map((d, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#F3F4F6', color: '#333', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
              {d}
              <button onClick={() => eliminarDestinatario(tipo, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '14px', lineHeight: 1 }}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => setList(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarDestinatario(tipo))}
            placeholder="Agregar correo o rol"
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
          <button
            onClick={() => agregarDestinatario(tipo)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Agregar
          </button>
        </div>
      </div>
    );
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
        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px', display: 'block', marginTop: '16px' }}>UMBRALES (DÍAS ANTES)</label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
          <div style={{ flex: 1 }}>
            {/* 4. Uso de Number.parseInt */}
            <InputField 
              id="umbral1" 
              label="Primer aviso" 
              type="number" 
              value={formData.umbral1} 
              onChange={(e) => handleChange('umbral1', Number.parseInt(e.target.value, 10) || 0)} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <InputField 
              id="umbral2" 
              label="Segundo aviso" 
              type="number" 
              value={formData.umbral2} 
              onChange={(e) => handleChange('umbral2', Number.parseInt(e.target.value, 10) || 0)} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <InputField 
              id="horaEnvio" 
              label="Hora del envío" 
              type="time" 
              value={formData.horaEnvio} 
              onChange={(e) => handleChange('horaEnvio', e.target.value)} 
            />
          </div>
        </div>

        {/* Destinatarios (Renderizado unificado) */}
        {renderDestinatarios('para')}
        {renderDestinatarios('cc')}

        {/* Plantilla */}
        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px', display: 'block', marginTop: '16px' }}>PLANTILLA DEL CORREO</label>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '2px', marginBottom: '8px' }}>
          En español. Usa marcadores entre llaves; se reemplazan con los datos de cada cliente.
        </p>

        <InputField 
          id="asunto" 
          label="Asunto" 
          value={formData.asunto} 
          onChange={(e) => handleChange('asunto', e.target.value)} 
        />

        <InputField 
          id="cuerpo" 
          label="Cuerpo" 
          value={formData.cuerpo} 
          onChange={(e) => handleChange('cuerpo', e.target.value)} 
          isTextArea 
        />

        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
          {['{cliente}', '{proyecto}', '{fecha_fin}', '{dias_restantes}', '{tabla_recursos}', '{lider_npd}'].map((v) => (
            <button
              key={v}
              onClick={() => handleChange('cuerpo', formData.cuerpo + ' ' + v)}
              style={{ padding: '4px 8px', border: '1px solid #DBEAFE', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button onClick={handleDiscard} style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              Descartar
            </button>
            <button onClick={handleSave} style={{ padding: '10px 20px', backgroundColor: '#E85D04', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};