import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import type { ProjectOption } from '../../services/projects.types'
import {
  groupProjectsByClient,
  NO_PROJECT,
  parseProjectParam,
  projectOptionDetail,
  projectSummaryDetail,
  registerNavigationState,
  registerResourcePath,
  sameChoice,
  toProjectOption,
  useOpenRegisterResource,
} from './registerProject'
import { withProjectChoice, EMPTY_RESOURCE_FORM } from './resourceForm'

const caja: ProjectOption = { id: '52', name: 'Caja de Ahorros', client: { id: '5', name: 'CAJA DE AHORROS' }, teamSize: 4, contractEndDate: '2026-12-31' }
const zuniga: ProjectOption = { id: '9', name: 'Portal Zúñiga', client: { id: '7', name: 'Ñandú' }, teamSize: 0, contractEndDate: null }

describe('registerProject', () => {
  it('carries the step 1 choice in the URL and reads it back', () => {
    expect(registerResourcePath(NO_PROJECT)).toBe('/recursos/nuevo?proyecto=ninguno')
    expect(registerResourcePath({ kind: 'project', project: caja })).toBe('/recursos/nuevo?proyecto=52')
    expect(parseProjectParam(new URLSearchParams(''))).toEqual({ kind: 'missing' })
    expect(parseProjectParam(new URLSearchParams('proyecto=%20'))).toEqual({ kind: 'missing' })
    expect(parseProjectParam(new URLSearchParams('proyecto=ninguno'))).toEqual({ kind: 'none' })
    expect(parseProjectParam(new URLSearchParams('proyecto=52'))).toEqual({ kind: 'project', id: '52' })
    expect(registerNavigationState(NO_PROJECT)).toEqual({})
    expect(registerNavigationState({ kind: 'project', project: caja })).toEqual({ project: caja })
  })

  it('compares choices', () => {
    const inCaja = { kind: 'project', project: caja } as const
    expect(sameChoice(undefined, undefined)).toBe(true)
    expect(sameChoice(undefined, NO_PROJECT)).toBe(false)
    expect(sameChoice(NO_PROJECT, NO_PROJECT)).toBe(true)
    expect(sameChoice(NO_PROJECT, inCaja)).toBe(false)
    expect(sameChoice(inCaja, { kind: 'project', project: { ...caja } })).toBe(true)
    expect(sameChoice(inCaja, { kind: 'project', project: zuniga })).toBe(false)
  })

  it('describes a project for step 1 and for the fixed summary of step 2', () => {
    expect(projectOptionDetail(caja)).toBe('4 colaboradores · fin de contrato 31 dic 2026')
    expect(projectOptionDetail({ ...zuniga, teamSize: 1 })).toBe('1 colaborador · sin fin de contrato')
    expect(projectSummaryDetail(caja)).toBe('4 colaboradores · fin de contrato con el cliente 31/12/2026')
    expect(projectSummaryDetail(zuniga)).toBe('0 colaboradores · sin fin de contrato con el cliente')
  })

  it('turns a created project into an option', () => {
    const project = {
      id: '77', name: 'Core QA', client: { id: '5', name: 'CAJA DE AHORROS', isInternal: false }, teamSize: 0,
      members: [], leads: [], startDate: '2026-11-23', contractEnd: null, pendingCount: 0, active: true,
    }
    expect(toProjectOption(project)).toEqual({ id: '77', name: 'Core QA', client: { id: '5', name: 'CAJA DE AHORROS' }, teamSize: 0, contractEndDate: null })
  })

  it('groups by client keeping the API order and filters without accents', () => {
    const groups = groupProjectsByClient([caja, zuniga, { ...caja, id: '53', name: 'Core' }], '')
    expect(groups.map((group) => [group.client.name, group.projects.map((project) => project.id)])).toEqual([
      ['CAJA DE AHORROS', ['52', '53']],
      ['Ñandú', ['9']],
    ])
    expect(groupProjectsByClient([caja, zuniga], 'zuniga')).toEqual([{ client: zuniga.client, projects: [zuniga] }])
    expect(groupProjectsByClient([caja, zuniga], 'NANDU')).toHaveLength(1)
    expect(groupProjectsByClient([caja, zuniga], '  ')).toHaveLength(2)
  })

  it('overrides the project of the form with the step 1 choice', () => {
    const typed = { ...EMPTY_RESOURCE_FORM, name: 'Valentina', clientId: '1', projectId: '11', withProject: false }
    expect(withProjectChoice(typed, { kind: 'project', project: caja })).toMatchObject({ name: 'Valentina', withProject: true, clientId: '5', projectId: '52' })
    expect(withProjectChoice(typed, NO_PROJECT)).toMatchObject({ name: 'Valentina', withProject: false, clientId: '', projectId: '' })
  })
})

function OpenButton() {
  const open = useOpenRegisterResource()
  return <button onClick={open}>Registrar recurso</button>
}

describe('useOpenRegisterResource', () => {
  it('opens step 1 through the layout when there is one', () => {
    const openRegisterResource = vi.fn()
    render(
      <MemoryRouter initialEntries={['/recursos']}>
        <Routes>
          <Route element={<Outlet context={{ openRegisterResource }} />}>
            <Route path="/recursos" element={<OpenButton />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(openRegisterResource).toHaveBeenCalledOnce()
  })

  it('goes to /recursos/nuevo without a layout', () => {
    render(
      <MemoryRouter initialEntries={['/recursos']}>
        <Routes>
          <Route path="/recursos" element={<OpenButton />} />
          <Route path="/recursos/nuevo" element={<h1>Paso 1</h1>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(screen.getByRole('heading', { name: 'Paso 1' })).toBeInTheDocument()
  })
})
