import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditarRecursoPage, RegistrarRecursoPage } from './RegistrarRecursoPage';

const formProps = vi.hoisted(() => ({ last: undefined as undefined | Record<string, unknown> }));
vi.mock('../../components/recursos/RegisterResourceForm', () => ({
  RegisterResourceForm: (props: { resourceId?: string; onSaved: () => void; onCancel: () => void }) => {
    formProps.last = props;
    return (
      <div>
        <span>Formulario {props.resourceId ?? 'nuevo'}</span>
        <button onClick={props.onSaved}>Guardar</button>
        <button onClick={props.onCancel}>Cancelar</button>
      </div>
    );
  },
}));

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/recursos" element={<h1>Roster</h1>} />
      <Route path="/recursos/nuevo" element={<RegistrarRecursoPage />} />
      <Route path="/recursos/:resourceId/editar" element={<EditarRecursoPage />} />
    </Routes>
  </MemoryRouter>
);

describe('RegistrarRecursoPage (HU-01)', () => {
  it('uses the real register form, not a static one', () => {
    renderAt('/recursos/nuevo');

    expect(screen.getByRole('heading', { name: 'Registrar Recurso' })).toBeInTheDocument();
    expect(screen.getByText('Formulario nuevo')).toBeInTheDocument();
    expect(formProps.last).toMatchObject({ canCreateProjects: true, resourceId: undefined });
  });

  it('goes back to the roster after saving', () => {
    renderAt('/recursos/nuevo');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByRole('heading', { name: 'Roster' })).toBeInTheDocument();
  });
});

describe('EditarRecursoPage (HU-02, BUG-03)', () => {
  it('opens the same form in edit mode for the resource in the URL', () => {
    renderAt('/recursos/1045/editar');

    expect(screen.getByRole('heading', { name: 'Editar Recurso' })).toBeInTheDocument();
    expect(screen.getByText('Formulario 1045')).toBeInTheDocument();
  });

  it('goes back to the roster when cancelled', () => {
    renderAt('/recursos/1045/editar');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Roster' })).toBeInTheDocument();
  });
});
