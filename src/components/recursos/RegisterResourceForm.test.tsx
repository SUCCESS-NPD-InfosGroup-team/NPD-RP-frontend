import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RegisterResourceForm } from './RegisterResourceForm'
import { getProjectsApi, type ProjectsApi } from '../../services/projects'
import { getResourcesApi, type ResourcesApi } from '../../services/resources'
import { ApiRequestError } from '../../services/projects.types'
import type { Catalogs } from '../../services/resources.types'
import { buildResourceResponse } from '../../test/fixtures/resourceDetail'
import { NOT_SPECIFIED_MESSAGE } from './resourceForm'

vi.mock('../../services/projects', () => ({ getProjectsApi: vi.fn() }))
vi.mock('../../services/resources', () => ({ getResourcesApi: vi.fn() }))

const catalogs: Catalogs = {
  jobTitles: [{ id: 1, name: 'QA Funcional' }],
  positions: [{ id: 4, name: 'Analista' }],
  businessUnits: [{ id: 2, name: 'Testing' }],
  workModes: [{ id: 1, name: 'Remoto' }],
  genders: [{ id: 1, name: 'Femenino' }],
  talentReviews: [],
  clientRoles: [{ id: 7, name: 'QA Automatizador' }],
  equipment: [],
  terminationReasons: [{ id: 2, name: 'Renuncia' }],
  npdLeads: [{ id: 755, name: 'Lorena Batista' }],
  statuses: [{ code: 'ACTIVO', label: 'Activo' }, { code: 'LICENCIA', label: 'Licencia' }, { code: 'BAJA', label: 'Baja' }],
}

function setup(createResource = vi.fn().mockResolvedValue({ id: 1102, name: 'Laura Gómez' })) {
  const listClientProjects = vi.fn().mockResolvedValue([
    { id: '41', name: 'Programa de automatización (DEYEL)', teamSize: 8, contractEndDate: '2026-12-31' },
  ])
  vi.mocked(getProjectsApi).mockResolvedValue({
    listProjects: vi.fn(),
    createProject: vi.fn(),
    listClients: vi.fn().mockResolvedValue([{ id: '3', name: 'BANESCO', isInternal: false, active: true }]),
    listClientProjects,
  } as unknown as ProjectsApi)
  vi.mocked(getResourcesApi).mockResolvedValue({
    getCatalogs: vi.fn().mockResolvedValue(catalogs),
    createResource,
    getResource: vi.fn(),
  } as unknown as ResourcesApi)
  const onSaved = vi.fn()
  render(<RegisterResourceForm canCreateProjects onSaved={onSaved} onCancel={vi.fn()} />)
  return { createResource, listClientProjects, onSaved }
}

const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

async function fillCollaborator() {
  await screen.findByRole('option', { name: 'Analista' })
  change('N° de empleado *', '1102')
  change('Nombre de empleado *', 'Laura Gómez')
  change('Posición en Infosgroup *', '4')
  change('Modalidad laboral *', '1')
  change('Género *', '1')
  change('Nivel', '3')
  change('Fecha de inicio de contrato *', '20102026')
}

