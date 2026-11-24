import { useNavigate, useOutletContext } from 'react-router-dom'
import type { Project, ProjectOption } from '../../services/projects.types'
import { formatShortDate, fromIsoDate } from '../../utils/dates'

/**
 * Step 1 of «Registrar recurso» (SCRUM-84, CA-01/CA-14): the project the collaborator joins, or
 * «Sin proyecto por ahora».
 */
/** CA-14: the stepper reads «1 · Proyecto · 2 · Datos del colaborador» */
export const REGISTER_STEPS = ['Proyecto', 'Datos del colaborador'] as const

export type ProjectChoice = { kind: 'none' } | { kind: 'project'; project: ProjectOption }

export const NO_PROJECT: ProjectChoice = { kind: 'none' }

/** Query parameter of /recursos/nuevo that carries the step 1 choice */
export const PROJECT_PARAM = 'proyecto'
export const NO_PROJECT_PARAM = 'ninguno'

const REGISTER_PATH = '/recursos/nuevo'

/** Step 2 URL for a choice: /recursos/nuevo?proyecto=41 or ?proyecto=ninguno */
export function registerResourcePath(choice: ProjectChoice): string {
  const value = choice.kind === 'none' ? NO_PROJECT_PARAM : choice.project.id
  return `${REGISTER_PATH}?${new URLSearchParams({ [PROJECT_PARAM]: value }).toString()}`
}

/** Router state that carries the chosen project, so step 2 shows it without fetching it again */
export interface RegisterNavigationState {
  project?: ProjectOption
}

export function registerNavigationState(choice: ProjectChoice): RegisterNavigationState {
  return choice.kind === 'project' ? { project: choice.project } : {}
}

/** What the URL asks for: no choice yet (step 1), no project, or the id of a project to load */
export type ProjectParam = { kind: 'missing' } | { kind: 'none' } | { kind: 'project'; id: string }

export function parseProjectParam(search: URLSearchParams): ProjectParam {
  const value = search.get(PROJECT_PARAM)?.trim()
  if (!value) return { kind: 'missing' }
  if (value === NO_PROJECT_PARAM) return { kind: 'none' }
  return { kind: 'project', id: value }
}

export function sameChoice(a: ProjectChoice | undefined, b: ProjectChoice | undefined): boolean {
  if (!a || !b) return a === b
  if (a.kind === 'none' || b.kind === 'none') return a.kind === b.kind
  return a.project.id === b.project.id
}

/** «CAJA DE AHORROS · Caja de Ahorros» */
export function projectTitle(project: ProjectOption): string {
  return `${project.client.name} · ${project.name}`
}

function teamText(teamSize: number): string {
  return teamSize === 1 ? '1 colaborador' : `${teamSize} colaboradores`
}

/** Step 1 row: «4 colaboradores · fin de contrato 31 dic 2026» */
export function projectOptionDetail(project: ProjectOption): string {
  const contract = project.contractEndDate
    ? `fin de contrato ${formatShortDate(project.contractEndDate, true)}`
    : 'sin fin de contrato'
  return `${teamText(project.teamSize)} · ${contract}`
}

/** Step 2 fixed summary: «4 colaboradores · fin de contrato con el cliente 31/12/2026» */
export function projectSummaryDetail(project: Pick<ProjectOption, 'teamSize' | 'contractEndDate'>): string {
  const contract = project.contractEndDate
    ? `fin de contrato con el cliente ${fromIsoDate(project.contractEndDate)}`
    : 'sin fin de contrato con el cliente'
  return `${teamText(project.teamSize)} · ${contract}`
}

/** A project just created with «Crear proyecto», as an option of step 1 */
export function toProjectOption(project: Project): ProjectOption {
  return {
    id: project.id,
    name: project.name,
    client: { id: project.client.id, name: project.client.name },
    teamSize: project.teamSize,
    contractEndDate: project.contractEnd ? project.contractEnd.slice(0, 10) : null,
  }
}

export interface ClientGroup {
  client: ProjectOption['client']
  projects: ProjectOption[]
}

/** Lower case and without accents, so «zuniga» finds «Zúñiga» */
function normalize(text: string): string {
  return text.normalize('NFD').replaceAll(/\p{Diacritic}/gu, '').toLowerCase()
}

/**
 * The projects that match the text in the client or project name, grouped by client in the order
 * they arrive (the API sorts them by client and then by project).
 */
export function groupProjectsByClient(projects: readonly ProjectOption[], text: string): ClientGroup[] {
  const query = normalize(text.trim())
  const groups = new Map<string, ClientGroup>()
  for (const project of projects) {
    if (query && !normalize(`${project.client.name} ${project.name}`).includes(query)) continue
    const group = groups.get(project.client.id) ?? { client: project.client, projects: [] }
    group.projects.push(project)
    groups.set(project.client.id, group)
  }
  return [...groups.values()]
}

/** What MainLayout shares with its pages through the <Outlet> context */
export interface RegisterResourceOutletContext {
  /** Opens step 1 («Registrar recurso» in the top bar or in Recursos) */
  openRegisterResource: () => void
}

/**
 * Opens step 1 over the current page when MainLayout provides it; otherwise goes to
 * /recursos/nuevo, which starts at step 1 too.
 */
export function useOpenRegisterResource(): () => void {
  const context = useOutletContext<RegisterResourceOutletContext | undefined>()
  const navigate = useNavigate()
  return context?.openRegisterResource ?? (() => navigate(REGISTER_PATH))
}
