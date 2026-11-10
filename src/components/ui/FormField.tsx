// src/components/ui/FormField.tsx
import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  id: string;
  children: ReactNode;
  required?: boolean;
}

export const FormField = ({ label, id, children, required = false }: FormFieldProps) => (
  <div style={{ marginBottom: '15px' }}>
    <label 
      htmlFor={id} 
      style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}
    >
      {label} {required && <span style={{ color: '#E85D04' }}>*</span>}
    </label>
    {children}
  </div>
);