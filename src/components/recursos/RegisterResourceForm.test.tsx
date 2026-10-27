import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RegisterResourceForm } from './RegisterResourceForm'
import { getProjectsApi, type ProjectsApi } from '../../services/projects'
import { getResourcesApi, type ResourcesApi } from '../../services/resources'
import { ApiRequestError } from '../../services/projects.types'
import type { Catalogs } from '../../services/resources.types'

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
    createClient: vi.fn(),
    listClients: vi.fn().mockResolvedValue([{ id: '3', name: 'BANESCO', isInternal: false, active: true }]),
    listClientProjects,
  } as unknown as ProjectsApi)
  vi.mocked(getResourcesApi).mockResolvedValue({
    getCatalogs: vi.fn().mockResolvedValue(catalogs),
    createResource,
    getResource: vi.fn(),
  } as unknown as ResourcesApi)
  const onCreated = vi.fn()
  render(<RegisterResourceForm canCreateProjects onCreated={onCreated} onCancel={vi.fn()} />)
  return { createResource, listClientProjects, onCreated }
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
    const { createResource, listClientProjects, onCreated } = setup()
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

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 1102, name: 'Laura Gómez' }))
    expect(createResource).toHaveBeenCalledWith(expect.objectContaining({
      employeeNumber: '1102',
      level: 3,
      hireDate: '2026-10-20',
      inProbation: true,
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
    await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ assignment: null, inProbation: false })))
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
    expect(screen.getByRole('link', { name: 'Abrir su registro' })).toHaveAttribute('href', '/recursos/1045')
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
    expect(screen.getByRole('link', { name: 'Abrir su registro' })).toHaveAttribute('href', '/recursos/1045')
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
