import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatLastAccess, UsuariosPage } from './UsuariosPage'
import { MOCK_ROLES, UsersApiError } from '../../services/users'
import type { Page, Problem, User } from '../../services/users.types'

const mockedApi = vi.hoisted(() => ({
  listRoles: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
}))

const authState = vi.hoisted(() => ({
  roles: ['operations-administrator'],
  user: { username: 'maria', fullName: 'María', email: 'maria.perez@infosgroup.com' },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../../services/users', async () => {
  const actual = await vi.importActual<typeof import('../../services/users')>('../../services/users')
  return { ...actual, usersApi: mockedApi }
})

const users: User[] = [
  { id: 1, fullName: 'Ana María Ríos', email: 'ana.rios@infosgroup.com', role: 'npd-leader', state: 'PENDING', lastAccessAt: null },
  { id: 2, fullName: 'María Pérez', email: 'Maria.Perez@infosgroup.com', role: 'operations-administrator', state: 'ACTIVE', lastAccessAt: '2026-11-02T15:04:11Z' },
]

function page(items: User[], number = 0, totalElements = items.length): Page<User> {
  return { items, page: { number, size: 25, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / 25)) } }
}

function problem(overrides: Partial<Problem>): UsersApiError {
  return new UsersApiError({ status: 400, code: 'API_ERROR', title: 'Error', detail: 'Algo falló.', ...overrides })
}

async function renderLoaded() {
  render(<UsuariosPage />)
  await screen.findByText('2 usuarios')
}

function fillForm(fullName = 'Nueva persona', email = 'nueva@infosgroup.com') {
  fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
  fireEvent.change(screen.getByLabelText('Nombre completo *'), { target: { value: fullName } })
  fireEvent.change(screen.getByLabelText('Correo corporativo *'), { target: { value: email } })
  fireEvent.click(screen.getByRole('radio', { name: /Invitado/ }))
}

