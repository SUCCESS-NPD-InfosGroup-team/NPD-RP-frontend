import type { Page, Request, Route } from '@playwright/test'

/**
 * Backend simulado para las E2E: mismos endpoints, formas de respuesta y reglas que el backend real
 * (filtros combinados, búsqueda sin acentos, «Activo» = ACTIVO + LICENCIA, size máximo 100, version
 * para la edición concurrente). Así una E2E en verde también prueba el contrato.
 */

type Named = { id: number; name: string }
type StatusCode = 'ACTIVO' | 'LICENCIA' | 'BAJA'
type SituationCode = 'ASIGNADO' | 'PENDIENTE_CONFIRMACION' | 'SIN_PROYECTO'

export interface FakeResource {
  id: number
  employeeNumber: string
  name: string
  email: string | null
  level: number | null
  status: StatusCode
  clientRoleId: number | null
  leaderId: number | null
  projectId: number | null
  hireDate: string
  assignmentEnd: string | null
  indefinite: boolean
  positionId: number
  workModeId: number | null
  genderId: number
  fieldsToFix: string[]
  version: number
}

export const CLIENTS: (Named & { active: boolean })[] = [
  { id: 1, name: 'BANESCO', active: true },
  { id: 2, name: 'COPA', active: true },
  { id: 3, name: 'Cliente importado', active: false },
]
export const PROJECTS: (Named & { clientId: number; active: boolean; contractEndDate: string | null; start: string })[] = [
  { id: 11, name: 'DEYEL', clientId: 1, active: true, contractEndDate: '2027-03-31', start: '2026-01-15' },
  { id: 12, name: 'Banca Móvil', clientId: 1, active: true, contractEndDate: '2026-12-31', start: '2026-02-01' },
  { id: 21, name: 'Check-in Web', clientId: 2, active: true, contractEndDate: '2027-06-30', start: '2026-03-01' },
  { id: 31, name: 'No especificado', clientId: 3, active: false, contractEndDate: null, start: '2025-01-01' },
]
export const LEADERS: Named[] = [{ id: 755, name: 'Lorena Batista' }, { id: 756, name: 'Noel Vega' }]
export const CLIENT_ROLES: Named[] = [{ id: 7, name: 'QA Funcional' }, { id: 8, name: 'QA Automatizador' }]
const STATUS_LABEL: Record<StatusCode, string> = { ACTIVO: 'Activo', LICENCIA: 'Licencia', BAJA: 'Baja' }
const SITUATION_LABEL: Record<SituationCode, string> = {
  ASIGNADO: 'Asignado', PENDIENTE_CONFIRMACION: 'Pendiente de confirmación', SIN_PROYECTO: 'Sin proyecto',
}
const CATALOGS: Record<string, unknown[]> = {
  'job-titles': [{ id: 1, name: 'Analista De Pruebas De Calidad De Software' }],
  positions: [{ id: 4, name: 'Analista de Pruebas de Calidad Sr.' }, { id: 5, name: 'Analista de Pruebas de Calidad Jr.' }],
  'business-units': [{ id: 2, name: 'IFP' }, { id: 3, name: 'Testing' }],
  'work-modes': [{ id: 1, name: 'Presencial - L/S' }, { id: 2, name: 'Remoto' }, { id: 3, name: 'Híbrido' }],
  genders: [{ id: 1, name: 'Femenino' }, { id: 2, name: 'Masculino' }],
  'talent-reviews': [{ id: 1, name: 'Alto desempeño' }],
  'client-roles': CLIENT_ROLES,
  equipment: [{ id: 1, name: 'Cliente' }, { id: 2, name: 'Laptop Infosgroup' }],
  'termination-reasons': [{ id: 1, name: 'Renuncia' }, { id: 2, name: 'Fin de contrato' }],
  statuses: Object.entries(STATUS_LABEL).map(([code, label]) => ({ code, label })),
}

