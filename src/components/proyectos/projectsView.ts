import type { Project } from '../../services/projects.types'

export function formatProjectDate(value: string | null): string {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(value))
    .replace('.', '')
}

export function daysUntil(value: string | null, today = new Date()): number | null {
  if (!value) return null
  return Math.ceil((new Date(value).getTime() - today.getTime()) / 86_400_000)
}

export function groupProjectsByClient(projects: Project[]): Array<{ client: Project['client']; projects: Project[] }> {
  const groups = new Map<string, { client: Project['client']; projects: Project[] }>()
  for (const project of projects) {
    const group = groups.get(project.client.id) ?? { client: project.client, projects: [] }
    group.projects.push(project)
    groups.set(project.client.id, group)
  }
  return [...groups.values()]
}
