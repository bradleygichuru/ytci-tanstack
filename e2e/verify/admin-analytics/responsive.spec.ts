import { expect, test } from '@playwright/test'
import {
  ANALYTICS_ROUTES,
  expectNoHorizontalOverflow,
  loginAnalytics,
  openAnalytics,
  VERIFY_ANALYTICS_USERS,
  type AnalyticsScreen,
} from './support'

test.describe.configure({ mode: 'serial' })
test.setTimeout(120_000)

test.skip(
  process.env.VERIFY_MODE !== 'live',
  'Analytics sections need the live admin app and a disposable seed; the static fixture has no auth or rollup.',
)

test.beforeEach(async ({ page }) => {
  await loginAnalytics(page, VERIFY_ANALYTICS_USERS.admin)
})

const SCREENS = Object.keys(ANALYTICS_ROUTES) as AnalyticsScreen[]

test('900px: every section stays inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1000 })
  for (const screen of SCREENS) {
    await openAnalytics(page, screen)
    await expectNoHorizontalOverflow(page)
  }
})

for (const width of [1400, 1180]) {
  test(`${width}px: overview and the densest tables stay inside the viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    for (const screen of ['overview', 'journeys', 'funnels', 'retention', 'adoption', 'quality'] as AnalyticsScreen[]) {
      await openAnalytics(page, screen)
      await expectNoHorizontalOverflow(page)
    }
  })
}

test('dark theme keeps the surface readable and scoped', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.addInitScript(() => {
    document.documentElement.classList.add('dark')
  })
  await openAnalytics(page, 'overview')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview')
  await expect(page.getByText('Data through 18 Nov 2026 · nightly rollup')).toBeVisible()
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(background).not.toBe('rgb(255, 255, 255)')
  await expectNoHorizontalOverflow(page)
})

test('200% text: headings and the rollup stamp stay visible', async ({ page }) => {
  await openAnalytics(page, 'overview')
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Data through 18 Nov 2026 · nightly rollup')).toBeVisible()
  const clipped = await page.evaluate(() => {
    const heading = document.querySelector('h1')
    if (!heading) return true
    const rect = heading.getBoundingClientRect()
    return rect.right > document.documentElement.clientWidth + 1
  })
  expect(clipped).toBe(false)
})
