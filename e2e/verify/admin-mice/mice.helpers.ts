/**
 * Shared helpers for the MICE admin verification specs (#364).
 *
 * Live mode only: the run owns the admin server on :3217, the contracts mock
 * on :8097 and the fixture proxy on :8096, and a disposable seed id.
 */
import { expect, type Page } from '@playwright/test'

export const ADMIN_EMAIL = process.env.VERIFY_ADMIN_EMAIL ?? 'grace@example.com'
export const ADMIN_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD ?? 'password'
export const EVENT_ID = '11111111-1111-4111-8111-111111111111'
export const PAID_EVENT_ID = '33333333-3333-4333-8333-333333333333'

export const SCREENS = [
  ['overview', '/programme/events', /Events overview/],
  ['events', '/programme/events/list', /Showing 3 of 3/],
  ['event-editor', `/programme/events/${EVENT_ID}`, /Edit event/],
  ['venues', '/programme/events/venues', /Curated venue records/],
  ['agenda-speakers', '/programme/events/agenda', /Sessions/],
  ['registrations', '/programme/events/registrations', /Capacity/],
  ['check-in', '/programme/events/check-in', /Check-in\s*Counter/],
  ['organisers', '/programme/events/organisers', /Organizer verification/],
  ['reports', '/programme/events/reports', /48-hour triage target/],
  ['review-queue', '/programme/events/review', /Review queue/],
  ['audit', '/programme/events/audit', /append-only log/],
] as const

/**
 * Sign in through the contract endpoint, then load the app. The login form is
 * a controlled React form and its hydration race makes it a poor fixture for
 * every spec; authentication itself is covered by the shell e2e suite.
 */
export async function login(page: Page, email = ADMIN_EMAIL) {
  const response = await page.request.post('/api/auth/sign-in/email', {
    data: { email, password: ADMIN_PASSWORD },
  })
  expect(response.ok(), `sign-in for ${email}`).toBeTruthy()
  await page.goto('/programme/events', { waitUntil: 'domcontentloaded' })
  await expect(page).not.toHaveURL(/\/login/, { timeout: 25_000 })
}

/** Navigate and wait for the route's loading scaffold to clear. */
export async function openRoute(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
  const loading = page.getByText(/^(Loading|Fetching)/)
  const deadline = Date.now() + 30_000
  while ((await loading.count()) > 0 && Date.now() < deadline) {
    await page.waitForTimeout(500)
  }
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
}

export async function setDataState(page: Page, label: 'Default' | 'Empty' | 'Error' | 'Stale') {
  const trigger = page.locator('button[aria-label="Data state"]')
  await expect(trigger).toBeVisible()
  await trigger.click()
  await page.getByRole('option', { name: label, exact: true }).click()
  const loading = page.getByText(/^(Loading|Fetching)/)
  const deadline = Date.now() + 20_000
  while ((await loading.count()) > 0 && Date.now() < deadline) {
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(600)
}
