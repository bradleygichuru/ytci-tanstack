import { expect, test } from '@playwright/test'
import { assertDisposableTarget } from '../helpers/seed'
import { EVENT_ID, login, openRoute } from './mice.helpers'

test.describe('MICE admin — implemented behaviour', () => {
  test.skip(process.env.VERIFY_MODE !== 'live', 'live admin run only')

  test.beforeAll(() => {
    if (process.env.VERIFY_MODE === 'live') assertDisposableTarget()
  })

  test('agenda detects a room double-booking and explains it', async ({ page }) => {
    await login(page)
    await openRoute(page, '/programme/events/agenda')
    await page.getByRole('button', { name: 'Add session' }).first().click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('#session-title').fill('Overlap check')
    await dialog.locator('#session-room').fill('Tsavo Ballroom')
    await dialog.locator('#session-start').fill('09:30')
    await dialog.locator('#session-end').fill('10:30')
    await dialog.getByRole('button', { name: 'Add session' }).click()

    await expect(page.locator('body')).toContainText(/agenda conflict/i)
    await expect(page.locator('body')).toContainText(/Tsavo Ballroom is double-booked/i)
  })

  test('registrations expose the ticket, access needs and an honest empty waitlist', async ({
    page,
  }) => {
    await login(page)
    await openRoute(page, '/programme/events/registrations')

    await expect(page.locator('body')).toContainText(/1 of 400 confirmed/)
    await expect(page.locator('body')).toContainText(/No one is waiting/)
    await expect(page.locator('body')).toContainText(/eyJhbGciOiJIUzI1NiJ9/)
    await expect(page.locator('body')).toContainText(/Step-free access required/)
    await expect(page.getByRole('button', { name: /Export access needs/ })).toBeEnabled()
    // No waitlist offer can exist when nobody is waiting.
    await expect(page.getByRole('button', { name: /^Send offer$/ })).toHaveCount(0)
  })

  test('check-in counts reconcile, roster stays hidden, undo and record both work', async ({
    page,
  }) => {
    await login(page)
    await openRoute(page, '/programme/events/check-in')

    await expect(page.locator('body')).toContainText(/1 of 1 confirmed/)
    await expect(page.locator('body')).toContainText(/0 not yet arrived/)
    await expect(page.locator('body')).toContainText(/1 imported from the door scanner/)
    await expect(page.locator('body')).toContainText(/0 recorded in this console/)
    await expect(page.locator('body')).toContainText(/Roster hidden/)

    const search = page.getByLabel('Search name or ticket code')
    await search.pressSequentially('Demo', { delay: 20 })
    await expect(page.locator('body')).toContainText(/Matching registrations/)
    await expect(page.locator('body')).toContainText(/Demo Attendee/)

    await page.getByRole('button', { name: 'Undo' }).first().click()
    await expect(page.locator('body')).toContainText(/0 imported from the door scanner/)
    await expect(page.locator('body')).toContainText(/1 not yet arrived/)

    await page.getByRole('button', { name: /^Check in$/ }).first().click()
    await expect(page.locator('body')).toContainText(/1 recorded in this console/)
    await expect(page.locator('body')).toContainText(/0 not yet arrived/)
  })

  test('check-in override requires a reason before it can be recorded', async ({ page }) => {
    await login(page)
    await openRoute(page, '/programme/events/check-in')
    await page.getByRole('button', { name: /Override entry/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('#override-reason')).toBeVisible()
    // Submitting without a reason must not close the dialog.
    await dialog.getByRole('button', { name: /Record override|Override/ }).last().click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/reason is required/i)
  })

  test('audit log filters, expands and records a local check-in action', async ({ page }) => {
    await login(page)
    await openRoute(page, '/programme/events/audit')
    await expect(page.locator('body')).toContainText(/3 entries/)

    await page.getByRole('button', { name: 'Events', exact: true }).click()
    await expect(page.locator('body')).toContainText(/2 entries/)
    await page.getByRole('button', { name: 'Detail' }).first().click()
    await expect(page.locator('body')).toContainText(/Great Lakes Tourism Forum 2026/)

    // A local workflow action appends its own audit row.
    await openRoute(page, '/programme/events/check-in')
    const search = page.getByLabel('Search name or ticket code')
    await search.pressSequentially('Demo', { delay: 20 })
    await page.getByRole('button', { name: 'Undo' }).first().click()
    await openRoute(page, '/programme/events/audit')
    await expect(page.locator('body')).toContainText(/Check-in|Undo|check-in/i)
  })

  test('event rows show lifecycle and organizer state; the editor carries revision state', async ({
    page,
  }) => {
    await login(page)
    await openRoute(page, '/programme/events/list')
    await expect(page.locator('body')).toContainText(/IN REVIEW/)
    await expect(page.locator('body')).toContainText(/Community organizer/)
    await expect(page.locator('body')).toContainText(/Verified organizer/)

    await openRoute(page, `/programme/events/${EVENT_ID}`)
    await expect(page.locator('body')).toContainText(/REVISION IN REVIEW/)
    await expect(page.locator('body')).toContainText(/ALL CHANGES SAVED/)
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
