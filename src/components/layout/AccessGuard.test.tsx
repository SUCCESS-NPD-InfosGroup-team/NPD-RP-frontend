import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NoAccess, RegisterResourceRoute } from './AccessGuard'

describe('NoAccess', () => {
  it('renders the access-denied screen as an alert', () => {
    render(<NoAccess />)

    expect(screen.getByRole('alert')).toHaveTextContent('No tienes acceso a esta pantalla')
  })
})

describe('RegisterResourceRoute (BUG-05)', () => {
  it('opens the register form for the operations administrator', () => {
    render(<RegisterResourceRoute roles={['operations-administrator']} />)

    expect(screen.getByRole('heading', { name: 'Registrar Recurso' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    [['guest']],
    [['customer-success']],
    [['npd-leader']],
    [['unknown-role']],
    [[]],
  ])('shows the access-denied screen for roles %j', (roles) => {
    render(<RegisterResourceRoute roles={roles} />)

    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta pantalla' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Registrar Recurso' })).not.toBeInTheDocument()
  })
})
