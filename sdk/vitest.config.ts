import { defineConfig } from 'vitest/config'

// Deliberately no alias or path-mapping layer. `sdk/tsconfig.json` declares no
// `baseUrl` and no `paths`, and every intra-package import is relative, so
// tests, tsc and the rollup build all resolve identical specifiers. Adding
// resolution here that the build does not have would let a test pass against a
// module graph consumers never get.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    server: {
      deps: {
        inline: ['axios'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'src/__tests__/**', '**/*.test.ts', '**/*.spec.ts', '**/types/**'],
    },
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    // Assertions about types, checked by tsc rather than executed. The runtime
    // suite cannot see a signature widening to `any`: every runtime assertion
    // still passes while consumers silently lose inference on the generic
    // surface (the event map, the API return types).
    typecheck: {
      include: ['src/**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
  },
})
