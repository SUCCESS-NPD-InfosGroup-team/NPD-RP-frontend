import type { Recurso, RecursoApi } from '../../types'
import { statusText } from './resourceExport'

/** Grupo de la fila: el cliente, «No especificado» si el proyecto está inactivo o «Sin proyecto» */
function groupLabel(item: RecursoApi): string {
  if (item.projectActive === false) return 'No especificado'
  return item.client?.name ?? 'Sin proyecto'
}

export function toRecurso(item: RecursoApi): Recurso {
  return {
    id: item.id.toString(),
    nEmpleado: `#${item.employeeNumber}`,
    nombre: item.name,
    rol: item.clientRole ?? 'Sin rol',
    cliente: groupLabel(item),
    proyecto: item.project?.name ?? 'Sin proyecto',
    liderNPD: item.leader?.name ?? 'Sin líder',
    nivel: item.level == null ? '—' : `N${item.level}`,
    estado: statusText(item.status),
    statusCode: typeof item.status === 'string' ? item.status : item.status.code,
    ...(item.leader ? { leaderId: item.leader.id } : {}),
    // Sin datos falsos (BUG-02): sin proyecto no hay barra; sin fin es indefinido
    fechaInicio: item.assignmentStart ?? '',
    fechaFin: item.assignmentEnd ?? '',
    ...(item.version === undefined ? {} : { version: item.version }),
  }
}