const FIRST = ['Ana', 'Luis', 'María', 'Jorge', 'Sofía', 'Andrés', 'Valentina', 'Camilo', 'Daniela', 'Mateo']
const LAST = ['Torres', 'Zúñiga', 'Peña', 'Rodríguez', 'Gómez', 'Muñoz', 'Rojas', 'Díaz']

/**
 * 140 personas: 130 Activo/Licencia (para que exportar necesite 2 páginas de 100) y 10 de Baja.
 * Mezcla de proyectos, sin proyecto, «No especificado», asignaciones vencidas e indefinidas.
 */
function statusFor(n: number): StatusCode {
  if (n > 130) return 'BAJA'
  return n % 17 === 0 ? 'LICENCIA' : 'ACTIVO'
}

/** Sin proyecto no hay fin; cada 5.ª es indefinida; cada 9.ª ya venció (Pendiente de confirmación) */
function assignmentEndFor(n: number, projectId: number | null): string | null {
  if (!projectId || n % 5 === 0) return null
  return n % 9 === 0 ? '2026-10-31' : '2027-02-28'
}

/**
 * 140 personas: 130 Activo/Licencia (para que exportar necesite 2 páginas de 100) y 10 de Baja.
 * Mezcla de proyectos, sin proyecto, «No especificado», asignaciones vencidas e indefinidas.
 */
export function buildResources(total = 140): FakeResource[] {
  const projectCycle = [11, 12, 21, null, 11, 21, 12, 31] as const
  return Array.from({ length: total }, (_, index) => {
    const n = index + 1
    const status = statusFor(n)
    const projectId = status === 'BAJA' ? null : projectCycle[index % projectCycle.length]
    return {
      id: 1000 + n,
      employeeNumber: String(2000 + n),
      name: n === 1 ? 'Ana Zúñiga' : `${FIRST[index % FIRST.length]} ${LAST[(index * 3) % LAST.length]} ${n}`,
      email: `persona${n}@infosgroup.com`,
      level: n % 11 === 0 ? null : (n % 4) + 1,
      status,
      clientRoleId: projectId ? CLIENT_ROLES[n % 2].id : null,
      leaderId: projectId ? LEADERS[n % 2].id : null,
      projectId,
      hireDate: '2025-06-02',
      assignmentEnd: assignmentEndFor(n, projectId),
      indefinite: Boolean(projectId) && n % 5 === 0,
      positionId: 4,
      workModeId: projectId === 31 ? null : 1,
      genderId: (n % 2) + 1,
      fieldsToFix: projectId === 31 ? ['assignment.projectId', 'workModeId'] : [],
      version: 1,
    }
  })
}

/** Lo que trae el import cuando la modalidad no venía en el planner (CA-08) */
const NOT_SPECIFIED_WORK_MODE: Named = { id: 99, name: 'No especificado' }

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const byId = <T extends { id: number }>(items: T[], id: number | null) => items.find((item) => item.id === id) ?? null
const named = (item: Named | null) => (item ? { id: item.id, name: item.name } : null)

interface Reply {
  status: number
  body: unknown
}

interface Handler {
  method: string
  path: RegExp
  reply: (match: RegExpExecArray, params: URLSearchParams, body: unknown) => Reply
}

export interface ApiCall {
  method: string
  path: string
  params: URLSearchParams
  body: unknown
}

export class FakeApi {
  readonly resources: FakeResource[]
  readonly calls: ApiCall[] = []
  readonly unhandled: string[] = []
  private failures: { match: RegExp; status: number; body: unknown; times: number }[] = []
  private delays: { match: RegExp; ms: number }[] = []

  constructor(resources = buildResources()) {
    this.resources = resources
  }

  /** Las próximas `times` llamadas cuyo "METHOD /ruta" coincida responden con `status` */
  fail(match: RegExp, status = 500, body: unknown = { code: 'INTERNAL', detail: 'Error simulado' }, times = 1): void {
    this.failures.push({ match, status, body, times })
  }

