
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
      'src/pages/Recursos/**/*.test.ts',
      'src/pages/Recursos/**/*.test.tsx',
      'src/pages/Auditoria/**/*.test.ts',
      'src/pages/Auditoria/**/*.test.tsx',
      'src/components/recursos/**/*.test.ts',
      'src/components/recursos/**/*.test.tsx',
      'src/components/auditoria/**/*.test.ts',
      'src/components/auditoria/**/*.test.tsx',
      'src/components/layout/**/*.test.ts',
      'src/components/layout/**/*.test.tsx',
      'src/components/arribos/**/*.test.ts',
      'src/components/arribos/**/*.test.tsx',
      'src/hooks/**/*.test.ts',
      'src/hooks/**/*.test.tsx',
      'src/services/**/*.test.ts',
      'src/services/**/*.test.tsx',
      'src/pages/ArribosProximos/**/*.test.ts',
      'src/pages/ArribosProximos/**/*.test.tsx',
      'src/pages/Proyectos/**/*.test.ts',
      'src/pages/Proyectos/**/*.test.tsx',
      'src/components/proyectos/**/*.test.ts',
      'src/components/proyectos/**/*.test.tsx',
    ],

    // Excluir los tests de otros módulos
    exclude: [
      'node_modules',
      'src/pages/Tablero/**',
      'src/pages/Avisos/**',
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
