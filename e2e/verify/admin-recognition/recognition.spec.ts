/**
 * Recognition admin verification — ticket #368.
 *
 * Live mode only: drives the real admin app on VERIFY_BASE_URL against a
 * disposable seed (VERIFY_SEED_ID=verify-368-*). It never attaches to
 * :3000/:3001, never uses ports 8081/8082, and never touches a shared DB.
 *
 *   VERIFY_MODE=live VERIFY_ALLOW_PORT=1 VERIFY_SEED_ID=verify-368-recognition \
 *   VERIFY_BASE_URL=http://127.0.0.1:3218 VERIFY_ADMIN_PASSWORD=... \
 *     bun run test:e2e:verify -- e2e/verify/admin-recognition
 *
 * Screenshots land in VERIFY_EVIDENCE_DIR (default test-results/verify/recognition).
 */
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { assertDisposableTarget } from '../helpers/seed'

const EVIDENCE_DIR =
  process.env.VERIFY_EVIDENCE_DIR ?? join('test-results', 'verify', 'recognition')
const ADMIN_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD ?? ''
const SEEDED_PASSWORD = 'password'
const SCENARIO = '[data-testid="recognition-fixture-state"]'

const ROUTES = [
  { path: '/recognition', heading: 'Recognition overview', file: 'overview' },
  { path: '/recognition/rules', heading: 'Rules', file: 'rules' },
  { path: '/recognition/badges', heading: 'Badge catalogue', file: 'badges' },
  { path: '/recognition/missions', heading: 'Missions', file: 'missions' },
  { path: '/recognition/seasons', heading: 'Seasons', file: 'seasons' },
  { path: '/recognition/leaderboard', heading: 'Leaderboard', file: 'leaderboard' },
  { path: '/recognition/awards', heading: 'Awards ledger', file: 'awards' },
  { path: '/recognition/reports', heading: 'Names & reports', file: 'reports' },
  { path: '/recognition/backfill', heading: 'Backfill', file: 'backfill' },
  { path: '/recognition/audit', heading: 'Audit log', file: 'audit' },
  { path: '/recognition/kill-switches', heading: 'Kill switches', file: 'kill-switches' },
] as const

async function shot(page: Page, name: string): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true })
  await page.screenshot({ path: join(EVIDENCE_DIR, `${name}.png`), fullPage: true })
}

async function login(page: Page, email: string, password: string): Promise<void> {
  // `fill()` sets the DOM value without a React state update in this form, so
  // the submit handler sees empty fields and posts the form natively. Type it.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.locator('#login-email').pressSequentially(email, { delay: 5 })
    await page.locator('#login-password').pressSequentially(password, { delay: 5 })
    await page.getByRole('button', { name: /sign in/i }).click()
    try {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
      break
    } catch (error) {
      const alert = await page.getByRole('alert').allInnerTexts().catch(() => [])
      if (attempt === 1) throw new Error(`login failed for ${email}: ${alert.join(' / ')}`)
      await page.waitForTimeout(1000)
    }
  }
  await page.waitForLoadState('networkidle').catch(() => {})
}

async function open(page: Page, path: string, heading: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible({
    timeout: 30_000,
  })
  await page.waitForLoadState('networkidle').catch(() => {})
}

async function setScenario(page: Page, value: string): Promise<void> {
  // The dev bundle hydrates late; selecting before React attaches leaves the
  // controlled select on its old value. Wait for the control, select, verify.
  await page.locator(SCENARIO).waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(800)
  await page.locator(SCENARIO).selectOption(value)
  await expect(page.locator(SCENARIO)).toHaveValue(value, { timeout: 10_000 })
  await page.waitForTimeout(700)
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((next) => {
    window.localStorage.setItem('theme', next)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(next)
  }, theme)
  await page.waitForTimeout(200)
}

test.describe.configure({ mode: 'serial', timeout: 180_000 })
test.setTimeout(180_000)

let browser: Browser
let context: BrowserContext
let page: Page

