import { expect, test } from '@playwright/test'
import {
  bodyText,
  loginAnalytics,
  openAnalytics,
  setDataState,
  VERIFY_ANALYTICS_USERS,
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

test('overview default: one rollup population across KPIs, chart and stamp', async ({ page }) => {
  await openAnalytics(page, 'overview')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview')
  await expect(page.getByText('Data through 18 Nov 2026 · nightly rollup')).toBeVisible()

  // Four KPIs, one filtered rollup.
  for (const label of ['Activation', 'DAU / WAU / MAU', 'Guest-to-account', 'New accounts']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
  }
  const text = await bodyText(page)
  expect(text).toContain('31.0%')
  expect(text).toContain('821 / 2,410 / 6,304')
  expect(text).toContain('42.0%')

  // The chart peak, its caption and the DAU KPI must name the same value.
  expect(text).toContain('Peak 821 daily active readers')
  expect(text).toContain('same DAU population as the KPI')
  expect(text).toContain('1 suppressed day(s) not plotted')

  // Highest completion reads the journeys rollup, not a second source.
  expect(text).toContain('Identical source to Journeys')
  await expect(page.getByRole('link', { name: 'View all 9' })).toBeVisible()
})

test('date range is applied to the read and named in the scope line', async ({ page }) => {
  await openAnalytics(page, 'overview')
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/v1/admin/analytics/')) requests.push(request.url())
  })

  await page.getByLabel('Date range').selectOption('90d')
  await expect(page.getByText('Last 90 days · applied to this screen')).toBeVisible()
  await expect.poll(() => requests.some((url) => url.includes('from='))).toBe(true)
  const window = new URL(requests.at(-1)!)
  expect(window.searchParams.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(window.searchParams.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(await bodyText(page)).toContain('Last 90 days · applied to this screen')
})

test('empty rollup and failed rollup are distinct states', async ({ page }) => {
  await openAnalytics(page, 'overview')

  await setDataState(page, 'empty')
  let text = await bodyText(page)
  expect(text).toContain('No data for these filters')
  expect(text).toContain('Last successful rollup')
  expect(text).not.toContain("We couldn't load the rollup")
  expect(text).not.toContain('Failed to fetch')
  await expect(page.getByRole('button', { name: /Retry rollup/ })).toHaveCount(0)

  await setDataState(page, 'error')
  text = await bodyText(page)
  expect(text).toContain("We couldn't load the rollup")
  expect(text).toContain('No partial numbers are shown')
  expect(text).toContain('Last successful rollup')
  await expect(page.getByRole('button', { name: /Retry rollup/ })).toBeVisible()
  // No partial KPI numbers survive a failed read.
  expect(text).not.toContain('821 / 2,410 / 6,304')
})

test('stale rollup keeps last-known data and disables export', async ({ page }) => {
  await openAnalytics(page, 'overview')
  await setDataState(page, 'stale')

  await expect(page.getByText('Showing last-known analytics.')).toBeVisible()
  await expect(page.getByText('Stale rollup').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Export CSV/ })).toBeDisabled()
  // Last-known numbers remain readable rather than blanking the screen.
  expect(await bodyText(page)).toContain('821 / 2,410 / 6,304')
})

test('loading state is not announced before the first read', async ({ page }) => {
  await page.goto('/analytics', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Loading the rollup')).toBeVisible()
  await expect(page.getByText('Showing last-known analytics.')).toHaveCount(0)
})

test(
  'loading after stale clears the stale banner',
  {
    annotation: {
      type: 'known-defect',
      description:
        'P2 #375: stale flag survives a switch to Loading, so the stale banner and disabled export remain.',
    },
  },
  async ({ page }) => {
    test.fail()
    await openAnalytics(page, 'overview')
    await setDataState(page, 'stale')
    await expect(page.getByText('Showing last-known analytics.')).toBeVisible()
    await setDataState(page, 'loading')
    await expect(page.getByText('Showing last-known analytics.')).toHaveCount(0)
  },
)