  /** Demora las respuestas cuyo "METHOD /ruta?query" coincida (para probar respuestas desordenadas) */
  delay(match: RegExp, ms: number): void {
    this.delays.push({ match, ms })
  }

  clearFailures(): void {
    this.failures = []
  }

  /** Simula que otra persona guardó el registro después de que se abrió */
  touch(id: number, changes: Partial<FakeResource> = {}): void {
    const resource = this.resources.find((item) => item.id === id)
    if (resource) Object.assign(resource, changes, { version: resource.version + 1 })
  }

  callsTo(method: string, path: RegExp): ApiCall[] {
    return this.calls.filter((call) => call.method === method && path.test(call.path))
  }

  async install(page: Page): Promise<void> {
    await page.route('**/api/v1/**', (route) => this.handle(route))
  }

  private situation(resource: FakeResource): SituationCode {
    if (!resource.projectId) return 'SIN_PROYECTO'
    if (resource.assignmentEnd && resource.assignmentEnd < '2026-11-19') return 'PENDIENTE_CONFIRMACION'
    return 'ASIGNADO'
  }

  private group(resource: FakeResource): number {
    const project = byId(PROJECTS, resource.projectId)
    if (!project) return 1
    return project.active ? 2 : 0
  }

  private listItem(resource: FakeResource) {
    const project = byId(PROJECTS, resource.projectId)
    const client = project ? byId(CLIENTS, project.clientId) : null
    const situation = this.situation(resource)
    return {
      id: resource.id,
      employeeNumber: resource.employeeNumber,
      name: resource.name,
      level: resource.level,
      clientRole: byId(CLIENT_ROLES, resource.clientRoleId)?.name ?? null,
      leader: named(byId(LEADERS, resource.leaderId)),
      status: { code: resource.status, label: STATUS_LABEL[resource.status] },
      situation: { code: situation, label: SITUATION_LABEL[situation] },
      hireDate: resource.hireDate,
      onProbation: false,
      probationEndDate: null,
      projectId: resource.projectId,
      assignmentStart: project ? [project.start, resource.hireDate].sort((a, b) => a.localeCompare(b))[1] : null,
      assignmentEnd: resource.assignmentEnd,
      indefinite: resource.indefinite,
      daysToAssignmentEnd: null,
      project: named(project),
      client: named(client),
      projectActive: project ? project.active : null,
    }
  }

  private detail(resource: FakeResource) {
    const project = byId(PROJECTS, resource.projectId)
    const client = project ? byId(CLIENTS, project.clientId) : null
    const workMode = (CATALOGS['work-modes'] as Named[]).find((item) => item.id === resource.workModeId) ?? null
    const situation = this.situation(resource)
    return {
      id: resource.id,
      employeeNumber: resource.employeeNumber,
      name: resource.name,
      email: resource.email,
      jobTitle: null,
      position: (CATALOGS.positions as Named[]).find((item) => item.id === resource.positionId) ?? null,
      level: resource.level,
      businessUnit: null,
      workMode: workMode ?? NOT_SPECIFIED_WORK_MODE,
      gender: (CATALOGS.genders as Named[]).find((item) => item.id === resource.genderId) ?? null,
      talentReview: null,
      hireDate: resource.hireDate,
      onProbation: false,
      probationEndDate: '2025-08-31',
      status: { code: resource.status, label: STATUS_LABEL[resource.status] },
      situation: { code: situation, label: SITUATION_LABEL[situation] },
      assignment: project
        ? {
            client: named(client),
            project: { id: project.id, name: project.name, contractEndDate: project.contractEndDate },
            leader: named(byId(LEADERS, resource.leaderId)),
            clientRole: named(byId(CLIENT_ROLES, resource.clientRoleId)),
            equipment: null,
            endDate: resource.assignmentEnd,
            indefinite: resource.indefinite,
            clientContactEmail: null,
          }
        : null,
      termination: resource.status === 'BAJA' ? { date: '2026-10-31', reason: { id: 1, name: 'Renuncia' } } : null,
      fieldsToFix: resource.fieldsToFix,
      version: resource.version,
      updatedAt: '2026-11-10T15:00:00Z',
      updatedBy: 'lbatista',
    }
  }

