/**
 * Ticket #372 recapture: the first matrix run photographed the client-side
 * detail fetch mid-flight (overview showed a 0 sample, readiness showed its
 * loading panel). These captures wait for the derived content before the shot.
 *
 * This is an evidence-capture run, not a parity gate: it only runs in live mode
 * with EVIDENCE_DIR set, because the screenshots belong in the mobile repo's
 * evidence tree and never in this one.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { assertDisposableTarget } from '../helpers/seed'

const BASE =
  process.env.VERIFY_BASE_URL ?? `http://127.0.0.1:${process.env.VERIFY_PORT ?? '3210'}`
const EVIDENCE = process.env.EVIDENCE_DIR ?? ''
const PASS = process.env.VERIFY_ADMIN_PASSWORD

async function login(page: Page, email = 'verify-admin@example.test') {
  if (!PASS) {
    throw new Error(
      'VERIFY_ADMIN_PASSWORD is required for live verification; set it in the shell, never in a spec.',
    )
  }
  const response = await page.request.post(`${BASE}/api/auth/sign-in/email`, {
    data: { email, password: PASS },
    headers: { Origin: BASE },
  })
  expect(response.status()).toBe(200)
  const cookies = await page.context().cookies()
  expect(cookies.some((cookie) => cookie.name === 'better-auth.session_token')).toBe(true)
}

async function shot(page: Page, screen: string, name: string) {
  const dir = path.join(EVIDENCE, 'admin', screen)
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true })
}

async function matrix(page: Page, screen: string, route: string, ready: string | RegExp) {
  await page.setViewportSize({ width: 1400, height: 1000 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto(`${BASE}${route}`)
  await expect(page.getByText(ready).first()).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(600)
  await shot(page, screen, '1400-light-default')
  for (const width of [1180, 900]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.waitForTimeout(400)
    await shot(page, screen, `${width}-light-default`)
  }
  await page.setViewportSize({ width: 1400, height: 1000 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForTimeout(400)
  await shot(page, screen, '1400-dark-default')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await page.waitForTimeout(400)
  await shot(page, screen, '200-large-text')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
}

test.describe('species recapture', () => {
  test.skip(process.env.VERIFY_MODE !== 'live', 'live admin run only')
  test.skip(!EVIDENCE, 'set EVIDENCE_DIR to capture evidence')

  test.beforeAll(() => {
    assertDisposableTarget()
  })

  test('recaptures the screens that need the derived data loaded', async ({ page }) => {
    test.setTimeout(180_000)
    await login(page)

    await matrix(page, 'overview', '/programme/species', 'Sample of 3 species')
    await matrix(page, 'translation', '/programme/species/translation', '4 shown')
    await matrix(
      page,
      'readiness',
      '/programme/species/readiness?species=panthera-leo',
      '3 blockers',
    )
    await matrix(page, 'sources', '/programme/species/sources', '3 loaded species')
  })
})
