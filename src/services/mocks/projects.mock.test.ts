import { describe, expect, it } from 'vitest'
import { projectsMock } from './projects.mock'

describe('projectsMock', () => {
  it('filters projects and paginates results', async () => {
    const firstPage = await projectsMock.listProjects()
    const secondPage = await projectsMock.listProjects({}, 2)
    const filtered = await projectsMock.listProjects({
      search: 'horizonte',
      clientId: 'client-bruma',
      leadId: '2',
      contractEnd: 'none',
    })
    const endingSoon = await projectsMock.listProjects({ contractEnd: 'next30' })
    const inactive = await projectsMock.listProjects({
      search: 'alba regional',
      includeInactive: true,
    })

    expect(firstPage.total).toBe(27)
    expect(firstPage.items).toHaveLength(25)
    expect(secondPage.items).toHaveLength(2)
    expect(filtered.items.map(({ name }) => name)).toEqual(['Horizonte Uno'])
    expect(endingSoon.items.map(({ id }) => id)).toEqual(['project-1'])
    expect(inactive.items.map(({ active }) => active)).toEqual([false])
  })

  it('calculates KPIs from the matching projects and calendar contract dates', async () => {
    await expect(projectsMock.getKpis()).resolves.toMatchObject({
      activeProjects: 27,
      activeClients: 6,
      contractEndingSoon: 1,
      withoutTeam: 2,
      unassignedPeople: 2,
    })

    await expect(projectsMock.getKpis({ clientId: 'client-bruma' })).resolves.toMatchObject({
      activeProjects: 5,
      activeClients: 1,
    })
    await expect(projectsMock.getKpis({ contractEnd: 'next30' })).resolves.toMatchObject({
      activeProjects: 1,
      contractEndingSoon: 1,
    })
  })

  it('creates projects, returns client choices, and rejects duplicate names', async () => {
    const created = await projectsMock.createProject({
      clientId: 'client-aurora',
      name: 'Nuevo proyecto de prueba',
    })
    const clients = await projectsMock.listClients()
    const clientProjects = await projectsMock.listClientProjects('client-aurora')

    expect(created.name).toBe('Nuevo proyecto de prueba')
    expect(clients.some(({ id }) => id === 'client-aurora')).toBe(true)
    expect(clientProjects.some(({ id }) => id === created.id)).toBe(true)
    await expect(projectsMock.createProject({
      clientId: 'client-aurora',
      name: 'Atlas Norte',
    })).rejects.toMatchObject({ status: 409, code: 'PROJECT_NAME_TAKEN' })
  })
})
