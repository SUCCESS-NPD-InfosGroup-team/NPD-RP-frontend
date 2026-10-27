// TEMPORAL SCRUM-84: eliminar al conectar la API real (SCRUM-88)
import { ApiRequestError } from '../projects.types'
import type { Catalogs, ResourceRequest, ResourceResponse } from '../resources.types'
import { addDaysIso } from '../../utils/dates'

const catalogs: Catalogs = {
  jobTitles: [{ id: 1, name: 'Analista De Pruebas De Calidad De Software' }, { id: 2, name: 'Desarrollador De Software' }],
  positions: [{ id: 4, name: 'Analista de Pruebas de Calidad Sr.' }, { id: 5, name: 'Analista de Pruebas de Calidad Jr.' }],
  businessUnits: [{ id: 2, name: 'IFP' }, { id: 3, name: 'Testing' }],
  workModes: [{ id: 1, name: 'Presencial - L/S' }, { id: 2, name: 'Remoto' }, { id: 3, name: 'Híbrido' }],
  genders: [{ id: 1, name: 'Femenino' }, { id: 2, name: 'Masculino' }],
  talentReviews: [{ id: 1, name: 'Alto desempeño' }, { id: 2, name: 'Desempeño esperado' }],
  clientRoles: [{ id: 7, name: 'QA Funcional' }, { id: 8, name: 'QA Automatizador' }],
  equipment: [{ id: 1, name: 'Cliente' }, { id: 2, name: 'Laptop Infosgroup' }],
  terminationReasons: [{ id: 1, name: 'Renuncia' }, { id: 2, name: 'Fin de contrato' }],
  npdLeads: [{ id: 1, name: 'Noel Vega' }, { id: 2, name: 'Mara Sol' }],
  statuses: [{ code: 'ACTIVO', label: 'Activo' }, { code: 'LICENCIA', label: 'Licencia' }, { code: 'BAJA', label: 'Baja' }],
}

const resources: ResourceResponse[] = []
const takenEmployeeNumbers = new Map([['1045', { id: 1045, name: 'Ana Torres' }]])

const find = (items: { id: number; name: string }[], id: number | null) => items.find((item) => item.id === id) ?? null

export const resourcesMock = {
  async getCatalogs(): Promise<Catalogs> { return catalogs },
  async createResource(input: ResourceRequest): Promise<ResourceResponse> {
    const taken = takenEmployeeNumbers.get(input.employeeNumber)
    if (taken) {
      throw new ApiRequestError({
        status: 409,
        code: 'EMPLOYEE_NUMBER_TAKEN',
        detail: `El N° ${input.employeeNumber} ya está registrado (${taken.name}).`,
        existingResourceId: taken.id,
        existingResourceName: taken.name,
      })
    }
    const id = 2000 + resources.length
    const resource: ResourceResponse = {
      id,
      employeeNumber: input.employeeNumber,
      name: input.name,
      email: input.email,
      jobTitle: find(catalogs.jobTitles, input.jobTitleId),
      position: find(catalogs.positions, input.positionId),
      level: input.level,
      businessUnit: find(catalogs.businessUnits, input.businessUnitId),
      workMode: find(catalogs.workModes, input.workModeId),
      gender: find(catalogs.genders, input.genderId),
      talentReview: find(catalogs.talentReviews, input.talentReviewId),
      hireDate: input.hireDate,
      probationEndDate: addDaysIso(input.hireDate, 90),
      status: catalogs.statuses.find((status) => status.code === input.status) ?? catalogs.statuses[0],
      situation: input.assignment ? { code: 'ASIGNADO', label: 'Asignado' } : { code: 'SIN_PROYECTO', label: 'Sin proyecto' },
      assignment: null,
      termination: null,
      fieldsToFix: [],
      version: 0,
      updatedAt: new Date().toISOString(),
      updatedBy: 'mock',
    }
    resources.push(resource)
    takenEmployeeNumbers.set(input.employeeNumber, { id, name: input.name })
    return resource
  },
  async getResource(id: number | string): Promise<ResourceResponse> {
    const resource = resources.find((item) => String(item.id) === String(id))
    if (!resource) throw new ApiRequestError({ status: 404, code: 'NOT_FOUND', detail: 'No existe el recurso.' })
    return resource
  },
}
