import { test, expect } from './support/test'

/** HU-03 (SCRUM-52) · BUG-01 (SCRUM-149) · BUG-02 (SCRUM-150) */
test.describe('Recursos · roster con la API real', () => {
  const lastSearch = (api: import('./support/fakeApi').FakeApi) => api.callsTo('GET', /^\/planner\/resources$/).at(-1)!.params

  test('E2E-RES-01 carga el roster de la API con el filtro por defecto Activo (CA-10)', async ({ page, open, api }) => {
    await open('/recursos')

    await expect(page.getByText('130 colaboradores, 25 por página.')).toBeVisible()
    await expect(page.getByText('1–25 de 130 colaboradores')).toBeVisible()
    const params = lastSearch(api)
    expect(params.getAll('status')).toEqual(['ACTIVO', 'LICENCIA'])
    expect(params.get('page')).toBe('0')
    expect(params.get('size')).toBe('25')
    await expect(page.getByText('Ana Torres')).toHaveCount(0)
    await expect(page.getByText('Michelle Peña')).toHaveCount(0)
  })

  test('E2E-RES-02 agrupa «No especificado» y «Sin proyecto» antes de los proyectos (CA-08)', async ({ page, open }) => {
    await open('/recursos')

    await expect(page.getByText('1–25 de 130 colaboradores')).toBeVisible()
    const headers = await page.getByText(/^\d+ colaboradores$/).evaluateAll((nodes) =>
      nodes.map((node) => (node.parentElement?.textContent ?? '').split(node.textContent ?? '')[0].trim().toUpperCase()))
    expect(headers.slice(0, 2)).toEqual(['NO ESPECIFICADO', 'SIN PROYECTO'])
  })

  test('E2E-RES-03 busca sin distinguir acentos y vuelve a la página 1 (CA-01)', async ({ page, open, api }) => {
    await open('/recursos')
    await page.getByRole('button', { name: 'Página siguiente' }).click()
    await expect(page.getByText('26–50 de 130 colaboradores')).toBeVisible()

    await page.getByLabel('Buscar').fill('zuniga')

    await expect(page.getByText('Ana Zúñiga')).toBeVisible()
    expect(lastSearch(api).get('q')).toBe('zuniga')
    expect(lastSearch(api).get('page')).toBe('0')
  })

  test('E2E-RES-04 cada filtro llega a la API y se combinan (CA-02..CA-07, CA-13)', async ({ page, open, api }) => {
    await open('/recursos')
    await expect(page.getByLabel('Cliente').locator('option', { hasText: 'BANESCO' })).toBeAttached()

    await page.getByLabel('Cliente').selectOption({ label: 'BANESCO' })
    await expect(page.getByLabel('Proyecto').locator('option', { hasText: 'DEYEL' })).toBeAttached()
    await page.getByLabel('Proyecto').selectOption({ label: 'DEYEL' })
    await page.getByLabel('Líder NPD').selectOption({ label: 'Lorena Batista' })
    await page.getByLabel('Rol').selectOption({ label: 'QA Automatizador' })
    await page.getByLabel('Nivel').fill('2')
    await page.getByLabel('Situación').selectOption('ASIGNADO')

    await expect.poll(() => Object.fromEntries(['clientId', 'projectId', 'leaderId', 'clientRoleId', 'level', 'situation']
      .map((key) => [key, lastSearch(api).get(key)]))).toEqual({
      clientId: '1', projectId: '11', leaderId: '755', clientRoleId: '8', level: '2', situation: 'ASIGNADO',
    })
    const total = Number((await page.getByText(/colaboradores, 25 por página\./).textContent())!.split(' ')[0])
    const expected = api.resources.filter((r) => r.status !== 'BAJA' && r.projectId === 11 && r.leaderId === 755
      && r.clientRoleId === 8 && r.level === 2 && !(r.assignmentEnd && r.assignmentEnd < '2026-11-19')).length
    expect(total).toBe(expected)
  })

  test('E2E-RES-05 cambiar de cliente limpia el proyecto elegido', async ({ page, open, api }) => {
    await open('/recursos')
    await page.getByLabel('Cliente').selectOption({ label: 'BANESCO' })
    await page.getByLabel('Proyecto').selectOption({ label: 'DEYEL' })
    await expect.poll(() => lastSearch(api).get('projectId')).toBe('11')

    await page.getByLabel('Cliente').selectOption({ label: 'COPA' })

    await expect.poll(() => lastSearch(api).get('clientId')).toBe('2')
    expect(lastSearch(api).has('projectId')).toBe(false)
    await expect(page.getByLabel('Proyecto').locator('option', { hasText: 'DEYEL' })).toHaveCount(0)
    await expect(page.getByLabel('Proyecto').locator('option', { hasText: 'Check-in Web' })).toBeAttached()
  })

  test('E2E-RES-06 «Incluir inactivos» muestra también las bajas', async ({ page, open, api }) => {
    await open('/recursos')
    await page.getByLabel('Incluir inactivos').check()

    await expect(page.getByText('140 colaboradores, 25 por página.')).toBeVisible()
    expect(lastSearch(api).getAll('status')).toEqual([])
    await page.getByLabel('Incluir inactivos').uncheck()
    await expect(page.getByText('130 colaboradores, 25 por página.')).toBeVisible()
  })

  test('E2E-RES-07 pagina con los totales de la API, 25 por página', async ({ page, open, api }) => {
    await open('/recursos')
    const previous = page.getByRole('button', { name: 'Página anterior' })
    const next = page.getByRole('button', { name: 'Página siguiente' })
    await expect(previous).toBeDisabled()

    const steps = [['26–50', '1'], ['51–75', '2'], ['76–100', '3'], ['101–125', '4'], ['126–130', '5']] as const
    // Una página tras otra: cada clic depende de que la anterior haya cargado
    await steps.reduce(async (previousStep, [range, pageNumber]) => {
      await previousStep
      await next.click()
      await expect(page.getByText(`${range} de 130 colaboradores`)).toBeVisible()
      expect(lastSearch(api).get('page')).toBe(pageNumber)
    }, Promise.resolve())
    await expect(next).toBeDisabled()
    await expect(page.getByText('Página 6 de 6')).toBeVisible()
  })

  test('E2E-RES-08 sin resultados lo dice y «Limpiar filtros» restablece todo', async ({ page, open }) => {
    await open('/recursos')
    await page.getByLabel('Buscar').fill('no-existe-nadie')
    await expect(page.getByText('Ningún colaborador cumple los filtros.')).toBeVisible()

    await page.getByRole('button', { name: 'Limpiar filtros' }).click()

    await expect(page.getByLabel('Buscar')).toHaveValue('')
    await expect(page.getByText('130 colaboradores, 25 por página.')).toBeVisible()
  })

  test('E2E-RES-09 si la búsqueda falla muestra el error con Reintentar, sin datos de ejemplo (BUG-02)', async ({ page, open, api }) => {
    api.fail(/^GET \/planner\/resources$/, 500, undefined, 99)
    await open('/recursos')

    const alert = page.getByRole('alert').filter({ hasText: 'No se pudieron cargar los recursos.' })
    await expect(alert).toBeVisible()
    await expect(alert).not.toContainText('datos de prueba')
    await expect(page.getByText(/^#\d+$/)).toHaveCount(0)

    api.clearFailures()
    await alert.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.getByText('1–25 de 130 colaboradores')).toBeVisible()
    await expect(alert).toBeHidden()
  })

  test('E2E-RES-10 si fallan las opciones de los filtros lo avisa y reintenta (BUG-02)', async ({ page, open, api }) => {
    api.fail(/^GET \/planner\/clients$/, 503, undefined, 99)
    await open('/recursos')

    const alert = page.getByRole('alert').filter({ hasText: 'No se pudieron cargar las opciones de los filtros.' })
    await expect(alert).toBeVisible()
    api.clearFailures()
    await alert.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.getByLabel('Cliente').locator('option', { hasText: 'BANESCO' })).toBeAttached()
    await expect(alert).toBeHidden()
  })

  test('E2E-RES-12 una respuesta vieja que llega tarde no pisa la búsqueda nueva', async ({ page, open, api }) => {
    await open('/recursos')
    await expect(page.getByText('1–25 de 130 colaboradores')).toBeVisible()
    // La búsqueda sin texto (filtro anterior) tarda; la de «zuniga» responde enseguida
    api.delay(/^GET \/planner\/resources\?page=0&size=25&status=ACTIVO&status=LICENCIA$/, 1500)
    const lateOldResponse = page.waitForResponse((response) => response.url().endsWith('/planner/resources?page=0&size=25&status=ACTIVO&status=LICENCIA'))

    await page.getByLabel('Incluir inactivos').check()
    await page.getByLabel('Incluir inactivos').uncheck()
    await page.getByLabel('Buscar').fill('zuniga')

    const zunigas = api.resources.filter((r) => r.status !== 'BAJA' && r.name.includes('Zúñiga')).length
    await expect(page.getByText(`${zunigas} colaboradores, 25 por página.`)).toBeVisible()
    // Cuando por fin llega la respuesta vieja (130), no debe reemplazar el resultado de «zuniga»
    await lateOldResponse
    await expect(page.getByText(`${zunigas} colaboradores, 25 por página.`)).toBeVisible()
    await expect(page.getByText('130 colaboradores, 25 por página.')).toHaveCount(0)
  })

  test('E2E-RES-11 la fila abre el detalle y Escape lo cierra (HU-05)', async ({ page, open }) => {
    await open('/recursos')
    await page.getByRole('button', { name: /^Ver detalle de / }).first().click()

    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Editar registro' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })
})
