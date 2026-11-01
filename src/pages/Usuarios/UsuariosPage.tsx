import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AlertIcon, PlusIcon, XIcon } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Paginador } from '../../components/ui/Paginador'
import {
  ROLE_DESCRIPTIONS,
  USER_ROLES,
  usersApi,
} from '../../services/users'
import type {
  CreateUserError,
  CreateUserRequest,
  User,
  UserRole,
} from '../../services/users.types'
import './UsuariosPage.css'

const PAGE_SIZE = 25

export function UsuariosPage() {
  const { roles, user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notice, setNotice] = useState('')

  async function loadUsers() {
    setLoading(true)
    setLoadError(false)
    try {
      setUsers(await usersApi.listUsers())
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadInitialUsers() {
      setLoading(true)
      setLoadError(false)
      try {
        const nextUsers = await usersApi.listUsers()
        if (!cancelled) setUsers(nextUsers)
      } catch {
        if (!cancelled) setLoadError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInitialUsers()
    return () => { cancelled = true }
  }, [])

  const canCreate = roles.includes('operations-administrator')
  if (!canCreate) {
    return (
      <section className="screen no-access" role="alert">
        <h1>No tienes acceso a esta pantalla</h1>
        <p>Tu perfil no tiene permiso para consultar esta sección.</p>
      </section>
    )
  }

  return (
    <section className={`screen users-page${drawerOpen ? ' users-page--drawer-open' : ''}`}>
      <header className="users-page__header">
        <div>
          <h1 className="page-heading" aria-label="Usuarios">Usuarios y roles</h1>
          <p className="users-page__subtitle">Cuentas de la plataforma, su rol y su acceso.</p>
        </div>
        <Button icon={<PlusIcon />} onClick={() => { setNotice(''); setDrawerOpen(true) }}>Crear usuario</Button>
      </header>
      {notice && <div className="users-page__banner" role="status">{notice}</div>}
      <div className="users-page__tabs" role="tablist" aria-label="Secciones de usuarios">
        <button className="users-page__tab users-page__tab--active" type="button" role="tab" aria-selected="true">Usuarios {users.length}</button>
        <button className="users-page__tab" type="button" role="tab" aria-selected="false" disabled>Matriz de permisos</button>
      </div>
      <div className="users-page__workspace">
        <div className="users-page__list">
          {loading
            ? <div className="users-page__empty">Cargando usuarios…</div>
            : loadError
              ? <div className="users-page__empty users-page__empty--error" role="alert">No se pudieron cargar los usuarios. Intenta nuevamente.</div>
              : <UsersTable users={users} currentUserEmail={currentUser.email} />}
          {!loading && !loadError && users.length > 0 && (
            <Paginador
              range={`1–${Math.min(PAGE_SIZE, users.length)} de ${users.length}`}
              page={1}
              totalPages={Math.max(1, Math.ceil(users.length / PAGE_SIZE))}
              onPageChange={() => undefined}
            />
          )}
        </div>
        {drawerOpen && (
          <CreateUserDrawer
            onClose={() => {
              setDrawerOpen(false)
              document.querySelector<HTMLButtonElement>('.users-page__header .ui-button')?.focus()
            }}
            onCreated={async () => { await loadUsers(); setDrawerOpen(false); setNotice('La cuenta se creó correctamente.') }}
          />
        )}
      </div>
    </section>
  )
}

interface UsersTableProps {
  users: User[]
  currentUserEmail?: string
}

function UsersTable({ users, currentUserEmail }: Readonly<UsersTableProps>) {
  return (
    <div className="users-page__table-wrap">
      <div className="users-page__summary">{users.length} usuarios · {users.filter((user) => user.status === 'active').length} activos</div>
      {users.length === 0
        ? <div className="users-page__empty">No hay usuarios para mostrar.</div>
        : <table className="users-table">
          <thead><tr><th>USUARIO</th><th>ROL</th><th>ESTADO</th><th>ÚLTIMO ACCESO</th><th>ACCIONES</th></tr></thead>
          <tbody>{users.map((item) => (
            <tr className={item.status === 'disabled' ? 'users-table__row--disabled' : ''} key={item.id}>
              <td><div className="users-table__person"><span className="users-table__avatar" aria-hidden="true">{getInitials(item.fullName)}</span><span><strong>{item.fullName}{item.email === currentUserEmail ? ' (tú)' : ''}</strong><span className="users-table__email">{item.email}</span></span></div></td>
              <td><Chip tone={item.role === 'Operations administrator' ? 'orange' : 'neutral'}>{item.role}</Chip></td>
              <td><Chip tone={item.status === 'active' ? 'ok' : 'neutral'}>{item.status === 'active' ? 'Activo' : 'Desactivado'}</Chip></td>
              <td>{item.lastAccess}</td>
              <td><Button variant="secondary" disabled>{item.status === 'disabled' ? 'Reactivar' : 'Editar'}</Button></td>
            </tr>
          ))}</tbody>
        </table>}
    </div>
  )
}

interface CreateUserDrawerProps {
  onClose: () => void
  onCreated: () => Promise<void>
}

function CreateUserDrawer({ onClose, onCreated }: Readonly<CreateUserDrawerProps>) {
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Omit<CreateUserRequest, 'role'>>({ fullName: '', email: '' })
  const [roleSelected, setRoleSelected] = useState<UserRole | ''>('')
  const [errors, setErrors] = useState<Partial<Record<'fullName' | 'email' | 'role', string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [apiErrorStatus, setApiErrorStatus] = useState<CreateUserError['status'] | null>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function validate(): boolean {
    const nextErrors: typeof errors = {}
    if (!form.fullName.trim()) nextErrors.fullName = 'El nombre completo es obligatorio.'
    if (!form.email.trim()) nextErrors.email = 'El correo corporativo es obligatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Ingresa un correo corporativo válido.'
    if (!roleSelected) nextErrors.role = 'Selecciona un rol.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setApiError('')
    setApiErrorStatus(null)
    try {
      await usersApi.createUser({ ...form, role: roleSelected as UserRole })
      await onCreated()
    } catch (error) {
      const apiErrorValue: CreateUserError = isCreateUserError(error)
        ? error
        : { status: 503, message: 'No se pudo crear la cuenta.' }
      setApiError(apiErrorValue.message || 'No se pudo crear la cuenta.')
      setApiErrorStatus(apiErrorValue.status)
      if (apiErrorValue.status === 409) setErrors((previous) => ({ ...previous, email: apiErrorValue.message }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <aside className="users-drawer" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
        <header className="users-drawer__header">
          <div><h2 className="users-drawer__title" id="create-user-title">Crear usuario</h2><p className="users-drawer__subtitle">La cuenta queda activa con los permisos del rol.</p></div>
          <button className="users-drawer__close" type="button" aria-label="Cerrar" onClick={onClose}><XIcon /></button>
        </header>
        <form className="users-drawer__form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="users-drawer__body">
            {apiError && apiErrorStatus !== 409 && <div className="users-page__banner users-page__banner--error" role="alert">{apiError}</div>}
            <UserInput ref={firstInputRef} id="user-full-name" label="Nombre completo *" value={form.fullName} error={errors.fullName} onChange={(value) => setForm((previous) => ({ ...previous, fullName: value }))} />
            <UserInput id="user-email" label="Correo corporativo *" type="email" value={form.email} error={errors.email} onChange={(value) => setForm((previous) => ({ ...previous, email: value }))} />
            <fieldset className="users-drawer__roles" aria-describedby={errors.role ? 'user-role-error' : undefined}>
              <legend className="users-drawer__role-label">Rol *</legend>
              {USER_ROLES.map((role) => <label className={`users-drawer__role${roleSelected === role ? ' users-drawer__role--selected' : ''}`} key={role}><input type="radio" name="user-role" value={role} checked={roleSelected === role} onChange={() => { setRoleSelected(role); setErrors((previous) => ({ ...previous, role: undefined })) }} /><span><span className="users-drawer__role-name">{role}</span><span className="users-drawer__role-description">{ROLE_DESCRIPTIONS[role]}</span></span></label>)}
            </fieldset>
            {errors.role && <p className="users-drawer__error" id="user-role-error"><AlertIcon />{errors.role}</p>}
          </div>
          <footer className="users-drawer__footer"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? 'Creando…' : 'Crear cuenta'}</Button></footer>
        </form>
    </aside>
  )
}

interface UserInputProps {
  id: string
  label: string
  value: string
  error?: string
  type?: 'text' | 'email'
  onChange: (value: string) => void
}

function UserInput({ id, label, value, error, type = 'text', onChange, ref }: UserInputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <div className="users-drawer__field"><label htmlFor={id}>{label}</label><input ref={ref} className={`users-drawer__input${error ? ' users-drawer__input--error' : ''}`} id={id} type={type} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} />{error && <p className="users-drawer__error" id={`${id}-error`}><AlertIcon />{error}</p>}</div>
}

function isCreateUserError(error: unknown): error is CreateUserError {
  return typeof error === 'object'
    && error !== null
    && 'status' in error
    && 'message' in error
    && typeof error.message === 'string'
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}