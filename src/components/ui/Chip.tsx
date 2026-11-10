import './Chip.css'

export type ChipTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'orange' | 'solid-danger'

interface ChipProps {
  children: string
  tone?: ChipTone
  className?: string
}

export function Chip({ children, className = '', tone = 'neutral' }: Readonly<ChipProps>) {
  return (
    <span className={`ui-chip ui-chip--${tone}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}
