import { fireEvent, render, screen, within } from '@testing-library/react'
import { ProjectPickerDrawer } from './ProjectPickerDrawer'
import { getProjectsApi, type ProjectsApi } from '../../services/projects'
import type { ProjectOption } from '../../services/projects.types'
import type { ProjectChoice } from './registerProject'

vi.mock('../../services/projects', () => ({ getProjectsApi: vi.fn() }))

const projects: ProjectOption[] = [
  { id: '11', name: 'Programa de automatización (DEYEL)', client: { id: '1', name: 'BANESCO' }, teamSize: 2, contractEndDate: '2026-10-31' },
  { id: '12', name: 'Banesco - Oracle Fusion', client: { id: '1', name: 'BANESCO' }, teamSize: 1, contractEndDate: '2027-02-15' },
  { id: '52', name: 'Caja de Ahorros', client: { id: '5', name: 'CAJA DE AHORROS' }, teamSize: 4, contractEndDate: '2026-12-31' },
  { id: '61', name: 'Bladex', client: { id: '6', name: 'BLADEX' }, teamSize: 2, contractEndDate: null },
]

function setup({
  listActiveProjects = vi.fn().mockResolvedValue(projects),
  createProject = vi.fn(),
  initialChoice,
  canCreateProjects = true,
}: {
  listActiveProjects?: ReturnType<typeof vi.fn>
  createProject?: ReturnType<typeof vi.fn>
  initialChoice?: ProjectChoice
  canCreateProjects?: boolean
} = {}) {
  const listClients = vi.fn().mockResolvedValue([{ id: '5', name: 'CAJA DE AHORROS', isInternal: false, active: true }])
  vi.mocked(getProjectsApi).mockResolvedValue({ listActiveProjects, listClients, createProject } as unknown as ProjectsApi)
  const onContinue = vi.fn()
  const onClose = vi.fn()
  render(
    <ProjectPickerDrawer
      open
      canCreateProjects={canCreateProjects}
      initialChoice={initialChoice}
      onContinue={onContinue}
      onClose={onClose}
    />,
  )
  return { listActiveProjects, listClients, createProject, onContinue, onClose }
}

const drawer = () => screen.getByRole('dialog', { name: 'Registrar recurso' })
const continueButton = () => within(drawer()).getByRole('button', { name: 'Continuar' })

