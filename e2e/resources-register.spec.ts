import { test, expect } from './support/test'

/** HU-01 · /recursos/nuevo usa el formulario real (hallazgo de la revisión del PR #48) */
test.describe('Recursos · registrar', () => {
  async function fillCollaborator(page: import('@playwright/test').Page, employeeNumber: string) {
    await expect(page.getByLabel('Posición en Infosgroup *').locator('option', { hasText: 'Sr.' })).toBeAttached()
    await page.getByLabel('N° de empleado *').fill(employeeNumber)
    await page.getByLabel('Nombre de empleado *').fill('Persona E2E')
    await page.getByLabel('Posición en Infosgroup *').selectOption({ label: 'Analista de Pruebas de Calidad Sr.' })
    await page.getByLabel('Modalidad laboral *').selectOption({ label: 'Remoto' })
    await page.getByLabel('Género *').selectOption({ label: 'Femenino' })
    await page.getByLabel('Fecha de inicio de contrato *').fill('03/11/2026')
  }

  test('E2E-REG-01 registra sin proyecto con POST y vuelve al roster', async ({ page, open, api }) => {
    await open('/recursos')
    await page.getByRole('main').getByRole('button', { name: 'Registrar recurso' }).click()
    await expect(page).toHaveURL(/\/recursos\/nuevo$/)

    await fillCollaborator(page, '7777')
    await page.getByRole('button', { name: 'Sin proyecto por ahora' }).click()
    await page.getByRole('button', { name: 'Registrar recurso' }).last().click()

    await expect(page).toHaveURL(/\/recursos$/)
    const post = api.callsTo('POST', /^\/planner\/resources$/)
    expect(post).toHaveLength(1)
    expect(post[0].body).toMatchObject({ employeeNumber: '7777', name: 'Persona E2E', positionId: 4, workModeId: 2, genderId: 1, hireDate: '2026-11-03', assignment: null })
  })

  test('E2E-REG-02 el formulario vacío no envía nada y resume lo que falta', async ({ page, open, api }) => {
    await open('/recursos/nuevo')
    await expect(page.getByLabel('Posición en Infosgroup *').locator('option', { hasText: 'Sr.' })).toBeAttached()
    await page.getByRole('button', { name: 'Registrar recurso' }).last().click()

    await expect(page.getByRole('alert')).toContainText('No se guardó el registro.')
    expect(api.callsTo('POST', /^\/planner\/resources$/)).toHaveLength(0)
  })

  test('E2E-REG-03 un N° de empleado repetido enlaza al registro existente, que se abre para editar', async ({ page, open, api }) => {
    await open('/recursos/nuevo')
    await fillCollaborator(page, '2001')
    await page.getByRole('button', { name: 'Sin proyecto por ahora' }).click()
    await page.getByRole('button', { name: 'Registrar recurso' }).last().click()

    await expect(page.getByRole('alert')).toContainText('N° de empleado')
    await page.getByRole('link', { name: 'Abrir su registro' }).click()

    await expect(page).toHaveURL(/\/recursos\/1001\/editar$/)
    await expect(page.getByRole('heading', { name: 'Pantalla no encontrada' })).toHaveCount(0)
    await expect(page.getByLabel('Nombre de empleado *')).toHaveValue('Ana Zúñiga')
    expect(api.resources.filter((r) => r.employeeNumber === '2001')).toHaveLength(1)
  })
})
