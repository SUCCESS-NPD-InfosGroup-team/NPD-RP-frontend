import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AlertIcon, PlusIcon, XIcon } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { Chip, type ChipTone } from '../../components/ui/Chip'
import { Paginador } from '../../components/ui/Paginador'
import { roleName, UsersApiError, usersApi } from '../../services/users'
import type {
  CreateUserField,
  Page,
  Role,
  RoleCode,
  User,
  UserState,
} from '../../services/users.types'
import './UsuariosPage.css'

const PAGE_SIZE = 25
const FULL_NAME_MAX = 150
const EMAIL_MAX = 254

const STATE_LABELS: Record<UserState, { label: string; tone: ChipTone }> = {
  PENDING: { label: 'Pendiente', tone: 'warn' },
  ACTIVE: { label: 'Activo', tone: 'ok' },
  DISABLED: { label: 'Desactivado', tone: 'neutral' },
}

const lastAccessFormat = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Último acceso en la hora local del navegador; null → "Nunca" */
// eslint-disable-next-line react-refresh/only-export-components
export function formatLastAccess(value: string | null): string {
  if (!value) return 'Nunca'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : lastAccessFormat.format(date)
}

function NoAccess() {
  return (
    <section className="screen no-access" role="alert">
      <h1>No tienes acceso a esta pantalla</h1>
      <p>Tu perfil no tiene permiso para consultar esta sección.</p>
    </section>
  )
}

/** Solo Operations administrator: el resto ni siquiera llama al backend (que también los rechaza con 403). */
export function UsuariosPage() {
  const { roles } = useAuth()
  if (!roles.includes('operations-administrator')) return <NoAccess />
  return <UsersAdministration />
}