test.beforeAll(async ({ browser: b }, testInfo) => {
  // The dev server's first authenticated render can take a minute.
  testInfo.setTimeout(180_000)
  assertDisposableTarget()
  if (!ADMIN_PASSWORD) {
    throw new Error('VERIFY_ADMIN_PASSWORD is required for live recognition verification.')
  }
  browser = b
  context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  page = await context.newPage()
  await login(page, 'verify-admin@example.test', ADMIN_PASSWORD)
})

test.afterAll(async () => {
  await context?.close()
})

// ---------------------------------------------------------------------------
// Screen coverage — default, 1400.
// ---------------------------------------------------------------------------

for (const route of ROUTES) {
  test(`${route.file} — default 1400`, async () => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await setTheme(page, 'light')
    await open(page, route.path, route.heading)
    await shot(page, `${route.file}-1400-light-default`)
  })
}

// ---------------------------------------------------------------------------
// Responsive and theme matrix.
// ---------------------------------------------------------------------------

test('overview — 1180 and 900 widths', async () => {
  await setTheme(page, 'light')
  for (const width of [1180, 900]) {
    await page.setViewportSize({ width, height: 900 })
    await open(page, '/recognition', 'Recognition overview')
    await shot(page, `overview-${width}-light-default`)
  }
  await page.setViewportSize({ width: 1400, height: 900 })
})

test('overview — dark theme', async () => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await open(page, '/recognition', 'Recognition overview')
  await setTheme(page, 'dark')
  await shot(page, 'overview-1400-dark-default')
  await setTheme(page, 'light')
})

test('awards — dark theme and 900 width', async () => {
  await open(page, '/recognition/awards', 'Awards ledger')
  await setTheme(page, 'dark')
  await shot(page, 'awards-1400-dark-default')
  await setTheme(page, 'light')
  await page.setViewportSize({ width: 900, height: 900 })
  await open(page, '/recognition/awards', 'Awards ledger')
  await shot(page, 'awards-900-light-default')
  await page.setViewportSize({ width: 1400, height: 900 })
})

test('overview — 200% text does not force horizontal scrolling', async () => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await open(page, '/recognition', 'Recognition overview')
  await page.addStyleTag({ content: 'html { font-size: 32px !important; }' })
  await page.waitForTimeout(300)
  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement
    return root ? root.scrollWidth - root.clientWidth : 0
  })
  await shot(page, 'overview-1400-light-200text')
  expect(overflow, 'horizontal overflow at 200% text').toBeLessThanOrEqual(2)
})

// ---------------------------------------------------------------------------
// Data states.
// ---------------------------------------------------------------------------

test('overview — empty, error, stale and read-only states', async () => {
  await open(page, '/recognition', 'Recognition overview')

  await setScenario(page, 'empty')
  await expect(page.getByText('Empty dataset').first()).toBeVisible()
  await shot(page, 'overview-1400-light-empty')

  await setScenario(page, 'error')
  await expect(page.getByText(/Recognition is unavailable/).first()).toBeVisible()
  await shot(page, 'overview-1400-light-error')

  await setScenario(page, 'stale')
  await expect(page.getByText('Showing last-known recognition data.')).toBeVisible()
  await shot(page, 'overview-1400-light-stale')

  await setScenario(page, 'readonly')
  await expect(page.getByText('Read-only preview.')).toBeVisible()
  await shot(page, 'overview-1400-light-readonly')

  await setScenario(page, 'default')
  await expect(page.getByRole('heading', { name: 'Recognition overview' })).toBeVisible()
})

test('badges — empty and stale states', async () => {
  await open(page, '/recognition/badges', 'Badge catalogue')

  await setScenario(page, 'empty')
  await shot(page, 'badges-1400-light-empty')

  await setScenario(page, 'stale')
  await expect(page.getByText('Showing last-known recognition data.')).toBeVisible()
  await shot(page, 'badges-1400-light-stale')

  await setScenario(page, 'default')
})

// ---------------------------------------------------------------------------
// Implemented behaviour.
// ---------------------------------------------------------------------------

test('rules — simulation and second approver gate', async () => {
  await open(page, '/recognition/rules', 'Rules')
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/simulation of the staged values is required/i)
  expect(body).toMatch(/second administrator must publish/i)
  await shot(page, 'rules-1400-light-gates')
})

