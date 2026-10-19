// src/components/vacaciones/RegistrarVacacionModal.tsx

import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { useVacaciones } from '../../context/VacacionesContext';
// 🛠️ 1. Importamos la función en lugar de la variable
import { getMockRecursos } from '../../services/mockData';
import type { Vacacion } from '../../types';

interface RegistrarVacacionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormErrors {
  colaborador?: string;
  fechaInicio?: string;
  fechaFin?: string;
  solapamiento?: string;
}

export const RegistrarVacacionModal = ({ isOpen, onClose }: RegistrarVacacionModalProps) => {
  const { addVacacion, tieneSolapamiento } = useVacaciones();

  const [formData, setFormData] = useState({
    nEmpleado: '',
    fechaInicio: '',
    fechaFin: '',
    nota: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors] || errors.solapamiento) {
      setErrors((prev) => ({ ...prev, [field]: undefined, solapamiento: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nEmpleado) {
      newErrors.colaborador = 'Selecciona un colaborador.';
    }

    if (!formData.fechaInicio) {
      newErrors.fechaInicio = 'La fecha de inicio es obligatoria.';
    }

    if (!formData.fechaFin) {
      newErrors.fechaFin = 'La fecha de fin es obligatoria.';
    }

    if (formData.fechaInicio && formData.fechaFin && new Date(formData.fechaFin) < new Date(formData.fechaInicio)) {
      newErrors.fechaFin = 'Debe ser igual o posterior a la fecha de inicio.';
    }

    // Verificar solapamiento
    if (formData.nEmpleado && formData.fechaInicio && formData.fechaFin) {
      const solapada = tieneSolapamiento(formData.nEmpleado, formData.fechaInicio, formData.fechaFin);
      if (solapada) {
        newErrors.solapamiento = `Se cruza con vacaciones ya registradas: ${solapada.fechaInicio} al ${solapada.fechaFin}. Cambia las fechas o edita el período existente.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // 🛠️ 2. Usamos la función aquí
    const recurso = getMockRecursos().find((r) => r.nEmpleado === formData.nEmpleado);
    if (!recurso) return;

    const nuevaVacacion: Vacacion = {
      id: String(Date.now()),
      nEmpleado: formData.nEmpleado,
      colaborador: recurso.nombre,
      cliente: recurso.cliente,
      liderNPD: recurso.liderNPD,
      fechaInicio: formData.fechaInicio,
      fechaFin: formData.fechaFin,
      nota: formData.nota,
    };

    addVacacion(nuevaVacacion);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      setFormData({ nEmpleado: '', fechaInicio: '', fechaFin: '', nota: '' });
      setErrors({});
      onClose();
    }, 1500);
  };

  const inputStyle = (field: keyof FormErrors) => ({
    width: '100%',
    padding: '10px 12px',
    border: errors[field] ? '1px solid #DC2626' : '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '6px',
  });

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#333',
    display: 'block',
    marginTop: '16px',
  };

  const errorStyle = {
    color: '#DC2626',
    fontSize: '12px',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    lineHeight: '1.4',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar vacaciones" width="600px">
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
        Período confirmado por el colaborador y su líder.
      </p>

      {showSuccess && (
        <div
          style={{
            backgroundColor: '#DCFCE7',
            color: '#166534',
            padding: '12px 16px',
            borderRadius: '6px',
            marginTop: '16px',
            fontWeight: 'bold',
          }}
        >
          ✅ Vacaciones registradas exitosamente
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Colaborador *</label>
        <select
          value={formData.nEmpleado}
          onChange={(e) => handleChange('nEmpleado', e.target.value)}
          style={inputStyle('colaborador')}
        >
          <option value="">Selecciona un colaborador</option>
          {/* 🛠️ 3. Usamos la función para mapear los recursos */}
          {getMockRecursos().map((r) => (
            <option key={r.id} value={r.nEmpleado}>
              {r.nombre} · {r.nEmpleado} · {r.cliente}
            </option>
          ))}
        </select>
        {errors.colaborador && <div style={errorStyle}>⚠ {errors.colaborador}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Inicio *</label>
            <input
              type="date"
              value={formData.fechaInicio}
              onChange={(e) => handleChange('fechaInicio', e.target.value)}
              style={inputStyle('fechaInicio')}
            />
            {errors.fechaInicio && <div style={errorStyle}>⚠ {errors.fechaInicio}</div>}
          </div>

          <div>
            <label style={labelStyle}>Fin *</label>
            <input
              type="date"
              value={formData.fechaFin}
              onChange={(e) => handleChange('fechaFin', e.target.value)}
              style={inputStyle('fechaFin')}
            />
            {errors.fechaFin && <div style={errorStyle}>⚠ {errors.fechaFin}</div>}
          </div>
        </div>

        {errors.solapamiento && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              padding: '12px 16px',
              borderRadius: '6px',
              marginTop: '16px',
              fontSize: '13px',
              lineHeight: '1.5',
            }}
          >
            ⚠ {errors.solapamiento}
          </div>
        )}

        <label style={labelStyle}>Nota (opcional)</label>
        <input
          type="text"
          value={formData.nota}
          onChange={(e) => handleChange('nota', e.target.value)}
          placeholder="Ej: reemplazo acordado con el cliente"
          style={inputStyle('fechaInicio')}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #eee',
          }}
        >
          <button
            type="button"
            onClick={onClose}
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
            Cancelar
          </button>
          <button
            type="submit"
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
            Registrar
          </button>
        </div>
      </form>
    </Modal>
  );
};