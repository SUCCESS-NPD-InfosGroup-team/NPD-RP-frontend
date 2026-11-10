// src/components/recursos/RegistrarRecursoModal.tsx

import { useState, type FormEvent, type ChangeEvent } from 'react';
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

// 1. Componente reutilizable para evitar duplicar labels e inputs
const FormField = ({
  id, label, error, children
}: { id: string; label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label htmlFor={id} style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', display: 'block', marginTop: '12px' }}>
      {label}
    </label>
    {children}
    {error && <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>⚠ {error}</div>}
  </div>
);

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
    if (!formData.nEmpleado.trim()) newErrors.nEmpleado = 'El N° de empleado es obligatorio.';
    else if (recursos.some((r) => r.nEmpleado === formData.nEmpleado)) newErrors.nEmpleado = `El ${formData.nEmpleado} ya está registrado.`;
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre del empleado es obligatorio.';
    if (!formData.liderNPD) newErrors.liderNPD = 'Selecciona el Líder NPD.';
    if (!formData.fechaFin) newErrors.fechaFin = 'La fecha final del proyecto es obligatoria.';
    else if (formData.fechaInicio && new Date(formData.fechaFin) <= new Date(formData.fechaInicio)) newErrors.fechaFin = 'Debe ser posterior a la fecha de inicio.';
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
      nEmpleado: '', nombre: '', puesto: 'QA Funcional', correo: '', uen: 'IFP', genero: 'Femenino',
      modalidad: 'Presencial — L-S', nivel: 'N3', cliente: 'BANESCO', proyecto: 'Programa de automatización (DEYEL)',
      liderNPD: '', rolActual: 'QA Funcional', fechaInicio: '', fechaFin: '', equipo: 'Cliente',
      contactoCliente: '', estado: 'Activo-Proyecto Asignado',
    });
    setErrors({});
  };

  const inputStyle = (field: keyof FormErrors) => ({
    width: '100%', padding: '8px 12px', border: errors[field] ? '1px solid #DC2626' : '1px solid #ddd',
    borderRadius: '4px', fontSize: '14px', marginTop: '4px',
  });

  const sectionTitle = {
    fontSize: '14px', fontWeight: 'bold' as const, color: '#E85D04',
    marginTop: '20px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #E85D04',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar recurso" width="900px">
      {showSuccess && (
        <div style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontWeight: 'bold' }}>
          ✅ Recurso registrado exitosamente
        </div>
      )}

      <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
        Agrega al colaborador al planer apenas entra a una asignación. Los campos con * son obligatorios.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={sectionTitle}>Colaborador</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* 2. Usamos el componente FormField para cada campo */}
          <FormField id="nEmpleado" label="N° de empleado *" error={errors.nEmpleado}>
            <input id="nEmpleado" type="text" value={formData.nEmpleado} onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('nEmpleado', e.target.value)} placeholder="#1045" style={inputStyle('nEmpleado')} />
          </FormField>

          <FormField id="nombre" label="Nombre de empleado *" error={errors.nombre}>
            <input id="nombre" type="text" value={formData.nombre} onChange={(e) => handleChange('nombre', e.target.value)} placeholder="Ana Torres" style={inputStyle('nombre')} />
          </FormField>

          <FormField id="puesto" label="Puesto">
            <select id="puesto" value={formData.puesto} onChange={(e) => handleChange('puesto', e.target.value)} style={inputStyle('nombre')}>
              <option>QA Funcional</option><option>QA Automatizador</option><option>Analista de Sistemas de Negocios Jr.</option><option>Desarrollador</option>
            </select>
          </FormField>

          <FormField id="correo" label="Correo del recurso">
            <input id="correo" type="email" value={formData.correo} onChange={(e) => handleChange('correo', e.target.value)} placeholder="ana.torres@infosgroup.com" style={inputStyle('nombre')} />
          </FormField>

          <FormField id="uen" label="UEN">
            <select id="uen" value={formData.uen} onChange={(e) => handleChange('uen', e.target.value)} style={inputStyle('nombre')}>
              <option>IFP</option><option>Otro</option>
            </select>
          </FormField>

          <FormField id="genero" label="Género">
            <select id="genero" value={formData.genero} onChange={(e) => handleChange('genero', e.target.value)} style={inputStyle('nombre')}>
              <option>Femenino</option><option>Masculino</option><option>Prefiero no decirlo</option>
            </select>
          </FormField>

          <FormField id="modalidad" label="Modalidad laboral">
            <select id="modalidad" value={formData.modalidad} onChange={(e) => handleChange('modalidad', e.target.value)} style={inputStyle('nombre')}>
              <option>Presencial — L-S</option><option>Híbrido</option><option>Remoto</option>
            </select>
          </FormField>

          <FormField id="nivel" label="Nivel *">
            <select id="nivel" value={formData.nivel} onChange={(e) => handleChange('nivel', e.target.value)} style={inputStyle('nombre')}>
              <option>N1</option><option>N2</option><option>N3</option><option>N4</option>
            </select>
          </FormField>
        </div>

        <div style={sectionTitle}>Asignación</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <FormField id="cliente" label="Cliente *">
            <select id="cliente" value={formData.cliente} onChange={(e) => handleChange('cliente', e.target.value)} style={inputStyle('nombre')}>
              <option>BANESCO</option><option>CAJA DE AHORROS</option><option>COPA</option><option>TIGO</option>
            </select>
          </FormField>

          <FormField id="proyecto" label="Proyecto asignado *">
            <select id="proyecto" value={formData.proyecto} onChange={(e) => handleChange('proyecto', e.target.value)} style={inputStyle('nombre')}>
              <option>Programa de automatización (DEYEL)</option><option>Oracle Fusion</option><option>Caja de Ahorros</option><option>Copa Airlines - Comercial</option>
            </select>
          </FormField>

          <FormField id="liderNPD" label="Líder NPD *" error={errors.liderNPD}>
            <select id="liderNPD" value={formData.liderNPD} onChange={(e) => handleChange('liderNPD', e.target.value)} style={inputStyle('liderNPD')}>
              <option value="">Selecciona un líder</option><option>Lorena Batista</option><option>Ricardo Him</option><option>Yaritza Castillo</option><option>Omar Delgado</option><option>Itzel Quintero</option>
            </select>
          </FormField>

          <FormField id="rolActual" label="Rol actual en cliente *">
            <select id="rolActual" value={formData.rolActual} onChange={(e) => handleChange('rolActual', e.target.value)} style={inputStyle('nombre')}>
              <option>QA Funcional</option><option>QA Automatizador</option><option>Analista de Sistemas de Negocios Jr.</option>
            </select>
          </FormField>

          <FormField id="fechaInicio" label="Fecha de inicio *">
            <input id="fechaInicio" type="date" value={formData.fechaInicio} onChange={(e) => handleChange('fechaInicio', e.target.value)} style={inputStyle('nombre')} />
          </FormField>

          <FormField id="fechaFin" label="Fecha final de proyecto *" error={errors.fechaFin}>
            <input id="fechaFin" type="date" value={formData.fechaFin} onChange={(e) => handleChange('fechaFin', e.target.value)} style={inputStyle('fechaFin')} />
          </FormField>

          <FormField id="equipo" label="Equipo / laptop">
            <select id="equipo" value={formData.equipo} onChange={(e) => handleChange('equipo', e.target.value)} style={inputStyle('nombre')}>
              <option>Cliente</option><option>Infosgroup</option>
            </select>
          </FormField>

          <FormField id="contactoCliente" label="Contacto por cliente">
            <input id="contactoCliente" type="email" value={formData.contactoCliente} onChange={(e) => handleChange('contactoCliente', e.target.value)} placeholder="mmedina@banesco.com" style={inputStyle('nombre')} />
          </FormField>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField id="estado" label="Estado">
              <select id="estado" value={formData.estado} onChange={(e) => handleChange('estado', e.target.value)} style={inputStyle('nombre')}>
                <option>Activo-Proyecto Asignado</option><option>Activo-Sin Asignación</option><option>En bench</option>
              </select>
            </FormField>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#666', marginTop: '20px', fontStyle: 'italic' }}>
          Cada cambio queda en la auditoría con tu usuario, la fecha y los valores.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            Cancelar
          </button>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#E85D04', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            Registrar recurso
          </button>
        </div>
      </form>
    </Modal>
  );
};