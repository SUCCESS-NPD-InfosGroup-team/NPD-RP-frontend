import { render, screen } from '@testing-library/react'
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
})
