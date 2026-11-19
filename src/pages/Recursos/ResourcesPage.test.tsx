import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ResourcesPage } from './ResourcesPage';

vi.mock('../../services/api', async () => {
  const { resourceSearchResponse } = await import('../../test/fixtures/resourceSearch');
  return { searchRecursos: vi.fn().mockResolvedValue(resourceSearchResponse) };
});

vi.mock('../../services/arrivals', () => ({
  getArrivalsApi: () => Promise.resolve({
    getStrip: () => Promise.resolve({ windowDays: 30, total: 3, nearest: [] }),
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ hasRole: () => true })
}));

vi.mock('../../components/recursos/ResourceDetailDrawer', () => ({
  ResourceDetailDrawer: ({ onClose, onEdit }: { onClose: () => void; onEdit: (resource: unknown) => void }) => (
    <div role="dialog">
      <button onClick={onClose}>Cerrar detalle del recurso</button>
      <button onClick={() => onEdit({ id: '1', nombre: 'Ana Torres' })}>Editar registro</button>
    </div>
  ),
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

  it('shows the upcoming events strip instead of fixed numbers (HU-06 CA-01)', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: /Ver los 3 eventos/ })).toHaveAttribute('href', '/arribos-proximos');
    expect(screen.queryByText('Fin de contrato ≤ 7 días')).not.toBeInTheDocument();
    expect(screen.queryByText('Colaboradores sin proyecto')).not.toBeInTheDocument();
  });

  it('opens the detail drawer from the table row and timeline row', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Ana Torres').length).toBeGreaterThan(0));
    const employee = screen.getByText('#1045');
    fireEvent.click(employee);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar registro' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /#1045/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle del recurso' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de Ana Torres' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('selects a row with its checkbox without opening the detail drawer', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Torres' }));
    expect(screen.getByText('1 seleccionados')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});