// TEMPORAL SCRUM-122: eliminar al conectar la API real (SCRUM-121)
import type {
  Client,
  CreateProjectInput,
  Page,
  Project,
  ProjectFilters,
  ProjectsSummary,
} from '../projects.types'

const clients: Client[] = [
  { id: 'client-aurora', name: 'Aurora Labs', isInternal: false, active: true },
  { id: 'client-bruma', name: 'Bruma Foods', isInternal: false, active: true },
  { id: 'client-cobalto', name: 'Cobalto Retail', isInternal: false, active: true },
  { id: 'client-delta', name: 'Delta Works', isInternal: false, active: true },
  { id: 'client-efimero', name: 'Efímero Studio', isInternal: false, active: true },
  { id: 'client-internal', name: 'NPD-ADMINISTRACION', isInternal: true, active: true },
]

const projectNames = [
  'Atlas Norte', 'Boreal Digital', 'Círculo Comercial', 'Duna Operativa',
  'Eclipse CX', 'Faro Analítico', 'Génesis Retail', 'Horizonte Uno',
  'Índigo Servicios', 'Junco Regional', 'Karma Integración', 'Lumen Ventas',
  'Marea Operaciones', 'Nébula Soporte', 'Órbita Growth', 'Prisma Central',
  'Quilla Experiencia', 'Rastro Clientes', 'Senda Calidad', 'Trama Datos',
  'Umbral Digital', 'Vértice NPD', 'Wadi Comercial', 'Xenón Labs',
  'Yunque Operativo', 'Zafiro CX', 'Alba Regional', 'Cauce Retail',
]

const projects: Project[] = projectNames.map((name, index) => {
  const client = clients[index % clients.length]
  const noTeam = index === 5 || index === 27
  const contractEnd = index === 0
    ? new Date(Date.now() + 20 * 86_400_000).toISOString()
    : index === 7 ? null : '2027-02-15'
  return {
    id: `project-${index + 1}`,
    name,
    client: { id: client.id, name: client.name, isInternal: client.isInternal },
    teamSize: noTeam ? 0 : 2 + (index % 4),
    members: noTeam ? [] : [{ id: `member-${index}-a`, initials: 'AR' }, { id: `member-${index}-b`, initials: 'LM' }],
    leads: noTeam ? [] : [index % 2 ? 'Mara Sol' : 'Noel Vega'],
    startDate: '2025-02-03',
    contractEnd,
    pendingCount: index === 2 || index === 9 ? 1 : 0,
    active: index !== 26,
  }
})

function filtered(filters: ProjectFilters): Project[] {
  return projects.filter((project) => {
    if (!filters.includeInactive && !project.active) return false
    const text = `${project.name} ${project.client.name}`.toLowerCase()
    if (filters.search && !text.includes(filters.search.toLowerCase())) return false
    if (filters.clientId && project.client.id !== filters.clientId) return false
    if (filters.leadId && !project.leads.includes(filters.leadId)) return false
    if (filters.contractEnd === 'none' && project.contractEnd !== null) return false
    return true
  })
}

export const projectsMock = {
  async listProjects(filters: ProjectFilters = {}, page = 1): Promise<Page<Project>> {
    const items = filtered(filters)
    return { items: items.slice((page - 1) * 25, page * 25), page, pageSize: 25, total: items.length }
  },
  async getSummary(): Promise<ProjectsSummary> {
    return {
      activeProjects: projects.filter((project) => project.active).length,
      activeClients: new Set(projects.filter((project) => project.active).map((project) => project.client.id)).size,
      contractEndingSoon: 1,
      withoutTeam: projects.filter((project) => project.teamSize === 0).length,
      unassignedPeople: 2,
    }
  },
  async createProject(input: CreateProjectInput): Promise<Project> {
    const client = input.clientId
      ? clients.find((item) => item.id === input.clientId)
      : undefined
    const targetClient = client ?? clients[0]
    const duplicate = projects.find((project) => project.client.id === targetClient.id && project.name.toLowerCase() === input.name.toLowerCase())
    if (duplicate) {
      throw { status: 409, code: 'DUPLICATE_PROJECT_NAME', message: 'El nombre ya existe.', field: 'name', existingProjectId: duplicate.id, existingProjectName: duplicate.name }
    }
    const project: Project = {
      id: `project-${projects.length + 1}`,
      name: input.name,
      client: { id: targetClient.id, name: targetClient.name, isInternal: targetClient.isInternal },
      teamSize: 0,
      members: [],
      leads: [],
      startDate: new Date().toISOString(),
      contractEnd: input.contractEnd ?? null,
      pendingCount: 0,
      active: true,
    }
    projects.push(project)
    return project
  },
  async listClients(): Promise<Client[]> { return clients },
  async createClient(input: { name: string; isInternal: boolean }): Promise<Client> {
    const client = { id: `client-${clients.length + 1}`, ...input, active: true }
    clients.push(client)
    return client
  },
}

export type ProjectsMockApi = typeof projectsMock
