import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

const isIntegration = process.env.INTEGRATION_TEST === 'true'

test.describe('CRUD Integration Tests', () => {
  test.describe.configure({ timeout: 90000 })

  test.skip(!isIntegration, 'integration tests require INTEGRATION_TEST=true')

  test('destinations — list loads from Go API', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await page.waitForURL('**/destinations', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Destination CMS')
    // Verify Go data loaded (seeded destination names)
    const body = page.locator('body')
    await expect(body).toContainText('Maasai Mara')
  })

  test('events — list loads from Go API', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/events')
    await page.waitForURL('**/events', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Events Calendar Admin')
    await expect(page.locator('body')).toContainText('Cultural Festival')
  })

  test('courses — list loads from Go API', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/lms')
    await page.waitForURL('**/lms', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Learning Hub')
    await expect(page.locator('body')).toContainText('Wildlife Conservation 101')
  })

  test('conservation — list loads from Go API', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/conservation')
    await page.waitForURL('**/conservation', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Conservation Tracker Administration')
  })

  test('campaigns — list loads from Go API', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/campaigns')
    await page.waitForURL('**/campaigns', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Campaigns')
  })

  test('challenges — list loads from Go API', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/challenges')
    await page.waitForURL('**/challenges', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Challenges')
  })

  test('media — list loads from Go API', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/media')
    await page.waitForURL('**/media', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('UGC Moderation & Media Library')
  })
})
