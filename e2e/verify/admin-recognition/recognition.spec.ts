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

// This suite signs into the real admin app against a disposable seed. The
// static fixture harness has no auth or database, so skip it there instead of
// failing every run that is only exercising the smoke fixture.
test.skip(process.env.VERIFY_MODE !== 'live', 'Recognition verification is live-mode only.')

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

// #390 regression: destructive retraction is reserved for the row menu and
// confirmation, and a retracted row keeps an explicit restore path.
test('leaderboard — retraction sits behind a row menu and restore is reachable', async () => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await open(page, '/recognition/leaderboard', 'Leaderboard')
  await setTheme(page, 'light')
  await page.waitForTimeout(800)

  const table = page.locator('table').first()
  await expect(table.getByRole('button', { name: /^retract$/i })).toHaveCount(0)
  const manage = table.getByRole('button', { name: /^manage /i })
  await expect(manage.first()).toBeVisible()

  await manage.first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/^Retract .+\?$/)).toBeVisible({ timeout: 15_000 })
  await dialog
    .getByLabel(/reason/i)
    .pressSequentially('Verification retraction with evidence.', { delay: 5 })
  await dialog.getByRole('button', { name: /^retract entry$/i }).click()

  await expect(table.getByText(/verification retraction with evidence/i)).toBeVisible({ timeout: 15_000 })
  await shot(page, 'leaderboard-1400-light-retracted')

  const restore = table.getByRole('button', { name: /^restore /i })
  await restore.first().click()
  await expect(table.getByText(/verification retraction with evidence/i)).toHaveCount(0, {
    timeout: 15_000,
  })
  await shot(page, 'leaderboard-1400-light-restored')
})

