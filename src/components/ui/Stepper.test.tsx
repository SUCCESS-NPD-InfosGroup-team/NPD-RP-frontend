import { render, screen } from '@testing-library/react'
import { Stepper } from './Stepper'

describe('Stepper', () => {
  it('numbers the steps and marks the current one', () => {
    render(<Stepper steps={['Proyecto', 'Datos del colaborador']} current={1} />)

    const steps = screen.getAllByRole('listitem')
    expect(screen.getByRole('list', { name: 'Pasos' })).toHaveTextContent('1 · Proyecto2 · Datos del colaborador')
    expect(steps[0]).not.toHaveAttribute('aria-current')
    expect(steps[1]).toHaveAttribute('aria-current', 'step')
    expect(steps[1]).toHaveClass('is-current')
  })
})
