/**
 * Ticket #372 — species admin, live verification.
 *
 * Runs the real admin app on a disposable seed against the frozen contracts
 * mock. Screenshots land in the mobile repo's evidence tree; assertions cover
 * the implemented behaviours the prototype's carry-forwards require.
 *
 *   VERIFY_MODE=live VERIFY_SEED_ID=verify-372-admin \
 *   VERIFY_BASE_URL=http://127.0.0.1:3213 VERIFY_ALLOW_PORT=1 \
 *   VERIFY_ADMIN_PASSWORD=password EVIDENCE_DIR=... \
 *     bunx playwright test -c playwright.verify.config.ts admin-species
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { assertDisposableTarget } from '../helpers/seed'

const BASE =
  process.env.VERIFY_BASE_URL ?? `http://127.0.0.1:${process.env.VERIFY_PORT ?? '3210'}`
const PASS = process.env.VERIFY_ADMIN_PASSWORD
const EVIDENCE = process.env.EVIDENCE_DIR

const SCREENS = [
  ['overview', '/programme/species'],
  ['catalogue', '/programme/species/catalogue'],
  ['editor', '/programme/species/panthera-leo'],
  ['languages', '/programme/species/panthera-leo/languages'],
  ['translation', '/programme/species/translation'],
  ['sources', '/programme/species/sources'],
  ['readiness', '/programme/species/readiness?species=panthera-leo'],
  ['audit', '/programme/species/audit'],
] as const

const USERS = {
  admin: 'verify-admin@example.test',
  editor: 'verify-editor@example.test',
  translator: 'verify-translator@example.test',
  reviewer: 'verify-reviewer@example.test',
} as const

async function login(page: Page, email: string) {
  if (!PASS) {
    throw new Error(
      'VERIFY_ADMIN_PASSWORD is required for live verification; set it in the shell, never in a spec.',
    )
  }
  const response = await page.request.post(`${BASE}/api/auth/sign-in/email`, {
    data: { email, password: PASS },
    headers: { Origin: BASE },
  })
  expect(response.status(), `sign in ${email}`).toBe(200)
}

async function fillStable(locator: import('@playwright/test').Locator, value: string) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await locator.fill(value)
    await locator.page().waitForTimeout(250)
    if ((await locator.inputValue()) === value) {
      await locator.page().waitForTimeout(500)
      if ((await locator.inputValue()) === value) return
    }
  }
  throw new Error(`Could not keep "${value}" in the field; the page did not finish hydrating.`)
}

async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 20_000 })
  // The species screens fetch details client-side after the shell renders.
  await page.waitForTimeout(1800)
}

function shotPath(screen: string, name: string) {
  if (!EVIDENCE) return undefined
  const dir = path.join(EVIDENCE, 'admin', screen)
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${name}.png`)
}

async function capture(page: Page, screen: string, viewport: string, state: string) {
  const file = shotPath(screen, `${viewport}-${state}`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

async function setDataState(page: Page, label: string) {
  await page.getByLabel('Data state').selectOption({ label })
  await page.waitForTimeout(600)
}

test.describe('species admin', () => {
  test.skip(process.env.VERIFY_MODE !== 'live', 'live admin run only')

  test.beforeAll(() => {
    assertDisposableTarget()
  })

  async function captureScreens(page: Page, screens: readonly (readonly [string, string])[]) {
    await page.goto('/login')
    await login(page, USERS.admin)

    for (const [screen, route] of screens) {
      await page.setViewportSize({ width: 1400, height: 1000 })
      await page.emulateMedia({ colorScheme: 'light' })
      await page.goto(`${BASE}${route}`)
      await settle(page)
      await expect(page.locator('body')).not.toContainText('Failed to fetch')
      await capture(page, screen, '1400', 'light-default')

      for (const width of [1180, 900]) {
        await page.setViewportSize({ width, height: 1000 })
        await page.waitForTimeout(350)
        await capture(page, screen, String(width), 'light-default')
      }

      await page.setViewportSize({ width: 1400, height: 1000 })
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.waitForTimeout(350)
      await capture(page, screen, '1400', 'dark-default')
      await page.emulateMedia({ colorScheme: 'light' })

      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
      await page.waitForTimeout(350)
      await capture(page, screen, '200', 'large-text')
      await page.evaluate(() => {
        document.documentElement.style.fontSize = ''
      })

      // Data states. Every species screen has the shared selector.
      for (const [state, label] of [
        ['empty', 'Empty state'],
        ['error', 'Error state'],
        ['stale', 'Stale snapshot'],
      ] as const) {
        await setDataState(page, label)
        await capture(page, screen, '1400', `${state}`)
        await setDataState(page, 'Default data')
      }
    }
  }

  test('captures overview, catalogue, editor and languages across the matrix', async ({ page }) => {
    test.setTimeout(240_000)
    await captureScreens(page, SCREENS.slice(0, 4))
  })

  test('captures translation, sources, readiness and audit across the matrix', async ({ page }) => {
    test.setTimeout(240_000)
    await captureScreens(page, SCREENS.slice(4))
  })

  test('catalogue search, selection and bulk assignment', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/login')
    await login(page, USERS.editor)
    await page.goto(`${BASE}/programme/species/catalogue`)
    await settle(page)
    await expect(page.getByRole('heading', { name: 'Species catalogue' })).toBeVisible()
    await expect(page.getByText('3 of 3 loaded')).toBeVisible()

    await fillStable(page.getByPlaceholder('Search common or scientific name'), 'elephant')
    await expect(page.getByText('1 of 3 loaded')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: 'African elephant', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Lion', exact: true })).toHaveCount(0)
    await capture(page, 'catalogue', '1400', 'filtered-search')

    await fillStable(page.getByPlaceholder('Search common or scientific name'), '')
    await page.getByRole('checkbox', { name: 'Select every species in this view' }).check()
    await expect(page.getByText('3 selected')).toBeVisible()
    await page.getByRole('button', { name: /Assign reviewer/ }).click()
    await expect(page.getByRole('heading', { name: 'Assign language tasks' })).toBeVisible()
    await fillStable(page.locator('#bulk-assignee'), 'language-reviewer-2')
    await capture(page, 'catalogue', '1400', 'bulk-assign-dialog')
    await page.getByRole('button', { name: 'Assign', exact: true }).click()
    await expect(page.getByText(/assigned to language-reviewer-2/)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('link', { name: 'Audit', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible()
    await expect(page.getByText(/language-reviewer-2/).first()).toBeVisible()
  })

  // Cursor traversal is covered by src/lib/species/__tests__/api.test.ts: the
  // fixture has three rows and one page, so a browser run cannot observe a
  // second cursor without inventing product data. Recorded as a fixture gap.

  test('stale is derived and blocks publish', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/login')
    await login(page, USERS.admin)
    await page.goto(`${BASE}/programme/species/translation`)
    await settle(page)
    await setDataState(page, 'Stale snapshot')
    await expect(page.locator('body')).toContainText(/stale/i)

    await page.goto(`${BASE}/programme/species/readiness?species=panthera-leo`)
    await settle(page)
    await setDataState(page, 'Stale snapshot')
    const publish = page.getByRole('button', { name: 'Publish', exact: true })
    await expect(publish).toBeDisabled()
    await capture(page, 'readiness', '1400', 'stale-publish-blocked')
  })

  test('rights withdrawal names blast radius; non-revocable sources cannot be targeted', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/login')
    await login(page, USERS.admin)
    await page.goto(`${BASE}/programme/species/sources`)
    await settle(page)
    await expect(page.getByText('1 sources')).toBeVisible()
    // GBIF is non-revocable: no withdraw action on its row.
    await expect(page.getByRole('button', { name: /Withdraw GBIF/ })).toHaveCount(0)
    await expect(page.getByText('Not revocable').first()).toBeVisible()

    await page.getByRole('button', { name: /^Withdraw$/ }).first().click()
    await expect(page.getByText(/loaded species affected/)).toBeVisible()
    await expect(page.getByText(/permitted use|replacement|blast/i).first()).toBeVisible()
    await capture(page, 'sources', '1400', 'rights-withdraw-blast-radius')
    await page.getByRole('button', { name: /cancel/i }).first().click()
  })

  test('readiness blockers link to records; second review is actionable; publish is gated', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/login')
    await login(page, USERS.reviewer)
    await page.goto(`${BASE}/programme/species/readiness?species=panthera-leo`)
    await settle(page)
    await expect(page.getByText(/\d+ blockers?/)).toBeVisible()
    await expect(page.getByText(/Record:/).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Open|Fix|Add|Review/ }).first()).toBeVisible()
    await expect(page.getByText(/Publish is limited/)).toBeVisible()
    await page.getByRole('button', { name: /Record second review/ }).click()
    await expect(page.getByRole('heading', { name: /second review/i })).toBeVisible()
    await capture(page, 'readiness', '1400', 'second-review-dialog')
    await page.getByRole('button', { name: /cancel/i }).first().click()
  })

  test('audit filters and CSV export use the same filter', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/login')
    await login(page, USERS.admin)
    await page.goto(`${BASE}/programme/species/audit`)
    await settle(page)
    await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible()
    await page.getByLabel('Filter by category').selectOption({ label: 'Rights' })
    await page.waitForTimeout(400)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export CSV/ }).click()
    const download = await downloadPromise
    const csvPath = await download.path()
    const csv = fs.readFileSync(csvPath, 'utf8')
    expect(csv.split('\n').filter(Boolean).length).toBeLessThanOrEqual(3)
    expect(csv.toLowerCase()).toContain('rights')
    await capture(page, 'audit', '1400', 'filtered-csv')
  })

  test('editor dirty guard keeps the draft on cancel', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/login')
    await login(page, USERS.editor)
    await page.goto(`${BASE}/programme/species/panthera-leo`)
    await settle(page)
    // FormField is rendered without an id on this screen, so the label is not
    // associated. Target the first field and record the a11y finding in the critique.
    const field = page.locator('input').first()
    await fillStable(field, 'Panthera leo edited')
    await expect(page.getByText('Unsaved changes').first()).toBeVisible()
    await page.getByRole('link', { name: 'Audit' }).click()
    await expect(page.getByRole('heading', { name: 'Discard unsaved changes?' })).toBeVisible()
    await page.getByRole('button', { name: 'Keep editing' }).click()
    await expect(field).toHaveValue('Panthera leo edited')
    await capture(page, 'editor', '1400', 'dirty-guard')
  })

  test('role gating: translator and reviewer see their own actions only', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/login')
    await login(page, USERS.translator)
    await page.goto(`${BASE}/programme/species/sources`)
    await settle(page)
    await capture(page, 'sources', '1400', 'role-translator')
    await expect(page.getByRole('button', { name: /^Withdraw$/ })).toHaveCount(0)

    await page.context().clearCookies()
    await page.goto('/login')
    await login(page, USERS.reviewer)
    await page.goto(`${BASE}/programme/species/readiness?species=panthera-leo`)
    await settle(page)
    await capture(page, 'readiness', '1400', 'role-reviewer')
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Record second review/ })).toBeVisible()
  })
})
