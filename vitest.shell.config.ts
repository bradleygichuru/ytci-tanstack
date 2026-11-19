/**
 * Vitest config for the admin shell smoke suite.
 *
 * It reuses the app config and adds a global setup that builds and runs the
 * frozen `cmd/contracts-mock` from ytci-go. Unit tests (`bun run test:unit`) never
 * need Go; only `bun run test:shell:smoke` does.
 */
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['smoke/**/*.test.ts'],
    exclude: ['node_modules/**', 'e2e/**'],
    globalSetup: ['scripts/vitest/contracts-mock-setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      '#': resolve(__dirname, './src'),
      '@': resolve(__dirname, './src'),
    },
  },
})