test('rule editor — weekly cap and anti-abuse explanation', async () => {
  await open(page, '/recognition/rules', 'Rules')
  await page.waitForTimeout(1200)
  const edit = page.getByRole('link', { name: /open|edit/i }).first()
  const href = await edit.getAttribute('href')
  expect(href, 'rule row exposes an editor link').toBeTruthy()
  await page.goto(href!, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/recognition\/rules\/[^/]+/, { timeout: 30_000 })
  await expect(page.getByText(/Edits are staged against live/i)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel('Weekly cap')).toHaveValue(/per reader per week|no cap/i)
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/caps? (at|come) from the event contract|capped|suppressed, not failed/i)
  await shot(page, 'rule-editor-1400-light-default')
})

test('badges — bilingual publish gate and badge locking copy', async () => {
  await open(page, '/recognition/badges', 'Badge catalogue')
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/every badge needs an EN and SW name/i)
  expect(body).toMatch(/EN \+ SW|EN only/)
  expect(body).toMatch(/must itself be published/i)
  await shot(page, 'badges-1400-light-gates')
})

test('seasons — two-person close and snapshot copy', async () => {
  await open(page, '/recognition/seasons', 'Seasons')
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/two-person action/i)
  expect(body).toMatch(/second administrator/i)
  expect(body).toMatch(/read-only snapshot/i)
  await shot(page, 'seasons-1400-light-gates')
})

test('awards — grouping by cause, idempotent retry, manual credit', async () => {
  await open(page, '/recognition/awards', 'Awards ledger')
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/cause explained once per group/i)
  expect(body).toMatch(/retrying is not a second award/i)
  expect(body).toMatch(/manual credit/i)
  await shot(page, 'awards-1400-light-gates')
})

test('moderation — decisions require a reason and are audited', async () => {
  await open(page, '/recognition/reports', 'Names & reports')
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/decisions require a reason/i)
  expect(body).toMatch(/reporter identity is never disclosed/i)
  await shot(page, 'reports-1400-light-gates')
})

test('backfill — frozen parameters and approver separation', async () => {
  await open(page, '/recognition/backfill', 'Backfill')
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/parameters are frozen into a batch/i)
  expect(body).toMatch(/second approver required/i)
  expect(body).toMatch(/approver sees the same rows/i)
  await shot(page, 'backfill-1400-light-gates')
})

test('kill switches — typed OFF confirmation and dependency summary', async () => {
  await open(page, '/recognition/kill-switches', 'Kill switches')
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/typed confirmation/i)
  expect(body).toMatch(/dependency summary/i)
  await shot(page, 'kill-switches-1400-light-gates')
})

// ---------------------------------------------------------------------------
// Role gating.
// ---------------------------------------------------------------------------

test('role gating — content editor and reader are redirected to no-access', async () => {
  for (const [email, file] of [
    ['editor@example.com', 'content-editor'],
    ['alice@example.com', 'reader'],
  ] as const) {
    const roleContext = await browser.newContext({ viewport: { width: 1400, height: 900 } })
    const rolePage = await roleContext.newPage()
    await login(rolePage, email, SEEDED_PASSWORD)
    await rolePage.goto('/recognition', { waitUntil: 'domcontentloaded' })
    await expect(rolePage).toHaveURL(/\/no-access/, { timeout: 30_000 })
    await shot(rolePage, `role-gating-${file}-no-access`)
    await roleContext.close()
  }
})

test('role gating — moderator reads but sees no authoring controls', async () => {
  const roleContext = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const moderator = await roleContext.newPage()
  await login(moderator, 'moderator@example.com', SEEDED_PASSWORD)
  await open(moderator, '/recognition', 'Recognition overview')
  await shot(moderator, 'role-gating-moderator-overview')
  await open(moderator, '/recognition/rules', 'Rules')
  const authoring = await moderator
    .getByRole('button', { name: /create rule|new rule/i })
    .count()
  const authoringLinks = await moderator
    .getByRole('link', { name: /create rule|new rule/i })
    .count()
  expect(authoring + authoringLinks, 'moderator must not see rule authoring controls').toBe(0)
  await shot(moderator, 'role-gating-moderator-rules')
  await roleContext.close()
})
