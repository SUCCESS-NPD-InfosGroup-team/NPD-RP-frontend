// src/pages/Recursos/RecursosPage.test.tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecursosPage } from './RecursosPage';

// 1. Mockeamos la API con datos en línea (evita el error de hoisting)
vi.mock('../../services/api', () => ({
  searchRecursos: vi.fn().mockResolvedValue({ 
    data: [
      { 
        id: '1', 
        nEmpleado: '#1045', 
        nombre: 'Ana Torres', 
        rol: 'QA Funcional', 
        cliente: 'BANESCO', 
        proyecto: 'Programa de automatización (DEYEL)', 
        liderNPD: 'Lorena Batista', 
        nivel: 'N3', 
        estado: 'Activo', 
        fechaInicio: '2026-09-01', 
        fechaFin: '2027-03-01' 
      },
      { 
        id: '2', 
        nEmpleado: '#1061', 
        nombre: 'Michelle Peña', 
        rol: 'QA Funcional', 
        cliente: 'CAJA DE AHORROS', 
        proyecto: 'Caja de Ahorros', 
        liderNPD: 'Ricardo Him', 
        nivel: 'N3', 
        estado: 'Activo', 
        fechaInicio: '2025-06-01', 
        fechaFin: '2026-12-31' 
      }
    ], 
    totalPages: 1 
  })
}));

// 2. Mockeamos el Gantt para evitar errores de SVG
vi.mock('../../components/recursos/RecursosGantt', () => ({
  RecursosGantt: () => 'Mock Gantt'
}));

describe('RecursosPage (HU-03)', () => {
  
  it('debe renderizar el título principal y el contador', async () => {
    await act(async () => {
      render(<RecursosPage />);
    });
    
    expect(screen.getByText('Recursos')).toBeTruthy();
    expect(screen.getByText(/colaboradores mostrados en esta página/i)).toBeTruthy();
  });

  it('debe renderizar los filtros de búsqueda principales (CA-01, CA-02)', async () => {
    await act(async () => {
      render(<RecursosPage />);
    });
    
    expect(screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i)).toBeTruthy();
    expect(screen.getByDisplayValue(/Cliente: Todos/i)).toBeTruthy();
    expect(screen.getByDisplayValue(/Activo/i)).toBeTruthy();
  });

  it('debe mostrar el Empty State si no hay resultados (CA-03)', async () => {
    await act(async () => {
      render(<RecursosPage />);
    });

    // Forzamos la vista de tabla
    const btnTabla = screen.getByRole('button', { name: /Tabla/i });
    await act(async () => {
      fireEvent.click(btnTabla);
    });

    // Escribimos un texto que no existe
    const inputBusqueda = screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i);
    await act(async () => {
      fireEvent.change(inputBusqueda, { target: { value: 'EmpleadoInexistente123' } });
    });

    // Verificamos que salga el mensaje
    await waitFor(() => {
      expect(screen.getByText(/¡Ningún recurso coincide con tu búsqueda!/i)).toBeTruthy();
    });
  });

  it('debe mostrar la etiqueta de filtro activo y permitir quitarla (CA-04)', async () => {
    await act(async () => {
      render(<RecursosPage />);
    });
    
    const selectCliente = screen.getByDisplayValue(/Cliente: Todos/i);
    
    await act(async () => {
      fireEvent.change(selectCliente, { target: { value: 'COPA' } });
    });

    const etiqueta = await screen.findByText(/cliente: COPA/i);
    expect(etiqueta).toBeTruthy();

    const btnCerrar = etiqueta.querySelector('button');
    if (btnCerrar) {
      await act(async () => {
        fireEvent.click(btnCerrar);
      });
    }

    // Verificamos que ya no esté
    expect(screen.queryByText(/cliente: COPA/i)).toBeFalsy();
  });

  // TEST EXTRA PARA EL CA-05 (Acentos)
  it('debe encontrar a Peña si se busca "pena" (CA-05)', async () => {
    await act(async () => {
      render(<RecursosPage />);
    });

    // Forzamos la vista de tabla
    const btnTabla = screen.getByRole('button', { name: /Tabla/i });
    await act(async () => {
      fireEvent.click(btnTabla);
    });
    
    // Buscamos "pena" sin tilde
    const inputBusqueda = screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i);
    await act(async () => {
      fireEvent.change(inputBusqueda, { target: { value: 'pena' } });
    });

    // Verificamos que aparezca la persona
    await waitFor(() => {
      expect(screen.getByText(/Michelle Peña/i)).toBeTruthy();
    });
  });

});