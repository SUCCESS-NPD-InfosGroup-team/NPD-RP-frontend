import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RegisterResourceForm } from './RegisterResourceForm'
import { getProjectsApi, type ProjectsApi } from '../../services/projects'
import { getResourcesApi, type ResourcesApi } from '../../services/resources'
import { ApiRequestError, type ProjectOption } from '../../services/projects.types'
import type { Catalogs } from '../../services/resources.types'
import { buildResourceResponse } from '../../test/fixtures/resourceDetail'
import { NOT_SPECIFIED_MESSAGE } from './resourceForm'
import { NO_PROJECT, type ProjectChoice } from './registerProject'

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

const cajaDeAhorros: ProjectOption = {
  id: '52',
  name: 'Caja de Ahorros',
  client: { id: '5', name: 'CAJA DE AHORROS' },
  teamSize: 4,
  contractEndDate: '2026-12-31',
}
const inCajaDeAhorros: ProjectChoice = { kind: 'project', project: cajaDeAhorros }

interface SetupOptions {
  createResource?: ReturnType<typeof vi.fn>
  getResource?: ReturnType<typeof vi.fn>
  updateResource?: ReturnType<typeof vi.fn>
  createProject?: ReturnType<typeof vi.fn>
  choice?: ProjectChoice
}

function setup({
  createResource = vi.fn().mockResolvedValue({ id: 1120, name: 'Valentina Ruiz' }),
  getResource = vi.fn(),
  updateResource = vi.fn(),
  createProject = vi.fn(),
  choice = inCajaDeAhorros,
}: SetupOptions = {}) {
  vi.mocked(getProjectsApi).mockResolvedValue({
    listProjects: vi.fn(),
    createProject,
    listClients: vi.fn().mockResolvedValue([{ id: '5', name: 'CAJA DE AHORROS', isInternal: false, active: true }]),
    listClientProjects: vi.fn().mockResolvedValue([]),
  } as unknown as ProjectsApi)
  vi.mocked(getResourcesApi).mockResolvedValue({
    getCatalogs: vi.fn().mockResolvedValue(catalogs),
    createResource,
    getResource,
    updateResource,
  } as unknown as ResourcesApi)
  const onSaved = vi.fn()
  const onChangeProject = vi.fn()
  const onProjectChoice = vi.fn()
  const view = render(
    <RegisterResourceForm
      canCreateProjects
      projectChoice={choice}
      onChangeProject={onChangeProject}
      onProjectChoice={onProjectChoice}
      onSaved={onSaved}
      onCancel={vi.fn()}
    />,
  )
  return { createResource, getResource, updateResource, createProject, onSaved, onChangeProject, onProjectChoice, view }
}

const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const register = () => fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))

async function fillCollaborator(employeeNumber = '1120') {
  await screen.findByRole('option', { name: 'Analista' })
  change('N° de empleado *', employeeNumber)
  change('Nombre de empleado *', 'Valentina Ruiz')
  change('Posición en Infosgroup *', '4')
  change('Modalidad laboral *', '1')
  change('Género *', '1')
  change('Nivel', '3')
  change('Fecha de inicio de contrato *', '20102026')
}

function fillAssignment() {
  change('Líder NPD *', '755')
  fireEvent.click(screen.getByLabelText('Sin fecha final (indefinido)'))
}

