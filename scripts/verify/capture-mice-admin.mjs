/**
 * MICE admin capture — ticket #364.
 *
 * Runs against the implemented admin surface on a verification-owned port,
 * logged in as a disposable seeded administrator. Captures the parity matrix:
 * 1400 / 1180 / 900, dark, 200% text, default/empty/error/stale, plus role
 * gating. It is evidence tooling, not a product change.
 *
 *   VERIFY_BASE_URL=http://127.0.0.1:3217 \
 *   VERIFY_ADMIN_EMAIL=grace@example.com VERIFY_ADMIN_PASSWORD=password \
 *   VERIFY_OUT=/path/to/docs/evidence/364/admin \
 *   node scripts/verify/capture-mice-admin.mjs
 */
import { chromium } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const BASE = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:3217'
const EMAIL = process.env.VERIFY_ADMIN_EMAIL ?? 'grace@example.com'
const PASSWORD = process.env.VERIFY_ADMIN_PASSWORD ?? 'password'
const OUT = process.env.VERIFY_OUT ?? '/tmp/opencode/evidence-364/admin'
const EVENT_ID = process.env.VERIFY_EVENT_ID ?? '11111111-1111-4111-8111-111111111111'

const SCREENS = [
  ['overview', '/programme/events'],
  ['events', '/programme/events/list'],
  ['event-editor', `/programme/events/${EVENT_ID}`],
  ['venues', '/programme/events/venues'],
  ['agenda-speakers', '/programme/events/agenda'],
  ['registrations-waitlist', '/programme/events/registrations'],
  ['check-in', '/programme/events/check-in'],
  ['organisers', '/programme/events/organisers'],
  ['reports', '/programme/events/reports'],
  ['review-queue', '/programme/events/review'],
  ['audit', '/programme/events/audit'],
]

const SIZES = [
  ['1400', { width: 1400, height: 1000 }],
  ['1180', { width: 1180, height: 900 }],
  ['900', { width: 900, height: 1000 }],
]

const manifest = []

async function signIn(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const emailInput = page.locator('input[type=email]').first()
  const passwordInput = page.locator('input[type=password]').first()
  await emailInput.click()
  await emailInput.pressSequentially(email, { delay: 10 })
  await passwordInput.click()
  await passwordInput.pressSequentially(password, { delay: 10 })
  await page.getByRole('button', { name: /^Sign In$/ }).last().click()
  await page
    .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 25_000 })
    .catch(() => {})
  await page.waitForTimeout(1500)
  if (page.url().includes('/login')) {
    // One retry: the first submit can race the client hydration on a cold Vite.
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const retryEmail = page.locator('input[type=email]').first()
    const retryPassword = page.locator('input[type=password]').first()
    await retryEmail.click()
    await retryEmail.pressSequentially(email, { delay: 10 })
    await retryPassword.click()
    await retryPassword.pressSequentially(password, { delay: 10 })
    await page.getByRole('button', { name: /^Sign In$/ }).last().click()
    await page.waitForTimeout(7000)
  }
  if (page.url().includes('/login')) throw new Error(`login failed for ${email}`)
}

async function login(page) {
  await signIn(page, EMAIL, PASSWORD)
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
  // The first visit to a route compiles it on demand under Vite, so give the
  // loading state a generous window before treating the screen as ready.
  const loading = page.getByText(/^(Loading|Fetching)/)
  const deadline = Date.now() + 30_000
  while ((await loading.count()) > 0 && Date.now() < deadline) {
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(800)
}

async function shot(page, name, meta) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true })
  manifest.push({ file: `${name}.png`, ...meta })
  console.log('captured', name)
}

async function setState(page, label) {
  const trigger = page.locator('button[aria-label="Data state"]')
  if ((await trigger.count()) === 0) return false
  await trigger.first().click()
  await page.getByRole('option', { name: label, exact: true }).click()
  const loading = page.getByText(/^(Loading|Fetching)/)
  const deadline = Date.now() + 20_000
  while ((await loading.count()) > 0 && Date.now() < deadline) {
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(1000)
  return true
}

const browser = await chromium.launch()
await mkdir(OUT, { recursive: true })

const context = await browser.newContext({ viewport: SIZES[0][1] })
const page = await context.newPage()
await login(page)

const ONLY = process.env.VERIFY_ONLY?.split(',').filter(Boolean)
const SCREENS_TO_RUN = ONLY ? SCREENS.filter(([key]) => ONLY.includes(key)) : SCREENS

// Default matrix.
for (const [key, path] of SCREENS_TO_RUN) {
  await page.setViewportSize(SIZES[0][1])
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, `${key}.default.1400`, { screen: key, state: 'default', view: '1400', path })

  for (const [sizeKey, size] of SIZES.slice(1)) {
    await page.setViewportSize(size)
    await settle(page)
    await shot(page, `${key}.default.${sizeKey}`, { screen: key, state: 'default', view: sizeKey, path })
  }

  // Dark.
  await page.setViewportSize(SIZES[0][1])
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')
    document.documentElement.style.colorScheme = 'dark'
  })
  await page.waitForTimeout(700)
  await shot(page, `${key}.dark.1400`, { screen: key, state: 'default', view: 'dark-1400', path })

  // 200% text.
  await page.evaluate(() => document.documentElement.style.fontSize = '32px')
  await page.waitForTimeout(900)
  await shot(page, `${key}.largetext.1400`, { screen: key, state: 'default', view: 'largetext-1400', path })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
    localStorage.setItem('theme', 'light')
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    document.documentElement.style.colorScheme = 'light'
  })
  await page.waitForTimeout(500)

  // Data states at 1400.
  for (const [label, state] of [['Empty', 'empty'], ['Error', 'error'], ['Stale', 'stale']]) {
    if (!(await setState(page, label))) break
    await shot(page, `${key}.${state}.1400`, { screen: key, state, view: '1400', path })
  }
  await setState(page, 'Default').catch(() => {})
  await page.waitForTimeout(400)
}

// Role gating: moderator has no events.read and no admin access.
const gateContext = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
const gatePage = await gateContext.newPage()
await signIn(gatePage, 'moderator@example.com', 'password')
await gatePage.goto(`${BASE}/programme/events`, { waitUntil: 'domcontentloaded' })
await gatePage.waitForTimeout(2500)
await gatePage.screenshot({ path: join(OUT, 'role-gating.moderator.1400.png'), fullPage: true })
manifest.push({
  file: 'role-gating.moderator.1400.png',
  screen: 'role-gating',
  state: 'moderator',
  view: '1400',
  path: '/programme/events',
  finalUrl: gatePage.url(),
})

let allManifest = manifest
if (ONLY) {
  try {
    const previous = JSON.parse(
      await readFile(join(OUT, 'manifest.json'), 'utf8'),
    )
    const replaced = new Set(manifest.map((row) => row.file))
    allManifest = [
      ...previous.filter((row) => !replaced.has(row.file)),
      ...manifest,
    ].sort((a, b) => a.file.localeCompare(b.file))
  } catch {
    allManifest = manifest
  }
}
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(allManifest, null, 2))
console.log(`captured ${manifest.length} screenshots to ${OUT}`)
await browser.close()
