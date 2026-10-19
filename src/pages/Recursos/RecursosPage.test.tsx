// src/pages/Recursos/RecursosPage.test.tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecursosPage } from './RecursosPage';

const MOCK_DATA = [
  { id: '1', nEmpleado: '#1045', nombre: 'Ana Torres', rol: 'QA Funcional', cliente: 'BANESCO', proyecto: 'Programa de automatización (DEYEL)', liderNPD: 'Lorena Batista', nivel: 'N3', estado: 'Activo', fechaInicio: '2026-09-01', fechaFin: '2027-03-01' },
  { id: '2', nEmpleado: '#1061', nombre: 'Michelle Peña', rol: 'QA Funcional', cliente: 'CAJA DE AHORROS', proyecto: 'Caja de Ahorros', liderNPD: 'Ricardo Him', nivel: 'N3', estado: 'Activo', fechaInicio: '2025-06-01', fechaFin: '2026-12-31' }
];

vi.mock('../../services/api', () => ({
  searchRecursos: vi.fn().mockResolvedValue({ data: MOCK_DATA, totalPages: 1 })
}));
vi.mock('../../components/recursos/RecursosGantt', () => ({ RecursosGantt: () => 'Mock Gantt' }));

describe('RecursosPage (HU-03)', () => {
  const renderPage = async () => {
    await act(async () => { render(<RecursosPage />); });
  };

  it('debe renderizar la interfaz inicial correctamente', async () => {
    await renderPage();
    expect(screen.getByText('Recursos')).toBeTruthy();
    expect(screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i)).toBeTruthy();
    expect(screen.getByDisplayValue(/Cliente: Todos/i)).toBeTruthy();
  });

  it('debe mostrar el Empty State si no hay resultados (CA-03)', async () => {
    await renderPage();
    const btnTabla = screen.getByRole('button', { name: /Tabla/i });
    await act(async () => { fireEvent.click(btnTabla); });
    const inputBusqueda = screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i);
    await act(async () => { fireEvent.change(inputBusqueda, { target: { value: 'EmpleadoInexistente123' } }); });
    await waitFor(() => { expect(screen.getByText(/¡Ningún recurso coincide con tu búsqueda!/i)).toBeTruthy(); });
  });

  it('debe mostrar etiquetas, buscar con acentos y quitarlas (CA-04, CA-05)', async () => {
    await renderPage();
    const btnTabla = screen.getByRole('button', { name: /Tabla/i });
    await act(async () => { fireEvent.click(btnTabla); });

    // Probar búsqueda con acentos
    const inputBusqueda = screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i);
    await act(async () => { fireEvent.change(inputBusqueda, { target: { value: 'pena' } }); });
    await waitFor(() => { expect(screen.getByText(/Michelle Peña/i)).toBeTruthy(); });

    // Probar etiquetas de filtros
    const selectCliente = screen.getByDisplayValue(/Cliente: Todos/i);
    await act(async () => { fireEvent.change(selectCliente, { target: { value: 'COPA' } }); });
    const etiqueta = await screen.findByText(/cliente: COPA/i);
    expect(etiqueta).toBeTruthy();

    // Quitar etiqueta
    const btnCerrar = etiqueta.querySelector('button');
    if (btnCerrar) await act(async () => { fireEvent.click(btnCerrar); });
    expect(screen.queryByText(/cliente: COPA/i)).toBeFalsy();
  });
});