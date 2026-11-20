import { expect, test } from '@playwright/test'
import { loginAs, loginAsAdmin } from './helpers/auth'

test.describe.configure({ timeout: 90_000 })

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
    await expect(page.getByText('Nairobi Railway Museum').first()).toBeVisible({
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

  test('pilot sites are live in stories and collections', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/audio-stories')

    for (const title of [
      'Nabongo Cultural Centre',
      'African Heritage House',
      'Nairobi Commonwealth War Cemetery',
      'Nairobi Railway Museum',
    ]) {
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 20000 })
    }

    const tabs = page.getByRole('navigation', { name: 'Audio Stories sections' })
    await tabs.getByRole('link', { name: 'Collections', exact: true }).click()
    for (const name of ['Cultural Landscapes', 'Nairobi Heritage']) {
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 20000 })
    }

    await page.goto('/audio-stories')
    await page.getByRole('link', { name: /Nabongo Cultural Centre/ }).first().click()
    await expect(
      page.getByRole('heading', { name: /Nabongo Cultural Centre/ }),
    ).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Published').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Cultural Landscapes/).first()).toBeVisible()
  })

  test('story detail opens with metadata and status', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/audio-stories')

    await page.getByRole('link', { name: /Nabongo Cultural Centre/ }).first().click()
    await expect(
      page.getByRole('heading', { name: /Nabongo Cultural Centre/ }),
    ).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Published').first()).toBeVisible({ timeout: 15000 })
  })

  test('review queue and published states render', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/audio-stories')
    await expect(page.getByText('Nairobi Railway Museum').first()).toBeVisible({
      timeout: 20000,
    })

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
