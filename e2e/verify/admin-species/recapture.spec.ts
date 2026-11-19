/**
 * Ticket #372 recapture: the first matrix run photographed the client-side
 * detail fetch mid-flight (overview showed a 0 sample, readiness showed its
 * loading panel). These captures wait for the derived content before the shot.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:3213'
const EVIDENCE = process.env.EVIDENCE_DIR ?? ''
const PASS = process.env.VERIFY_ADMIN_PASSWORD ?? 'password'

async function login(page: Page, email = 'verify-admin@example.test') {
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

test('recaptures the screens that need the derived data loaded', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)

  await matrix(page, 'overview', '/programme/species', 'Sample of 3 species')
  await matrix(page, 'translation', '/programme/species/translation', '4 shown')
  await matrix(page, 'readiness', '/programme/species/readiness?species=panthera-leo', '3 blockers')
  await matrix(page, 'sources', '/programme/species/sources', '3 loaded species')

})
