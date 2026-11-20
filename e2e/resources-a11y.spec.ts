import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './support/test'

/**
 * Accesibilidad WCAG 2.1 A/AA con axe-core: no se aceptan violaciones serias ni críticas.
 * EXEMPT son excepciones que WCAG permite y axe no distingue:
 * - El «IG» del logo usa el naranja de marca (#ff5000, 3,3:1). WCAG 1.4.3 exime el texto que
 *   forma parte de un logotipo.
 */
const EXEMPT = new Set([
  'color-contrast .brand-mark',
])

test.describe('Recursos · accesibilidad', () => {
  const scan = (page: import('@playwright/test').Page) =>
    new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()

  const serious = (results: Awaited<ReturnType<typeof scan>>) => results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .flatMap((violation) => violation.nodes.map((node) => ({ key: `${violation.id} ${node.target.join(' ')}`, help: violation.help })))
    .filter(({ key }) => !EXEMPT.has(key))
    .map(({ key, help }) => `${key}: ${help}`)

  test('E2E-A11Y-01 roster', async ({ page, open }) => {
    await open('/recursos')
    await expect(page.getByText('1–25 de 130 colaboradores')).toBeVisible()
    expect(serious(await scan(page))).toEqual([])
  })

  test('E2E-A11Y-02 detalle del recurso', async ({ page, open }) => {
    await open('/recursos')
    await page.getByRole('button', { name: /^Ver detalle de / }).first().click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Editar registro' })).toBeVisible()
    expect(serious(await scan(page))).toEqual([])
  })

  test('E2E-A11Y-03 formulario de edición con errores', async ({ page, open }) => {
    await open('/recursos/1008/editar')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    expect(serious(await scan(page))).toEqual([])
  })

  test('E2E-A11Y-05 el detalle se desplaza con el teclado', async ({ page, open }) => {
    await open('/recursos')
    await page.getByRole('button', { name: /^Ver detalle de / }).first().click()
    const body = page.getByRole('region', { name: 'Datos del recurso' })
    await expect(body).toBeVisible()

    await body.focus()
    await expect(body).toBeFocused()
    const before = await body.evaluate((node) => node.scrollTop)
    await page.keyboard.press('PageDown')
    await expect.poll(() => body.evaluate((node) => node.scrollTop)).toBeGreaterThan(before)
  })

  test('E2E-A11Y-04 los filtros y la paginación se usan con teclado', async ({ page, open }) => {
    await open('/recursos')
    await expect(page.getByText('1–25 de 130 colaboradores')).toBeVisible()
    await page.getByRole('button', { name: 'Página siguiente' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('26–50 de 130 colaboradores')).toBeVisible()
    await page.getByLabel('Buscar').focus()
    await page.keyboard.type('zuniga')
    await expect(page.getByText('Ana Zúñiga')).toBeVisible()
  })
})
