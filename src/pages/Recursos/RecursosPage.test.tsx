// src/pages/Recursos/RecursosPage.test.tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecursosPage } from './RecursosPage';

// 1. Mockeamos el AuthContext (simulando ser Administrador)
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    hasRole: (role: string) => role === 'operations-administrator',
  })
}));

// 2. Mockeamos la API con los datos en línea (evita el error de hoisting)
vi.mock('../../services/api', () => ({
  searchRecursos: vi.fn().mockResolvedValue({ 
    data: [
      { id: '1', nEmpleado: '#1045', nombre: 'Ana Torres', rol: 'QA Funcional', cliente: 'BANESCO', proyecto: 'Programa de automatización', liderNPD: 'Lorena Batista', nivel: 'N3', estado: 'Activo', fechaInicio: '2026-09-01', fechaFin: '2027-03-01' },
      { id: '2', nEmpleado: '#1061', nombre: 'Michelle Peña', rol: 'QA Funcional', cliente: 'CAJA DE AHORROS', proyecto: 'Caja de Ahorros', liderNPD: 'Ricardo Him', nivel: 'N3', estado: 'Activo', fechaInicio: '2025-06-01', fechaFin: '2026-12-31' }
    ], 
    totalPages: 1 
  })
}));

// 3. Mockeamos el Gantt para que no intente dibujar SVG
vi.mock('../../components/recursos/RecursosGantt', () => ({
  RecursosGantt: () => 'Mock Gantt'
}));

const renderPage = async () => {
  await act(async () => { render(<RecursosPage />); });
};

describe('RecursosPage (HU-03)', () => {
  it('debe renderizar el título y los filtros', async () => {
    await renderPage();
    expect(screen.getByText('Recursos')).toBeTruthy();
    expect(screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i)).toBeTruthy();
  });

  it('debe mostrar el Empty State si no hay resultados (CA-03)', async () => {
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Tabla/i })); });
    
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i), { target: { value: 'EmpleadoInexistente' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/¡Ningún recurso coincide con tu búsqueda!/i)).toBeTruthy();
    });
  });

  it('debe encontrar a Peña buscando "pena" sin tilde (CA-05)', async () => {
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Tabla/i })); });
    
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i), { target: { value: 'pena' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Michelle Peña/i)).toBeTruthy();
    });
  });

  it('debe mostrar la etiqueta de filtro activo (CA-04)', async () => {
    await renderPage();
    await act(async () => {
      fireEvent.change(screen.getByDisplayValue(/Cliente: Todos/i), { target: { value: 'COPA' } });
    });

    const etiqueta = await screen.findByText(/cliente: COPA/i);
    expect(etiqueta).toBeTruthy();
  });

  it('debe mostrar el botón de editar si es administrador (CA-05)', async () => {
    await renderPage();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Tabla/i })); });
    
    await waitFor(() => {
      const botonesEditar = screen.getAllByTitle('Editar recurso');
      expect(botonesEditar.length).toBeGreaterThan(0);
    });
  });
});