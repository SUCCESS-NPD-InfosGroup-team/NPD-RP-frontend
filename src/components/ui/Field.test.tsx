import { render, screen } from '@testing-library/react'
import { Field } from './Field'

describe('Field', () => {
  it('associates an input label', () => {
    render(<Field id="project" label="Proyecto" />)
    expect(screen.getByLabelText('Proyecto')).toHaveAttribute('id', 'project')
  })

  it('renders select options and the error state accessibly', () => {
    render(
      <Field
        id="client"
        label="Cliente"
        type="select"
        state="error"
        error="Selecciona un cliente"
        options={[{ value: 'one', label: 'Uno' }]}
      />,
    )
    const select = screen.getByLabelText('Cliente')
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAccessibleDescription('Selecciona un cliente')
    expect(screen.getByText('Selecciona un cliente')).toBeInTheDocument()
  })
})
