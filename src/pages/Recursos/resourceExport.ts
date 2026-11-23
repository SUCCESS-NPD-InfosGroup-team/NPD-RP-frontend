// src/pages/Recursos/resourceExport.ts
import type { RecursoApi } from '../../types'

/** Etiqueta del estado tal como la ve el usuario («Activo», no «ACTIVO») */
export function statusText(status: RecursoApi['status']): string {
  if (typeof status !== 'string') return status.label
  return status === 'ACTIVO' ? 'Activo' : status
}

/** Una fila del Excel por recurso, con las columnas del roster (BUG-06) */
export function toExportRows(items: readonly RecursoApi[]): Record<string, string | number>[] {
  return items.map((item) => ({
    'N° Empleado': item.employeeNumber,
    'Nombre': item.name,
    'Rol': item.clientRole ?? '',
    'Cliente': item.client?.name ?? '',
    'Proyecto': item.project?.name ?? 'Sin proyecto',
    'Líder NPD': item.leader?.name ?? '',
    'Nivel': item.level ?? '',
    'Estado': statusText(item.status),
    'Situación': item.situation?.label ?? '',
    'Fecha Inicio': item.assignmentStart ?? '',
    'Fecha Fin': item.indefinite ? 'Indefinido' : (item.assignmentEnd ?? ''),
  }))
}

export function exportFileName(today = new Date()): string {
  return `Recursos_${today.toISOString().slice(0, 10)}.xlsx`
}
