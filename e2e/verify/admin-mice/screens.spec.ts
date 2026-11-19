import { expect, test } from '@playwright/test'
import { assertDisposableTarget } from '../helpers/seed'
import { login, openRoute, SCREENS, setDataState } from './mice.helpers'

/**
 * Screen matrix for the implemented MICE admin surface (#364).
 *
 * Runs against the real admin app in live mode. Captures live in
 * docs/verification/evidence/364/admin; this spec asserts the same screens
 * render real data rather than loading scaffolds.
 */
test.describe('MICE admin — screen matrix', () => {
  test.skip(process.env.VERIFY_MODE !== 'live', 'live admin run only')

  test.beforeAll(() => {
    if (process.env.VERIFY_MODE === 'live') assertDisposableTarget()
  })

  test('every screen renders real data at 1400', async ({ page }) => {
    const serverErrors: string[] = []
    page.on('response', (response) => {
      if (/\/v1\/(admin|public|mobile)\//.test(response.url()) && response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.url()}`)
      }
    })
    await page.setViewportSize({ width: 1400, height: 1000 })
    await login(page)

    for (const [key, route, marker] of SCREENS) {
      await openRoute(page, route)
      await expect(page.locator('body'), `${key} marker`).toContainText(marker, {
        timeout: 20_000,
      })
      await expect(page.locator('body')).not.toContainText(/^Loading the/m)
      await expect(page.locator('body')).not.toContainText(/Fetching the latest from the programme API/)
    }

    expect(serverErrors, 'no 5xx from the MICE API on the default state').toEqual([])
  })

  test('1180 and 900 keep each screen readable and populated', async ({ page }) => {
    await login(page)
    for (const width of [1180, 900]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const [key, route, marker] of SCREENS) {
        await openRoute(page, route)
        await expect(page.locator('body'), `${key} @ ${width}`).toContainText(marker, {
          timeout: 20_000,
        })
      }
    }
  })

  test('default, empty, error and stale are distinct states', async ({ page }) => {
    await login(page)
    await page.setViewportSize({ width: 1400, height: 1000 })
    await openRoute(page, '/programme/events/list')
    await expect(page.locator('body')).toContainText(/Showing 3 of 3/)

    await setDataState(page, 'Empty')
    await expect(page.locator('body')).toContainText(/No events match|No events in this fixture/i)

    await setDataState(page, 'Error')
    await expect(page.locator('body')).toContainText(/could not load|Retry/i)

    await setDataState(page, 'Stale')
    await expect(page.locator('body')).toContainText(/Stale snapshot/i)

    await setDataState(page, 'Default')
    await expect(page.locator('body')).toContainText(/Showing 3 of 3/)
  })
})
