import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BulkAssignmentApiError } from '../services/bulkAssignment.api'
import type { BulkAssignmentResponse } from '../services/bulkAssignment.types'
import { useBulkAssign, type BulkAssignProject, type BulkAssignResource } from './useBulkAssign'

const project: BulkAssignProject = {
  id: 7,
  name: 'Core QA',
  client: { id: 3, name: 'Banco Mercantil' },
  teamSize: 4,
  contractEndDate: '2027-03-31',
}

const response: BulkAssignmentResponse = {
  project: { id: 7, name: 'Core QA' },
  client: { id: 3, name: 'Banco Mercantil' },
  assigned: 1,
  added: 1,
  moved: 0,
  members: [{
    id: 890,
    name: 'Jorge Castillo',
    previousProject: null,
    endDate: '2027-03-31',
    indefinite: false,
    version: 3,
  }],
}

function person(
  employeeId: number,
  overrides: Partial<BulkAssignResource> = {},
): BulkAssignResource {
  return {
    employeeId,
    employeeNumber: String(employeeId),
    name: `Persona ${employeeId}`,
    statusCode: 'ACTIVO',
    version: 2,
    leaderId: 755,
    clientRoleName: 'QA Funcional',
    ...overrides,
  }
}

describe('useBulkAssign', () => {
  const assignMembers = vi.fn()

  beforeEach(() => {
    assignMembers.mockReset().mockResolvedValue(response)
  })

  it('keeps unique selected ids when selecting rows across pages', () => {
    const { result } = renderHook(() => useBulkAssign({ assignMembers }))

    act(() => result.current.togglePerson(person(890)))
    act(() => result.current.toggleGroup([person(744), person(744)]))

    expect(result.current.selectedCount).toBe(2)
    expect(result.current.selectedPeople.map(({ employeeId }) => employeeId)).toEqual([890, 744])
  })

  it('toggles only visible group members and preserves selections outside the group', () => {
    const { result } = renderHook(() => useBulkAssign({ assignMembers }))
    act(() => result.current.togglePerson(person(890)))
    act(() => result.current.toggleGroup([person(744), person(1092)]))

    expect(result.current.selectedPeople.map(({ employeeId }) => employeeId)).toEqual([890, 744, 1092])

    act(() => result.current.toggleGroup([person(744), person(1092)]))
    expect(result.current.selectedPeople.map(({ employeeId }) => employeeId)).toEqual([890])
  })

  it('rejects Baja people and enforces the 100-person limit', () => {
    const { result } = renderHook(() => useBulkAssign({ assignMembers }))
    act(() => result.current.togglePerson(person(1, { statusCode: 'BAJA' })))

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.selectionError).toContain('está en Baja')

    act(() => {
      for (let employeeId = 1; employeeId <= 100; employeeId += 1) {
        result.current.togglePerson(person(employeeId))
      }
      result.current.togglePerson(person(101))
    })

    expect(result.current.selectedCount).toBe(100)
    expect(result.current.selectionError).toContain('hasta 100')
  })

  it('prepares assignment rows from selected people and the project contract end', () => {
    const { result } = renderHook(() => useBulkAssign({ assignMembers }))
    act(() => result.current.togglePerson(person(890)))
    act(() => result.current.chooseProject(project))

    expect(result.current.step).toBe('assignment')
    expect(result.current.project).toEqual(project)
    expect(result.current.defaults).toEqual({})
    expect(result.current.rows).toEqual([{
      employeeId: 890,
      employeeNumber: '890',
      name: 'Persona 890',
      version: 2,
      leaderId: 755,
      clientRoleName: 'QA Funcional',
      endDate: '2027-03-31',
    }])
    expect(result.current.rows[0]).not.toHaveProperty('equipmentId')
  })

  it('blocks submission when a selected resource has no version', async () => {
    const { result } = renderHook(() => useBulkAssign({ assignMembers }))
    act(() => result.current.togglePerson(person(890, { version: undefined })))
    act(() => result.current.chooseProject(project))

    await act(async () => result.current.submit())

    expect(assignMembers).not.toHaveBeenCalled()
    expect(result.current.submitError?.code).toBe('VERSION_REQUIRED')
    expect(result.current.errors.rows[890]).toEqual([expect.objectContaining({
      field: 'version',
      code: 'VERSION_REQUIRED',
      message: expect.stringContaining('falta la versión'),
    })])
  })

  it('applies common values to rows and clears an edited field error', () => {
    const { result } = renderHook(() => useBulkAssign({ assignMembers }))
    act(() => result.current.togglePerson(person(890)))
    act(() => result.current.chooseProject(project))
    act(() => result.current.setDefaults({ equipmentId: 1, indefinite: true }))
    act(() => result.current.applyDefaultsToAll())

    expect(result.current.rows[0]).toMatchObject({ equipmentId: 1, indefinite: true })

    act(() => result.current.updateRow(890, { equipmentId: 2 }))
    expect(result.current.rows[0].equipmentId).toBe(2)
  })

  it('maps all validation errors to their rows and common defaults', async () => {
    const { result } = renderHook(() => useBulkAssign({ assignMembers }))
    act(() => {
      result.current.togglePerson(person(890))
      result.current.togglePerson(person(744))
      result.current.chooseProject(project)
    })
    assignMembers.mockRejectedValue(new BulkAssignmentApiError(400, {
      code: 'VALIDATION_FAILED',
      errors: [
        {
          field: 'leaderId',
          code: 'REQUIRED',
          message: 'Selecciona el líder NPD.',
          employeeId: 890,
          index: 0,
        },
        {
          field: 'defaults.endDate',
          code: 'DATE_IN_PAST',
          message: 'Selecciona una fecha futura.',
        },
      ],
    }))

    await act(async () => result.current.submit())

    expect(result.current.errors.rows[890]?.[0]).toMatchObject({ field: 'leaderId', index: 0 })
    expect(result.current.errors.rows[744]).toBeUndefined()
    expect(result.current.errors.defaults[0]).toMatchObject({ field: 'defaults.endDate' })
    expect(result.current.submitError?.code).toBe('VALIDATION_FAILED')
  })

  it('preserves concurrency details and prevents a duplicate request', async () => {
    const { result } = renderHook(() => useBulkAssign({ assignMembers }))
    act(() => result.current.togglePerson(person(890)))
    act(() => result.current.chooseProject(project))
    assignMembers.mockResolvedValue(response)

    await act(async () => {
      await Promise.all([result.current.submit(), result.current.submit()])
    })

    expect(assignMembers).toHaveBeenCalledTimes(1)
    expect(assignMembers).toHaveBeenCalledWith(7, {
      defaults: {},
      members: [{
        employeeId: 890,
        version: 2,
        leaderId: 755,
        endDate: '2027-03-31',
      }],
    })
    expect(result.current.result).toEqual(response)
    expect(result.current.isSubmitting).toBe(false)
  })

  it('surfaces forbidden and concurrent-modification errors', async () => {
    const { result } = renderHook(() => useBulkAssign({ assignMembers }))
    act(() => result.current.togglePerson(person(890)))
    act(() => result.current.chooseProject(project))
    const conflict = {
      currentVersion: 3,
      updatedBy: 'María Pérez',
      updatedAt: '2026-10-07T09:12:00Z',
    }
    assignMembers.mockRejectedValue(new BulkAssignmentApiError(409, {
      code: 'CONCURRENT_MODIFICATION',
      members: [conflict],
    }))

    await act(async () => result.current.submit())

    expect(result.current.submitError?.message).toContain('cambiaron')
    expect(result.current.conflicts).toEqual([conflict])

    assignMembers.mockRejectedValue(new BulkAssignmentApiError(403, { code: 'FORBIDDEN' }))
    await act(async () => result.current.submit())
    expect(result.current.submitError?.message).toContain('No tienes permiso')
  })
})
