import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResourcesPage } from './ResourcesPage';
import { searchAllRecursos, searchRecursos } from '../../services/api';
import { getProjectsApi, type ProjectsApi } from '../../services/projects';
import { getResourcesApi, type ResourcesApi } from '../../services/resources';
import { bulkAssignmentApi } from '../../services/bulkAssignment.api';
import type { BulkAssignmentResponse } from '../../services/bulkAssignment.types';
import { buildResource, buildResourceSearchResponse, resourceSearchResponse } from '../../test/fixtures/resourceSearch';
import type { ResourceSearchResponse } from '../../types';

vi.mock('../../services/api', () => ({ searchRecursos: vi.fn(), searchAllRecursos: vi.fn() }));
vi.mock('../../services/projects', () => ({ getProjectsApi: vi.fn() }));
vi.mock('../../services/resources', () => ({ getResourcesApi: vi.fn() }));
vi.mock('../../services/bulkAssignment.api', () => ({
  bulkAssignmentApi: { assignMembers: vi.fn() },
  BulkAssignmentApiError: class BulkAssignmentApiError extends Error {},
}));

const xlsx = vi.hoisted(() => ({
  json_to_sheet: vi.fn(() => ({})),
  book_new: vi.fn(() => ({})),
  book_append_sheet: vi.fn(),
  write: vi.fn(() => new ArrayBuffer(1)),
}));
const saveAs = vi.hoisted(() => vi.fn());
vi.mock('xlsx', () => ({ utils: xlsx, write: xlsx.write }));
vi.mock('file-saver', () => ({ saveAs }));

vi.mock('../../services/arrivals', () => ({
  getArrivalsApi: () => Promise.resolve({
    getStrip: () => Promise.resolve({ windowDays: 30, total: 3, nearest: [] }),
  }),
}));

const auth = vi.hoisted(() => ({ isAdmin: true }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ hasRole: () => auth.isAdmin })
}));

vi.mock('../../components/recursos/ResourceDetailDrawer', () => ({
  ResourceDetailDrawer: ({ onClose, onEdit, resource }: { onClose: () => void; onEdit: (resource: unknown) => void; resource: unknown }) => (
    <div role="dialog">
      <button onClick={onClose}>Cerrar detalle del recurso</button>
      <button onClick={() => onEdit(resource)}>Editar registro</button>
    </div>
  ),
}));

const mockedSearch = vi.mocked(searchRecursos);
const mockedSearchAll = vi.mocked(searchAllRecursos);
let listClients: ReturnType<typeof vi.fn>;
let listClientProjects: ReturnType<typeof vi.fn>;
const mockedAssignMembers = vi.mocked(bulkAssignmentApi.assignMembers);
const assignmentResult: BulkAssignmentResponse = {
  project: { id: 41, name: 'Programa de automatización (DEYEL)' },
  client: { id: 3, name: 'BANESCO' },
  assigned: 1,
  added: 0,
  moved: 1,
  members: [{
    id: 1,
    name: 'Ana Torres',
    previousProject: { id: 21, name: 'DEYEL' },
    endDate: '2026-12-31',
    indefinite: false,
    version: 4,
  }],
};

beforeEach(() => {
  auth.isAdmin = true;
  mockedSearch.mockReset().mockResolvedValue(resourceSearchResponse);
  mockedSearchAll.mockReset().mockResolvedValue(resourceSearchResponse.items);
  saveAs.mockReset();
  xlsx.json_to_sheet.mockClear();
  listClients = vi.fn().mockResolvedValue([{ id: '3', name: 'BANESCO', isInternal: false, active: true }]);
  listClientProjects = vi.fn().mockResolvedValue([{ id: '41', name: 'DEYEL', teamSize: 8, contractEndDate: null }]);
  vi.mocked(getProjectsApi).mockResolvedValue({ listClients, listClientProjects } as unknown as ProjectsApi);
  vi.mocked(getResourcesApi).mockResolvedValue({
    getNpdLeads: vi.fn().mockResolvedValue([{ id: 755, name: 'Lorena Batista' }]),
    getClientRoles: vi.fn().mockResolvedValue([{ id: 7, name: 'QA Funcional' }]),
    getCatalogs: vi.fn().mockResolvedValue({
      jobTitles: [],
      positions: [],
      businessUnits: [],
      workModes: [],
      genders: [],
      talentReviews: [],
      clientRoles: [{ id: 7, name: 'QA Funcional' }],
      equipment: [],
      terminationReasons: [],
      npdLeads: [{ id: 1, name: 'Lorena' }, { id: 755, name: 'Lorena Batista' }],
      statuses: [],
    }),
  } as unknown as ResourcesApi);
  mockedAssignMembers.mockReset().mockResolvedValue(assignmentResult);
});

