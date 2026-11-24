import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { EditarRecursoPage, RegistrarRecursoPage } from './RegistrarRecursoPage';
import { getProjectsApi, type ProjectsApi } from '../../services/projects';
import type { ProjectOption } from '../../services/projects.types';
import type { ProjectChoice } from '../../components/recursos/registerProject';

interface FormProps {
  resourceId?: string;
  projectChoice?: ProjectChoice;
  onChangeProject?: () => void;
  onProjectChoice?: (choice: ProjectChoice) => void;
  onSaved: () => void;
  onCancel: () => void;
}

const form = vi.hoisted(() => ({ last: undefined as undefined | FormProps, mounts: 0 }));
vi.mock('../../components/recursos/RegisterResourceForm', async () => {
  const { useEffect } = await import('react');
  return {
    RegisterResourceForm: (props: FormProps) => {
      form.last = props;
      useEffect(() => { form.mounts += 1; }, []);
      return (
        <div>
          <span>Formulario {props.resourceId ?? 'nuevo'}</span>
          <button onClick={props.onSaved}>Guardar</button>
          <button onClick={props.onCancel}>Cancelar</button>
          {props.onChangeProject && <button onClick={props.onChangeProject}>Cambiar proyecto</button>}
        </div>
      );
    },
  };
});
vi.mock('../../services/projects', () => ({ getProjectsApi: vi.fn() }));

const caja: ProjectOption = { id: '52', name: 'Caja de Ahorros', client: { id: '5', name: 'CAJA DE AHORROS' }, teamSize: 4, contractEndDate: '2026-12-31' };
const deyel: ProjectOption = { id: '41', name: 'DEYEL', client: { id: '3', name: 'BANESCO' }, teamSize: 2, contractEndDate: null };

function mockProjects(getProject = vi.fn().mockResolvedValue({ ...caja, active: true })) {
  vi.mocked(getProjectsApi).mockResolvedValue({
    listActiveProjects: vi.fn().mockResolvedValue([deyel, caja]),
    getProject,
    listClients: vi.fn().mockResolvedValue([]),
  } as unknown as ProjectsApi);
  return { getProject };
}

function Location() {
  const location = useLocation();
  return <output aria-label="URL">{location.pathname + location.search}</output>;
}

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/recursos" element={<h1>Roster</h1>} />
      <Route path="/recursos/nuevo" element={<><RegistrarRecursoPage /><Location /></>} />
      <Route path="/recursos/:resourceId/editar" element={<EditarRecursoPage />} />
    </Routes>
  </MemoryRouter>
);

const url = () => screen.getByRole('status', { name: 'URL' }).textContent;
const steps = () => within(screen.getAllByRole('list', { name: 'Pasos' })[0]).getAllByRole('listitem');

