// src/components/recursos/EditarRecursoModal.tsx
import { useState } from 'react';
import type { Recurso } from '../../types';

// 🛠️ Estilos extraídos para evitar duplicación en SonarCloud
const MODAL_OVERLAY = { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const MODAL_CONTENT = { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '500px', maxWidth: '90%' };
const INPUT_STYLE = { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' as const };
const LABEL_STYLE = { display: 'block', marginBottom: '5px', fontSize: '14px' };
const ROW_STYLE = { display: 'flex', gap: '15px' };
const COL_STYLE = { flex: 1 };
const ERROR_BOX = { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '4px', marginBottom: '15px' };

interface Props {
  recurso: Recurso;
  onClose: () => void;
  onSave: (recursoActualizado: Recurso) => void;
}

export const EditarRecursoModal = ({ recurso, onClose, onSave }: Props) => {
  const [formData, setFormData] = useState<Recurso>({ ...recurso });
  const [error, setError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.cliente || !formData.rol || !formData.nivel) {
      setError('El cliente, rol y nivel son obligatorios.');
      return;
    }

    if (formData.fechaInicio && formData.fechaFin && formData.fechaFin < formData.fechaInicio) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(recurso);
    if (!hasChanges) {
      onClose();
      return;
    }

    onSave(formData);
  };

  return (
    <div style={MODAL_OVERLAY}>
      <div style={MODAL_CONTENT}>
        <h2 style={{ marginBottom: '20px' }}>Editar Recurso: {recurso.nombre}</h2>
        
        {error && <div style={ERROR_BOX}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={ROW_STYLE}>
            <div style={COL_STYLE}>
              <label style={LABEL_STYLE}>Cliente *</label>
              <input name="cliente" value={formData.cliente} onChange={handleChange} style={INPUT_STYLE} />
            </div>
            <div style={COL_STYLE}>
              <label style={LABEL_STYLE}>Proyecto *</label>
              <input name="proyecto" value={formData.proyecto} onChange={handleChange} style={INPUT_STYLE} />
            </div>
          </div>

          <div style={ROW_STYLE}>
            <div style={COL_STYLE}>
              <label style={LABEL_STYLE}>Rol *</label>
              <input name="rol" value={formData.rol} onChange={handleChange} style={INPUT_STYLE} />
            </div>
            <div style={COL_STYLE}>
              <label style={LABEL_STYLE}>Nivel *</label>
              <input name="nivel" value={formData.nivel} onChange={handleChange} style={INPUT_STYLE} />
            </div>
          </div>

          <div style={ROW_STYLE}>
            <div style={COL_STYLE}>
              <label style={LABEL_STYLE}>Fecha Inicio</label>
              <input type="date" name="fechaInicio" value={formData.fechaInicio} onChange={handleChange} style={INPUT_STYLE} />
            </div>
            <div style={COL_STYLE}>
              <label style={LABEL_STYLE}>Fecha Fin</label>
              <input type="date" name="fechaFin" value={formData.fechaFin} onChange={handleChange} style={INPUT_STYLE} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #ccc', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: '8px 16px', border: 'none', background: '#E85D04', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};