import * as XLSX from 'xlsx'
import { readFile } from 'node:fs/promises'
import { test, expect } from './support/test'

/** BUG-06 (SCRUM-154) · HU-03 exportar */
test.describe('Recursos · exportar', () => {
  async function exportRows(page: import('@playwright/test').Page) {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar' }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^Recursos_\d{4}-\d{2}-\d{2}\.xlsx$/)
    const workbook = XLSX.read(await readFile(await file.path()), { type: 'buffer' })
    return XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets.Recursos)
  }

  test('E2E-EXP-01 exporta todos los que cumplen los filtros, no solo la página en pantalla', async ({ page, open, api }) => {
    await open('/recursos')
    await expect(page.getByText('1–25 de 130 colaboradores')).toBeVisible()

    const rows = await exportRows(page)

    expect(rows).toHaveLength(130)
    const exportCalls = api.callsTo('GET', /^\/planner\/resources$/).filter((call) => call.params.get('size') === '100')
    expect(exportCalls.map((call) => call.params.get('page')).sort()).toEqual(['0', '1'])
    expect(new Set(rows.map((row) => row['N° Empleado'])).size).toBe(130)
  })

  test('E2E-EXP-02 respeta los filtros activos y usa etiquetas legibles', async ({ page, open, api }) => {
    await open('/recursos')
    await page.getByLabel('Situación').selectOption('SIN_PROYECTO')
    const expected = api.resources.filter((r) => r.status !== 'BAJA' && r.projectId === null).length
    await expect(page.getByText(`${expected} colaboradores, 25 por página.`)).toBeVisible()

    const rows = await exportRows(page)

    expect(rows).toHaveLength(expected)
    expect(rows.every((row) => row['Proyecto'] === 'Sin proyecto' && row['Situación'] === 'Sin proyecto')).toBe(true)
    expect(rows.every((row) => ['Activo', 'Licencia'].includes(String(row['Estado'])))).toBe(true)
    expect(Object.keys(rows[0])).toEqual(['N° Empleado', 'Nombre', 'Rol', 'Cliente', 'Proyecto', 'Líder NPD', 'Nivel', 'Estado', 'Situación', 'Fecha Inicio', 'Fecha Fin'])
  })

  test('E2E-EXP-03 con inactivos incluidos exporta también las bajas', async ({ page, open }) => {
    await open('/recursos')
    await page.getByLabel('Incluir inactivos').check()
    await expect(page.getByText('140 colaboradores, 25 por página.')).toBeVisible()

    const rows = await exportRows(page)

    expect(rows).toHaveLength(140)
    expect(rows.filter((row) => row['Estado'] === 'Baja')).toHaveLength(10)
  })

  test('E2E-EXP-04 si la exportación falla avisa con un banner, sin alert() ni archivo', async ({ page, open, api }) => {
    await open('/recursos')
    await expect(page.getByText('1–25 de 130 colaboradores')).toBeVisible()
    api.fail(/^GET \/planner\/resources$/, 500, undefined, 5)
    let dialog = false
    page.on('dialog', async (d) => { dialog = true; await d.dismiss() })
    let downloaded = false
    page.on('download', () => { downloaded = true })

    await page.getByRole('button', { name: 'Exportar' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo exportar' })).toBeVisible()
    expect(dialog).toBe(false)
    expect(downloaded).toBe(false)
    await expect(page.getByRole('button', { name: 'Exportar' })).toBeEnabled()
  })
})
