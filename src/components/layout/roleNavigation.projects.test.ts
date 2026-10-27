import { describe, expect, it } from 'vitest'
import { canAccessNavigationItem, canCreateProjects, getNavigationForRole } from './roleNavigation'

describe('project permissions', () => {
  it.each(['operations-administrator', 'guest', 'customer-success', 'npd-leader'] as const)('allows %s to view projects', (role) => {
    expect(canAccessNavigationItem(role, 'projects')).toBe(true)
    expect(getNavigationForRole(role).some((item) => item.id === 'projects')).toBe(true)
  })

  it.each(['guest', 'customer-success', 'npd-leader', 'unknown-role'] as const)('hides write actions for %s', (role) => {
    expect(canCreateProjects(role)).toBe(false)
  })

  it('allows only operations-administrator to create projects', () => {
    expect(canCreateProjects('operations-administrator')).toBe(true)
  })
})
