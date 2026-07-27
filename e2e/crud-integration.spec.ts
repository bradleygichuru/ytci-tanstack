import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

const isIntegration = process.env.INTEGRATION_TEST === 'true'

test.describe('CRUD Integration Tests', () => {
  test.describe.configure({ timeout: 60000 })

  const created: { type: string; id: string }[] = []

  test.afterEach(async ({ page }) => {
    await loginAsAdmin(page)
    for (const r of created.reverse()) {
      try {
        await page.evaluate(({ type, id }) => fetch(`/v1/${type}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${(window as Record<string, unknown>).token as string}` } }), r)
      } catch { /* cleanup best-effort */ }
    }
    created.length = 0
  })

  test.skip(!isIntegration, 'integration tests require INTEGRATION_TEST=true')

  test('destinations — create + read + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/destinations')

    await page.getByRole('button', { name: /New Destination/ }).click()
    await page.fill('input[id*="name"]', 'E2E Test Destination')
    await page.fill('input[id*="slug"]', `e2e-test-${Date.now()}`)
    await page.fill('input[id*="county"]', 'Nairobi')
    await page.locator('select').filter({ hasText: 'Select...' }).first().selectOption('wildlife')
    await page.getByRole('button', { name: /Create Destination/ }).click()
    await page.waitForTimeout(1000)

    await expect(page.getByText('E2E Test Destination')).toBeVisible({ timeout: 10000 })
  })

  test('destinations — hero image upload via R2', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await page.getByText('E2E Test Destination').click()
    await page.getByRole('button', { name: /Media/ }).click()
    const uploadArea = page.locator('input[type="file"]').first()
    await uploadArea.setInputFiles('./e2e/fixtures/test-image.png')
    await expect(page.getByText('Upload complete')).toBeVisible({ timeout: 30000 })
  })

  test('events — create + status transition', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/events')
    await page.getByRole('button', { name: /New Event/ }).click()
    await page.fill('input[id*="title"]', `E2E Event ${Date.now()}`)
    await page.fill('input[id*="county"]', 'Nairobi')
    await page.fill('input[id*="date"]', '2026-08-15')
    await page.getByRole('button', { name: /Create Event/ }).click()
    await page.waitForTimeout(1000)
  })

  test('campaigns — create + banner upload + push preview', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/campaigns')
    await page.getByRole('button', { name: /New Campaign/ }).click()
    await page.fill('input[id*="title"]', `E2E Campaign ${Date.now()}`)
    await page.getByRole('button', { name: /Create Campaign/ }).click()
    await page.waitForTimeout(1000)
  })

  test('challenges — create + edit + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/challenges')
    await page.getByRole('button', { name: /New Challenge/ }).click()
    await page.fill('input[id*="title"]', `E2E Challenge ${Date.now()}`)
    await page.getByRole('button', { name: /Create Challenge/ }).click()
    await page.waitForTimeout(1000)
  })

  test('media — full upload flow', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/media')
    await page.getByRole('button', { name: /Media Library/ }).click()
    await page.getByRole('button', { name: /Upload Asset/ }).click()
    const uploadInput = page.locator('input[type="file"]').first()
    await uploadInput.setInputFiles('./e2e/fixtures/test-image.png')
    await expect(page.getByText('Upload complete')).toBeVisible({ timeout: 30000 })
  })
})
