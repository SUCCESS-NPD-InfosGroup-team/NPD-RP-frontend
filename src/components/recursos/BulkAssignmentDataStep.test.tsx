import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBulkAssign } from '../../hooks/useBulkAssign'
import { getResourcesApi } from '../../services/resources'
import type { Catalogs } from '../../services/resources.types'
import { BulkAssignmentDataStep } from './BulkAssignmentDataStep'

vi.mock('../../services/resources', () => ({ getResourcesApi: vi.fn() }))
vi.mock('../../services/bulkAssignment.api', () => ({
  bulkAssignmentApi: { assignMembers: vi.fn() },
  BulkAssignmentApiError: class BulkAssignmentApiError extends Error {},
}))

const catalogs: Catalogs = {
  jobTitles: [],
  positions: [],
  businessUnits: [],
  workModes: [],
  genders: [],
  talentReviews: [],
  clientRoles: [{ id: 11, name: 'QA Funcional' }, { id: 12, name: 'Desarrollo' }],
  equipment: [{ id: 21, name: 'Laptop estándar' }, { id: 22, name: 'Laptop avanzada' }],
  terminationReasons: [],
  npdLeads: [{ id: 755, name: 'María Pérez' }, { id: 756, name: 'Luis Gómez' }],
  statuses: [],
}
const getCatalogs = vi.fn<() => Promise<Catalogs>>()

function Harness() {
  const assignment = useBulkAssign()
  const { togglePerson, chooseProject } = assignment

  useEffect(() => {
    togglePerson({
      employeeId: 890,
      employeeNumber: '1045',
      name: 'Ana Torres',
      statusCode: 'ACTIVO',
      version: 3,
      clientRoleName: 'QA Funcional',
      currentClientName: 'BANESCO',
      currentProjectName: 'Programa de automatización',
    })
    chooseProject({
      id: 51,
      name: 'Copa Airlines - Comercial',
      client: { id: 4, name: 'COPA' },
      teamSize: 2,
      contractEndDate: '2027-12-31',
    })
  }, [chooseProject, togglePerson])

  return <BulkAssignmentDataStep assignment={assignment} />
}

describe('BulkAssignmentDataStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCatalogs.mockResolvedValue(catalogs)
    vi.mocked(getResourcesApi).mockResolvedValue({ getCatalogs } as never)
  })

  it('loads catalogs, supports common values, per-person overrides and project moves', async () => {
    render(<Harness />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando catálogos')
    await waitFor(() => expect(screen.getAllByRole('option', { name: 'María Pérez' })).toHaveLength(2))
    expect(screen.getByText('Sale de BANESCO · Programa de automatización')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Rol en el cliente para Ana Torres')).toHaveValue('11'))
    expect(screen.getByText(/fecha fin del contrato del cliente/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Líder NPD'), { target: { value: '755' } })
    fireEvent.change(screen.getByLabelText('Rol en el cliente'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Laptop'), { target: { value: '22' } })
    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2027-10-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a todos' }))

    expect(screen.getByLabelText('Líder NPD para Ana Torres')).toHaveValue('755')
    expect(screen.getByLabelText('Rol en el cliente para Ana Torres')).toHaveValue('12')
    expect(screen.getByLabelText('Laptop para Ana Torres')).toHaveValue('22')
    expect(screen.getByLabelText('Fecha fin para Ana Torres')).toHaveValue('2027-10-31')

    fireEvent.change(screen.getByLabelText('Líder NPD para Ana Torres'), { target: { value: '756' } })
    expect(screen.getByLabelText('Líder NPD para Ana Torres')).toHaveValue('756')
  })

  it('keeps date and indefinite mutually exclusive for common and individual values', async () => {
    render(<Harness />)
    await waitFor(() => expect(screen.getAllByRole('option', { name: 'María Pérez' })).toHaveLength(2))

    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2027-10-31' } })
    const [commonIndefinite, rowIndefinite] = screen.getAllByRole('checkbox', { name: 'Indefinido' })
    fireEvent.click(commonIndefinite)
    expect(screen.getByLabelText('Fecha fin')).toBeDisabled()
    expect(screen.getByLabelText('Fecha fin')).toHaveValue('')

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a todos' }))
    expect(rowIndefinite).toBeChecked()
    expect(screen.getByLabelText('Fecha fin para Ana Torres')).toBeDisabled()
    expect(screen.getByLabelText('Fecha fin para Ana Torres')).toHaveValue('')
  })

  it('retries a failed catalog request and reports an empty lead catalog', async () => {
    getCatalogs.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      ...catalogs,
      npdLeads: [],
    })
    render(<Harness />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudieron cargar los catálogos')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(getCatalogs).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/No hay líderes NPD disponibles/)).toBeInTheDocument()
    expect(screen.getByLabelText('Líder NPD')).toBeDisabled()
  })

  it('loads catalogs from an in-flight response', async () => {
    let resolveCatalogs: (result: Catalogs) => void = () => undefined
    getCatalogs.mockImplementationOnce(() => new Promise((resolve) => { resolveCatalogs = resolve }))
    render(<Harness />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando catálogos')
    await waitFor(() => expect(getCatalogs).toHaveBeenCalledTimes(1))
    await act(async () => resolveCatalogs(catalogs))
    expect(await screen.findAllByRole('option', { name: 'Luis Gómez' })).toHaveLength(2)
  })
})