const employeeNumberTaken = () => new ApiRequestError({
  status: 409,
  code: 'EMPLOYEE_NUMBER_TAKEN',
  detail: 'El N° 1045 ya está registrado (Ana Torres).',
  existingResourceId: 1045,
  existingResourceName: 'Ana Torres',
})

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
    expect(screen.getByText('Sin probatoria')).toBeInTheDocument()
    expect(screen.getByText('No se envía aviso de fin de probatoria')).toBeInTheDocument()
  })

  it('shows the project of step 1 as a fixed summary, without client or project selectors (CA-01)', async () => {
    const { onChangeProject } = setup()
    await screen.findByRole('option', { name: 'Analista' })

    expect(screen.getByRole('heading', { name: 'Asignación en este proyecto' })).toBeInTheDocument()
    expect(screen.getByText('CAJA DE AHORROS · Caja de Ahorros')).toBeInTheDocument()
    expect(screen.getByText('4 colaboradores · fin de contrato con el cliente 31/12/2026')).toBeInTheDocument()
    expect(screen.queryByLabelText('Cliente *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Proyecto asignado *')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Con proyecto' })).not.toBeInTheDocument()
    expect(screen.getByText('Asignado')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar proyecto' }))
    expect(onChangeProject).toHaveBeenCalledOnce()
  })

  it('summarizes the missing fields, the NPD lead and end date included, and creates nothing', async () => {
    const { createResource } = setup()
    await screen.findByRole('option', { name: 'Analista' })
    register()
    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('No se guardó el registro. Corrige los 8 campos marcados')
    expect(within(summary).getByRole('link', { name: 'Líder NPD' })).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Fecha final' })).toBeInTheDocument()
    expect(screen.getByLabelText('N° de empleado *')).toHaveAttribute('aria-invalid', 'true')
    expect(createResource).not.toHaveBeenCalled()
  })

  it('registers a collaborator in the project of step 1', async () => {
    const { createResource, onSaved } = setup()
    await fillCollaborator()
    expect(screen.getByText('Día 90 calculado desde el inicio de contrato: 18/01/2027. El mes de vacaciones (septiembre) también sale de esta fecha.')).toBeInTheDocument()
    expect(screen.getByLabelText(/En periodo de prueba/)).toBeChecked()
    fillAssignment()
    register()

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 1120, name: 'Valentina Ruiz' }))
    expect(createResource).toHaveBeenCalledWith(expect.objectContaining({
      employeeNumber: '1120',
      level: 3,
      hireDate: '2026-10-20',
      onProbation: true,
      assignment: expect.objectContaining({ projectId: 52, leaderId: 755, indefinite: true, endDate: null }),
    }))
    expect(createResource.mock.calls[0][0].assignment).not.toHaveProperty('clientId')
  })

  it('keeps what was typed when the project changes (Cambiar proyecto)', async () => {
    const { createResource, view } = setup()
    await fillCollaborator()
    fillAssignment()
    const other: ProjectOption = { id: '41', name: 'DEYEL', client: { id: '3', name: 'BANESCO' }, teamSize: 1, contractEndDate: null }
    view.rerender(
      <RegisterResourceForm canCreateProjects projectChoice={{ kind: 'project', project: other }} onSaved={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(screen.getByText('BANESCO · DEYEL')).toBeInTheDocument()
    expect(screen.getByText('1 colaborador · sin fin de contrato con el cliente')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre de empleado *')).toHaveValue('Valentina Ruiz')
    expect(screen.getByLabelText('Líder NPD *')).toHaveValue('755')
    register()
    await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({
      assignment: expect.objectContaining({ projectId: 41, leaderId: 755 }),
    })))
  })

  it('registers without a project', async () => {
    const { createResource, onChangeProject } = setup({ choice: NO_PROJECT })
    await fillCollaborator()
    expect(screen.getByRole('heading', { name: 'Proyecto' })).toBeInTheDocument()
    expect(screen.getByText('Sin proyecto por ahora')).toBeInTheDocument()
    expect(screen.queryByLabelText('Líder NPD *')).not.toBeInTheDocument()
    expect(screen.getByText('Aparece en el grupo «Sin proyecto» de Recursos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Elegir proyecto' }))
    expect(onChangeProject).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByLabelText(/En periodo de prueba/))
    expect(screen.getByLabelText(/En periodo de prueba/)).not.toBeChecked()
    register()
    await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ assignment: null, onProbation: false })))
  })

  it('warns that Estado = Baja registers without the chosen project', async () => {
    const { createResource } = setup()
    await fillCollaborator()
    change('Estado *', 'BAJA')
    expect(screen.getByText(/no entra a CAJA DE AHORROS · Caja de Ahorros/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Líder NPD *')).not.toBeInTheDocument()
    register()
    expect(await screen.findByRole('alert')).toHaveTextContent('Corrige los 2 campos marcados: Motivo de desvinculación y Fecha de desvinculación.')
    change('Motivo de desvinculación *', '2')
    change('Fecha de desvinculación *', '30102026')
    register()
    await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({
      status: 'BAJA',
      termination: { date: '2026-10-30', reasonId: 2 },
      assignment: null,
    })))
  })

  it('chooses a project made with «Crear proyecto»', async () => {
    const createProject = vi.fn().mockResolvedValue({
      id: '77', name: 'Core QA', client: { id: '5', name: 'CAJA DE AHORROS', isInternal: false }, teamSize: 0,
      members: [], leads: [], startDate: '2026-11-23', contractEnd: null, pendingCount: 0, active: true,
    })
    const { onProjectChoice } = setup({ createProject })
    await screen.findByRole('option', { name: 'Analista' })
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    await screen.findByRole('option', { name: 'CAJA DE AHORROS' })
    change('Cliente *', '5')
    change('Nombre del proyecto *', 'Core QA')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Crear proyecto' }))

    await waitFor(() => expect(onProjectChoice).toHaveBeenCalledWith({
      kind: 'project',
      project: { id: '77', name: 'Core QA', client: { id: '5', name: 'CAJA DE AHORROS' }, teamSize: 0, contractEndDate: null },
    }))
  })

  it('points an API error on the project at «Cambiar proyecto»', async () => {
    setup({
      createResource: vi.fn().mockRejectedValue(new ApiRequestError({
        status: 400,
        code: 'VALIDATION_FAILED',
        detail: 'No se guardó el registro.',
        errors: [{ field: 'assignment.projectId', code: 'INACTIVE', message: 'El proyecto ya no está activo.' }],
      })),
    })
    await fillCollaborator()
    fillAssignment()
    register()
    expect(await screen.findByText('El proyecto ya no está activo.')).toBeInTheDocument()
    const summary = screen.getAllByRole('alert')[0]
    fireEvent.click(within(summary).getByRole('link', { name: 'Proyecto asignado' }))
    expect(screen.getByRole('button', { name: 'Cambiar proyecto' })).toHaveFocus()
  })

  it('offers to assign the person who already has the employee number (SCRUM-84)', async () => {
    const getResource = vi.fn().mockResolvedValue(buildResourceResponse({
      assignment: {
        ...buildResourceResponse().assignment!,
        indefinite: false,
        endDate: '2026-10-31',
      },
    }))
    const updateResource = vi.fn().mockResolvedValue(buildResourceResponse({ version: 4 }))
    const { onSaved } = setup({ createResource: vi.fn().mockRejectedValue(employeeNumberTaken()), getResource, updateResource })
    await fillCollaborator('1045')
    fillAssignment()
    register()

    const dialog = await screen.findByRole('dialog', { name: 'El N° 1045 ya está registrado' })
    expect(await within(dialog).findByText('BANESCO · Programa de automatización (DEYEL)')).toBeInTheDocument()
    expect(getResource).toHaveBeenCalledWith(1045)
    expect(within(dialog).getByText('Líder Lorena Batista · fin 31 oct 2026')).toBeInTheDocument()
    expect(within(dialog).getByText('CAJA DE AHORROS · Caja de Ahorros')).toBeInTheDocument()
    expect(within(dialog).getByText(/dejará de ser colaborador de BANESCO · Programa de automatización \(DEYEL\)/)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Ver su registro' })).toHaveAttribute('href', '/recursos/1045/editar')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Asignar a Caja de Ahorros' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(buildResourceResponse({ version: 4 })))
    const [id, request] = updateResource.mock.calls[0]
    expect(id).toBe(1045)
    // Their own record, with the version that was read; only the assignment comes from the form
    expect(request).toMatchObject({
      employeeNumber: '1045',
      name: 'Ana Torres',
      hireDate: '2025-11-03',
      version: 3,
      assignment: { projectId: 52, leaderId: 755, indefinite: true, endDate: null, clientRoleId: null },
    })
  })

  it('reloads the record and explains it when someone else changed it before assigning', async () => {
    const getResource = vi.fn().mockResolvedValue(buildResourceResponse())
    const updateResource = vi.fn().mockRejectedValue(new ApiRequestError({ status: 409, code: 'CONCURRENT_MODIFICATION', detail: 'Otra persona lo guardó.' }))
    setup({ createResource: vi.fn().mockRejectedValue(employeeNumberTaken()), getResource, updateResource })
    await fillCollaborator('1045')
    fillAssignment()
    register()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Asignar a Caja de Ahorros' }))

    expect(await within(dialog).findByText('Otra persona cambió su registro mientras tanto. Revisa los datos y vuelve a asignar.')).toBeInTheDocument()
    await waitFor(() => expect(getResource).toHaveBeenCalledTimes(2))
  })

  it.each([
    ['is terminated', buildResourceResponse({ status: { code: 'BAJA', label: 'Baja' }, assignment: null }), inCajaDeAhorros, 'Ana Torres está de Baja: ábrelo para reactivarlo antes de asignarle un proyecto.'],
    ['is already in the project', buildResourceResponse({ assignment: { ...buildResourceResponse().assignment!, project: { id: 52, name: 'Caja de Ahorros', contractEndDate: null } } }), inCajaDeAhorros, 'Ana Torres ya es colaborador de Caja de Ahorros. Ábrelo si quieres cambiar su asignación.'],
    ['was registered without a project', buildResourceResponse(), NO_PROJECT, 'Elegiste «Sin proyecto por ahora»: ábrelo para ver o editar su registro.'],
  ])('only links to the existing record when the person %s', async (_, resource, choice, notice) => {
    setup({ createResource: vi.fn().mockRejectedValue(employeeNumberTaken()), getResource: vi.fn().mockResolvedValue(resource), choice })
    await fillCollaborator('1045')
    if (choice.kind === 'project') fillAssignment()
    register()
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(notice)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Asignar a/ })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Ver su registro' })).toBeInTheDocument()
  })

  it('still links to the existing record when it cannot be loaded, and closes the dialog', async () => {
    setup({ createResource: vi.fn().mockRejectedValue(employeeNumberTaken()), getResource: vi.fn().mockRejectedValue(new Error('network')), choice: NO_PROJECT })
    await fillCollaborator('1045')
    register()
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('No se pudo cargar su registro. Ábrelo para ver sus datos.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('El N° 1045 ya está registrado (Ana Torres).')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir su registro' })).toHaveAttribute('href', '/recursos/1045/editar')
    change('N° de empleado *', '1103')
    expect(screen.queryByRole('link', { name: 'Abrir su registro' })).not.toBeInTheDocument()
  })

  const takenInside400 = (...extra: Array<{ field: string; code: string; message: string }>) => new ApiRequestError({
    status: 400,
    code: 'VALIDATION_FAILED',
    detail: 'No se guardó el registro.',
    errors: [
      { field: 'employeeNumber', code: 'EMPLOYEE_NUMBER_TAKEN', message: 'El N° 1045 ya está registrado (Ana Torres).', existingResourceId: 1045, existingResourceName: 'Ana Torres' },
      ...extra,
    ],
  })

  it('offers to assign the person when both the N° and the email are already theirs (CA-04)', async () => {
    const getResource = vi.fn().mockResolvedValue(buildResourceResponse({ assignment: null, situation: { code: 'SIN_PROYECTO', label: 'Sin proyecto' } }))
    setup({
      getResource,
      createResource: vi.fn().mockRejectedValue(takenInside400({ field: 'email', code: 'EMAIL_TAKEN', message: 'Ese correo ya está registrado.' })),
    })
    await fillCollaborator('1045')
    fillAssignment()
    register()

    const dialog = await screen.findByRole('dialog', { name: 'El N° 1045 ya está registrado' })
    // Without a project today, the modal offers to assign them
    expect(await within(dialog).findByText('Sin proyecto')).toBeInTheDocument()
    expect(within(dialog).getByText(/Puedes asignar a Ana Torres a este proyecto/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Asignar a Caja de Ahorros' })).toBeEnabled()
    expect(within(dialog).queryByText(/dejará de ser colaborador/)).not.toBeInTheDocument()
    expect(screen.getByText('Ese correo ya está registrado.')).toBeInTheDocument()
  })

  it.each([['a text', 'x/../../evil'], ['zero', 0], ['a decimal', 10.5]])(
    'neither links nor opens the modal when the existing id is %s',
    async (_, existingResourceId) => {
      const { getResource } = setup({
        choice: NO_PROJECT,
        createResource: vi.fn().mockRejectedValue(new ApiRequestError({
          status: 409,
          code: 'EMPLOYEE_NUMBER_TAKEN',
          detail: 'El N° 1045 ya está registrado.',
          existingResourceId: existingResourceId as number,
        })),
      })
      await fillCollaborator('1045')
      register()
      expect(await screen.findByText('El N° 1045 ya está registrado.')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Abrir su registro' })).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(getResource).not.toHaveBeenCalled()
    },
  )

  it('only links to the existing record while other fields still need fixing', async () => {
    setup({
      choice: NO_PROJECT,
      createResource: vi.fn().mockRejectedValue(takenInside400({ field: 'workModeId', code: 'UNKNOWN_ID', message: 'La modalidad no existe.' })),
    })
    await fillCollaborator()
    register()
    expect(await screen.findByRole('alert')).toHaveTextContent('Corrige los 2 campos marcados: N° de empleado y Modalidad laboral.')
    expect(screen.getByText('La modalidad no existe.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir su registro' })).toHaveAttribute('href', '/recursos/1045/editar')
    // With other errors to fix there is nothing to assign yet
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the detail when the database does not answer', async () => {
    setup({
      choice: NO_PROJECT,
      createResource: vi.fn().mockRejectedValue(new ApiRequestError({
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        detail: 'La base de datos no respondió y no se guardó nada. Intenta de nuevo.',
      })),
    })
    await fillCollaborator()
    register()
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
    setup({ createResource, choice: NO_PROJECT })
    await fillCollaborator()
    register()
    expect(await screen.findByText('La modalidad no existe.')).toBeInTheDocument()
    register()
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
