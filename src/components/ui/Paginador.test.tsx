import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Paginador } from './Paginador'

describe('Paginador', () => {
  it('disables the previous button on the first page and advances', async () => {
    const onPageChange = vi.fn()
    render(<Paginador range="1–25 de 50" page={1} totalPages={2} onPageChange={onPageChange} />)
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables both buttons on a single page', () => {
    render(<Paginador range="1–10 de 10" page={1} totalPages={1} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
  })
})
