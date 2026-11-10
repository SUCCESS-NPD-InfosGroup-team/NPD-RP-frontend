// src/pages/Recursos/RecursosPage.test.tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecursosPage } from './RecursosPage';
import * as api from '../../services/api';

// Simulamos la respuesta REAL del backend (ResourceSearchResponse)
const MOCK_API_RESPONSE = {
  items: [
    {
      id: 1,
      employeeNumber: '#1045',
      name: 'Ana Torres',
      level: 3,
      clientRole: 'QA Funcional',
      leader: { id: 1, name: 'Lorena Batista' },
      client: { id: 1, name: 'BANESCO' },
      project: { id: 1, name: 'Programa de automatización (DEYEL)' },
      status: 'ACTIVO',
      startDate: '2026-09-01',
      endDate: '2027-03-01',
      version: 1
    }
  ],
  groups: {},
  page: 1,
  totalPages: 1,
  totalElements: 1
};

vi.mock('../../components/recursos/RecursosGantt', () => ({ RecursosGantt: () => <div>Mock Gantt</div> }));

describe('RecursosPage (HU-03) - BUG-07', () => {
  
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderPage = async () => {
    await act(async () => { render(<RecursosPage />); });
  };

  it('debe renderizar la interfaz inicial correctamente', async () => {
    vi.spyOn(api, 'searchRecursos').mockResolvedValue(MOCK_API_RESPONSE);
    
    await renderPage();
    expect(screen.getByText('Recursos')).toBeTruthy();
    expect(screen.getByPlaceholderText(/Buscar por nombre, N° empleado/i)).toBeTruthy();
  });

  it('debe mostrar los datos reales de la API en la tabla', async () => {
    vi.spyOn(api, 'searchRecursos').mockResolvedValue(MOCK_API_RESPONSE);
    
    await renderPage();
    
    // Cambiamos a vista de Tabla para ver los datos
    const btnTabla = screen.getByRole('button', { name: /Tabla/i });
    await act(async () => { fireEvent.click(btnTabla); });

    await waitFor(() => {
      expect(screen.getByText('Ana Torres')).toBeTruthy();
      expect(screen.getByText('#1045')).toBeTruthy();
      expect(screen.getByText(/BANESCO — Programa de automatización/i)).toBeTruthy();
    });
  });

  it('debe mostrar el Empty State si no hay resultados', async () => {
    // Simulamos una API que devuelve vacío
    vi.spyOn(api, 'searchRecursos').mockResolvedValue({
      items: [], groups: {}, page: 1, totalPages: 1, totalElements: 0
    });
    
    await renderPage();
    const btnTabla = screen.getByRole('button', { name: /Tabla/i });
    await act(async () => { fireEvent.click(btnTabla); });

    await waitFor(() => { 
      expect(screen.getByText(/¡Ningún recurso coincide con tu búsqueda!/i)).toBeTruthy(); 
    });
  });

  it('debe manejar errores de la API y mostrar el botón Reintentar (BUG-02)', async () => {
    // Simulamos un error de la API
    vi.spyOn(api, 'searchRecursos').mockRejectedValue(new Error('Error 500: Fallo del servidor'));
    
    await renderPage();
    
    await waitFor(() => {
      expect(screen.getByText(/Error 500: Fallo del servidor/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeTruthy();
    });
  });
});