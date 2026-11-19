import { expect, test } from '@playwright/test'
import {
  bodyText,
  loginAnalytics,
  openAnalytics,
  VERIFY_ANALYTICS_USERS,
} from './support'

test.describe.configure({ mode: 'serial' })
test.setTimeout(120_000)

test.skip(
  process.env.VERIFY_MODE !== 'live',
  'Analytics sections need the live admin app and a disposable seed; the static fixture has no auth or rollup.',
)

test('administrator can queue an analytics export', async ({ page }) => {
  await loginAnalytics(page, VERIFY_ANALYTICS_USERS.admin)
  await openAnalytics(page, 'overview')

  const posts: { url: string; body: string | null }[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/analytics/export')) {
      posts.push({ url: request.url(), body: request.postData() })
    }
  })

  await page.getByRole('button', { name: /Export CSV/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Aggregates only, no PII.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Queue export' }).click()

  await expect(page.getByText('Export queued')).toBeVisible({ timeout: 10_000 })
  await expect.poll(() => posts.length).toBe(1)
  const payload = JSON.parse(posts[0].body ?? '{}')
  expect(payload).toMatchObject({ dataset: 'overview' })
  expect(payload.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(payload.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('moderator can read analytics but cannot export or erase', async ({ page }) => {
  await loginAnalytics(page, VERIFY_ANALYTICS_USERS.moderator)
  await openAnalytics(page, 'overview')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview')
  const exportButton = page.getByRole('button', { name: /Export CSV/ })
  await expect(exportButton).toBeDisabled()
  await expect(exportButton).toHaveAttribute('title', /cannot export analytics/i)

  await openAnalytics(page, 'quality')
  const erasure = page.getByRole('button', { name: /Request erasure/ })
  await expect(erasure).toBeDisabled()
  await expect(erasure).toHaveAttribute('title', /analytics\.erasure/)
  expect(await bodyText(page)).toContain('Your role can read analytics but cannot request erasure.')
})

test('administrator can submit a data-subject erasure request', async ({ page }) => {
  await loginAnalytics(page, VERIFY_ANALYTICS_USERS.admin)
  await openAnalytics(page, 'quality')

  const posts: { body: string | null }[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/analytics/erasure')) {
      posts.push({ body: request.postData() })
    }
  })

  await page.getByRole('button', { name: /Request erasure/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('The subject reference is recorded only for this request.')).toBeVisible()
  await dialog.getByLabel('Subject type').selectOption('user')
  await dialog.getByLabel('User ID').fill('user_verify_375')
  await dialog.getByRole('button', { name: 'Submit request' }).click()

  await expect(page.getByText('Erasure accepted')).toBeVisible({ timeout: 10_000 })
  await expect.poll(() => posts.length).toBe(1)
  expect(JSON.parse(posts[0].body ?? '{}')).toMatchObject({
    subjectType: 'user',
    subjectRef: 'user_verify_375',
  })
})

test('a role without admin access cannot reach analytics', async ({ page }) => {
  await loginAnalytics(page, 'verify-viewer@example.test')
  await page.goto('/analytics', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/no-access|\/login/)
  await expect(page.getByRole('heading', { name: 'Overview' })).toHaveCount(0)
})
