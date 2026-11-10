import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { Button } from './Button'

describe('Button', () => {
  it.each(['primary', 'secondary', 'feature', 'danger', 'ghost'] as const)(
    'renders the %s variant',
    (variant) => {
      render(<Button variant={variant}>Guardar</Button>)
      expect(screen.getByRole('button', { name: 'Guardar' }))
        .toHaveClass(`ui-button--${variant}`)
    },
  )

  it('renders an optional icon and supports disabled state', () => {
    render(<Button icon={<span>+</span>} disabled>Nuevo</Button>)
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeDisabled()
    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('forwards a ref to the native button', () => {
    const buttonRef = createRef<HTMLButtonElement>()
    render(<Button ref={buttonRef}>Nuevo</Button>)
    expect(buttonRef.current).toBe(screen.getByRole('button', { name: 'Nuevo' }))
  })
})
