import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'feature' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: ReactNode
}

export function Button({
  children,
  className = '',
  icon,
  type = 'button',
  variant = 'primary',
  ...props
}: Readonly<ButtonProps>) {
  return (
    <button
      className={`ui-button ui-button--${variant}${className ? ` ${className}` : ''}`}
      type={type}
      {...props}
    >
      {icon && <span className="ui-button__icon" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
