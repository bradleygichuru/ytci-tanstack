import { test, expect } from '@playwright/test'

/**
 * Harness smoke. Runs against the static fixture by default (port 3210).
 * It must not require Postgres, the Go API, or an auth secret.
 */
// The static fixture owns `/`, `/health` and 404 behaviour. A live run is a
// real app + seed, so these harness-only assertions do not apply there.
test.skip(process.env.VERIFY_MODE === 'live', 'Static fixture smoke runs in fixture mode only.')

test.describe('verification harness fixture', () => {
  test('serves and asserts the fixture page', async ({ page, baseURL }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)

    await expect(page.getByTestId('verify-fixture')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Verification fixture' }),
    ).toBeVisible()
    await expect(page.getByTestId('status')).toHaveText('idle')

    await page.getByTestId('toggle').click()
    await expect(page.getByTestId('status')).toHaveText('ready')
    await expect(page.getByRole('button', { name: 'Fixture ready' })).toBeDisabled()

    if (baseURL) {
      const url = new URL(baseURL)
      expect(['127.0.0.1', 'localhost']).toContain(url.hostname)
    }
  })

  test('health endpoint answers', async ({ request }) => {
    const response = await request.get('/health')
    expect(response.status()).toBe(200)
  })

  test('unknown paths are 404, not a fallback to the dev app', async ({ request }) => {
    const response = await request.get('/not-a-verify-route')
    expect(response.status()).toBe(404)
  })
})
