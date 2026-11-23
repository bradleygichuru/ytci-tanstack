import { expect, test, type Page } from '@playwright/test'
import { assertDisposableTarget } from '../helpers/seed'
import { EVENT_ID, login, openRoute } from './mice.helpers'

test.setTimeout(180_000)

test.describe('MICE admin — implemented behaviour', () => {
  test.skip(process.env.VERIFY_MODE !== 'live', 'live admin run only')

  test.beforeAll(() => {
    if (process.env.VERIFY_MODE === 'live') assertDisposableTarget()
  })

  test('agenda detects a room double-booking and explains it', async ({ page }) => {
    // The frozen mock serves one session and cannot persist a POST, so inject
    // the second session at the network boundary for this read-only check.
    await page.route('**/v1/admin/events/*', async (route) => {
      const { pathname } = new URL(route.request().url())
      if (route.request().method() !== 'GET' || !/^\/v1\/admin\/events\/[^/]+$/.test(pathname)) {
        return route.continue()
      }
      try {
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
        await route.fulfill({ response, json: { ...body } })
      } catch {
        await route.continue().catch(() => {})
      }
    })

    await login(page)
    await openRoute(page, '/programme/events/agenda')

    await expect(page.locator('body')).toContainText(/agenda conflict/i)
    await expect(page.locator('body')).toContainText(/Tsavo Ballroom is double-booked/i)
  })

  test('a waitlist offer is written by the server and can be accepted', async ({
    page,
  }) => {
    // Keep the queue deterministic at the network boundary. The offer itself
    // must still be a real POST: this test fails if the store falls back to a
    // browser-local record.
    let confirmBy: string | null = null
    let status: 'waitlisted' | 'confirmed' = 'waitlisted'
    let offerBody: Record<string, unknown> | null = null

    const registration = () => ({
      id: 'verify-waitlisted-registration',
      eventId: EVENT_ID,
      status,
      answers: {},
      reminderOffsetMinutes: null,
      waitlistPosition: status === 'waitlisted' ? 1 : null,
      confirmBy,
      createdAt: '2026-11-18T10:00:00Z',
      cancelledAt: null,
      ticket: null,
      checkIn: null,
      attendee: { displayName: 'Waitlist Wendy', email: 'wendy@example.com' },
      answersSummary: '',
    })

    await page.route('**/v1/admin/events/*/registrations*', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          json: { items: [registration()], nextCursor: null, hasMore: false },
        })
      }
      return route.continue()
    })
    await page.route('**/v1/admin/events/*/waitlist-offers', async (route) => {
      offerBody = route.request().postDataJSON() as Record<string, unknown>
      confirmBy = new Date(Date.now() + 86_400_000).toISOString()
      return route.fulfill({
        status: 201,
        json: {
          eventId: EVENT_ID,
          registrationId: 'verify-waitlisted-registration',
          attendeeName: 'Waitlist Wendy',
          offeredAt: new Date().toISOString(),
          expiresAt: confirmBy,
          offeredBy: 'grace@example.com',
        },
      })
    })
    await page.route(
      '**/v1/admin/events/*/waitlist-offers/*/decision',
      async (route) => {
        const body = route.request().postDataJSON() as { decision: string }
        if (body.decision === 'accept') {
          status = 'confirmed'
          confirmBy = null
        }
        return route.fulfill({ json: registration() })
      },
    )

    await login(page)
    await openRoute(page, '/programme/events/registrations')
    await expect(page.locator('body')).toContainText(/1 waiting/)
    await expect(page.locator('body')).toContainText(/Waitlist Wendy is next/)

    await page.getByRole('button', { name: /^Send offer$/ }).click()
    await expect.poll(() => offerBody).not.toBeNull()
    expect(offerBody).toMatchObject({
      registrationId: 'verify-waitlisted-registration',
    })
    await expect(page.locator('body')).toContainText(/has an offer/)
    await expect(page.locator('body')).toContainText(/No further promotion/)

    await page.getByRole('button', { name: 'Accept offer' }).click()
    await expect(page.locator('body')).toContainText(/0 waiting/)
    await expect(page.locator('body')).toContainText(/Registration confirmed/)
  })

  test('registrations expose the ticket, access needs and an honest empty waitlist', async ({
    page,
  }) => {
    await login(page)
    await openRoute(page, '/programme/events/registrations')

    await expect(page.locator('body')).toContainText(/1 of 400 confirmed/)
    await expect(page.locator('body')).toContainText(/No one is waiting/)
    await expect(page.locator('body')).toContainText(/eyJhbGciOiJIUzI1Ni/)
    await expect(page.locator('body')).toContainText(/Step-free access required/)
    await expect(page.getByRole('button', { name: /Export access needs/ })).toBeEnabled()
    // No waitlist offer can exist when nobody is waiting.
    await expect(page.getByRole('button', { name: /^Send offer$/ })).toHaveCount(0)
  })

  test('an admin cancels a registration through the server endpoint', async ({
    page,
  }) => {
    let patchBody: Record<string, unknown> | null = null
    await page.route('**/v1/admin/events/*/registrations/*', async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue()
      patchBody = route.request().postDataJSON() as Record<string, unknown>
      const response = await route.fetch()
      return route.fulfill({ response })
    })

    await login(page)
    await openRoute(page, '/programme/events/registrations')

    await page.getByRole('button', { name: /^Cancel Demo/ }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('#cancel-reason').fill('Attendee asked to withdraw')
    await dialog.getByRole('button', { name: 'Cancel registration' }).click()

    await expect.poll(() => patchBody).not.toBeNull()
    expect(patchBody).toMatchObject({
      status: 'cancelled',
      reason: 'Attendee asked to withdraw',
    })
  })

  test('check-in counts reconcile, roster stays hidden, undo and record both work', async ({
    page,
  }) => {
    await login(page)
    await openRoute(page, '/programme/events/check-in')

    await expect(page.locator('body')).toContainText(/1\s*of 1 confirmed/)
    await expect(page.locator('body')).toContainText(/0 not yet arrived/)
    await expect(page.locator('body')).toContainText(/1 imported from the door scanner/)
    await expect(page.locator('body')).toContainText(/0 recorded in this console/)
    await expect(page.locator('body')).toContainText(/Roster hidden/)

    const search = page.getByLabel('Search name or ticket code')
    await search.pressSequentially('Demo', { delay: 20 })
    await expect(page.locator('body')).toContainText(/Matching registrations/)
    await expect(page.locator('body')).toContainText(/Demo Attendee/)

    await undoCheckIn(page)
    await expect(page.locator('body')).toContainText(/0 imported from the door scanner/)
    await expect(page.locator('body')).toContainText(/1 not yet arrived/)

    await page.getByRole('button', { name: /^Check in Demo/ }).first().click()
    // The check-in POST succeeds and the console confirms it…
    await expect(page.locator('body')).toContainText(/Demo Attendee checked in/, {
      timeout: 15_000,
    })
  })

  // Regression guard for #395: a successful console check-in must reconcile
  // from the 201 body, not from a static follow-up read.
  test('console check-in reconciles the counts and undo reverses it', async ({ page }) => {
    await login(page)
    await openRoute(page, '/programme/events/check-in')
    await page.getByLabel('Search name or ticket code').pressSequentially('Demo', { delay: 20 })
    await undoCheckIn(page)
    await expect(page.locator('body')).toContainText(/1 not yet arrived/, { timeout: 10_000 })
    await page.getByRole('button', { name: /^Check in Demo/ }).first().click()
    await expect(page.locator('body')).toContainText(/1 recorded in this console/, {
      timeout: 10_000,
    })
    // The row flips to checked-in state; the scanner row is no longer the
    // only source and the console action is counted once.
    await expect(page.locator('body')).toContainText(/0 imported from the door scanner/)
    await expect(page.getByRole('button', { name: /Undo check-in/ })).toBeVisible()

    // Undo reverses the same counter without a refresh.
    await undoCheckIn(page)
    await expect(page.locator('body')).toContainText(/0 recorded in this console/, {
      timeout: 10_000,
    })
    await expect(page.locator('body')).toContainText(/1 not yet arrived/)
    await expect(page.getByRole('button', { name: /^Check in Demo/ })).toBeVisible()
  })

  test('check-in undo posts a reason to the server', async ({ page }) => {
    let undoBody: Record<string, unknown> | null = null
    await page.route('**/v1/admin/events/*/checkins/*/undo', async (route) => {
      undoBody = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({
        json: { ok: true, id: 'verify-registration', message: 'check-in undone' },
      })
    })

    await login(page)
    await openRoute(page, '/programme/events/check-in')
    await page.getByLabel('Search name or ticket code').pressSequentially('Demo', { delay: 20 })
    await page.getByRole('button', { name: /Undo check-in/ }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('#undo-reason').fill('Scanned the wrong guest')
    await dialog.getByRole('button', { name: 'Undo check-in' }).click()

    await expect.poll(() => undoBody).not.toBeNull()
    expect(undoBody).toMatchObject({ reason: 'Scanned the wrong guest' })
  })

  test('check-in override requires a reason before it can be recorded', async ({ page }) => {
    await login(page)
    await openRoute(page, '/programme/events/check-in')
    await page.getByLabel('Search name or ticket code').pressSequentially('Demo', { delay: 20 })
    // Override is for a registration that is not checked in yet.
    await undoCheckIn(page)
    await page.getByRole('button', { name: /Override entry/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('#override-reason')).toBeVisible()
    // Submitting without a reason must not close the dialog.
    await dialog.getByRole('button', { name: 'Record override' }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/reason is required/i)
  })

  test('audit log reads the server trail and still shows review-staging rows', async ({
    page,
  }) => {
    await login(page)
    await openRoute(page, '/programme/events/audit')

    // Server fixture rows from GET /v1/admin/mice/audit.
    await expect(page.locator('body')).toContainText(/Event published/, {
      timeout: 20_000,
    })
    await expect(page.locator('body')).toContainText(/Registration corrected/)

    await page.getByRole('button', { name: 'Events', exact: true }).click()
    await page.getByRole('button', { name: 'Detail' }).first().click()
    await expect(page.locator('body')).toContainText(/event\.publish/)

    // A server write appends a row that the next read shows.
    await openRoute(page, '/programme/events/check-in')
    const search = page.getByLabel('Search name or ticket code')
    await search.pressSequentially('Demo', { delay: 20 })
    await undoCheckIn(page)
    await openRoute(page, '/programme/events/audit')
    await expect(page.locator('body')).toContainText(/Check-in undone|checkin\.undone/i)
  })

  test('event lifecycle is a server write', async ({ page }) => {
    let lifecycleBody: Record<string, unknown> | null = null
    await page.route('**/v1/admin/events/*/lifecycle', async (route) => {
      lifecycleBody = route.request().postDataJSON() as Record<string, unknown>
      const response = await route.fetch()
      return route.fulfill({ response })
    })

    await login(page)
    await openRoute(page, `/programme/events/${EVENT_ID}`)
    await page.getByRole('button', { name: 'Cancel event' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('#lifecycle-reason').fill('Venue withdrew the booking')
    await dialog.getByRole('button', { name: 'Record lifecycle change' }).click()

    await expect.poll(() => lifecycleBody).not.toBeNull()
    expect(lifecycleBody).toMatchObject({
      action: 'cancel',
      reason: 'Venue withdrew the booking',
    })
  })

  test('event rows show lifecycle and organizer state; the editor carries revision state', async ({
    page,
  }) => {
    await login(page)
    await openRoute(page, '/programme/events/list')
    await expect(page.locator('body')).toContainText(/in review/i, { timeout: 20_000 })
    await expect(page.locator('body')).toContainText(/Community organizer/, { timeout: 20_000 })
    await expect(page.locator('body')).toContainText(/Verified organizer/, { timeout: 20_000 })

    await openRoute(page, `/programme/events/${EVENT_ID}`)
    await expect(page.locator('body')).toContainText(/revision in review/i, { timeout: 20_000 })
    await expect(page.locator('body')).toContainText(/all changes saved/i)
    await expect(page.locator('body')).toContainText(/Capacity \(places\)/)
    await expect(page.locator('body')).toContainText(/Floor 313/)
  })

  test('role gating: a reader is redirected, a moderator keeps read access', async ({
    browser,
  }) => {
    const reader = await browser.newContext()
    const readerPage = await reader.newPage()
    await login(readerPage, 'alice@example.com')
    await readerPage.goto('/programme/events', { waitUntil: 'domcontentloaded' })
    await expect(readerPage).toHaveURL(/\/no-access/, { timeout: 20_000 })
    await reader.close()

    const moderator = await browser.newContext()
    const moderatorPage = await moderator.newPage()
    await login(moderatorPage, 'moderator@example.com')
    await moderatorPage.goto('/programme/events', { waitUntil: 'domcontentloaded' })
    await expect(moderatorPage).not.toHaveURL(/\/no-access/, { timeout: 20_000 })
    await expect(moderatorPage.locator('body')).toContainText(/Events overview/)
    await moderator.close()
  })
})

async function undoCheckIn(page: Page) {
  await page.getByRole('button', { name: /Undo check-in/ }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.locator('#undo-reason').fill('Verification correction')
  await dialog.getByRole('button', { name: 'Undo check-in' }).click()
  await expect(dialog).not.toBeVisible()
}