  private search(params: URLSearchParams) {
    const q = normalize(params.get('q') ?? '')
    const statuses = params.getAll('status')
    const situations = params.getAll('situation')
    const numberParam = (key: string) => (params.has(key) ? Number(params.get(key)) : null)
    const clientId = numberParam('clientId')
    const projectId = numberParam('projectId')
    const leaderId = numberParam('leaderId')
    const clientRoleId = numberParam('clientRoleId')
    const level = numberParam('level')

    const matches = this.resources
      .filter((resource) => {
        const item = this.listItem(resource)
        const text = normalize([item.name, item.employeeNumber, item.project?.name, item.client?.name].join(' '))
        return (!q || text.includes(q))
          && (statuses.length === 0 || statuses.includes(resource.status))
          && (situations.length === 0 || situations.includes(this.situation(resource)))
          && (clientId === null || item.client?.id === clientId)
          && (projectId === null || resource.projectId === projectId)
          && (leaderId === null || resource.leaderId === leaderId)
          && (clientRoleId === null || resource.clientRoleId === clientRoleId)
          && (level === null || resource.level === level)
      })
      .sort((a, b) => this.group(a) - this.group(b) || (a.assignmentEnd ?? '9999').localeCompare(b.assignmentEnd ?? '9999') || a.id - b.id)

    // Spring recorta en silencio cualquier size mayor a max-page-size (100)
    const size = Math.min(Number(params.get('size') ?? 25), 100)
    const number = Number(params.get('page') ?? 0)
    const pageItems = matches.slice(number * size, number * size + size)
    return {
      items: pageItems.map((resource) => this.listItem(resource)),
      groups: [],
      page: { number, size, totalElements: matches.length, totalPages: Math.ceil(matches.length / size) },
    }
  }

  private async handle(route: Route): Promise<void> {
    const request: Request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api\/v1/, '')
    const method = request.method()
    let body: unknown
    try { body = request.postDataJSON() } catch { body = request.postData() }
    this.calls.push({ method, path, params: url.searchParams, body })

