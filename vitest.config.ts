
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',

    // Cargar los matchers de Testing Library
    setupFiles: './src/setupTests.ts',

    // Correr solo los tests de Recursos
    include: [
      'src/pages/Recursos/**/*.test.tsx',
      'src/components/recursos/**/*.test.tsx'
    ],

    // Excluir los tests de otros módulos
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
  }
});
