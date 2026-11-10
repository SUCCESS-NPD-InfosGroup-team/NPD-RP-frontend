import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ResourcesPage } from './ResourcesPage';

vi.mock('../../services/api', () => ({
  searchRecursos: vi.fn().mockResolvedValue({
    items: [
      { id: 1, employeeNumber: '1045', name: 'Ana Torres', level: 3, clientRole: 'QA', leader: { id: 1, name: 'Lorena' }, client: { id: 1, name: 'BANESCO' }, project: { id: 1, name: 'DEYEL' }, status: 'ACTIVO', startDate: '2026-01-01', endDate: '2026-12-31', version: 1 },
    ],
    groups: {}, page: 1, totalPages: 1, totalElements: 1
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