describe('ProjectPickerDrawer', () => {
  it('renders nothing while closed', () => {
    render(<ProjectPickerDrawer open={false} canCreateProjects onContinue={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lists the active projects grouped by client, with their team and contract end (CA-14)', async () => {
    setup()
    expect(within(drawer()).getByRole('list', { name: 'Pasos' })).toHaveTextContent('1 · Proyecto2 · Datos del colaborador')
    const banesco = await screen.findByRole('region', { name: 'BANESCO' })
    expect(within(banesco).getAllByRole('radio')).toHaveLength(2)
    expect(within(banesco).getByText('2 colaboradores · fin de contrato 31 oct 2026')).toBeInTheDocument()
    expect(within(banesco).getByText('1 colaborador · fin de contrato 15 feb 2027')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'CAJA DE AHORROS' })).toBeInTheDocument()
    expect(screen.getByText('2 colaboradores · sin fin de contrato')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Sin proyecto por ahora/ })).not.toBeChecked()
  })

  it('continues only after choosing, with the chosen project', async () => {
    const { onContinue } = setup()
    expect(continueButton()).toBeDisabled()
    expect(screen.getByText('Elige un proyecto o «Sin proyecto por ahora».')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('radio', { name: /Caja de Ahorros/ }))
    expect(within(drawer()).getByText('CAJA DE AHORROS · Caja de Ahorros', { selector: 'p' })).toBeInTheDocument()
    fireEvent.click(continueButton())
    expect(onContinue).toHaveBeenCalledWith({ kind: 'project', project: projects[2] })
  })

  it('continues without a project', async () => {
    const { onContinue } = setup()
    await screen.findByRole('region', { name: 'BANESCO' })
    fireEvent.click(screen.getByRole('radio', { name: /Sin proyecto por ahora/ }))
    fireEvent.click(continueButton())
    expect(onContinue).toHaveBeenCalledWith({ kind: 'none' })
  })

  it('preselects the choice made before', async () => {
    setup({ initialChoice: { kind: 'project', project: projects[1] } })
    expect(await screen.findByRole('radio', { name: /Oracle Fusion/ })).toBeChecked()
    expect(continueButton()).toBeEnabled()
  })

  it('filters by client or project name, ignoring accents and case', async () => {
    setup()
    await screen.findByRole('region', { name: 'BANESCO' })
    const search = screen.getByRole('searchbox', { name: 'Buscar cliente o proyecto' })

    fireEvent.change(search, { target: { value: 'automatizacion' } })
    expect(screen.getAllByRole('radio', { name: /DEYEL|Oracle|Caja|Bladex/ })).toHaveLength(1)

    fireEvent.change(search, { target: { value: 'caja de' } })
    expect(screen.getByRole('region', { name: 'CAJA DE AHORROS' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'BANESCO' })).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'tigo' } })
    expect(screen.getByText('Ningún cliente o proyecto coincide con la búsqueda.')).toBeInTheDocument()
    // «Sin proyecto por ahora» is always there
    expect(screen.getByRole('radio', { name: /Sin proyecto por ahora/ })).toBeInTheDocument()
  })

  it('suggests creating a project when there is none', async () => {
    setup({ listActiveProjects: vi.fn().mockResolvedValue([]) })
    expect(await screen.findByText('No hay proyectos activos. Usa «Crear proyecto».')).toBeInTheDocument()
  })

  it('offers a retry when the projects cannot be loaded', async () => {
    const listActiveProjects = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(projects)
    setup({ listActiveProjects })
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los proyectos.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('region', { name: 'BANESCO' })).toBeInTheDocument()
    expect(listActiveProjects).toHaveBeenCalledTimes(2)
  })

  it('selects the project made with «Crear proyecto»', async () => {
    const createProject = vi.fn().mockResolvedValue({
      id: '77', name: 'Core QA', client: { id: '5', name: 'CAJA DE AHORROS', isInternal: false }, teamSize: 0,
      members: [], leads: [], startDate: '2026-11-23', contractEnd: '2027-03-31T00:00:00Z', pendingCount: 0, active: true,
    })
    const listActiveProjects = vi.fn().mockResolvedValue(projects)
    const { onContinue } = setup({ createProject, listActiveProjects })
    await screen.findByRole('region', { name: 'BANESCO' })

    fireEvent.click(within(drawer()).getByRole('button', { name: 'Crear proyecto' }))
    const modal = screen.getByRole('dialog', { name: 'Nuevo proyecto' })
    await within(modal).findByRole('option', { name: 'CAJA DE AHORROS' })
    fireEvent.change(within(modal).getByLabelText('Cliente *'), { target: { value: '5' } })
    fireEvent.change(within(modal).getByLabelText('Nombre del proyecto *'), { target: { value: 'Core QA' } })
    // Escape belongs to the modal while it is open
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Nuevo proyecto' })).not.toBeInTheDocument()
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Crear proyecto' }))
    const reopened = screen.getByRole('dialog', { name: 'Nuevo proyecto' })
    fireEvent.change(within(reopened).getByLabelText('Cliente *'), { target: { value: '5' } })
    fireEvent.change(within(reopened).getByLabelText('Nombre del proyecto *'), { target: { value: 'Core QA' } })
    fireEvent.click(within(reopened).getByRole('button', { name: 'Crear proyecto' }))

    expect(await screen.findByRole('radio', { name: /Core QA/ })).toBeChecked()
    expect(within(screen.getByRole('region', { name: 'CAJA DE AHORROS' })).getAllByRole('radio')).toHaveLength(2)
    expect(listActiveProjects).toHaveBeenCalledOnce()
    fireEvent.click(continueButton())
    expect(onContinue).toHaveBeenCalledWith({
      kind: 'project',
      project: { id: '77', name: 'Core QA', client: { id: '5', name: 'CAJA DE AHORROS' }, teamSize: 0, contractEndDate: '2027-03-31' },
    })
  })

  it('hides «Crear proyecto» without permission to create projects', async () => {
    const { listClients } = setup({ canCreateProjects: false })
    await screen.findByRole('region', { name: 'BANESCO' })
    expect(within(drawer()).queryByRole('button', { name: 'Crear proyecto' })).not.toBeInTheDocument()
    expect(listClients).not.toHaveBeenCalled()
  })

  it('closes with Cancelar, the close button and Escape', async () => {
    const { onClose } = setup()
    await screen.findByRole('region', { name: 'BANESCO' })
    expect(within(drawer()).getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Cerrar' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})
