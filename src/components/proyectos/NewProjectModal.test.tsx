import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NewProjectModal } from './NewProjectModal'
import { getProjectsApi } from '../../services/projects'

vi.mock('../../services/projects', () => ({
  getProjectsApi: vi.fn(),
}))

describe('NewProjectModal', () => {
  it('validates required fields and creates a project', async () => {
    const createProject = vi.fn().mockResolvedValue({ id: 'project-2' })
    vi.mocked(getProjectsApi).mockResolvedValue({
      createProject,
      listProjects: vi.fn(),
      listClients: vi.fn(),
      createClient: vi.fn(),
    })
    const onCreated = vi.fn()
    render(<NewProjectModal open clients={[{ id: 'client-1', name: 'Aurora', isInternal: false, active: true }]} onCreated={onCreated} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(screen.getByRole('alert')).toHaveTextContent('No se creó el proyecto. Corrige el campo marcado.')
    fireEvent.change(screen.getByLabelText('Cliente *'), { target: { value: 'client-1' } })
    fireEvent.change(screen.getByLabelText('Nombre del proyecto *'), { target: { value: 'Nuevo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    await waitFor(() => expect(createProject).toHaveBeenCalledWith({ clientId: 'client-1', name: 'Nuevo', contractEnd: undefined }))
    expect(onCreated).toHaveBeenCalledOnce()
  })

  it('shows a permission error from the API', async () => {
    vi.mocked(getProjectsApi).mockResolvedValue({
      createProject: vi.fn().mockRejectedValue({ status: 403, message: 'Forbidden' }),
      listProjects: vi.fn(),
      listClients: vi.fn(),
      createClient: vi.fn(),
    })
    render(<NewProjectModal open clients={[{ id: 'client-1', name: 'Aurora', isInternal: false, active: true }]} onCreated={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Cliente *'), { target: { value: 'client-1' } })
    fireEvent.change(screen.getByLabelText('Nombre del proyecto *'), { target: { value: 'Nuevo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se creó el proyecto. Corrige el campo marcado.')
    expect(screen.getByText('No tienes permisos para crear proyectos.')).toBeInTheDocument()
  })

  it('validates and converts the contract end date', async () => {
    const createProject = vi.fn().mockResolvedValue({ id: 'project-3' })
    vi.mocked(getProjectsApi).mockResolvedValue({
      createProject,
      listProjects: vi.fn(),
      listClients: vi.fn(),
      createClient: vi.fn(),
    })
    render(<NewProjectModal open clients={[{ id: 'client-1', name: 'Aurora', isInternal: false, active: true }]} onCreated={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Cliente *'), { target: { value: 'client-1' } })
    fireEvent.change(screen.getByLabelText('Nombre del proyecto *'), { target: { value: 'Fechas' } })
    fireEvent.change(screen.getByLabelText('Fin de contrato con el cliente'), { target: { value: '31/02/2027' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(screen.getAllByText('Usa una fecha válida en formato dd/mm/aaaa.')).not.toHaveLength(0)
    fireEvent.change(screen.getByLabelText('Fin de contrato con el cliente'), { target: { value: '31032027' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear y agregar colaboradores' }))
    await waitFor(() => expect(createProject).toHaveBeenCalledWith({ clientId: 'client-1', name: 'Fechas', contractEnd: '2027-03-31' }))
  })

  it('shows a duplicate project link and closes from the cancel action', async () => {
    const onClose = vi.fn()
    vi.mocked(getProjectsApi).mockResolvedValue({
      createProject: vi.fn().mockRejectedValue({
        code: 'PROJECT_NAME_TAKEN',
        existingProjectName: 'Atlas',
        existingProjectId: 1,
        message: 'Duplicate',
      }),
      listProjects: vi.fn(),
      listClients: vi.fn(),
      createClient: vi.fn(),
    })
    render(<NewProjectModal open clients={[{ id: 'client-1', name: 'Aurora', isInternal: false, active: true }]} onCreated={vi.fn()} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText('Cliente *'), { target: { value: 'client-1' } })
    fireEvent.change(screen.getByLabelText('Nombre del proyecto *'), { target: { value: 'Atlas' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(await screen.findByText('Atlas ya tiene un proyecto con este nombre.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir Atlas' })).toHaveAttribute('href', '/proyectos?project=1')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('creates a new internal client and returns the add-members intent', async () => {
    const createProject = vi.fn().mockResolvedValue({ id: 'project-4' })
    const onCreated = vi.fn()
    vi.mocked(getProjectsApi).mockResolvedValue({
      createProject,
      listProjects: vi.fn(),
      listClients: vi.fn(),
      createClient: vi.fn(),
    })
    render(<NewProjectModal open clients={[]} onCreated={onCreated} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Cliente *'), { target: { value: '__new__' } })
    fireEvent.change(screen.getByLabelText('Nombre del cliente *'), { target: { value: 'Tigo' } })
    fireEvent.click(screen.getByLabelText('Cliente interno'))
    fireEvent.change(screen.getByLabelText('Nombre del proyecto *'), { target: { value: 'Tigo QA' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear y agregar colaboradores' }))
    await waitFor(() => expect(createProject).toHaveBeenCalledWith({
      clientId: undefined,
      newClient: { name: 'Tigo', isInternal: true },
      name: 'Tigo QA',
      contractEnd: undefined,
    }))
    expect(onCreated).toHaveBeenCalledWith({ id: 'project-4' }, { addMembers: true })
  })
})