test('awards — dark theme and 900 width', async () => {  await open(page, '/recognition/awards', 'Awards ledger')
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

// #59 regression: the fourth KPI value ("Suppressed") is a single unbreakable
// word. At 200 % text it forced its grid track wider than the page, which is
// the 25 px document overflow. Every KPI value must stay inside its card and
// every card inside the viewport.
test('overview — KPI values stay inside their cards at 200% text', async () => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await open(page, '/recognition', 'Recognition overview')
  await page.addStyleTag({ content: 'html { font-size: 32px !important; }' })
  await page.waitForTimeout(300)

  const overflows = await page.locator('[data-slot="stat-card"]').evaluateAll((cards) =>
    cards.map((card) => {
      const value = card.querySelector('[data-slot="stat-card-value"]')
      if (!value) return { label: card.textContent ?? '', overflow: Number.POSITIVE_INFINITY }
      const cardBox = card.getBoundingClientRect()
      const valueBox = value.getBoundingClientRect()
      return {
        label: value.textContent ?? '',
        overflow: Math.max(
          value.scrollWidth - value.clientWidth,
          Math.round(valueBox.right - cardBox.right),
          Math.round(cardBox.right - document.documentElement.clientWidth),
        ),
      }
    })
  )

  expect(overflows.length).toBeGreaterThan(0)
  for (const entry of overflows) {
    expect(entry.overflow, `KPI "${entry.label}" overflows its card`).toBeLessThanOrEqual(1)
  }

  await page.addStyleTag({ content: 'html { font-size: 16px !important; }' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
})

// #389 regression: the 200 % plate must fold the sidebar to the icon rail and
// keep the section nav on one scrollable line instead of four wrapped rows.
test('overview — 200% text collapses the sidebar and keeps the nav on one line', async () => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await open(page, '/recognition', 'Recognition overview')
  await page.addStyleTag({ content: 'html { font-size: 32px !important; }' })
  await page.waitForTimeout(2000)

  const gap = await page
    .locator('[data-slot="sidebar-gap"]')
    .first()
    .evaluate((el) => el.getBoundingClientRect().width)
  expect(gap, 'sidebar rail width at 200% text').toBeLessThanOrEqual(90)

  const nav = page.getByRole('navigation', { name: 'Recognition sections' })
  const navBox = await nav.evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    overflow: el.scrollHeight - el.clientHeight,
  }))
  expect(navBox.height, 'section nav stays one row at 200% text').toBeLessThan(120)
  expect(navBox.overflow, 'section nav does not wrap into stacked rows').toBeLessThanOrEqual(2)

  await shot(page, 'overview-1400-light-200text-rail')
  await page.addStyleTag({ content: 'html { font-size: 16px !important; }' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
})

// #389 regression: every shell link that opens a switch or audit surface must
// clear 4.5:1 on the dark surface (WCAG 1.4.3).
test('overview — shell links clear 4.5:1 in dark mode', async () => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await open(page, '/recognition', 'Recognition overview')
  await setTheme(page, 'dark')

  const ratios = await page.evaluate(() => {
    const parse = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/)
      if (!match) return null
      const [r, g, b, a = '1'] = match[1].split(',').map((part) => part.trim())
      return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) }
    }
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const channel = (value: number) => {
        const s = value / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    const background = (start: Element | null) => {
      let node = start
      while (node) {
        const parsed = parse(getComputedStyle(node).backgroundColor)
        if (parsed && parsed.a > 0.9) return parsed
        node = node.parentElement
      }
      return { r: 15, g: 26, b: 30, a: 1 }
    }
    const ratio = (el: Element) => {
      const fg = parse(getComputedStyle(el).color)
      if (!fg) return 0
      const bg = background(el)
      const light = Math.max(luminance(fg), luminance(bg))
      const dark = Math.min(luminance(fg), luminance(bg))
      return (light + 0.05) / (dark + 0.05)
    }

    const links = Array.from(document.querySelectorAll('main a')).filter((el) => {
      const label = (el.textContent ?? '').trim()
      return label === 'Manage' || label === 'All' || label.endsWith('Open →')
    })
    return links.map((el) => ({
      label: (el.textContent ?? '').trim(),
      ratio: ratio(el),
    }))
  })

  // Contract-only data has fewer rows than the old sample overlay, so assert on
  // the links that are present rather than a sample-sized count.
  expect(ratios.length, 'shell links are present').toBeGreaterThanOrEqual(1)
  for (const entry of ratios) {
    expect(entry.ratio, `${entry.label} contrast in dark mode`).toBeGreaterThanOrEqual(4.5)
  }

  await shot(page, 'overview-1400-dark-links')
  await setTheme(page, 'light')
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
  await expect(page.getByText(/frozen contract has no rule-update operation/i)).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByLabel('Weekly cap')).toHaveValue(/per reader per week|no cap/i)
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/caps? (at|come) from the event contract|capped|suppressed, not failed/i)
  await shot(page, 'rule-editor-1400-light-default')
})

// #391 regression: provenance copy may only claim sample data when every read
// fell back, and the badge catalogue carries artwork plus an unpublish warning.
test('overview — provenance banner matches the footer source marker', async () => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await open(page, '/recognition', 'Recognition overview')
  await expect(page.getByText('Contract API', { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  })
  const body = await page.locator('main').innerText()
  expect(body).toMatch(/Contract API/)
  expect(body).not.toMatch(/Sample data is showing/)
  expect(body).not.toMatch(/:8099|:8109|localhost:/)
  await shot(page, 'overview-1400-light-provenance')
})

test('badges — artwork preview and unpublish warning', async () => {
  await open(page, '/recognition/badges', 'Badge catalogue')
  await expect(page.getByTestId('badge-art').first()).toBeVisible()
  await expect(page.getByText('Unpublish warning').first()).toBeVisible({ timeout: 15_000 })
  await shot(page, 'badges-1400-light-art')

  const edit = page.getByRole('button', { name: /^edit$/i }).first()
  await edit.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByTestId('badge-preview')).toBeVisible({ timeout: 15_000 })
  await expect(dialog.getByText(/artwork preview/i)).toBeVisible()
  await shot(page, 'badges-1400-light-preview')
  await dialog.getByRole('button', { name: /^cancel$/i }).click()
})

