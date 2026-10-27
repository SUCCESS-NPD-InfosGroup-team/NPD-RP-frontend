import { vi } from 'vitest'

// Mockeamos el Gantt para que no falle en JSDOM
vi.mock('../../components/recursos/RecursosGantt', () => ({
  RecursosGantt: () => 'Mock Gantt'
}))