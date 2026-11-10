import { AlertIcon, ChevDownIcon } from '../icons'
import './Field.css'

export type FieldState = 'default' | 'error'
export type FieldType = 'input' | 'select'

interface FieldProps {
  id: string
  label: string
  type?: FieldType
  state?: FieldState
  error?: string
  value?: string
  defaultValue?: string
  placeholder?: string
  options?: readonly { value: string; label: string }[]
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  name?: string
  required?: boolean
  disabled?: boolean
}

export function Field({
  id,
  label,
  type = 'input',
  state = 'default',
  error,
  value,
  defaultValue,
  placeholder,
  options = [],
  onChange,
  name,
  required,
  disabled,
}: Readonly<FieldProps>) {
  const errorId = `${id}-error`
  const describedBy = state === 'error' ? errorId : undefined
  const className = `ui-field__control${state === 'error' ? ' ui-field__control--error' : ''}`

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>{label}</label>
      <div className="ui-field__control-wrap">
        {type === 'select' ? (
          <select
            className={className}
            id={id}
            name={name}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            required={required}
            disabled={disabled}
            aria-invalid={state === 'error'}
            aria-describedby={describedBy}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <input
            className={className}
            id={id}
            name={name}
            value={value}
            defaultValue={defaultValue}
            placeholder={placeholder}
            onChange={onChange}
            required={required}
            disabled={disabled}
            aria-invalid={state === 'error'}
            aria-describedby={describedBy}
          />
        )}
        {type === 'select' && <ChevDownIcon />}
      </div>
      {state === 'error' && error && (
        <p className="ui-field__error" id={errorId}>
          <AlertIcon />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
