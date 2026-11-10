import { render, screen } from '@testing-library/react'
import { Chip } from './Chip'

describe('Chip', () => {
  it.each(['neutral', 'ok', 'warn', 'danger', 'info', 'orange', 'solid-danger'] as const)(
    'renders the %s tone',
    (tone) => {
      render(<Chip tone={tone}>Estado</Chip>)
      expect(screen.getByText('Estado')).toHaveClass(`ui-chip--${tone}`)
    },
  )
})
