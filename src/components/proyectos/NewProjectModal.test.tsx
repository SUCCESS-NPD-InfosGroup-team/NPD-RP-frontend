import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
      getSummary: vi.fn(),
      listClients: vi.fn(),
      createClient: vi.fn(),
    })
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<NewProjectModal open clients={[{ id: 'client-1', name: 'Aurora', isInternal: false, active: true }]} onCreated={onCreated} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Cliente y nombre son obligatorios.')
    await user.selectOptions(screen.getByLabelText('Cliente *'), 'client-1')
    await user.type(screen.getByLabelText('Nombre del proyecto *'), 'Nuevo')
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(createProject).toHaveBeenCalledWith({ clientId: 'client-1', name: 'Nuevo', contractEnd: undefined })
    expect(onCreated).toHaveBeenCalledOnce()
  })

  it('shows a permission error from the API', async () => {
    vi.mocked(getProjectsApi).mockResolvedValue({
      createProject: vi.fn().mockRejectedValue({ status: 403, message: 'Forbidden' }),
      listProjects: vi.fn(),
      getSummary: vi.fn(),
      listClients: vi.fn(),
      createClient: vi.fn(),
    })
    const user = userEvent.setup()
    render(<NewProjectModal open clients={[{ id: 'client-1', name: 'Aurora', isInternal: false, active: true }]} onCreated={vi.fn()} onClose={vi.fn()} />)
    await user.selectOptions(screen.getByLabelText('Cliente *'), 'client-1')
    await user.type(screen.getByLabelText('Nombre del proyecto *'), 'Nuevo')
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permisos para crear proyectos.')
  })
})
