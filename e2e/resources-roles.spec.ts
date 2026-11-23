import { test, expect } from './support/test'
import type { E2ERole } from './support/fakeKeycloak'

/** Matriz de permisos: Recursos es de solo lectura para todo rol que no sea Operations administrator */
const READ_ONLY: E2ERole[] = ['npd-leader', 'customer-success', 'guest']

test.describe('Recursos · permisos por rol', () => {
  test('E2E-ROL-01 el Operations administrator ve registrar, selección masiva y editar', async ({ page, open }) => {
    await open('/recursos')
    await expect(page.getByRole('main').getByRole('button', { name: 'Registrar recurso' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Seleccionar todos' })).toBeVisible()
    await page.getByRole('button', { name: /^Ver detalle de / }).first().click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Editar registro' })).toBeVisible()
  })

  for (const role of READ_ONLY) {
    test(`E2E-ROL-02 ${role}: consulta y exporta, pero no registra, selecciona ni edita`, async ({ page, open }) => {
      await open('/recursos', role)
      await expect(page.getByText('130 colaboradores, 25 por página.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Exportar' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Registrar recurso' })).toHaveCount(0)
      await expect(page.getByRole('checkbox', { name: /^Seleccionar/ })).toHaveCount(0)

      await page.getByRole('button', { name: /^Ver detalle de / }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').getByRole('button', { name: 'Editar registro' })).toHaveCount(0)
    })

    test(`E2E-ROL-03 ${role}: las rutas de registrar y editar muestran acceso denegado`, async ({ page, open, api }) => {
      await open('/recursos/nuevo', role)
      await expect(page.getByRole('heading', { name: 'No tienes acceso a esta pantalla' })).toBeVisible()
      await page.goto('/recursos/1001/editar')
      await expect(page.getByRole('heading', { name: 'No tienes acceso a esta pantalla' })).toBeVisible()
      expect(api.callsTo('GET', /^\/planner\/resources\/1001$/)).toHaveLength(0)
    })
  }
})