test('badges — bilingual publish gate and badge locking copy', async () => {  await open(page, '/recognition/badges', 'Badge catalogue')
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
// Write paths (engine-on fixture override).
// ---------------------------------------------------------------------------

test('moderation — a decision needs a reason and is recorded', async () => {
  test.skip(!process.env.VERIFY_WRITE_PATHS, 'needs the engine-on fixture override')
  await open(page, '/recognition/reports', 'Names & reports')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^decide$/i }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Decide this case')).toBeVisible({ timeout: 15_000 })
  const record = dialog.getByRole('button', { name: /record decision/i })
  await expect(record, 'reason gate is enforced').toBeDisabled()
  await dialog.getByLabel('Decision reason').pressSequentially('Verified against the scan evidence.', {
    delay: 5,
  })
  await expect(record).toBeEnabled()
  await record.click()
  await expect(page.getByText(/decision recorded|recorded/i).first()).toBeVisible({ timeout: 20_000 })
  await shot(page, 'reports-1400-light-decision-recorded')
})

// Contracts 1.0.0 has no awards read, so a reachable API clears the demo
// awards and the product correctly disables "Retry failed" (there is nothing
// to retry). Accepted as a documented release gap rather than a UI defect;
// re-enable once an awards ledger endpoint exists.
test.fixme('awards — bulk retry asks for scope and never duplicates XP', async () => {
  test.skip(!process.env.VERIFY_WRITE_PATHS, 'needs the engine-on fixture override')
  await open(page, '/recognition/awards', 'Awards ledger')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /retry failed/i }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/Retry \d+ failed award/i)).toBeVisible({ timeout: 15_000 })
  await shot(page, 'awards-1400-light-retry-preview')
  await dialog.getByRole('button', { name: /retry these awards/i }).click()
  await expect(page.getByText(/XP was not duplicated|re-driven/i).first()).toBeVisible({
    timeout: 20_000,
  })
  await shot(page, 'awards-1400-light-retry-done')
})

test('seasons — closing needs a reason and a typed confirmation', async () => {
  test.skip(!process.env.VERIFY_WRITE_PATHS, 'needs the engine-on fixture override')
  await open(page, '/recognition/seasons', 'Seasons')
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /close season/i }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/^Close .+\?$/)).toBeVisible({ timeout: 15_000 })
  await expect(dialog.getByText(/type .* to confirm/i)).toBeVisible()
  const confirm = dialog.getByRole('button', { name: /close and snapshot/i })
  await expect(confirm, 'typed confirmation gates the close').toBeDisabled()
  await shot(page, 'seasons-1400-light-close-dialog')
  await dialog.getByRole('button', { name: /^cancel$/i }).click()
})

// ---------------------------------------------------------------------------
// Role gating.
// ---------------------------------------------------------------------------

test('role gating — content editor reads, reader is redirected to no-access', async () => {
  // `content_editor` holds `recognition.read` and, since the widened
  // `platform.admin_access` grant (#65 / ytci-mobile#407), reaches the shell.
  const editorContext = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const editor = await editorContext.newPage()
  await login(editor, 'editor@example.com', SEEDED_PASSWORD)
  await open(editor, '/recognition', 'Recognition overview')
  await shot(editor, 'role-gating-content-editor-overview')
  await editorContext.close()

  // A reader still has no admin access and no recognition permission.
  const readerContext = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const reader = await readerContext.newPage()
  await login(reader, 'alice@example.com', SEEDED_PASSWORD)
  await reader.goto('/recognition', { waitUntil: 'domcontentloaded' })
  await expect(reader).toHaveURL(/\/no-access/, { timeout: 30_000 })
  await shot(reader, 'role-gating-reader-no-access')
  await readerContext.close()
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
