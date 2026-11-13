import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('opens the detail drawer from the table row and timeline row', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Ana Torres').length).toBeGreaterThan(0));
    const employee = screen.getByText('#1045');
    fireEvent.click(employee);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar registro' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByText('#1045').parentElement?.parentElement as HTMLElement, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle del recurso' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const timelineRow = document.querySelector('.rp-timeline-row') as HTMLElement;
    fireEvent.keyDown(timelineRow, { key: ' ' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});