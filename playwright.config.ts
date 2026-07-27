import { defineConfig, devices } from '@playwright/test'

const isIntegration = process.env.INTEGRATION_TEST === 'true'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: isIntegration ? [
    {
      command: 'bun run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: { VITE_MOCK_API: 'false' },
    },
    {
      command: 'cd ../ytci-go && go run ./cmd/server',
      port: 8080,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/ytci',
        ADMIN_JWKS_URL: process.env.ADMIN_JWKS_URL ?? 'http://localhost:3000/api/auth/jwks',
        CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000',
        JWT_EXPECTED_AUDIENCE: process.env.JWT_EXPECTED_AUDIENCE ?? 'ytci-api',
        LOG_LEVEL: 'error',
      },
    },
  ] : undefined,
})
