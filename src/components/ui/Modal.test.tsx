import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal', () => {
  it('traps focus and closes with Escape', async () => {
    const onClose = vi.fn()
    render(
      <Modal open title="Editar recurso" onClose={onClose}>
        <button type="button">Guardar</button>
        <button type="button">Cancelar</button>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Editar recurso' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={vi.fn()}>Contenido</Modal>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