describe('UsuariosPage', () => {
  beforeEach(() => {
    authState.roles = ['operations-administrator']
    mockedApi.listRoles.mockReset().mockResolvedValue(MOCK_ROLES)
    mockedApi.listUsers.mockReset().mockResolvedValue(page(users))
    mockedApi.createUser.mockReset().mockResolvedValue({
      id: 3, fullName: 'Nueva persona', email: 'nueva@infosgroup.com', role: 'guest', state: 'PENDING', lastAccessAt: null,
    })
  })

  it.each([['guest'], ['npd-leader'], ['customer-success']])(
    'denies access to %s without calling the backend',
    (role) => {
      authState.roles = [role]
      render(<UsuariosPage />)
      expect(screen.getByText('No tienes acceso a esta pantalla')).toBeInTheDocument()
      expect(mockedApi.listUsers).not.toHaveBeenCalled()
      expect(mockedApi.listRoles).not.toHaveBeenCalled()
    },
  )

  it('shows the no-access screen when the backend answers 403', async () => {
    mockedApi.listUsers.mockRejectedValueOnce(problem({ status: 403, code: 'FORBIDDEN' }))
    render(<UsuariosPage />)
    expect(await screen.findByText('No tienes acceso a esta pantalla')).toBeInTheDocument()
  })

  it('shows the loading state', async () => {
    let resolveList: (value: Page<User>) => void = () => undefined
    mockedApi.listUsers.mockReturnValueOnce(new Promise<Page<User>>((resolve) => { resolveList = resolve }))
    render(<UsuariosPage />)
    expect(screen.getByText('Cargando usuarios…')).toBeInTheDocument()
    resolveList(page(users))
    expect(await screen.findByText('2 usuarios')).toBeInTheDocument()
  })

  it('shows the load error and retries', async () => {
    mockedApi.listUsers.mockRejectedValueOnce(problem({ status: 500, detail: 'Error interno.' }))
    render(<UsuariosPage />)
    expect(await screen.findByText('No se pudieron cargar los usuarios. Error interno.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('2 usuarios')).toBeInTheDocument()
    expect(mockedApi.listUsers).toHaveBeenCalledTimes(2)
  })

  it('shows a generic load error for network failures', async () => {
    mockedApi.listUsers.mockRejectedValueOnce(new TypeError('network'))
    render(<UsuariosPage />)
    expect(await screen.findByText('No se pudieron cargar los usuarios. Intenta nuevamente.')).toBeInTheDocument()
  })

  it('renders role names, states, last access and the current user', async () => {
    await renderLoaded()
    expect(mockedApi.listUsers).toHaveBeenCalledWith(0, 25)
    expect(screen.getByText('María Pérez (tú)')).toBeInTheDocument()
    expect(screen.getByText('Líder NPD')).toBeInTheDocument()
    expect(screen.getByText('Administrador de operaciones')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Nunca')).toBeInTheDocument()
    expect(screen.getByText(formatLastAccess('2026-11-02T15:04:11Z'))).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Usuarios 2' })).toBeInTheDocument()
  })

  it('shows the role code when the roles could not be loaded', async () => {
    mockedApi.listRoles.mockRejectedValueOnce(new TypeError('network'))
    await renderLoaded()
    expect(screen.getByText('npd-leader')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(screen.getByText('No se pudieron cargar los roles. Intenta nuevamente.')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mockedApi.listUsers.mockResolvedValueOnce(page([]))
    render(<UsuariosPage />)
    expect(await screen.findByText('No hay usuarios para mostrar.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument()
  })

  it('requests the next page from the backend', async () => {
    mockedApi.listUsers
      .mockResolvedValueOnce(page(users, 0, 27))
      .mockResolvedValueOnce(page([users[0]], 1, 27))
    render(<UsuariosPage />)
    expect(await screen.findByText('1–25 de 27')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(await screen.findByText('26–27 de 27')).toBeInTheDocument()
    expect(mockedApi.listUsers).toHaveBeenLastCalledWith(1, 25)
  })

  it('validates the form with the backend messages', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByText('Escribe el nombre completo.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el correo.')).toBeInTheDocument()
    expect(screen.getByText('Selecciona un rol.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Correo corporativo *'), { target: { value: 'ana@local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByText('Escribe un correo válido.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nombre completo *'), { target: { value: 'a'.repeat(151) } })
    fireEvent.change(screen.getByLabelText('Correo corporativo *'), { target: { value: `${'a'.repeat(250)}@x.co` } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByText('El nombre puede tener hasta 150 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('El correo puede tener hasta 254 caracteres.')).toBeInTheDocument()
    expect(mockedApi.createUser).not.toHaveBeenCalled()
  })

  it('creates the user, closes the drawer, reloads the list and returns focus', async () => {
    await renderLoaded()
    const openButton = screen.getByRole('button', { name: 'Crear usuario' })
    fillForm('  Nueva persona ', ' nueva@infosgroup.com ')
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mockedApi.createUser).toHaveBeenCalledWith({ fullName: 'Nueva persona', email: 'nueva@infosgroup.com', role: 'guest' })
    expect(screen.getByText(/Se creó la cuenta de Nueva persona/)).toBeInTheDocument()
    await waitFor(() => expect(mockedApi.listUsers).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(openButton).toHaveFocus())
  })

  it('shows every VALIDATION_FAILED error under its field', async () => {
    mockedApi.createUser.mockRejectedValueOnce(problem({
      code: 'VALIDATION_FAILED',
      errors: [
        { field: 'fullName', code: 'TOO_LONG', message: 'El nombre puede tener hasta 150 caracteres.' },
        { field: 'role', code: 'UNKNOWN_VALUE', message: 'Selecciona uno de los cuatro roles.' },
      ],
    }))
    await renderLoaded()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByText('Selecciona uno de los cuatro roles.')).toBeInTheDocument()
    expect(screen.getByText('El nombre puede tener hasta 150 caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre completo *')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a banner for VALIDATION_FAILED without known fields', async () => {
    mockedApi.createUser.mockRejectedValueOnce(problem({
      code: 'VALIDATION_FAILED', title: 'Datos inválidos', detail: 'Corrige los campos.',
      errors: [{ field: 'other', code: 'X', message: 'x' }],
    }))
    await renderLoaded()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Datos inválidos. Corrige los campos.')
  })

  it('shows EMAIL_TAKEN under the email field', async () => {
    mockedApi.createUser.mockRejectedValueOnce(problem({
      status: 409, code: 'EMAIL_TAKEN', title: 'Correo ya registrado', detail: 'Ya existe un usuario con el correo nueva@infosgroup.com.',
    }))
    await renderLoaded()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByText('Ya existe un usuario con el correo nueva@infosgroup.com.')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo corporativo *')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Correo corporativo *'), { target: { value: 'otra@infosgroup.com' } })
    expect(screen.getByLabelText('Correo corporativo *')).toHaveAttribute('aria-invalid', 'false')
  })

  it.each([
    [403, 'FORBIDDEN', 'Acceso denegado', 'No tienes permiso.'],
    [503, 'IDENTITY_PROVIDER_UNAVAILABLE', 'Servicio no disponible', 'No se pudo enviar el correo.'],
  ])('shows title and detail for %s %s and keeps the form', async (status, code, title, detail) => {
    mockedApi.createUser.mockRejectedValueOnce(problem({ status, code, title, detail }))
    await renderLoaded()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(`${title}. ${detail}`)
    expect(screen.getByLabelText('Nombre completo *')).toHaveValue('Nueva persona')
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled()
  })

  it('shows a generic error when the request fails without a response', async () => {
    mockedApi.createUser.mockRejectedValueOnce(new TypeError('network'))
    await renderLoaded()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo crear la cuenta')
  })

  it('closes the drawer with Escape and the close button and returns focus', async () => {
    await renderLoaded()
    const openButton = screen.getByRole('button', { name: 'Crear usuario' })
    fireEvent.click(openButton)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(openButton).toHaveFocus())

    fireEvent.click(openButton)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(openButton).toHaveFocus())
  })

  it('cycles focus within the drawer with Tab and Shift+Tab', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    const drawer = screen.getByRole('dialog')
    const first = screen.getByRole('button', { name: 'Cerrar' })
    const last = screen.getByRole('button', { name: 'Crear cuenta' })

    last.focus()
    fireEvent.keyDown(drawer, { key: 'Tab' })
    expect(first).toHaveFocus()

    first.focus()
    fireEvent.keyDown(drawer, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })
})

describe('formatLastAccess', () => {
  it('returns "Nunca" for null and "—" for an invalid date', () => {
    expect(formatLastAccess(null)).toBe('Nunca')
    expect(formatLastAccess('no-date')).toBe('—')
    expect(formatLastAccess('2026-11-02T15:04:11Z')).toMatch(/2026/)
  })
})
