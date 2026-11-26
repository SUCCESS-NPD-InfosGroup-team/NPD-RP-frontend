import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'

const authState = vi.hoisted(() => ({ roles: ['guest'] as string[] }))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ roles: authState.roles, isAuthenticated: true }),
}))
vi.mock('../../components/layout/MainLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  return { MainLayout: () => <Outlet /> }
})
vi.mock('./ProjectDetailPage', async () => {
  const { useParams } = await import('react-router-dom')
  return { ProjectDetailPage: () => <h1>Proyecto {useParams().projectId}</h1> }
})

describe('project detail route', () => {
  beforeEach(() => {
    authState.roles = ['guest']
    window.history.replaceState(null, '', '/proyectos/8')
  })

  it('renders the project detail route for an authorized role', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Proyecto 8' })).toBeInTheDocument()
  })

  it('protects the detail route from unknown roles', () => {
    authState.roles = ['unknown-role']
    render(<App />)

    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta pantalla' }))
      .toBeInTheDocument()
  })
})