const renderPage = () => render(
  <MemoryRouter initialEntries={['/recursos']}>
    <Routes>
      <Route path="/recursos" element={<ResourcesPage />} />
      <Route path="/recursos/:id/editar" element={<h1>Pantalla de edición</h1>} />
    </Routes>
  </MemoryRouter>
);

const lastFilters = () => mockedSearch.mock.calls.at(-1)![0];
const lastPage = () => mockedSearch.mock.calls.at(-1)![1];

describe('ResourcesPage (HU-03)', () => {
  it('debe renderizar la página sin errores', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Recursos' })).toBeInTheDocument();
    expect(await screen.findByText('#1045')).toBeInTheDocument();
  });

  it('shows the upcoming events strip instead of fixed numbers (HU-06 CA-01)', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: /Ver los 3 eventos/ })).toHaveAttribute('href', '/arribos-proximos');
    expect(screen.queryByText('Fin de contrato ≤ 7 días')).not.toBeInTheDocument();
    expect(screen.queryByText('Colaboradores sin proyecto')).not.toBeInTheDocument();
  });

  it('opens the detail drawer from the table row and timeline row', async () => {
    renderPage();

    fireEvent.click(await screen.findByText('#1045'));
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

  it('hides "Registrar recurso" from roles that cannot register', async () => {
    auth.isAdmin = false;
    renderPage();
    await screen.findByText('#1045');
    expect(screen.queryByRole('button', { name: /Registrar recurso/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar Ana Torres' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Asignar a proyecto' })).not.toBeInTheDocument();
  });

  it('selects only eligible visible group members and shows inactive bulk actions', async () => {
    mockedSearch.mockResolvedValue(buildResourceSearchResponse([
      buildResource({ id: 1, name: 'Activa uno' }),
      buildResource({ id: 2, name: 'Baja', status: { code: 'BAJA', label: 'Baja' } }),
      buildResource({ id: 3, employeeNumber: '1047', name: 'Activa dos' }),
    ]));
    renderPage();
    await screen.findByText('Activa uno');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar grupo BANESCO' }));

    expect(screen.getByText('2 seleccionados')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Activa uno' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Activa dos' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Baja' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Quitar de proyecto' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar selección' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Limpiar selección' })).toBeEnabled();
  });

  it('preserves selected people while changing roster pages', async () => {
    const first = buildResourceSearchResponse(
      [buildResource({ id: 1, name: 'Página uno' })],
      { number: 0, totalElements: 2, totalPages: 2 },
    );
    const second = buildResourceSearchResponse(
      [buildResource({ id: 2, employeeNumber: '1046', name: 'Página dos' })],
      { number: 1, totalElements: 2, totalPages: 2 },
    );
    mockedSearch.mockImplementation(async (_filters, page) => page === 2 ? second : first);
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Página uno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));

    expect(await screen.findByText('Página dos')).toBeInTheDocument();
    expect(screen.getByText('1 seleccionados')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Página dos' }));
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument();
  });

  it('assigns the selected roster model version and reports the result after refreshing', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Torres' }));
    fireEvent.click(screen.getByRole('button', { name: 'Asignar a proyecto' }));

    fireEvent.click(await screen.findByRole('radio', { name: /DEYEL/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('region', { name: 'Datos de la asignación' });
    fireEvent.click(screen.getByRole('button', { name: 'Asignar 1' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '0 a Programa de automatización (DEYEL) · 1 cambia de proyecto',
    );
    expect(mockedAssignMembers).toHaveBeenCalledWith(41, expect.objectContaining({
      members: [expect.objectContaining({ employeeId: 1, version: 3 })],
    }));
    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: 'Asignar a proyecto' })).not.toBeInTheDocument();
  });
});

