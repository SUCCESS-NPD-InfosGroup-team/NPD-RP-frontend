import type { Role } from '../../types'
export type { Role } from '../../types'

export type NavigationItemId =
  | 'resources'
  | 'arrivals'
  | 'dashboard'
  | 'vacations'
  | 'users'
  | 'notifications'
  | 'audit'
  | 'infosweb'

export interface NavigationItem {
  id: NavigationItemId
  label: string
  path: string
  allowedRoles: readonly Role[]
  showInNavigation?: boolean
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: 'resources',
    label: 'Recursos',
    path: '/recursos',
    allowedRoles: [
      'operations-administrator',
      'guest',
      'customer-success',
      'npd-leader',
    ],
  },
  {
    id: 'arrivals',
    label: 'Arribos próximos',
    path: '/arribos-proximos',
    allowedRoles: [
      'operations-administrator',
      'guest',
      'customer-success',
      'npd-leader',
    ],
    showInNavigation: false,
  },
  {
    id: 'dashboard',
    label: 'Tablero',
    path: '/tablero',
    allowedRoles: ['operations-administrator'],
  },
  {
    id: 'vacations',
    label: 'Vacaciones',
    path: '/vacaciones',
    allowedRoles: [
      'operations-administrator',
      'customer-success',
      'npd-leader',
    ],
  },
  {
    id: 'infosweb',
    label: 'Infosweb',
    path: '/infosweb',
    allowedRoles: ['operations-administrator'],
  },
  {
    id: 'users',
    label: 'Usuarios',
    path: '/usuarios',
    allowedRoles: ['operations-administrator'],
  },
  {
    id: 'notifications',
    label: 'Avisos',
    path: '/avisos',
    allowedRoles: ['operations-administrator'    ],
  },
  {
    id: 'audit',
    label: 'Auditoría',
    path: '/auditoria',
    allowedRoles: ['operations-administrator'],
    showInNavigation: false,
  },
]

const knownRoles: readonly Role[] = [
  'operations-administrator',
  'guest',
  'customer-success',
  'npd-leader',
]

export function isUserRole(role: unknown): role is Role {
  return typeof role === 'string' && (knownRoles as readonly string[]).includes(role)
}

function hasAllowedRole(
  roles: readonly Role[],
  roleOrRoles: unknown,
): boolean {
  const candidates = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]
  return candidates.some(
    (candidate: unknown) =>
      isUserRole(candidate) && roles.includes(candidate),
  )
}

export function getNavigationForRole(role: unknown): NavigationItem[] {
  return NAVIGATION_ITEMS.filter(
    ({ allowedRoles, showInNavigation = true }) =>
      showInNavigation && hasAllowedRole(allowedRoles, role),
  )
}

export function canAccessNavigationItem(
  role: unknown,
  itemId: string,
): boolean {
  return NAVIGATION_ITEMS.some(
    ({ allowedRoles, id }) =>
      id === itemId && hasAllowedRole(allowedRoles, role),
  )
}

export function canRegisterResources(role: unknown): boolean {
  return hasAllowedRole(['operations-administrator'], role)
}
