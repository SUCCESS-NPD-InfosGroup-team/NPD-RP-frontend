import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { EditResourceRoute, NoAccess, RegisterResourceRoute } from './AccessGuard'

vi.mock('../recursos/RegisterResourceForm', () => ({
  RegisterResourceForm: ({ resourceId }: { resourceId?: string }) => <p>Formulario {resourceId ?? 'nuevo'}</p>,
}))

const renderInRouter = (element: ReactElement, path = '/recursos/nuevo', pattern = '/recursos/nuevo') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path={pattern} element={element} />
    </Routes>
  </MemoryRouter>,
)

describe('NoAccess', () => {
  it('renders the access-denied screen as an alert', () => {
    render(<NoAccess />)

    expect(screen.getByRole('alert')).toHaveTextContent('No tienes acceso a esta pantalla')
  })
})

describe('RegisterResourceRoute (BUG-05)', () => {
  it('opens the register form for the operations administrator', () => {
    renderInRouter(<RegisterResourceRoute roles={['operations-administrator']} />)

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
    renderInRouter(<RegisterResourceRoute roles={roles} />)

    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta pantalla' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Registrar Recurso' })).not.toBeInTheDocument()
  })
})

describe('EditResourceRoute (HU-02)', () => {
  const renderEdit = (roles: string[]) => renderInRouter(
    <EditResourceRoute roles={roles} />, '/recursos/1045/editar', '/recursos/:resourceId/editar',
  )

  it('opens the edit form for the operations administrator', () => {
    renderEdit(['operations-administrator'])

    expect(screen.getByRole('heading', { name: 'Editar Recurso' })).toBeInTheDocument()
    expect(screen.getByText('Formulario 1045')).toBeInTheDocument()
  })

  it.each([[['guest']], [['customer-success']], [['npd-leader']], [[]]])(
    'shows the access-denied screen for roles %j',
    (roles) => {
      renderEdit(roles)

      expect(screen.getByRole('heading', { name: 'No tienes acceso a esta pantalla' })).toBeInTheDocument()
      expect(screen.queryByText('Formulario 1045')).not.toBeInTheDocument()
    },
  )
})
