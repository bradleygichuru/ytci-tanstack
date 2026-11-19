import { defineConfig, devices } from '@playwright/test'

/**
 * Verification harness config — ticket #377.
 *
 * Default mode is a static fixture served on a unique port. It does not need
 * Postgres, the Go API, or auth secrets, and it never attaches to the admin
 * dev server on :3000 (which belongs to whoever is running it).
 *
 *   VERIFY_MODE=fixture bun run test:e2e:verify
 *   VERIFY_MODE=live VERIFY_SEED_ID=verify-local \
 *     VERIFY_BASE_URL=http://127.0.0.1:3210 bun run test:e2e:verify
 *
 * Live mode requires the app to already be running on VERIFY_BASE_URL with a
 * disposable seed. See docs/verification/README.md.
 */
const PORT = Number(process.env.VERIFY_PORT ?? 3210)
const HOST = process.env.VERIFY_HOST ?? '127.0.0.1'
const MODE = process.env.VERIFY_MODE ?? 'fixture'
const EXTERNAL_BASE_URL = process.env.VERIFY_BASE_URL
const baseURL = EXTERNAL_BASE_URL ?? `http://${HOST}:${PORT}`

if (MODE === 'fixture' && EXTERNAL_BASE_URL) {
  throw new Error(
    'VERIFY_MODE=fixture must not set VERIFY_BASE_URL; that would attach to a server this run does not own.',
  )
}

export default defineConfig({
  testDir: './e2e/verify',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // The live harness signs into a real app and downloads route chunks on first
  // navigation. A single retry absorbs a cold start or a transient rate-limit
  // window without hiding a reproducible product failure.
  retries: 1,
  workers: 1,
  // A cold preview fetches a route chunk on first client-side navigation; the
  // default 5s assertion timeout is shorter than that first chunk on a loaded
  // machine, which reads as a product failure.
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/verify', open: 'never' }],
  ],
  outputDir: 'test-results/verify',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'verify-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Fixture mode owns its server. reuseExistingServer is false on purpose:
  // a stale server on :3210 is a coordination bug, not something to reuse.
  webServer:
    MODE === 'fixture' && !EXTERNAL_BASE_URL
      ? {
          command: 'node e2e/verify/fixture-server.mjs',
          url: `${baseURL}/health`,
          reuseExistingServer: false,
          timeout: 15_000,
          env: { VERIFY_PORT: String(PORT), VERIFY_HOST: HOST },
        }
      : undefined,
})