describe('RegistrarRecursoPage (HU-01, SCRUM-84)', () => {
  beforeEach(() => {
    form.last = undefined;
    form.mounts = 0;
  });

  it('starts at step 1 when no project was chosen yet (CA-14)', async () => {
    mockProjects();
    renderAt('/recursos/nuevo');

    expect(screen.getByRole('heading', { name: 'Registrar recurso', level: 1 })).toBeInTheDocument();
    expect(steps()[0]).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByText('Formulario nuevo')).not.toBeInTheDocument();
    const drawer = screen.getByRole('dialog', { name: 'Registrar recurso' });
    fireEvent.click(await within(drawer).findByRole('radio', { name: /Caja de Ahorros/ }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Formulario nuevo')).toBeInTheDocument();
    expect(url()).toBe('/recursos/nuevo?proyecto=52');
    expect(steps()[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('CAJA DE AHORROS · Caja de Ahorros')).toBeInTheDocument();
    expect(form.last).toMatchObject({ canCreateProjects: true, projectChoice: { kind: 'project', project: caja } });
    expect(form.last?.resourceId).toBeUndefined();
  });

  it('goes back to the roster when step 1 is closed', async () => {
    mockProjects();
    renderAt('/recursos/nuevo');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByRole('heading', { name: 'Roster' })).toBeInTheDocument();
  });

  it('registers without a project with ?proyecto=ninguno', () => {
    mockProjects();
    renderAt('/recursos/nuevo?proyecto=ninguno');

    expect(screen.getByText('sin proyecto')).toBeInTheDocument();
    expect(form.last?.projectChoice).toEqual({ kind: 'none' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('loads the project of the link with GET /projects/{id}', async () => {
    const { getProject } = mockProjects();
    renderAt('/recursos/nuevo?proyecto=52');

    expect(screen.getByText('Cargando el proyecto…')).toBeInTheDocument();
    expect(await screen.findByText('Formulario nuevo')).toBeInTheDocument();
    expect(getProject).toHaveBeenCalledWith('52');
    expect(screen.getByText('CAJA DE AHORROS · Caja de Ahorros')).toBeInTheDocument();
  });

  it.each([
    ['inactive', vi.fn().mockResolvedValue({ ...caja, active: false })],
    ['missing', vi.fn().mockRejectedValue({ status: 404 })],
  ])('asks for another project when the one in the link is %s', async (_, getProject) => {
    mockProjects(getProject);
    renderAt('/recursos/nuevo?proyecto=52');

    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el proyecto o ya no está activo.');
    fireEvent.click(screen.getByRole('button', { name: 'Elegir proyecto' }));
    const drawer = screen.getByRole('dialog');
    fireEvent.click(await within(drawer).findByRole('radio', { name: /Sin proyecto por ahora/ }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Formulario nuevo')).toBeInTheDocument();
    expect(url()).toBe('/recursos/nuevo?proyecto=ninguno');
  });

  it('changes the project without remounting the form, so nothing typed is lost (CA-01)', async () => {
    const { getProject } = mockProjects();
    renderAt('/recursos/nuevo?proyecto=52');
    await screen.findByText('Formulario nuevo');

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar proyecto' }));
    const drawer = screen.getByRole('dialog');
    expect(await within(drawer).findByRole('radio', { name: /Caja de Ahorros/ })).toBeChecked();
    fireEvent.click(within(drawer).getByRole('radio', { name: /DEYEL/ }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(form.last?.projectChoice).toEqual({ kind: 'project', project: deyel }));
    expect(url()).toBe('/recursos/nuevo?proyecto=41');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(form.mounts).toBe(1);
    expect(getProject).toHaveBeenCalledTimes(1);
  });

  it('closes «Cambiar proyecto» and keeps the project', async () => {
    mockProjects();
    renderAt('/recursos/nuevo?proyecto=ninguno');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar proyecto' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(url()).toBe('/recursos/nuevo?proyecto=ninguno');
  });

  it('takes the project the form creates with «Crear proyecto»', async () => {
    mockProjects();
    renderAt('/recursos/nuevo?proyecto=ninguno');
    form.last?.onProjectChoice?.({ kind: 'project', project: deyel });

    await waitFor(() => expect(url()).toBe('/recursos/nuevo?proyecto=41'));
    expect(form.last?.projectChoice).toEqual({ kind: 'project', project: deyel });
  });

  it('goes back to the roster after saving', () => {
    mockProjects();
    renderAt('/recursos/nuevo?proyecto=ninguno');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByRole('heading', { name: 'Roster' })).toBeInTheDocument();
  });
});

describe('EditarRecursoPage (HU-02, BUG-03)', () => {
  it('opens the same form in edit mode for the resource in the URL', () => {
    renderAt('/recursos/1045/editar');

    expect(screen.getByRole('heading', { name: 'Editar Recurso' })).toBeInTheDocument();
    expect(screen.getByText('Formulario 1045')).toBeInTheDocument();
    expect(form.last?.projectChoice).toBeUndefined();
  });

  it('goes back to the roster when cancelled', () => {
    renderAt('/recursos/1045/editar');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Roster' })).toBeInTheDocument();
  });
});
