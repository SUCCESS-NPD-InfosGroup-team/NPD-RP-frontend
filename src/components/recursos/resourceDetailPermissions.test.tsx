import { describe, expect, it } from 'vitest'
import { canPerformResourceAction } from './resourceDetailPermissions'

describe('resource detail permissions', () => {
  it('allows every action for the Operations administrator', () => {
    expect(canPerformResourceAction(['operations-administrator'], 'edit')).toBe(true)
    expect(canPerformResourceAction(['operations-administrator'], 'audit')).toBe(true)
    expect(canPerformResourceAction(['operations-administrator'], 'history')).toBe(true)
  })

  it.each(['npd-leader', 'customer-success'])('allows history for %s', (role) => {
    expect(canPerformResourceAction([role], 'history')).toBe(true)
    expect(canPerformResourceAction([role], 'edit')).toBe(false)
    expect(canPerformResourceAction([role], 'audit')).toBe(false)
  })

  it.each(['guest', 'unknown-role'])('does not allow actions for %s', (role) => {
    expect(canPerformResourceAction([role], 'edit')).toBe(false)
    expect(canPerformResourceAction([role], 'audit')).toBe(false)
    expect(canPerformResourceAction([role], 'history')).toBe(false)
  })

  it('accepts legacy role labels and skips unknown roles', () => {
    expect(canPerformResourceAction(['unknown-role', 'NPD Lead'], 'history')).toBe(true)
    expect(canPerformResourceAction(['Operations administrator'], 'audit')).toBe(true)
  })
})