describe('RegisterResourceForm', () => {
  it('waits for the hire date to calculate the probation and the roster preview', async () => {
    setup()
    await screen.findByRole('option', { name: 'Analista' })
    expect(screen.getByLabelText(/En periodo de prueba/)).toBeDisabled()
    expect(screen.getByText('Escribe el inicio de contrato para ver la línea de tiempo.')).toBeInTheDocument()
    change('Fecha de inicio de contrato *', '01012020')
    expect(screen.getByLabelText(/En periodo de prueba/)).not.toBeChecked()
    fireEvent.click(screen.getByLabelText(/En periodo de prueba/))
    expect(screen.getByLabelText(/En periodo de prueba/)).toBeChecked()
    // Changing the hire date goes back to the calculation
    change('Fecha de inicio de contrato *', '02012020')
    expect(screen.getByLabelText(/En periodo de prueba/)).not.toBeChecked()
    expect(screen.getByText('No está en periodo de prueba')).toBeInTheDocument()
  })

  it('summarizes the missing fields and creates nothing', async () => {
    const { createResource } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('No se guardó el registro. Corrige los 10 campos marcados')
    expect(within(summary).getByRole('link', { name: 'Líder NPD' })).toBeInTheDocument()
    expect(screen.getByLabelText('N° de empleado *')).toHaveAttribute('aria-invalid', 'true')
    expect(createResource).not.toHaveBeenCalled()
  })

  it('registers a collaborator in an existing project', async () => {
    const { createResource, listClientProjects, onSaved } = setup()
    await fillCollaborator()
    expect(screen.getByText('Día 90 calculado desde el inicio de contrato: 18/01/2027. El mes de vacaciones (septiembre) también sale de esta fecha.')).toBeInTheDocument()
    expect(screen.getByLabelText(/En periodo de prueba/)).toBeChecked()
    change('Cliente *', '3')
    await waitFor(() => expect(listClientProjects).toHaveBeenCalledWith('3'))
    change('Proyecto asignado *', await screen.findByRole('option', { name: 'Programa de automatización (DEYEL)' }).then(() => '41'))
    expect(screen.getByText('8 colaboradores · fin de contrato con el cliente 31/12/2026')).toBeInTheDocument()
    expect(screen.getByText('Asignado')).toBeInTheDocument()
    change('Líder NPD *', '755')
    fireEvent.click(screen.getByLabelText('Sin fecha final (indefinido)'))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 1102, name: 'Laura Gómez' }))
    expect(createResource).toHaveBeenCalledWith(expect.objectContaining({
      employeeNumber: '1102',
      level: 3,
      hireDate: '2026-10-20',
      onProbation: true,
      assignment: expect.objectContaining({ projectId: 41, leaderId: 755, indefinite: true, endDate: null }),
    }))
    expect(createResource.mock.calls[0][0].assignment).not.toHaveProperty('clientId')
  })

  it('registers without a project', async () => {
    const { createResource } = setup()
    await fillCollaborator()
    fireEvent.click(screen.getByRole('button', { name: 'Sin proyecto por ahora' }))
    expect(screen.queryByLabelText('Líder NPD *')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/En periodo de prueba/))
    expect(screen.getByLabelText(/En periodo de prueba/)).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ assignment: null, onProbation: false })))
  })

  it('asks for reason and termination date with Estado = Baja', async () => {
    const { createResource } = setup()
    await fillCollaborator()
    change('Estado *', 'BAJA')
    expect(screen.getByText('Con Estado = Baja la persona se registra sin proyecto.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Corrige los 2 campos marcados: Motivo de desvinculación y Fecha de desvinculación.')
    change('Motivo de desvinculación *', '2')
    change('Fecha de desvinculación *', '30102026')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({
      status: 'BAJA',
      termination: { date: '2026-10-30', reasonId: 2 },
      assignment: null,
    })))
  })

  it('links to the existing record when the employee number is taken', async () => {
    setup(vi.fn().mockRejectedValue(new ApiRequestError({
      status: 409,
      code: 'EMPLOYEE_NUMBER_TAKEN',
      detail: 'El N° 1045 ya está registrado (Ana Torres).',
      existingResourceId: 1045,
      existingResourceName: 'Ana Torres',
    })))
    await fillCollaborator()
    fireEvent.click(screen.getByRole('button', { name: 'Sin proyecto por ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(await screen.findByText('El N° 1045 ya está registrado (Ana Torres).')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir su registro' })).toHaveAttribute('href', '/recursos/1045/editar')
    change('N° de empleado *', '1103')
    expect(screen.queryByRole('link', { name: 'Abrir su registro' })).not.toBeInTheDocument()
  })

  it('links to the existing record when the duplicate comes inside a 400', async () => {
    setup(vi.fn().mockRejectedValue(new ApiRequestError({
      status: 400,
      code: 'VALIDATION_FAILED',
      detail: 'No se guardó el registro.',
      errors: [
        { field: 'employeeNumber', code: 'EMPLOYEE_NUMBER_TAKEN', message: 'El N° 1045 ya está registrado (Ana Torres).', existingResourceId: 1045, existingResourceName: 'Ana Torres' },
        { field: 'email', code: 'EMAIL_TAKEN', message: 'Ese correo ya está registrado.' },
      ],
    })))
    await fillCollaborator()
    fireEvent.click(screen.getByRole('button', { name: 'Sin proyecto por ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Corrige los 2 campos marcados: N° de empleado y Correo del recurso.')
    expect(screen.getByText('Ese correo ya está registrado.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir su registro' })).toHaveAttribute('href', '/recursos/1045/editar')
  })

  it('shows the detail when the database does not answer', async () => {
    setup(vi.fn().mockRejectedValue(new ApiRequestError({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      detail: 'La base de datos no respondió y no se guardó nada. Intenta de nuevo.',
    })))
    await fillCollaborator()
    fireEvent.click(screen.getByRole('button', { name: 'Sin proyecto por ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La base de datos no respondió y no se guardó nada. Intenta de nuevo.')
  })

  it('shows the API field errors and lets the user retry after a failure', async () => {
    const createResource = vi.fn()
      .mockRejectedValueOnce(new ApiRequestError({
        status: 400,
        code: 'VALIDATION_FAILED',
        detail: 'No se guardó el registro.',
        errors: [{ field: 'workModeId', code: 'UNKNOWN_ID', message: 'La modalidad no existe.' }],
      }))
      .mockRejectedValueOnce(new Error('network'))
    setup(createResource)
    await fillCollaborator()
    fireEvent.click(screen.getByRole('button', { name: 'Sin proyecto por ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(await screen.findByText('La modalidad no existe.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(await screen.findByText(/no se guardó nada\. Intenta de nuevo\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar recurso' })).toBeEnabled()
  })
})

describe('RegisterResourceForm in edit mode (HU-02, BUG-03)', () => {
  function setupEdit({
    getResource = vi.fn().mockResolvedValue(buildResourceResponse()),
    updateResource = vi.fn().mockResolvedValue(buildResourceResponse({ version: 4 })),
  } = {}) {
    vi.mocked(getProjectsApi).mockResolvedValue({
      listProjects: vi.fn(),
      createProject: vi.fn(),
      listClients: vi.fn().mockResolvedValue([{ id: '3', name: 'BANESCO', isInternal: false, active: true }]),
      listClientProjects: vi.fn().mockResolvedValue([
        { id: '41', name: 'Programa de automatización (DEYEL)', teamSize: 8, contractEndDate: '2026-12-31' },
      ]),
    } as unknown as ProjectsApi)
    vi.mocked(getResourcesApi).mockResolvedValue({
      getCatalogs: vi.fn().mockResolvedValue(catalogs),
      createResource: vi.fn(),
      getResource,
      updateResource,
    } as unknown as ResourcesApi)
    const onSaved = vi.fn()
    render(<RegisterResourceForm canCreateProjects resourceId={1045} onSaved={onSaved} onCancel={vi.fn()} />)
    return { getResource, updateResource, onSaved }
  }

  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

  it('prefills the form with GET /resources/{id}', async () => {
    const { getResource } = setupEdit()

    expect(await screen.findByLabelText('Nombre de empleado *')).toHaveValue('Ana Torres')
    expect(getResource).toHaveBeenCalledWith(1045)
    expect(screen.getByRole('form', { name: 'Editar recurso' })).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de inicio de contrato *')).toHaveValue('03/11/2025')
    await waitFor(() => expect(screen.getByLabelText('Proyecto asignado *')).toHaveValue('41'))
  })

  it('saves with a PUT that carries the version that was read (CA-04)', async () => {
    const { updateResource, onSaved } = setupEdit()
    await screen.findByRole('option', { name: 'Analista' })
    change('Nombre de empleado *', 'Ana María Torres')

    save()

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ version: 4 })))
    expect(updateResource).toHaveBeenCalledWith(1045, expect.objectContaining({
      name: 'Ana María Torres',
      positionId: 4,
      workModeId: 1,
      genderId: 1,
      hireDate: '2025-11-03',
      onProbation: false,
      status: 'ACTIVO',
      version: 3,
      assignment: expect.objectContaining({ projectId: 41, leaderId: 755, indefinite: true }),
    }))
  })

  it('does not apply the removed "end date before start date" rule', async () => {
    const resource = buildResourceResponse()
    const { updateResource } = setupEdit({
      getResource: vi.fn().mockResolvedValue({
        ...resource,
        assignment: { ...resource.assignment!, indefinite: false, endDate: '2099-01-01' },
        hireDate: '2099-06-01',
      }),
    })
    await screen.findByRole('option', { name: 'Analista' })

    save()

    await waitFor(() => expect(updateResource).toHaveBeenCalled())
  })

  it('marks the «No especificado» fields and does not save until they are chosen (CA-08)', async () => {
    const { updateResource } = setupEdit({
      getResource: vi.fn().mockResolvedValue(buildResourceResponse({ fieldsToFix: ['workModeId'] })),
    })

    expect(await screen.findByText(/viene del import con valores «No especificado» en Modalidad laboral/)).toBeInTheDocument()
    expect(screen.getByText(NOT_SPECIFIED_MESSAGE)).toBeInTheDocument()
    expect(screen.getByLabelText('Modalidad laboral *')).toHaveValue('')

    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Modalidad laboral')
    expect(updateResource).not.toHaveBeenCalled()

    change('Modalidad laboral *', '1')
    save()
    await waitFor(() => expect(updateResource).toHaveBeenCalledWith(1045, expect.objectContaining({ workModeId: 1 })))
  })

  it('offers «Recargar registro» on a 409 and reloads the latest version', async () => {
    const getResource = vi.fn()
      .mockResolvedValueOnce(buildResourceResponse())
      .mockResolvedValueOnce(buildResourceResponse({ name: 'Ana T. (actualizado)', version: 5 }))
    const updateResource = vi.fn()
      .mockRejectedValueOnce(new ApiRequestError({ status: 409, code: 'CONCURRENT_MODIFICATION', detail: 'Conflicto', updatedBy: 'lbatista' }))
      .mockResolvedValueOnce(buildResourceResponse({ version: 6 }))
    const { onSaved } = setupEdit({ getResource, updateResource })
    await screen.findByRole('option', { name: 'Analista' })

    save()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('lbatista lo guardó después de que lo abriste')
    fireEvent.click(within(alert).getByRole('button', { name: 'Recargar registro' }))

    expect(await screen.findByDisplayValue('Ana T. (actualizado)')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    save()
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(updateResource).toHaveBeenLastCalledWith(1045, expect.objectContaining({ version: 5 }))
  })

  it('says another person saved it when the 409 does not say who', async () => {
    setupEdit({
      updateResource: vi.fn().mockRejectedValue(new ApiRequestError({ status: 409, code: 'CONCURRENT_MODIFICATION', detail: 'Conflicto' })),
    })
    await screen.findByRole('option', { name: 'Analista' })

    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona lo guardó')
  })

  it('explains a 403 as missing permission to edit', async () => {
    setupEdit({
      updateResource: vi.fn().mockRejectedValue(new ApiRequestError({ status: 403, code: 'FORBIDDEN', detail: 'Prohibido' })),
    })
    await screen.findByRole('option', { name: 'Analista' })

    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu perfil no tiene permiso para editar recursos.')
  })

  it('shows a retry when the record cannot be loaded', async () => {
    const getResource = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(buildResourceResponse())
    setupEdit({ getResource })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo cargar el registro del recurso.')
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByLabelText('Nombre de empleado *')).toHaveValue('Ana Torres')
  })
})
