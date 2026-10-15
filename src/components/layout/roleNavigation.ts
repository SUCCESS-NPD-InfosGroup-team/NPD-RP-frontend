import type { UserRole } from '../../types'
export type { UserRole } from '../../types'

export interface NavigationItem {
  id: string
  label: string
  path: string
  allowedRoles: readonly UserRole[]
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
      'sales-customer-success',
      'npd-lead',
    ],
  },
  {
    id: 'arrivals',
    label: 'Arribos próximos',
    path: '/arribos-proximos',
    allowedRoles: [
      'operations-administrator',
      'guest',
      'sales-customer-success',
      'npd-lead',
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
      'sales-customer-success',
      'npd-lead',
    ],
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
    allowedRoles: ['operations-administrator'],
  },
  {
    id: 'audit',
    label: 'Auditoría',
    path: '/auditoria',
    allowedRoles: ['operations-administrator'],
    showInNavigation: false,
  },
  {
    id: 'infosweb',
    label: 'Infosweb',
    path: '/infosweb',
    allowedRoles: ['operations-administrator'],
  },
]

const knownRoles: readonly UserRole[] = [
  'operations-administrator',
  'guest',
  'sales-customer-success',
  'npd-lead',
]

export function isUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && knownRoles.includes(role as UserRole)
}

export function getNavigationForRole(role: unknown): NavigationItem[] {
  if (!isUserRole(role)) {
    return []
  }

  return NAVIGATION_ITEMS.filter(
    ({ allowedRoles, showInNavigation = true }) =>
      showInNavigation && allowedRoles.includes(role),
  )
}

export function canAccessNavigationItem(
  role: unknown,
  itemId: string,
): boolean {
  if (!isUserRole(role)) {
    return false
  }

  return NAVIGATION_ITEMS.some(
    ({ allowedRoles, id }) => id === itemId && allowedRoles.includes(role),
  )
}

export function canRegisterResources(role: unknown): boolean {
  return role === 'operations-administrator'
}
