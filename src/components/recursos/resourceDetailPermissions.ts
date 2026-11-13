import type { Role } from '../../types'

export type ResourceDetailAction = 'edit' | 'audit' | 'history'

const ACTIONS_BY_ROLE: Readonly<Record<Role, readonly ResourceDetailAction[]>> = {
  'Operations administrator': ['edit', 'audit', 'history'],
  'operations-administrator': ['edit', 'audit', 'history'],
  'NPD Lead': ['history'],
  'npd-leader': ['history'],
  'Customer Success': ['history'],
  'customer-success': ['history'],
  Guest: [],
  guest: [],
}

export function canPerformResourceAction(
  roles: readonly string[],
  action: ResourceDetailAction,
): boolean {
  return roles.some((role) => ACTIONS_BY_ROLE[role as Role]?.includes(action) ?? false)
}
