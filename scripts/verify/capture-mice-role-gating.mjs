import { chromium } from '@playwright/test'

const BASE = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:3217'
const OUT = process.env.VERIFY_OUT ?? '/tmp/opencode/evidence-364/admin'

const browser = await chromium.launch()

async function signIn(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const e = page.locator('input[type=email]').first()
  const p = page.locator('input[type=password]').first()
  await e.click()
  await e.pressSequentially(email, { delay: 10 })
  await p.click()
  await p.pressSequentially('password', { delay: 10 })
  await page.getByRole('button', { name: /^Sign In$/ }).last().click()
  await page.waitForTimeout(6000)
}

for (const [name, email] of [
  ['moderator', 'moderator@example.com'],
  ['reader', 'alice@example.com'],
]) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const page = await context.newPage()
  await signIn(page, email)
  await page.goto(`${BASE}/programme/events`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(4000)
  await page
    .getByText('Great Lakes Tourism Forum 2026', { exact: false })
    .first()
    .waitFor({ timeout: 12_000 })
    .catch(() => {})
  await page.waitForTimeout(800)
  console.log(name, '->', page.url())
  await page.screenshot({ path: `${OUT}/role-gating.${name}.1400.png`, fullPage: true })
  await context.close()
}

await browser.close()
