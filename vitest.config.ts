
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',

    // Cargar los matchers de Testing Library
    setupFiles: './src/setupTests.ts',

    include: [
      'src/pages/Recursos/**/*.test.tsx',
      'src/components/recursos/**/*.test.tsx',
      'src/components/arribos/**/*.test.ts',
      'src/components/arribos/**/*.test.tsx',
      'src/hooks/**/*.test.ts',
      'src/hooks/**/*.test.tsx',
      'src/services/**/*.test.ts',
      'src/services/**/*.test.tsx',
      'src/pages/ArribosProximos/**/*.test.ts',
      'src/pages/ArribosProximos/**/*.test.tsx',
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
      'src/App.test.tsx'
    ]
  }
});
