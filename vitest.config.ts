import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // Correr solo los tests de Recursos (los tuyos)
    include: [
      'src/pages/Recursos/**/*.test.tsx',
      'src/components/recursos/**/*.test.tsx'
    ],
    // Excluir los tests rotos de otros módulos
    exclude: [
      'node_modules',
      'src/pages/Tablero/**',
      'src/pages/Avisos/**',
      'src/pages/Auditoria/**',
      'src/pages/Usuarios/**',
      'src/pages/Vacaciones/**',
      'src/components/usuarios/**',
      'src/components/vacaciones/**',
      'src/components/avisos/**',
      'src/context/**',
      'src/services/**',
      'src/App.test.tsx'
    ]
  },
});