    const key = `${method} ${path}`
    const keyWithQuery = `${key}?${url.searchParams.toString()}`
    const wait = Math.max(0, ...this.delays.filter((delay) => delay.match.test(keyWithQuery)).map((delay) => delay.ms))
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))

    const failure = this.failures.find((item) => item.times > 0 && item.match.test(key))
    if (failure) {
      failure.times -= 1
      await route.fulfill({ status: failure.status, contentType: 'application/problem+json', body: JSON.stringify(failure.body) })
      return
    }

    const handler = this.handlers.find((candidate) => candidate.method === method && candidate.path.test(path))
    let reply: Reply = { status: 404, body: { code: 'NOT_FOUND', detail: `E2E: endpoint sin simular ${key}` } }
    if (handler) reply = handler.reply(handler.path.exec(path)!, url.searchParams, body)
    else this.unhandled.push(key)
    await route.fulfill({ status: reply.status, contentType: 'application/json', body: reply.body === undefined ? '' : JSON.stringify(reply.body) })
  }

  private findResource(id: string): FakeResource | undefined {
    return this.resources.find((item) => item.id === Number(id))
  }

  private update(id: string, body: unknown): Reply {
    const resource = this.findResource(id)
    if (!resource) return { status: 404, body: { code: 'NOT_FOUND', detail: 'No existe el recurso.' } }
    const input = body as { version: number; name: string; level: number | null; status: StatusCode; workModeId: number; assignment: { projectId: number; leaderId: number } | null }
    if (input.version !== resource.version) {
      return { status: 409, body: { code: 'CONCURRENT_MODIFICATION', detail: 'Otra persona guardó el registro.', currentVersion: resource.version, updatedBy: 'lbatista' } }
    }
    Object.assign(resource, {
      name: input.name,
      level: input.level,
      status: input.status,
      workModeId: input.workModeId,
      projectId: input.assignment?.projectId ?? null,
      leaderId: input.assignment?.leaderId ?? null,
      fieldsToFix: [],
      version: resource.version + 1,
    })
    return { status: 200, body: this.detail(resource) }
  }

  private create(body: unknown): Reply {
    const input = body as { employeeNumber: string; name: string }
    const existing = this.resources.find((item) => item.employeeNumber === input.employeeNumber)
    if (existing) {
      return { status: 409, body: { code: 'EMPLOYEE_NUMBER_TAKEN', detail: 'Ya está registrado.', existingResourceId: existing.id, existingResourceName: existing.name } }
    }
    const created: FakeResource = { ...buildResources(1)[0], id: 9000 + this.resources.length, employeeNumber: input.employeeNumber, name: input.name, projectId: null, leaderId: null }
    this.resources.push(created)
    return { status: 201, body: this.detail(created) }
  }

  private clientProjects(clientId: string): Reply {
    const items = PROJECTS.filter((project) => project.clientId === Number(clientId) && project.active).map((project) => ({
      id: project.id,
      name: project.name,
      teamSize: this.resources.filter((item) => item.projectId === project.id).length,
      contractEndDate: project.contractEndDate,
    }))
    return { status: 200, body: { items } }
  }

  /** Endpoints del backend que usa el módulo Recursos, en el orden en que se comparan */
  private readonly handlers: Handler[] = [
    { method: 'GET', path: /^\/planner\/resources$/, reply: (_, params) => ({ status: 200, body: this.search(params) }) },
    { method: 'GET', path: /^\/planner\/resources\/npd-leads$/, reply: () => ({ status: 200, body: { items: LEADERS } }) },
    {
      method: 'GET',
      path: /^\/planner\/resources\/(\d+)$/,
      reply: ([, id]) => {
        const resource = this.findResource(id)
        return resource ? { status: 200, body: this.detail(resource) } : { status: 404, body: { code: 'NOT_FOUND', detail: 'No existe el recurso.' } }
      },
    },
    { method: 'PUT', path: /^\/planner\/resources\/(\d+)$/, reply: ([, id], _, body) => this.update(id, body) },
    { method: 'POST', path: /^\/planner\/resources$/, reply: (_, __, body) => this.create(body) },
    {
      method: 'GET',
      path: /^\/planner\/clients$/,
      reply: () => ({ status: 200, body: { items: CLIENTS.filter((client) => client.active).map((client) => ({ ...client, isInternal: false })) } }),
    },
    { method: 'GET', path: /^\/planner\/clients\/(\d+)\/projects$/, reply: ([, id]) => this.clientProjects(id) },
    {
      method: 'GET',
      path: /^\/planner\/catalogs\/([a-z-]+)$/,
      reply: ([, list]) => (CATALOGS[list] ? { status: 200, body: { items: CATALOGS[list] } } : { status: 404, body: { code: 'NOT_FOUND' } }),
    },
    { method: 'GET', path: /^\/planner\/upcoming-events\/summary$/, reply: () => ({ status: 200, body: { windowDays: 30, total: 0, nearest: [] } }) },
    { method: 'GET', path: /^\/history\/resources\/\d+\/last-change$/, reply: () => ({ status: 204, body: undefined }) },
    { method: 'GET', path: /^\/planner\/upcoming-events\/summary$/, reply: () => ({ status: 200, body: { windowDays: 30, total: 0, nearest: [] } }) },
    { method: 'GET', path: /^\/planner\/projects\/kpis$/, reply: () => ({ status: 200, body: { activeResources: 130, activeProjects: 3, activeClients: 2, endingSoon: 0 } }) },
    { method: 'GET', path: /^\/history\/resources\/\d+\/last-change$/, reply: () => ({ status: 204, body: undefined }) },
    { method: 'GET', path: /^\/planner\/operations-status$/, reply: () => ({ status: 200, body: {} }) },
  ]
}
