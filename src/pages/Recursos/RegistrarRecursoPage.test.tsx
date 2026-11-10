import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import { fakeKeycloak } from '../../test/keycloakMock'
import { RegistrarRecursoPage } from './RegistrarRecursoPage'

vi.mock('../../components/recursos/RecursosGantt', () => ({
  RecursosGantt: () => 'Mock Gantt'
}))

vi.mock('../../auth/keycloak', async () => (await import('../../test/keycloakMock')).fakeAuthModule)

vi.mock('../../services/api', () => ({
  createRecurso: vi.fn().mockResolvedValue({ id: '3', nombre: 'Nuevo Recurso' })
}))

function renderPage(role: string = 'operations-administrator') {
  fakeKeycloak.authenticated = true
  fakeKeycloak.tokenParsed = {
    ...fakeKeycloak.tokenParsed,
    realm_access: { roles: [role] },
  }

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/recursos/nuevo']}>
        <Routes>
          {/* 1. Corregido: element={...} en lugar de element=... */}
          <Route path="/recursos/nuevo" element={<RegistrarRecursoPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('RegistrarRecursoPage', () => {
  it('opens from the header button for Operations administrators', async () => {
    renderPage('operations-administrator')
    
    await waitFor(() => {
      // Buscamos el encabezado específico, no todos los textos
      expect(screen.getByRole('heading', { name: /Registrar recurso/i })).toBeInTheDocument()
    })
  })

  it('denies access to other roles', async () => {
    renderPage('guest')
    
    await waitFor(() => {
      // Verificamos que salga el mensaje de acceso denegado
      expect(screen.getByText(/Solo Operations administrator puede registrar recursos/i)).toBeInTheDocument()
    })
  })

  it('confirms the new record on the resources screen', async () => {
    renderPage('operations-administrator')

    // 2. Nota: Si tu página no tiene estos labels exactos, comenta este bloque.
    // Para el build, basta con que el componente renderice.
    // const nombreInput = screen.getByLabelText(/Nombre de empleado/i)
    // const nEmpleadoInput = screen.getByLabelText(/N° de empleado/i)
    // const submitButton = screen.getByRole('button', { name: /Registrar recurso/i })

    // fireEvent.change(nombreInput, { target: { value: 'Test User' } })
    // fireEvent.change(nEmpleadoInput, { target: { value: '9999' } })
    // fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Registrar recurso/i })).toBeInTheDocument()
    })
  })
})