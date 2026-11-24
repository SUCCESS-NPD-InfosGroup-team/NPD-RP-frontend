import { test, expect } from './support/test'

/**
 * HU-01 · SCRUM-84: registrar en dos pasos. El paso 1 elige el proyecto (o «Sin proyecto por ahora»)
 * en un panel sobre la página y el paso 2 es /recursos/nuevo con ese proyecto fijo.
 */
test.describe('Recursos · registrar', () => {
  type Page = import('@playwright/test').Page

  async function fillCollaborator(page: Page, employeeNumber: string) {
    await expect(page.getByLabel('Posición en Infosgroup *').locator('option', { hasText: 'Sr.' })).toBeAttached()
    await page.getByLabel('N° de empleado *').fill(employeeNumber)
    await page.getByLabel('Nombre de empleado *').fill('Persona E2E')
    await page.getByLabel('Posición en Infosgroup *').selectOption({ label: 'Analista de Pruebas de Calidad Sr.' })
    await page.getByLabel('Modalidad laboral *').selectOption({ label: 'Remoto' })
    await page.getByLabel('Género *').selectOption({ label: 'Femenino' })
    await page.getByLabel('Fecha de inicio de contrato *').fill('03/11/2026')
  }

  async function fillAssignment(page: Page) {
    await page.getByLabel('Líder NPD *').selectOption({ label: 'Lorena Batista' })
    await page.getByLabel('Sin fecha final (indefinido)').check()
  }

  /** Paso 1: elige la opción en el panel y continúa */
  async function chooseProject(page: Page, option: RegExp) {
    const step1 = page.getByRole('dialog', { name: 'Registrar recurso' })
    await step1.getByRole('radio', { name: option }).check()
    await step1.getByRole('button', { name: 'Continuar' }).click()
    await expect(step1).toHaveCount(0)
  }

  const submit = (page: Page) => page.getByRole('button', { name: 'Registrar recurso' }).last().click()

  test('E2E-REG-01 registra sin proyecto con POST y vuelve al roster', async ({ page, open, api }) => {
    await open('/recursos')
    await page.getByRole('main').getByRole('button', { name: 'Registrar recurso' }).click()
    await expect(page.getByRole('dialog', { name: 'Registrar recurso' }).getByRole('list', { name: 'Pasos' })).toContainText('1 · Proyecto')
    await chooseProject(page, /Sin proyecto por ahora/)
    await expect(page).toHaveURL(/\/recursos\/nuevo\?proyecto=ninguno$/)

    await fillCollaborator(page, '7777')
    await submit(page)

    await expect(page).toHaveURL(/\/recursos$/)
    const post = api.callsTo('POST', /^\/planner\/resources$/)
    expect(post).toHaveLength(1)
    expect(post[0].body).toMatchObject({ employeeNumber: '7777', name: 'Persona E2E', positionId: 4, workModeId: 2, genderId: 1, hireDate: '2026-11-03', assignment: null })
  })

  test('E2E-REG-04 desde la barra superior: proyecto primero, «Cambiar proyecto» conserva lo escrito (CA-01, CA-14)', async ({ page, open, api }) => {
    await open('/recursos')
    await page.getByRole('banner').getByRole('button', { name: 'Registrar recurso' }).click()
    await chooseProject(page, /DEYEL/)
    await expect(page).toHaveURL(/\/recursos\/nuevo\?proyecto=11$/)
    await expect(page.getByText('BANESCO · DEYEL').first()).toBeVisible()

    await fillCollaborator(page, '7778')
    await fillAssignment(page)
    await page.getByRole('button', { name: 'Cambiar proyecto' }).click()
    await expect(page.getByRole('dialog', { name: 'Registrar recurso' }).getByRole('radio', { name: /DEYEL/ })).toBeChecked()
    await chooseProject(page, /Check-in Web/)

    await expect(page).toHaveURL(/\/recursos\/nuevo\?proyecto=21$/)
    await expect(page.getByLabel('Nombre de empleado *')).toHaveValue('Persona E2E')
    await submit(page)

    await expect(page).toHaveURL(/\/recursos$/)
    expect(api.callsTo('POST', /^\/planner\/resources$/)[0].body).toMatchObject({
      employeeNumber: '7778',
      assignment: { projectId: 21, leaderId: 755, indefinite: true, endDate: null },
    })
  })

  test('E2E-REG-05 el enlace del paso 2 carga el proyecto con GET', async ({ page, open, api }) => {
    await open('/recursos/nuevo?proyecto=12')
    await expect(page.getByText('BANESCO · Banca Móvil').first()).toBeVisible()
    // En dev, StrictMode monta el efecto dos veces y la primera respuesta se descarta: basta con que se haya pedido
    expect(api.callsTo('GET', /^\/planner\/projects\/12$/).length).toBeGreaterThan(0)
  })

  test('E2E-REG-02 el formulario vacío no envía nada y resume lo que falta', async ({ page, open, api }) => {
    await open('/recursos/nuevo?proyecto=ninguno')
    await expect(page.getByLabel('Posición en Infosgroup *').locator('option', { hasText: 'Sr.' })).toBeAttached()
    await submit(page)

    await expect(page.getByRole('alert')).toContainText('No se guardó el registro.')
    expect(api.callsTo('POST', /^\/planner\/resources$/)).toHaveLength(0)
  })

  test('E2E-REG-03 un N° de empleado repetido ofrece asignar a esa persona al proyecto elegido', async ({ page, open, api }) => {
    await open('/recursos/nuevo?proyecto=21')
    await fillCollaborator(page, '2001')
    await fillAssignment(page)
    await submit(page)

    const dialog = page.getByRole('dialog', { name: 'El N° 2001 ya está registrado' })
    await expect(dialog).toContainText('Pertenece a Ana Zúñiga')
    await expect(dialog).toContainText('BANESCO · DEYEL')
    await expect(dialog.getByRole('link', { name: 'Ver su registro' })).toHaveAttribute('href', '/recursos/1001/editar')
    await dialog.getByRole('button', { name: 'Asignar a Check-in Web' }).click()

    await expect(page).toHaveURL(/\/recursos$/)
    const put = api.callsTo('PUT', /^\/planner\/resources\/1001$/)
    expect(put).toHaveLength(1)
    expect(put[0].body).toMatchObject({ name: 'Ana Zúñiga', version: 1, assignment: { projectId: 21, leaderId: 755 } })
    expect(api.resources.filter((r) => r.employeeNumber === '2001')).toHaveLength(1)
  })

  test('E2E-REG-06 sin proyecto, el N° repetido solo enlaza al registro existente', async ({ page, open }) => {
    await open('/recursos/nuevo?proyecto=ninguno')
    await fillCollaborator(page, '2001')
    await submit(page)

    const dialog = page.getByRole('dialog', { name: 'El N° 2001 ya está registrado' })
    await expect(dialog).toContainText('Elegiste «Sin proyecto por ahora»')
    await dialog.getByRole('link', { name: 'Ver su registro' }).click()

    await expect(page).toHaveURL(/\/recursos\/1001\/editar$/)
    await expect(page.getByLabel('Nombre de empleado *')).toHaveValue('Ana Zúñiga')
  })
})
