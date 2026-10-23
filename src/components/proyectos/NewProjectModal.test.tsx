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
      getSummary: vi.fn(),
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
      getSummary: vi.fn(),
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
})
