import { test, expect } from './support/test'

/** HU-02 (SCRUM-51) · BUG-03 (SCRUM-151) */
test.describe('Recursos · editar registro', () => {
  const ASSIGNED = 1001 // proyecto DEYEL, versión 1
  const IMPORTED = 1008 // proyecto inactivo «No especificado» y modalidad sin valor (CA-08)

  test('E2E-EDT-01 desde el detalle abre el formulario completo con los datos del registro', async ({ page, open, api }) => {
    await open('/recursos')
    await page.getByLabel('Buscar').fill('2001')
    await page.getByRole('button', { name: /^Ver detalle de Ana Zúñiga/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Editar registro' }).click()

    await expect(page).toHaveURL(new RegExp(`/recursos/${ASSIGNED}/editar$`))
    await expect(page.getByRole('heading', { name: 'Editar Recurso' })).toBeVisible()
    await expect(page.getByLabel('Nombre de empleado *')).toHaveValue('Ana Zúñiga')
    await expect(page.getByLabel('N° de empleado *')).toHaveValue('2001')
    await expect(page.getByLabel('Fecha de inicio de contrato *')).toHaveValue('02/06/2025')
    await expect(page.getByLabel('Proyecto asignado *')).toHaveValue('11')
    expect(api.callsTo('GET', new RegExp(`^/planner/resources/${ASSIGNED}$`)).length).toBeGreaterThan(0)
  })

  test('E2E-EDT-02 guarda con PUT enviando la versión leída y vuelve al roster (CA-01, CA-04)', async ({ page, open, api }) => {
    await open(`/recursos/${ASSIGNED}/editar`)
    await expect(page.getByLabel('Nombre de empleado *')).toHaveValue('Ana Zúñiga')

    await page.getByLabel('Nombre de empleado *').fill('Ana María Zúñiga')
    await page.getByLabel('Nivel').fill('4')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page).toHaveURL(/\/recursos$/)
    const put = api.callsTo('PUT', new RegExp(`^/planner/resources/${ASSIGNED}$`))
    expect(put).toHaveLength(1)
    expect(put[0].body).toMatchObject({ name: 'Ana María Zúñiga', level: 4, version: 1, positionId: 4, workModeId: 1, genderId: 2, hireDate: '2025-06-02', status: 'ACTIVO' })
    expect(api.resources.find((r) => r.id === ASSIGNED)).toMatchObject({ name: 'Ana María Zúñiga', version: 2 })
  })

  test('E2E-EDT-03 campos obligatorios vacíos no se guardan (CA-02)', async ({ page, open, api }) => {
    await open(`/recursos/${ASSIGNED}/editar`)
    await page.getByLabel('Nombre de empleado *').fill('')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page.getByRole('alert')).toContainText('Nombre de empleado')
    expect(api.callsTo('PUT', /^\/planner\/resources\//)).toHaveLength(0)
  })

  test('E2E-EDT-04 si otra persona guardó antes ofrece «Recargar registro» (CA-04)', async ({ page, open, api }) => {
    await open(`/recursos/${ASSIGNED}/editar`)
    await expect(page.getByLabel('Nombre de empleado *')).toHaveValue('Ana Zúñiga')
    api.touch(ASSIGNED, { name: 'Ana Z. (cambiado por otra persona)' })

    await page.getByLabel('Nombre de empleado *').fill('Mi cambio')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('lbatista lo guardó después de que lo abriste')
    await alert.getByRole('button', { name: 'Recargar registro' }).click()
    await expect(page.getByLabel('Nombre de empleado *')).toHaveValue('Ana Z. (cambiado por otra persona)')

    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page).toHaveURL(/\/recursos$/)
    expect(api.callsTo('PUT', /^\/planner\/resources\//).at(-1)!.body).toMatchObject({ version: 2 })
  })

  test('E2E-EDT-05 valores «No especificado» del import se marcan y bloquean el guardado (CA-08)', async ({ page, open, api }) => {
    await open(`/recursos/${IMPORTED}/editar`)

    await expect(page.getByText(/viene del import con valores «No especificado»/)).toBeVisible()
    await expect(page.getByLabel('Modalidad laboral *')).toHaveValue('')
    await expect(page.getByLabel('Cliente *')).toHaveValue('')
    await expect(page.getByLabel('Cliente *').locator('option', { hasText: 'Cliente importado' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('alert')).toContainText('Modalidad laboral')
    expect(api.callsTo('PUT', /^\/planner\/resources\//)).toHaveLength(0)

    await page.getByLabel('Modalidad laboral *').selectOption({ label: 'Remoto' })
    await page.getByLabel('Cliente *').selectOption({ label: 'COPA' })
    await page.getByLabel('Proyecto asignado *').selectOption({ label: 'Check-in Web' })
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page).toHaveURL(/\/recursos$/)
    expect(api.callsTo('PUT', /^\/planner\/resources\//)[0].body).toMatchObject({ workModeId: 2, assignment: { projectId: 21 } })
  })

  test('E2E-EDT-06 si el guardado falla lo dice y deja reintentar (CA-06)', async ({ page, open, api }) => {
    await open(`/recursos/${ASSIGNED}/editar`)
    await expect(page.getByLabel('Nombre de empleado *')).toHaveValue('Ana Zúñiga')
    api.fail(/^PUT \/planner\/resources\//, 503, { code: 'SERVICE_UNAVAILABLE', detail: 'La base de datos no respondió y no se guardó nada. Intenta de nuevo.' })

    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('alert')).toContainText('no se guardó nada')
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()

    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page).toHaveURL(/\/recursos$/)
  })

  test('E2E-EDT-07 si el registro no existe muestra el error y deja reintentar', async ({ page, open }) => {
    await open('/recursos/999999/editar')
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('No se pudo cargar el registro del recurso.')
    await expect(alert.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  })

  test('E2E-EDT-08 Cancelar vuelve al roster sin guardar', async ({ page, open, api }) => {
    await open(`/recursos/${ASSIGNED}/editar`)
    await page.getByLabel('Nombre de empleado *').fill('No guardar esto')
    await page.getByRole('button', { name: 'Cancelar' }).click()

    await expect(page).toHaveURL(/\/recursos$/)
    expect(api.callsTo('PUT', /^\/planner\/resources\//)).toHaveLength(0)
  })
})