describe('ResourcesPage · BUG-01 real search API', () => {
  it('starts on page 1 with active resources and no situation filter', async () => {
    renderPage();
    await screen.findByText('#1045');
    expect(mockedSearch).toHaveBeenCalledWith(expect.objectContaining({ estado: 'Activo', situacion: 'Todos', nivel: '' }), 1, 25);
  });

  it('loads the filter options from the API', async () => {
    renderPage();
    expect(await screen.findByRole('option', { name: 'BANESCO' })).toHaveValue('3');
    expect(screen.getByRole('option', { name: 'Lorena Batista' })).toHaveValue('755');
    expect(screen.getByRole('option', { name: 'QA Funcional' })).toHaveValue('7');
  });

  it('sends the situation, role, level and leader filters to the API', async () => {
    renderPage();
    await screen.findByRole('option', { name: 'QA Funcional' });

    fireEvent.change(screen.getByLabelText('Situación'), { target: { value: 'SIN_PROYECTO' } });
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Nivel'), { target: { value: 'N3x' } });
    fireEvent.change(screen.getByLabelText('Líder NPD'), { target: { value: '755' } });

    await waitFor(() => expect(lastFilters()).toMatchObject({ situacion: 'SIN_PROYECTO', rol: '7', nivel: '3', liderNPD: '755' }));
  });

  it('loads the projects of the chosen client and resets the project when the client changes', async () => {
    renderPage();
    await screen.findByRole('option', { name: 'BANESCO' });

    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '3' } });
    expect(await screen.findByRole('option', { name: 'DEYEL' })).toBeInTheDocument();
    expect(listClientProjects).toHaveBeenCalledWith('3');
    fireEvent.change(screen.getByLabelText('Proyecto'), { target: { value: '41' } });
    await waitFor(() => expect(lastFilters()).toMatchObject({ cliente: '3', proyecto: '41' }));

    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Todos' } });
    await waitFor(() => expect(lastFilters()).toMatchObject({ cliente: 'Todos', proyecto: 'Todos' }));
    expect(screen.queryByRole('option', { name: 'DEYEL' })).not.toBeInTheDocument();
  });

  it('includes inactive resources when the checkbox is marked', async () => {
    renderPage();
    await screen.findByText('#1045');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Incluir inactivos' }));
    await waitFor(() => expect(lastFilters()).toMatchObject({ estado: 'Todos' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Incluir inactivos' }));
    await waitFor(() => expect(lastFilters()).toMatchObject({ estado: 'Activo' }));
  });

  it('paginates with the totals of the API and goes back to page 1 on a new filter', async () => {
    const items = Array.from({ length: 25 }, (_, index) => buildResource({ id: index + 1, employeeNumber: String(2000 + index), name: `Persona ${index + 1}` }));
    mockedSearch.mockResolvedValue(buildResourceSearchResponse(items, { totalElements: 60, totalPages: 3 }));
    renderPage();

    expect(await screen.findByText('1–25 de 60 colaboradores')).toBeInTheDocument();
    expect(screen.getByText('60 colaboradores, 25 por página.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(lastPage()).toBe(2));
    expect(await screen.findByText('26–50 de 60 colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    await waitFor(() => expect(lastPage()).toBe(1));

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(lastPage()).toBe(2));
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'zuniga' } });
    await waitFor(() => expect(lastPage()).toBe(1));
    expect(lastFilters()).toMatchObject({ search: 'zuniga' });

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() => expect(lastFilters()).toMatchObject({ search: '' }));
  });

  it('groups by client, «Sin proyecto» and «No especificado», with no bar when there is no project', async () => {
    mockedSearch.mockResolvedValue(buildResourceSearchResponse([
      buildResource({ id: 1, name: 'Con proyecto' }),
      buildResource({ id: 2, name: 'Sin asignar', client: null, project: null, projectActive: null, assignmentStart: null, assignmentEnd: null, level: null }),
      buildResource({ id: 3, name: 'Importado', projectActive: false, indefinite: true, assignmentEnd: null }),
    ]));
    renderPage();

    expect(await screen.findByText('Con proyecto')).toBeInTheDocument();
    expect(screen.getAllByText('BANESCO').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sin proyecto').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No especificado').length).toBeGreaterThan(0);
    expect(screen.getByText('—')).toBeInTheDocument();
    const withoutProject = screen.getByRole('button', { name: 'Ver detalle de Sin asignar' });
    expect(withoutProject.querySelectorAll('span[style*="position: absolute"]')).toHaveLength(0);
    const indefinite = screen.getByRole('button', { name: 'Ver detalle de Importado' });
    expect(indefinite.querySelectorAll('span[style*="position: absolute"]')).toHaveLength(1);
  });

  it('ignores a slow response of an older search that arrives after the current one', async () => {
    let releaseOld: (value: ResourceSearchResponse) => void = () => undefined;
    const oldSearch = new Promise<ResourceSearchResponse>((resolve) => { releaseOld = resolve; });
    const current = buildResourceSearchResponse([buildResource({ id: 9, name: 'Ana Zúñiga' })], { totalElements: 1, totalPages: 1 });
    mockedSearch.mockImplementation((filters) => (filters.search === 'zuniga' ? Promise.resolve(current) : oldSearch));
    renderPage();

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'zuniga' } });
    expect(await screen.findByText('Ana Zúñiga')).toBeInTheDocument();

    releaseOld(buildResourceSearchResponse(
      Array.from({ length: 3 }, (_, index) => buildResource({ id: 100 + index, name: `Vieja ${index}` })),
      { totalElements: 130, totalPages: 6 },
    ));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('Ana Zúñiga')).toBeInTheDocument();
    expect(screen.queryByText('Vieja 0')).not.toBeInTheDocument();
    expect(screen.getByText('1 colaboradores, 25 por página.')).toBeInTheDocument();
  });

  it('says so when nobody matches the filters', async () => {
    mockedSearch.mockResolvedValue(buildResourceSearchResponse([], { totalPages: 0 }));
    renderPage();
    expect(await screen.findByText('Ningún colaborador cumple los filtros.')).toBeInTheDocument();
    expect(screen.getByText('0 de 0 colaboradores')).toBeInTheDocument();
  });
});

