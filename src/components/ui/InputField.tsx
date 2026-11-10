// src/components/ui/InputField.tsx
import type { ChangeEvent } from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export const InputField = ({ id, label, type = 'text', value, onChange, placeholder }: InputFieldProps) => (
  <div style={{ marginBottom: '15px' }}>
    <label htmlFor={id} style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
    />
  </div>
);