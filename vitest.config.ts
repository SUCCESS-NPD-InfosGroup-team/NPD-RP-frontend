import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      environmentOptions: {
        jsdom: {
          // Polyfill inyectado directamente en la configuración global
          // Corregido: Le decimos a TypeScript que "window" es de tipo any
          beforeParse(window: any) {
            if (window.SVGSVGElement) {
              window.SVGSVGElement.prototype.createSVGPoint = function () {
                return {
                  x: 0,
                  y: 0,
                  matrixTransform() {
                    return { x: 0, y: 0 };
                  },
                } // Corregido: Quitamos el "as unknown as DOMPoint"
              };
              window.SVGSVGElement.prototype.getScreenCTM = () =>
                ({ inverse: () => ({}) }) // Corregido: Quitamos el "as unknown as DOMMatrix"
            }
          },
        },
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/main.tsx',
          'src/vite-env.d.ts',
          'src/test/**',
          'src/**/*.d.ts',
          'src/**/*.css',
          'src/styles/**',
          'src/**/*.test.{ts,tsx}',
          '*.config.{ts,js}',
        ],
        thresholds: { lines: 70 },
      },
    },
  }),
)