describe('ResourcesPage · BUG-02 visible errors', () => {
  it('shows the error with a retry instead of sample people', async () => {
    mockedSearch.mockRejectedValueOnce(new Error('500')).mockResolvedValue(resourceSearchResponse);
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudieron cargar los recursos.');
    expect(alert).not.toHaveTextContent('datos de prueba');
    expect(screen.queryByText('Ana Torres')).not.toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('#1045')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('warns when the filter options cannot be loaded and retries them', async () => {
    listClients.mockRejectedValueOnce(new Error('500'));
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudieron cargar las opciones de los filtros.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('option', { name: 'BANESCO' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('warns when the projects of a client cannot be loaded', async () => {
    listClientProjects.mockRejectedValueOnce(new Error('500'));
    renderPage();
    await screen.findByRole('option', { name: 'BANESCO' });

    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '3' } });
    expect(await screen.findByText(/No se pudieron cargar las opciones de los filtros/)).toBeInTheDocument();
  });
});

describe('ResourcesPage · BUG-06 export', () => {
  it('exports every resource that matches the active filters, not just the page on screen', async () => {
    const all = [buildResource({ id: 1 }), buildResource({ id: 2, employeeNumber: '1046', name: 'Michelle Peña' })];
    mockedSearchAll.mockResolvedValue(all);
    renderPage();
    await screen.findByText('#1045');
    fireEvent.change(screen.getByLabelText('Situación'), { target: { value: 'ASIGNADO' } });

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    await waitFor(() => expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^Recursos_\d{4}-\d{2}-\d{2}\.xlsx$/)));
    expect(mockedSearchAll).toHaveBeenCalledWith(expect.objectContaining({ situacion: 'ASIGNADO' }));
    expect(xlsx.json_to_sheet).toHaveBeenCalledWith([
      expect.objectContaining({ 'N° Empleado': '1045', Estado: 'Activo' }),
      expect.objectContaining({ 'N° Empleado': '1046', Nombre: 'Michelle Peña' }),
    ]);
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeEnabled();
  });

  it('shows an error banner instead of an alert() when the export fails', async () => {
    mockedSearchAll.mockRejectedValue(new Error('500'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    renderPage();
    await screen.findByText('#1045');

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(await screen.findByText(/No se pudo exportar/)).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(saveAs).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('ResourcesPage · BUG-03 edit', () => {
  it('opens the full edit form for the chosen resource', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('#1045'));

    fireEvent.click(screen.getByRole('button', { name: 'Editar registro' }));

    expect(await screen.findByRole('heading', { name: 'Pantalla de edición' })).toBeInTheDocument();
  });
});
