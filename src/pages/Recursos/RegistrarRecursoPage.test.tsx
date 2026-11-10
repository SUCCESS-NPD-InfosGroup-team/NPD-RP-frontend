import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom'; // <-- Importante
import { ResourcesPage } from './ResourcesPage';

vi.mock('../../services/api', () => ({
  searchRecursos: vi.fn().mockResolvedValue({
    items: [
      { id: 1, employeeNumber: '1045', name: 'Ana Torres', level: 3, clientRole: 'QA', leader: { id: 1, name: 'Lorena' }, client: { id: 1, name: 'BANESCO' }, project: { id: 1, name: 'DEYEL' }, status: 'ACTIVO', startDate: '2026-01-01', endDate: '2026-12-31', version: 1 },
      { id: 2, employeeNumber: '1046', name: 'Michelle Peña', level: 3, clientRole: 'QA', leader: { id: 1, name: 'Ricardo' }, client: { id: 2, name: 'COPA' }, project: { id: 2, name: 'Web' }, status: 'ACTIVO', startDate: '2026-02-01', endDate: '2026-11-30', version: 1 }
    ],
    groups: {}, page: 1, totalPages: 1, totalElements: 2
  })
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ hasRole: () => true })
}));

const renderPage = () => render(
  <MemoryRouter>
    <ResourcesPage />
  </MemoryRouter>
);

describe('ResourcesPage (HU-03)', () => {
  it('debe renderizar la página sin errores', () => {
    renderPage();
    expect(screen.getByText(/Recursos/i)).toBeTruthy();
  });
});