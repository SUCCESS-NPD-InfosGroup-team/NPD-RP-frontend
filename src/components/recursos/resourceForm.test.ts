import {
  apiFieldErrors,
  EMPTY_RESOURCE_FORM,
  orderedErrorFields,
  previewSituation,
  toResourceRequest,
  validateResourceForm,
  type ResourceFormValues,
} from './resourceForm'

const TODAY = '2026-10-24'

const valid: ResourceFormValues = {
  ...EMPTY_RESOURCE_FORM,
  employeeNumber: ' 1102 ',
  name: 'Laura Gómez',
  positionId: '4',
  workModeId: '1',
  genderId: '1',
  hireDate: '20/10/2026',
  clientId: '3',
  projectId: '41',
  leaderId: '755',
  indefinite: true,
}

describe('validateResourceForm', () => {
  it('accepts a complete record with project', () => {
    expect(validateResourceForm(valid, TODAY)).toEqual({})
  })

  it('requires the collaborator fields and the project fields', () => {
    const errors = validateResourceForm({ ...EMPTY_RESOURCE_FORM, status: '' }, TODAY)
    expect(Object.keys(errors)).toEqual(expect.arrayContaining([
      'employeeNumber', 'name', 'positionId', 'workModeId', 'genderId', 'hireDate', 'status',
      'assignment.clientId', 'assignment.projectId', 'assignment.leaderId', 'assignment.endDate',
    ]))
  })

  it('does not ask for project data with "Sin proyecto por ahora"', () => {
    const errors = validateResourceForm({ ...valid, withProject: false, clientId: '', projectId: '', leaderId: '', indefinite: false }, TODAY)
    expect(errors).toEqual({})
  })

  it('rejects an end date already passed but accepts today', () => {
    expect(validateResourceForm({ ...valid, indefinite: false, endDate: '23/10/2026' }, TODAY))
      .toEqual({ 'assignment.endDate': 'Ya pasó. Usa una fecha futura o marca indefinido.' })
    expect(validateResourceForm({ ...valid, indefinite: false, endDate: '24/10/2026' }, TODAY)).toEqual({})
  })

  it('rejects level 0', () => {
    expect(validateResourceForm({ ...valid, level: '0' }, TODAY)).toEqual({ level: 'Usa un número entero mayor que 0.' })
  })

  it('validates formats of dates, emails and level', () => {
    const errors = validateResourceForm({
      ...valid,
      hireDate: '31/02/2026',
      email: 'no-es-correo',
      level: '40000',
      clientContactEmail: 'mal@',
    }, TODAY)
    expect(errors).toMatchObject({
      hireDate: 'Usa una fecha válida en formato dd/mm/aaaa.',
      email: 'Usa un correo válido.',
      level: 'Usa un número entero mayor que 0.',
      'assignment.clientContactEmail': 'Usa un correo válido.',
    })
  })

  it('requires reason and a termination date not before the hire date with Estado = Baja', () => {
    expect(validateResourceForm({ ...valid, status: 'BAJA' }, TODAY)).toEqual({
      'termination.reasonId': 'Selecciona el motivo de desvinculación.',
      'termination.date': 'Indica la fecha de desvinculación.',
    })
    expect(validateResourceForm({ ...valid, status: 'BAJA', terminationReasonId: '2', terminationDate: '19/10/2026' }, TODAY))
      .toEqual({ 'termination.date': 'No puede ser anterior al inicio de contrato.' })
  })

  it('does not ask for project data with Estado = Baja', () => {
    const errors = validateResourceForm({ ...valid, status: 'BAJA', terminationReasonId: '2', terminationDate: '30/10/2026', projectId: '', leaderId: '' }, TODAY)
    expect(errors).toEqual({})
  })
})

describe('toResourceRequest', () => {
  it('builds the contract request with an assignment that only carries the project id', () => {
    expect(toResourceRequest({ ...valid, level: '3', email: ' ', indefinite: false, endDate: '31/12/2026', clientRoleId: '7' })).toEqual({
      employeeNumber: '1102',
      name: 'Laura Gómez',
      email: null,
      jobTitleId: null,
      positionId: 4,
      level: 3,
      businessUnitId: null,
      workModeId: 1,
      genderId: 1,
      talentReviewId: null,
      hireDate: '2026-10-20',
      status: 'ACTIVO',
      termination: null,
      assignment: {
        projectId: 41,
        leaderId: 755,
        clientRoleId: 7,
        equipmentId: null,
        endDate: '2026-12-31',
        indefinite: false,
        clientContactEmail: null,
      },
    })
  })

  it('sends no assignment without project or with Estado = Baja', () => {
    expect(toResourceRequest({ ...valid, withProject: false }).assignment).toBeNull()
    const terminated = toResourceRequest({ ...valid, status: 'BAJA', terminationReasonId: '2', terminationDate: '30/10/2026' })
    expect(terminated.assignment).toBeNull()
    expect(terminated.termination).toEqual({ date: '2026-10-30', reasonId: 2 })
  })

  it('sends a null end date when it is indefinite', () => {
    expect(toResourceRequest({ ...valid, endDate: '31/12/2026' }).assignment?.endDate).toBeNull()
  })
})

describe('helpers', () => {
  it('previews the situation from the project and the status', () => {
    expect(previewSituation(valid).code).toBe('ASIGNADO')
    expect(previewSituation({ ...valid, withProject: false }).code).toBe('SIN_PROYECTO')
    expect(previewSituation({ ...valid, status: 'BAJA' }).code).toBe('SIN_PROYECTO')
  })

  it('maps API errors and orders them like the form', () => {
    const errors = apiFieldErrors([
      { field: 'assignment.endDate', code: 'DATE_IN_PAST', message: 'Ya pasó.' },
      { field: 'employeeNumber', code: 'REQUIRED', message: 'Falta.' },
      { field: 'unknown', code: 'X', message: 'Otro.' },
    ])
    expect(errors['assignment.endDate']).toBe('Ya pasó.')
    expect(orderedErrorFields(errors)).toEqual(['employeeNumber', 'assignment.endDate', 'unknown'])
    expect(apiFieldErrors(undefined)).toEqual({})
  })
})
