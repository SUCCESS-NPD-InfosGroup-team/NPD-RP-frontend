// src/components/usuarios/CrearUsuarioModal.tsx

import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { useUsuarios } from '../../context/UsuariosContext';
import type { Role, User } from '../../types';

interface CrearUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  email?: string;
  role?: string;
}

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: 'Operations administrator',
    label: 'Operations administrator',
    description: 'Registra y edita recursos, usuarios, vacaciones y avisos. Ve auditoría y riesgos.',
  },
  {
    value: 'NPD Lead',
    label: 'NPD Lead',
    description: 'Registra evaluaciones, reconocimientos e incidentes de sus colaboradores.',
  },
  {
    value: 'Customer Success',
    label: 'Customer Success',
    description: 'Sales / Customer Success: sigue cuentas, renovaciones y cobertura.',
  },
  {
    value: 'Guest',
    label: 'Guest',
    description: 'Solo consulta y exporta. No ve evaluaciones, incidentes ni riesgo.',
  },
];

export const CrearUsuarioModal = ({ isOpen, onClose }: CrearUsuarioModalProps) => {
  const { usuarios, addUsuario } = useUsuarios();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '' as Role | '',
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

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El correo no es válido.';
    } else if (usuarios.some((u) => u.email.toLowerCase() === formData.email.toLowerCase())) {
      newErrors.email = `Ya existe una cuenta con este correo.`;
    }

    if (!formData.role) {
      newErrors.role = 'Selecciona un rol.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Generar iniciales
    const initials = formData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const nuevoUsuario: User = {
      id: String(Date.now()),
      name: formData.name,
      email: formData.email,
      role: formData.role as Role,
      avatarInitials: initials,
      status: 'Activo',
    };

    addUsuario(nuevoUsuario);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      setFormData({ name: '', email: '', role: '' });
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
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear usuario" width="520px">
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
        La cuenta queda activa con los permisos del rol.
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
          ✅ Usuario creado exitosamente
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Nombre completo *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ana Torres"
          style={inputStyle('name')}
        />
        {errors.name && <div style={errorStyle}>⚠ {errors.name}</div>}

        <label style={labelStyle}>Correo corporativo *</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="ana.torres@infosgroup.com"
          style={inputStyle('email')}
        />
        {errors.email && <div style={errorStyle}>⚠ {errors.email}</div>}

        <label style={labelStyle}>Rol *</label>
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ROLES.map((role) => (
            <label
              key={role.value}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                border:
                  formData.role === role.value
                    ? '2px solid #E85D04'
                    : '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: formData.role === role.value ? '#FFF7ED' : 'white',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="role"
                value={role.value}
                checked={formData.role === role.value}
                onChange={(e) => handleChange('role', e.target.value)}
                style={{ marginTop: '3px' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{role.label}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {role.description}
                </div>
              </div>
            </label>
          ))}
        </div>
        {errors.role && <div style={errorStyle}>⚠ {errors.role}</div>}

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
            Crear cuenta
          </button>
        </div>
      </form>
    </Modal>
  );
};