function UsersAdministration() {
  const { user: currentUser } = useAuth()
  const [page, setPage] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState<Page<User> | null>(null)
  // La última petición que terminó; mientras no coincida con la actual, la lista está cargando
  const [settledKey, setSettledKey] = useState('')
  const [loadError, setLoadError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesError, setRolesError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const createUserButtonRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef(false)

  useEffect(() => {
    if (!drawerOpen && restoreFocusRef.current) {
      createUserButtonRef.current?.focus()
      restoreFocusRef.current = false
    }
  }, [drawerOpen])

  useEffect(() => {
    let cancelled = false
    usersApi.listRoles()
      .then((items) => { if (!cancelled) setRoles(items) })
      .catch((error: unknown) => {
        if (cancelled) return
        if (isForbidden(error)) setForbidden(true)
        setRolesError(problemText(error, 'No se pudieron cargar los roles.'))
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const key = `${page}:${reloadKey}`
    usersApi.listUsers(page, PAGE_SIZE)
      .then((nextData) => {
        if (cancelled) return
        setData(nextData)
        setLoadError('')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (isForbidden(error)) setForbidden(true)
        setLoadError(problemText(error, 'No se pudieron cargar los usuarios.'))
      })
      .finally(() => { if (!cancelled) setSettledKey(key) })
    return () => { cancelled = true }
  }, [page, reloadKey])

  const closeDrawer = useCallback(() => {
    restoreFocusRef.current = true
    setDrawerOpen(false)
  }, [])

  if (forbidden) return <NoAccess />

  const loading = settledKey !== `${page}:${reloadKey}`

  const total = data?.page.totalElements ?? 0
  const totalPages = Math.max(1, data?.page.totalPages ?? 1)

  let userListContent = <UsersTable users={data?.items ?? []} total={total} roles={roles} currentUserEmail={currentUser.email} />
  if (loading && !data) {
    userListContent = <div className="users-page__empty">Cargando usuarios…</div>
  } else if (loadError && !loading) {
    userListContent = (
      <div className="users-page__empty users-page__empty--error" role="alert">
        <p>{loadError}</p>
        <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button>
      </div>
    )
  }

  return (
    <section className={`screen users-page${drawerOpen ? ' users-page--drawer-open' : ''}`}>
      <header className="users-page__header">
        <div>
          <h1 className="page-heading" aria-label="Usuarios">Usuarios y roles</h1>
          <p className="users-page__subtitle">Cuentas de la plataforma, su rol y su acceso.</p>
        </div>
        <Button ref={createUserButtonRef} icon={<PlusIcon />} onClick={() => { setNotice(''); setDrawerOpen(true) }}>Crear usuario</Button>
      </header>
      {notice && <output className="users-page__banner">{notice}</output>}
      <div className="users-page__tabs" role="tablist" aria-label="Secciones de usuarios">
        <button className="users-page__tab users-page__tab--active" type="button" role="tab" aria-selected="true">Usuarios {total}</button>
        <button className="users-page__tab" type="button" role="tab" aria-selected="false" disabled>Matriz de permisos</button>
      </div>
      <div className="users-page__workspace">
        <div className="users-page__list">
          {userListContent}
          {!loadError && data && total > 0 && (
            <Paginador
              range={`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} de ${total}`}
              page={page + 1}
              totalPages={totalPages}
              onPageChange={(nextPage) => setPage(nextPage - 1)}
            />
          )}
        </div>
        {drawerOpen && (
          <CreateUserDrawer
            roles={roles}
            rolesError={rolesError}
            onClose={closeDrawer}
            onCreated={(created) => {
              restoreFocusRef.current = true
              setDrawerOpen(false)
              setNotice(`Se creó la cuenta de ${created.fullName}. Le enviamos a ${created.email} un enlace para definir su contraseña (vale 48 horas).`)
              setPage(0)
              setReloadKey((key) => key + 1)
            }}
          />
        )}
      </div>
    </section>
  )
}

interface UsersTableProps {
  users: User[]
  total: number
  roles: readonly Role[]
  currentUserEmail?: string
}

function UsersTable({ users, total, roles, currentUserEmail }: Readonly<UsersTableProps>) {
  const ownEmail = currentUserEmail?.toLowerCase()
  return (
    <div className="users-page__table-wrap">
      <div className="users-page__summary">{total} {total === 1 ? 'usuario' : 'usuarios'}</div>
      {users.length === 0
        ? <div className="users-page__empty">No hay usuarios para mostrar.</div>
        : <table className="users-table">
          <thead><tr><th>USUARIO</th><th>ROL</th><th>ESTADO</th><th>ÚLTIMO ACCESO</th></tr></thead>
          <tbody>{users.map((item) => {
            const state = STATE_LABELS[item.state] ?? { label: item.state, tone: 'neutral' }
            return (
              <tr className={item.state === 'DISABLED' ? 'users-table__row--disabled' : ''} key={item.id}>
                <td><div className="users-table__person"><span className="users-table__avatar" aria-hidden="true">{getInitials(item.fullName)}</span><span><strong>{item.fullName}{item.email.toLowerCase() === ownEmail ? ' (tú)' : ''}</strong><span className="users-table__email">{item.email}</span></span></div></td>
                <td><Chip tone={item.role === 'operations-administrator' ? 'orange' : 'neutral'}>{roleName(roles, item.role)}</Chip></td>
                <td><Chip tone={state.tone}>{state.label}</Chip></td>
                <td>{formatLastAccess(item.lastAccessAt)}</td>
              </tr>
            )
          })}</tbody>
        </table>}
    </div>
  )
}

interface CreateUserDrawerProps {
  roles: readonly Role[]
  rolesError: string
  onClose: () => void
  onCreated: (user: User) => void
}

type FormErrors = Partial<Record<CreateUserField, string>>

function CreateUserDrawer({ roles, rolesError, onClose, onCreated }: Readonly<CreateUserDrawerProps>) {
  const drawerRef = useRef<HTMLDialogElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [roleSelected, setRoleSelected] = useState<RoleCode | ''>('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<{ title: string; detail: string } | null>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusableElements = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
      ))
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      if (!lastElement) return
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Mismos textos que el backend (FRONTEND-INTEGRATION.md §5)
  function validate(): boolean {
    const nextErrors: FormErrors = {}
    const name = fullName.trim()
    const mail = email.trim()
    if (!name) nextErrors.fullName = 'Escribe el nombre completo.'
    else if (name.length > FULL_NAME_MAX) nextErrors.fullName = 'El nombre puede tener hasta 150 caracteres.'
    if (!mail) nextErrors.email = 'Escribe el correo.'
    else if (mail.length > EMAIL_MAX) nextErrors.email = 'El correo puede tener hasta 254 caracteres.'
    else if (!isValidEmail(mail)) nextErrors.email = 'Escribe un correo válido.'
    if (!roleSelected) nextErrors.role = 'Selecciona un rol.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setApiError(null)
    try {
      const created = await usersApi.createUser({ fullName: fullName.trim(), email: email.trim(), role: roleSelected as RoleCode })
      onCreated(created)
    } catch (error) {
      if (error instanceof UsersApiError && error.code === 'VALIDATION_FAILED' && error.errors?.length) {
        const fieldErrors: FormErrors = {}
        for (const fieldError of error.errors) {
          if (isFormField(fieldError.field)) fieldErrors[fieldError.field] ??= fieldError.message
        }
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length === 0) setApiError({ title: error.title, detail: error.detail })
      } else if (error instanceof UsersApiError && error.code === 'EMAIL_TAKEN') {
        setErrors((previous) => ({ ...previous, email: error.detail }))
      } else if (error instanceof UsersApiError) {
        setApiError({ title: error.title, detail: error.detail })
      } else {
        setApiError({ title: 'No se pudo crear la cuenta', detail: 'Revisa tu conexión e intenta nuevamente.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog open className="users-drawer" ref={drawerRef} aria-modal="true" aria-labelledby="create-user-title">
      <header className="users-drawer__header">
        <div><h2 className="users-drawer__title" id="create-user-title">Crear usuario</h2><p className="users-drawer__subtitle">Le enviaremos un correo para que defina su contraseña.</p></div>
        <button className="users-drawer__close" type="button" aria-label="Cerrar" onClick={onClose}><XIcon /></button>
      </header>
      <form className="users-drawer__form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <div className="users-drawer__body">
          {apiError && <div className="users-page__banner users-page__banner--error" role="alert"><strong>{apiError.title}.</strong> {apiError.detail}</div>}
          <UserInput ref={firstInputRef} id="user-full-name" label="Nombre completo *" value={fullName} maxLength={FULL_NAME_MAX} error={errors.fullName} onChange={(value) => { setFullName(value); setErrors((previous) => ({ ...previous, fullName: undefined })) }} />
          <UserInput id="user-email" label="Correo corporativo *" type="email" value={email} maxLength={EMAIL_MAX} error={errors.email} onChange={(value) => { setEmail(value); setErrors((previous) => ({ ...previous, email: undefined })) }} />
          <fieldset className="users-drawer__roles" aria-describedby={errors.role ? 'user-role-error' : undefined}>
            <legend className="users-drawer__role-label">Rol *</legend>
            {rolesError && roles.length === 0 && <p className="users-drawer__error" role="alert"><AlertIcon />{rolesError}</p>}
            {roles.map((role) => {
              const roleId = `user-role-${role.code}`
              return <label className={`users-drawer__role${roleSelected === role.code ? ' users-drawer__role--selected' : ''}`} htmlFor={roleId} key={role.code}><input id={roleId} type="radio" name="user-role" value={role.code} checked={roleSelected === role.code} onChange={() => { setRoleSelected(role.code); setErrors((previous) => ({ ...previous, role: undefined })) }} /><span><span className="users-drawer__role-name">{role.name}</span><span className="users-drawer__role-description">{role.description}</span></span></label>
            })}
          </fieldset>
          {errors.role && <p className="users-drawer__error" id="user-role-error"><AlertIcon />{errors.role}</p>}
        </div>
        <footer className="users-drawer__footer"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? 'Creando…' : 'Crear cuenta'}</Button></footer>
      </form>
    </dialog>
  )
}

interface UserInputProps {
  id: string
  label: string
  value: string
  maxLength: number
  error?: string
  type?: 'text' | 'email'
  onChange: (value: string) => void
}

function UserInput({ id, label, value, maxLength, error, type = 'text', onChange, ref }: UserInputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <div className="users-drawer__field"><label htmlFor={id}>{label}</label><input ref={ref} className={`users-drawer__input${error ? ' users-drawer__input--error' : ''}`} id={id} type={type} value={value} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} />{error && <p className="users-drawer__error" id={`${id}-error`}><AlertIcon />{error}</p>}</div>
}

function isFormField(field: string): field is CreateUserField {
  return field === 'fullName' || field === 'email' || field === 'role'
}

function isForbidden(error: unknown): boolean {
  return error instanceof UsersApiError && error.status === 403
}

function problemText(error: unknown, fallback: string): string {
  return error instanceof UsersApiError ? `${fallback} ${error.detail}` : `${fallback} Intenta nuevamente.`
}

function isValidEmail(email: string): boolean {
  if (/\s/.test(email)) return false
  const atIndex = email.indexOf('@')
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@')) return false
  const domain = email.slice(atIndex + 1)
  const dotIndex = domain.indexOf('.')
  return dotIndex > 0 && dotIndex < domain.length - 1
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}
