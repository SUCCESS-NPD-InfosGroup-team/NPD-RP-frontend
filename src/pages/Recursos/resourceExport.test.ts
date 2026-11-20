import { describe, expect, it } from 'vitest'
import { exportFileName, statusText, toExportRows } from './resourceExport'
import { buildResource } from '../../test/fixtures/resourceSearch'

describe('resourceExport (BUG-06)', () => {
  it('writes one row per resource with the labels the user sees', () => {
    expect(toExportRows([buildResource()])).toEqual([{
      'N° Empleado': '1045',
      'Nombre': 'Ana Torres',
      'Rol': 'QA',
      'Cliente': 'BANESCO',
      'Proyecto': 'DEYEL',
      'Líder NPD': 'Lorena',
      'Nivel': 3,
      'Estado': 'Activo',
      'Situación': 'Asignado',
      'Fecha Inicio': '2026-01-01',
      'Fecha Fin': '2026-12-31',
    }])
  })

  it('fills the gaps of a resource without project and of an indefinite assignment', () => {
    const [withoutProject, indefinite] = toExportRows([
      buildResource({ clientRole: null, client: null, project: null, leader: null, assignmentStart: null, assignmentEnd: null }),
      buildResource({ indefinite: true, assignmentEnd: null }),
    ])

    expect(withoutProject).toMatchObject({ Rol: '', Cliente: '', Proyecto: 'Sin proyecto', 'Líder NPD': '', 'Fecha Inicio': '', 'Fecha Fin': '' })
    expect(indefinite['Fecha Fin']).toBe('Indefinido')
  })

  it('accepts the status as an object or as a plain code', () => {
    expect(statusText({ code: 'LICENCIA', label: 'Licencia' })).toBe('Licencia')
    expect(statusText('ACTIVO')).toBe('Activo')
    expect(statusText('BAJA')).toBe('BAJA')
  })

  it('names the file with the date', () => {
    expect(exportFileName(new Date('2026-11-19T15:00:00Z'))).toBe('Recursos_2026-11-19.xlsx')
  })
})
