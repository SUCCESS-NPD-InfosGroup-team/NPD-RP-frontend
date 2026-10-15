import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { fakeKeycloak } from './test/keycloakMock'

vi.mock('./auth/keycloak', async () => ({ keycloak: (await import('./test/keycloakMock')).fakeKeycloak }))

describe('App', () => {
  it('renders the planner with the signed-in user in the header', () => {
    render(<AuthProvider><App /></AuthProvider>)

    expect(screen.getByRole('heading', { name: 'NPD Planner' })).toBeInTheDocument()
    expect(screen.getByText('Juan David Vela Coronado')).toBeInTheDocument()
  })

  it('logs out through Keycloak and comes back to the app origin', async () => {
    render(<AuthProvider><App /></AuthProvider>)

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(fakeKeycloak.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin })
  })
})
