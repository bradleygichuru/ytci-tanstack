import { expect, type Cookie, type Page } from '@playwright/test'
import { assertDisposableTarget } from '../helpers/seed'

/**
 * Better Auth rate-limits the sign-in path per client IP. The analytics specs
 * open a fresh browser context per test, so signing in in every `beforeEach`
 * turns the suite into a 429 generator. Reuse one real session per account
 * within a worker instead; the auth suite is what tests the sign-in form.
 */
const sessionCache = new Map<string, Cookie[]>()

export const ANALYTICS_ROUTES = {
  overview: '/analytics',
  journeys: '/analytics/journeys',
  funnels: '/analytics/funnels',
  retention: '/analytics/retention',
  adoption: '/analytics/adoption',
  search: '/analytics/search',
  content: '/analytics/content',
  programme: '/analytics/programme',
  quality: '/analytics/quality',
  suppressed: '/analytics/suppressed',
} as const

export type AnalyticsScreen = keyof typeof ANALYTICS_ROUTES

export const VERIFY_ANALYTICS_USERS = {
  admin: 'verify-admin@example.test',
  moderator: 'verify-moderator@example.test',
  viewer: 'verify-viewer@example.test',
} as const

/**
 * Sign in through the Better Auth endpoint so the session cookie lands in the
 * browser context. The UI form is covered by the auth suite; analytics specs
 * start after auth to keep the signal on the analytics surface.
 */
export async function loginAnalytics(page: Page, email: string): Promise<void> {
  assertDisposableTarget()
  const password = process.env.VERIFY_ADMIN_PASSWORD
  if (!password) {
    throw new Error('VERIFY_ADMIN_PASSWORD is required for live analytics verification.')
  }

  const cached = sessionCache.get(email)
  if (cached) {
    await page.context().addCookies(cached)
    return
  }

  const signIn = () =>
    page.context().request.post('/api/auth/sign-in/email', {
      data: { email, password },
    })
  let response = await signIn()
  if (response.status() === 429) {
    // A previous suite run can still own the rate-limit window. Wait it out
    // once rather than turning a verification run into a retry storm.
    await new Promise((resolve) => setTimeout(resolve, 15_000))
    response = await signIn()
  }
  expect(response.status(), `sign-in for ${email}`).toBe(200)
  sessionCache.set(email, await page.context().cookies())
}

export async function openAnalytics(page: Page, screen: AnalyticsScreen | string): Promise<void> {
  const path = (ANALYTICS_ROUTES as Record<string, string>)[screen] ?? screen
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await waitForRollup(page)
}

/** Wait until the surface leaves its loading state. */
export async function waitForRollup(page: Page): Promise<void> {
  await expect
    .poll(async () => (await page.locator('body').innerText()).includes('Loading the rollup'), {
      // A cold preview/navigation has to fetch the route chunk before the
      // rollup settles; 20s was tight enough to flake on a loaded machine.
      timeout: 60_000,
    })
    .toBe(false)
  await page.waitForTimeout(100)
}

export async function setDataState(page: Page, state: 'default' | 'empty' | 'loading' | 'error' | 'stale') {
  await page.getByTestId('analytics-fixture-state').selectOption(state)
  if (state === 'loading') {
    await expect(page.getByText('Loading the rollup')).toBeVisible()
    return
  }
  await waitForRollup(page)
}

export function bodyText(page: Page): Promise<string> {
  return page.locator('body').innerText()
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, `horizontal overflow: ${overflow}px`).toBeLessThanOrEqual(1)
}
