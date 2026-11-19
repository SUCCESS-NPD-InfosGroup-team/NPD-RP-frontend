import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ResourcesPage } from './ResourcesPage';

vi.mock('../../services/api', async () => {
  const { resourceSearchResponse } = await import('../../test/fixtures/resourceSearch');
  return { searchRecursos: vi.fn().mockResolvedValue(resourceSearchResponse) };
});

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