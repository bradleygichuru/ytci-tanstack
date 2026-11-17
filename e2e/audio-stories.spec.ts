import { expect, test } from '@playwright/test'
import { loginAs, loginAsAdmin } from './helpers/auth'

test.describe('Audio Stories admin', () => {
  test('stories, review and collections tabs render', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/audio-stories')

    await expect(
      page.getByRole('heading', { name: 'Audio Stories', exact: true }),
    ).toBeVisible()
    const tabs = page.getByRole('navigation', { name: 'Audio Stories sections' })
    await expect(tabs).toBeVisible()
    await expect(tabs.getByRole('link', { name: 'Stories', exact: true })).toBeVisible()
    await expect(tabs.getByRole('link', { name: 'Review', exact: true })).toBeVisible()
    await expect(tabs.getByRole('link', { name: 'Collections', exact: true })).toBeVisible()
    await expect(page.getByText('The Drum at Dusk').first()).toBeVisible({
      timeout: 20000,
    })

    await tabs.getByRole('link', { name: 'Review', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Audio Story Reviews' }),
    ).toBeVisible()

    await tabs.getByRole('link', { name: 'Collections', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Audio Story Collections' }),
    ).toBeVisible()
    await expect(page.getByText('Coastal Voices').first()).toBeVisible({
      timeout: 20000,
    })
  })

  test('story detail opens with metadata and status', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/audio-stories')

    await page.getByRole('link', { name: /The Drum at Dusk/ }).first().click()
    await expect(
      page.getByRole('heading', { name: /The Drum at Dusk/ }),
    ).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/Kajiado/).first()).toBeVisible()
    await expect(page.getByText('Published').first()).toBeVisible()
  })

  test('draft story and review queue states render', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/audio-stories')
    await expect(page.getByText('The Last Mangrove').first()).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByText('Draft').first()).toBeVisible()

    await page.goto('/audio-stories/review')
    await expect(
      page.getByRole('heading', { name: 'Audio Story Reviews' }),
    ).toBeVisible()
    const filters = page.getByRole('tablist', { name: 'Review queue filters' })
    await expect(filters).toBeVisible()
    await expect(filters.getByRole('tab', { name: /All/ })).toBeVisible()
  })

  test('non-admin cannot open the audio admin', async ({ page }) => {
    await loginAs(page, 'alice@example.com')
    await page.goto('/audio-stories')
    await expect(page).toHaveURL(/no-access/, { timeout: 20000 })
  })
})
