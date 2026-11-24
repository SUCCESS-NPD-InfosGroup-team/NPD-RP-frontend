import './Stepper.css'

interface StepperProps {
  steps: readonly string[]
  /** Index of the current step, from 0 */
  current: number
  label?: string
  className?: string
}

/** Numbered steps as chips: «1 · Proyecto» «2 · Datos del colaborador» */
export function Stepper({ steps, current, label = 'Pasos', className = '' }: Readonly<StepperProps>) {
  return (
    <ol className={['ui-stepper', className].filter(Boolean).join(' ')} aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={step}
          className={index === current ? 'is-current' : undefined}
          aria-current={index === current ? 'step' : undefined}
        >
          {index + 1} · {step}
        </li>
      ))}
    </ol>
  )
}
