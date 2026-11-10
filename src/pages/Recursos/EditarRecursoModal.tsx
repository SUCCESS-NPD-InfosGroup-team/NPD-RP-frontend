// src/components/recursos/EditarRecursoModal.tsx

import { useState } from 'react';
import type { Recurso } from '../../types';
import { updateRecurso } from '../../services/api';

interface Props {
  recurso: Recurso;
  onClose: () => void;
  onSave: () => void;
}

export const EditarRecursoModal = ({ recurso, onClose, onSave }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado local del formulario
  const [formData, setFormData] = useState({
    employeeNumber: recurso.nEmpleado,
    name: recurso.nombre,
    level: Number(recurso.nivel.replace('N', '')) || 1,
    status: recurso.estado === 'Activo' ? 'ACTIVO' : recurso.estado === 'Licencia' ? 'LICENCIA' : 'BAJA',
    endDate: recurso.fechaFin || '', 
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        employeeNumber: formData.employeeNumber,
        name: formData.name,
        level: Number(formData.level),
        status: formData.status,
        version: recurso.version, // IMPORTANTE: Enviar la versión actual para evitar conflictos
        assignment: {
          endDate: formData.endDate || undefined,
          indefinite: formData.endDate === '',
        }
      };

      await updateRecurso(recurso.id, payload);
      onSave(); // Recarga la tabla en RecursosPage
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los cambios.';
      
      if (msg.includes('CONFLICT')) {
        setError('El registro fue modificado por otro usuario. Por favor, cierra y recarga la página.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Editar Recurso</h3>
        
        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>N° Empleado</label>
            <input type="text" name="employeeNumber" value={formData.employeeNumber} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Nombre</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Nivel</label>
              <input type="number" name="level" value={formData.level} onChange={handleChange} min="1" max="5" required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Estado</label>
              <select name="status" value={formData.status} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <option value="ACTIVO">Activo</option>
                <option value="LICENCIA">Licencia</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Fecha Fin (Dejar vacío si es indefinido)</label>
            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ padding: '8px 16px', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ padding: '8px 16px', border: 'none', background: '#E85D04', color: 'white', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};