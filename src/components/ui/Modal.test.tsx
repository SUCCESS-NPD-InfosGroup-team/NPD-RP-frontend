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

  it('closes when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<Modal open title="Editar recurso" onClose={onClose}>Contenido</Modal>)
    await userEvent.click(document.querySelector('.ui-modal__backdrop') as HTMLElement)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={vi.fn()}>Contenido</Modal>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
