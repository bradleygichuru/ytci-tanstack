/**
 * MICE admin behaviour captures — ticket #364.
 *
 * Captures the states the matrix cannot show by default: agenda conflict,
 * waitlist offer/promotion and the check-in override dialog. Two fixtures are
 * injected at the network boundary because the shared mock is read-only.
 *
 *   VERIFY_BASE_URL=http://127.0.0.1:3217 \
 *   VERIFY_OUT=../ytci-mobile/docs/verification/evidence/364/admin \
 *   node scripts/verify/capture-mice-behaviour-364.mjs
 */
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const BASE = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:3217'
const OUT = process.env.VERIFY_OUT ?? '/home/brad/code/ytci-mobile-verify364/docs/verification/evidence/364/admin'

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
const page = await context.newPage()

const res = await context.request.post(`${BASE}/api/auth/sign-in/email`, {
  data: { email: 'grace@example.com', password: 'password' },
})
if (!res.ok()) throw new Error(`sign-in failed: ${res.status()}`)

async function settle() {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
  const loading = page.getByText(/^(Loading|Fetching)/)
  const deadline = Date.now() + 30_000
  while ((await loading.count()) > 0 && Date.now() < deadline) {
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(700)
}

async function shot(name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true })
  console.log('captured', name)
}

// Agenda conflict.
await page.route('**/v1/admin/events/*', async (route) => {
  const { pathname } = new URL(route.request().url())
  if (route.request().method() !== 'GET' || !/^\/v1\/admin\/events\/[^/]+$/.test(pathname)) {
    return route.continue()
  }
  const response = await route.fetch()
  const body = await response.json()
  body.agenda = [
    ...(body.agenda ?? []),
    {
      id: 'verify-conflict-session',
      day: '2026-12-05',
      startsAt: '2026-12-05T09:30:00+03:00',
      endsAt: '2026-12-05T10:30:00+03:00',
      title: 'Overlap check',
      room: 'Tsavo Ballroom',
      speakers: [],
    },
  ]
  await route.fulfill({ response, json: body })
})
await page.goto(`${BASE}/programme/events/agenda`, { waitUntil: 'domcontentloaded' })
await settle()
await shot('behaviour-agenda-conflict.1400')
await page.unroute('**/v1/admin/events/*')

// Waitlist offer and promotion.
await page.route('**/v1/admin/events/*/registrations*', async (route) => {
  const response = await route.fetch()
  const body = await response.json()
  const confirmed = body.items?.[0]
  if (confirmed) {
    body.items = [
      ...body.items,
      {
        ...confirmed,
        id: 'verify-waitlisted-registration',
        status: 'waitlisted',
        waitlistPosition: 1,
        ticket: null,
        checkIn: null,
        attendee: { ...confirmed.attendee, displayName: 'Waitlist Wendy' },
      },
    ]
  }
  await route.fulfill({ response, json: body })
})
await page.goto(`${BASE}/programme/events/registrations`, { waitUntil: 'domcontentloaded' })
await settle()
await shot('behaviour-waitlist-offer.1400')
await page.getByRole('button', { name: /^Send offer$/ }).click()
await page.waitForTimeout(800)
await shot('behaviour-waitlist-offered.1400')
await page.getByRole('button', { name: 'Accept offer' }).click()
await page.waitForTimeout(1000)
await shot('behaviour-waitlist-promoted.1400')
await page.unroute('**/v1/admin/events/*/registrations*')

// Check-in override dialog.
await page.goto(`${BASE}/programme/events/check-in`, { waitUntil: 'domcontentloaded' })
await settle()
await page.getByLabel('Search name or ticket code').pressSequentially('Demo', { delay: 20 })
await page.getByRole('button', { name: /Undo check-in/ }).first().click()
await page.getByRole('button', { name: /Override entry/ }).click()
await page.waitForTimeout(700)
await shot('behaviour-checkin-override.1400')

await browser.close()
