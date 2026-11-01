import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UsuariosPage } from './UsuariosPage'
import type { User } from '../../services/users.types'

const mockedApi = vi.hoisted(() => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
}))

const authState = vi.hoisted(() => ({
  roles: ['operations-administrator'],
  user: { username: 'erick', fullName: 'Erick', email: 'maria.perez@infosgroup.com' },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../../services/users', async () => {
  const actual = await vi.importActual<typeof import('../../services/users')>('../../services/users')
  return { ...actual, usersApi: mockedApi }
})

const users: User[] = [
  {
    id: '1',
    fullName: 'María Pérez',
    email: 'maria.perez@infosgroup.com',
    role: 'Operations administrator',
    status: 'active',
    lastAccess: 'Ahora',
  },
  {
    id: '2',
    fullName: 'Rosa Murillo',
    email: 'rosa.murillo@infosgroup.com',
    role: 'Customer Success',
    status: 'disabled',
    lastAccess: '30 jul 2026',
  },
]

describe('UsuariosPage', () => {
  beforeEach(() => {
    authState.roles = ['operations-administrator']
    mockedApi.listUsers.mockReset().mockResolvedValue(users)
    mockedApi.createUser.mockReset().mockResolvedValue({
      ...users[0],
      id: '3',
      fullName: 'Nueva persona',
      email: 'nueva@infosgroup.com',
    })
  })

  it('denies access without the operations administrator role', () => {
    authState.roles = ['guest']
    render(<UsuariosPage />)
    expect(screen.getByText('No tienes acceso a esta pantalla')).toBeInTheDocument()
  })

  it('shows loading and load error states', async () => {
    let resolveList: (value: User[]) => void = () => undefined
    mockedApi.listUsers.mockReturnValueOnce(new Promise<User[]>((resolve) => { resolveList = resolve }))
    render(<UsuariosPage />)
    expect(screen.getByText('Cargando usuarios…')).toBeInTheDocument()
    resolveList(users)
    await waitFor(() => expect(screen.getByText('2 usuarios · 1 activos')).toBeInTheDocument())

    mockedApi.listUsers.mockRejectedValueOnce(new Error('network'))
    render(<UsuariosPage />)
    await waitFor(() => expect(screen.getByText('No se pudieron cargar los usuarios. Intenta nuevamente.')).toBeInTheDocument())
  })

  it('renders the user count, current user and disabled user', async () => {
    render(<UsuariosPage />)
    expect(await screen.findByText('2 usuarios · 1 activos')).toBeInTheDocument()
    expect(screen.getByText('María Pérez (tú)')).toBeInTheDocument()
    expect(screen.getByText('Desactivado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeDisabled()
  })

  it('validates the empty form and invalid email', async () => {
    render(<UsuariosPage />)
    await screen.findByText('2 usuarios · 1 activos')
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByText('El nombre completo es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El correo corporativo es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('Selecciona un rol.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Correo corporativo *'), { target: { value: 'correo-invalido' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Crear cuenta' }).closest('form')!)
    expect(screen.getByText('Ingresa un correo corporativo válido.')).toBeInTheDocument()
  })

  it('closes the drawer after successful creation and shows a notice', async () => {
    render(<UsuariosPage />)
    await screen.findByText('2 usuarios · 1 activos')
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    fireEvent.change(screen.getByLabelText('Nombre completo *'), { target: { value: 'Nueva persona' } })
    fireEvent.change(screen.getByLabelText('Correo corporativo *'), { target: { value: 'nueva@infosgroup.com' } })
    fireEvent.click(screen.getByRole('radio', { name: /Guest/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('La cuenta se creó correctamente.')).toBeInTheDocument()
  })

  it.each([
    [409, 'Ya existe una cuenta con este correo.', 'field'],
    [403, 'No tienes permiso para crear usuarios.', 'banner'],
    [503, 'El proveedor de identidad no está disponible. Intenta nuevamente.', 'banner'],
  ])('shows the expected error for status %s', async (status, message, kind) => {
    mockedApi.createUser.mockRejectedValueOnce({ status, message })
    render(<UsuariosPage />)
    await screen.findByText('2 usuarios · 1 activos')
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    fireEvent.change(screen.getByLabelText('Nombre completo *'), { target: { value: 'Nueva persona' } })
    fireEvent.change(screen.getByLabelText('Correo corporativo *'), { target: { value: 'nueva@infosgroup.com' } })
    fireEvent.click(screen.getByRole('radio', { name: /Guest/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument())
    if (kind === 'banner') {
      expect(screen.getByRole('alert')).toHaveTextContent(message)
    } else {
      expect(screen.getByLabelText('Correo corporativo *')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    }
  })

  it('closes the drawer with Escape and the close button and returns focus', async () => {
    render(<UsuariosPage />)
    await screen.findByText('2 usuarios · 1 activos')
    const openButton = screen.getByRole('button', { name: 'Crear usuario' })
    fireEvent.click(openButton)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()

    fireEvent.click(openButton)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })
})
