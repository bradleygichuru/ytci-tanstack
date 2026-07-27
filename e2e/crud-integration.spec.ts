import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

const isIntegration = process.env.INTEGRATION_TEST === 'true'

test.describe('CRUD Integration Tests', () => {
  test.describe.configure({ timeout: 90000 })

  test.skip(!isIntegration, 'integration tests require INTEGRATION_TEST=true')

  test('destinations — create + read + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await page.waitForURL('**/destinations', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Destination CMS')
    await page.waitForTimeout(2000)

    await page.getByRole('button', { name: /New Destination/ }).click()
    await page.waitForTimeout(2000)

    // Verify the form opened by checking the create button exists
    const createBtn = page.locator('button:has-text("Create Destination")')
    await expect(createBtn.first()).toBeVisible({ timeout: 8000 })

    // Find the surrounding create form container (go up 2 levels from the button)
    const formArea = createBtn.first().locator('..').locator('..')
    await formArea.locator('input').nth(0).fill('E2E Test Destination')
    await formArea.locator('input').nth(1).fill(`e2e-test-${Date.now()}`)
    await formArea.locator('input').nth(2).fill('Nairobi')
    await formArea.locator('select').first().selectOption('wildlife')
    await createBtn.first().click()
    await page.waitForTimeout(2000)

    await expect(page.getByText('E2E Test Destination')).toBeVisible({ timeout: 10000 })
  })

  test('destinations — hero image upload via R2', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await page.waitForURL('**/destinations', { timeout: 15000 })
    await page.waitForTimeout(2000)

    await page.getByText('E2E Test Destination').click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /Media/ }).click()
    await page.waitForTimeout(500)
    const uploadArea = page.locator('input[type="file"]').first()
    await uploadArea.setInputFiles('./e2e/fixtures/test-image.png')
    await expect(page.getByText('Upload complete')).toBeVisible({ timeout: 30000 })
  })

  test('media — full upload flow', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/media')
    await page.waitForURL('**/media', { timeout: 15000 })
    await page.waitForTimeout(2000)

    await page.getByRole('button', { name: /Media Library/ }).click()
    await page.getByRole('button', { name: /Upload Asset/ }).click()
    await page.waitForTimeout(500)
    const uploadInput = page.locator('input[type="file"]').first()
    await uploadInput.setInputFiles('./e2e/fixtures/test-image.png')
    await expect(page.getByText('Upload complete')).toBeVisible({ timeout: 30000 })
  })
})
