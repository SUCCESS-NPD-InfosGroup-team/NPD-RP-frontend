// src/components/recursos/RegistrarRecursoModal.tsx

import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { useRecursos } from '../../context/RecursosContext';
import type { Recurso } from '../../types';

interface RegistrarRecursoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormErrors {
  nEmpleado?: string;
  nombre?: string;
  liderNPD?: string;
  fechaFin?: string;
}

export const RegistrarRecursoModal = ({ isOpen, onClose }: RegistrarRecursoModalProps) => {
  const { recursos, addRecurso } = useRecursos();

  const [formData, setFormData] = useState({
    nEmpleado: '',
    nombre: '',
    puesto: 'QA Funcional',
    correo: '',
    uen: 'IFP',
    genero: 'Femenino',
    modalidad: 'Presencial — L-S',
    nivel: 'N3',
    cliente: 'BANESCO',
    proyecto: 'Programa de automatización (DEYEL)',
    liderNPD: '',
    rolActual: 'QA Funcional',
    fechaInicio: '',
    fechaFin: '',
    equipo: 'Cliente',
    contactoCliente: '',
    estado: 'Activo-Proyecto Asignado',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nEmpleado.trim()) {
      newErrors.nEmpleado = 'El N° de empleado es obligatorio.';
    } else if (recursos.some((r) => r.nEmpleado === formData.nEmpleado)) {
      newErrors.nEmpleado = `El ${formData.nEmpleado} ya está registrado. Ver registro.`;
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre del empleado es obligatorio.';
    }

    if (!formData.liderNPD) {
      newErrors.liderNPD = 'Selecciona el Líder NPD.';
    }

    if (!formData.fechaFin) {
      newErrors.fechaFin = 'La fecha final del proyecto es obligatoria.';
    } else if (formData.fechaInicio && new Date(formData.fechaFin) <= new Date(formData.fechaInicio)) {
      newErrors.fechaFin = 'Debe ser posterior a la fecha de inicio.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const nuevoRecurso: Recurso = {
      // eslint-disable-next-line react-hooks/purity
      id: String(Date.now()),
      nEmpleado: formData.nEmpleado,
      nombre: formData.nombre,
      rol: formData.puesto,
      cliente: formData.cliente,
      proyecto: formData.proyecto,
      liderNPD: formData.liderNPD,
      nivel: formData.nivel,
      estado: formData.estado,
      fechaInicio: formData.fechaInicio || new Date().toISOString().split('T')[0],
      fechaFin: formData.fechaFin,
    };

    addRecurso(nuevoRecurso);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      handleReset();
      onClose();
    }, 1500);
  };

  const handleReset = () => {
    setFormData({
      nEmpleado: '',
      nombre: '',
      puesto: 'QA Funcional',
      correo: '',
      uen: 'IFP',
      genero: 'Femenino',
      modalidad: 'Presencial — L-S',
      nivel: 'N3',
      cliente: 'BANESCO',
      proyecto: 'Programa de automatización (DEYEL)',
      liderNPD: '',
      rolActual: 'QA Funcional',
      fechaInicio: '',
      fechaFin: '',
      equipo: 'Cliente',
      contactoCliente: '',
      estado: 'Activo-Proyecto Asignado',
    });
    setErrors({});
  };

  const inputStyle = (field: keyof FormErrors) => ({
    width: '100%',
    padding: '8px 12px',
    border: errors[field] ? '1px solid #DC2626' : '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '4px',
  });

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#333',
    display: 'block',
    marginTop: '12px',
  };

  const errorStyle = {
    color: '#DC2626',
    fontSize: '12px',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const sectionTitle = {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#E85D04',
    marginTop: '20px',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '2px solid #E85D04',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar recurso" width="900px">
      {showSuccess && (
        <div
          style={{
            backgroundColor: '#DCFCE7',
            color: '#166534',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontWeight: 'bold',
          }}
        >
          ✅ Recurso registrado exitosamente
        </div>
      )}

      <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
        Agrega al colaborador al planer apenas entra a una asignación. Los campos con * son obligatorios.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={sectionTitle}>Colaborador</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>N° de empleado *</label>
            <input
              type="text"
              value={formData.nEmpleado}
              onChange={(e) => handleChange('nEmpleado', e.target.value)}
              placeholder="#1045"
              style={inputStyle('nEmpleado')}
            />
            {errors.nEmpleado && <div style={errorStyle}>⚠ {errors.nEmpleado}</div>}
          </div>

          <div>
            <label style={labelStyle}>Nombre de empleado *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ana Torres"
              style={inputStyle('nombre')}
            />
            {errors.nombre && <div style={errorStyle}>⚠ {errors.nombre}</div>}
          </div>

          <div>
            <label style={labelStyle}>Puesto</label>
            <select
              value={formData.puesto}
              onChange={(e) => handleChange('puesto', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>QA Funcional</option>
              <option>QA Automatizador</option>
              <option>Analista de Sistemas de Negocios Jr.</option>
              <option>Desarrollador</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Correo del recurso</label>
            <input
              type="email"
              value={formData.correo}
              onChange={(e) => handleChange('correo', e.target.value)}
              placeholder="ana.torres@infosgroup.com"
              style={inputStyle('nombre')}
            />
          </div>

          <div>
            <label style={labelStyle}>UEN</label>
            <select
              value={formData.uen}
              onChange={(e) => handleChange('uen', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>IFP</option>
              <option>Otro</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Género</label>
            <select
              value={formData.genero}
              onChange={(e) => handleChange('genero', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>Femenino</option>
              <option>Masculino</option>
              <option>Prefiero no decirlo</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Modalidad laboral</label>
            <select
              value={formData.modalidad}
              onChange={(e) => handleChange('modalidad', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>Presencial — L-S</option>
              <option>Híbrido</option>
              <option>Remoto</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Nivel *</label>
            <select
              value={formData.nivel}
              onChange={(e) => handleChange('nivel', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>N1</option>
              <option>N2</option>
              <option>N3</option>
              <option>N4</option>
            </select>
          </div>
        </div>

        <div style={sectionTitle}>Asignación</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Cliente *</label>
            <select
              value={formData.cliente}
              onChange={(e) => handleChange('cliente', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>BANESCO</option>
              <option>CAJA DE AHORROS</option>
              <option>COPA</option>
              <option>TIGO</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Proyecto asignado *</label>
            <select
              value={formData.proyecto}
              onChange={(e) => handleChange('proyecto', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>Programa de automatización (DEYEL)</option>
              <option>Oracle Fusion</option>
              <option>Caja de Ahorros</option>
              <option>Copa Airlines - Comercial</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Líder NPD *</label>
            <select
              value={formData.liderNPD}
              onChange={(e) => handleChange('liderNPD', e.target.value)}
              style={inputStyle('liderNPD')}
            >
              <option value="">Selecciona un líder</option>
              <option>Lorena Batista</option>
              <option>Ricardo Him</option>
              <option>Yaritza Castillo</option>
              <option>Omar Delgado</option>
              <option>Itzel Quintero</option>
            </select>
            {errors.liderNPD && <div style={errorStyle}>⚠ {errors.liderNPD}</div>}
          </div>

          <div>
            <label style={labelStyle}>Rol actual en cliente *</label>
            <select
              value={formData.rolActual}
              onChange={(e) => handleChange('rolActual', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>QA Funcional</option>
              <option>QA Automatizador</option>
              <option>Analista de Sistemas de Negocios Jr.</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Fecha de inicio *</label>
            <input
              type="date"
              value={formData.fechaInicio}
              onChange={(e) => handleChange('fechaInicio', e.target.value)}
              style={inputStyle('nombre')}
            />
          </div>

          <div>
            <label style={labelStyle}>Fecha final de proyecto *</label>
            <input
              type="date"
              value={formData.fechaFin}
              onChange={(e) => handleChange('fechaFin', e.target.value)}
              style={inputStyle('fechaFin')}
            />
            {errors.fechaFin && <div style={errorStyle}>⚠ {errors.fechaFin}</div>}
          </div>

          <div>
            <label style={labelStyle}>Equipo / laptop</label>
            <select
              value={formData.equipo}
              onChange={(e) => handleChange('equipo', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>Cliente</option>
              <option>Infosgroup</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Contacto por cliente</label>
            <input
              type="email"
              value={formData.contactoCliente}
              onChange={(e) => handleChange('contactoCliente', e.target.value)}
              placeholder="mmedina@banesco.com"
              style={inputStyle('nombre')}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => handleChange('estado', e.target.value)}
              style={inputStyle('nombre')}
            >
              <option>Activo-Proyecto Asignado</option>
              <option>Activo-Sin Asignación</option>
              <option>En bench</option>
            </select>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#666', marginTop: '20px', fontStyle: 'italic' }}>
          Cada cambio queda en la auditoría con tu usuario, la fecha y los valores.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
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
            Registrar recurso
          </button>
        </div>
      </form>
    </Modal>
  );
};