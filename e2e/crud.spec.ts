import { test, expect, type Page } from '@playwright/test'

test.describe('CRUD E2E Tests', () => {
  test.describe.configure({ timeout: 120000 })

  async function loginAsAdmin(page: Page) {
    await page.goto('/login')
    await page.waitForFunction(() => Object.keys(document).some(k => k.startsWith('__reactContainer')))
    await page.waitForTimeout(500)
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL('**/analytics', { timeout: 20000 })
    await page.waitForTimeout(500)
  }

  test('Destinations — create + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await expect(page.getByText(/3 destinations/)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'New Destination' }).click()
    await expect(page.getByLabel('Name')).toBeVisible({ timeout: 10000 })

    await page.getByLabel('Name').fill('E2E Test Dest')
    await page.getByLabel('Slug').fill('e2e-test-dest')
    await page.getByLabel('County').fill('Nairobi')
    await page.getByLabel('Category').selectOption('culture')

    await page.getByRole('button', { name: 'Create Destination' }).click()

    await expect(page.getByText('E2E Test Dest').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible({ timeout: 10000 })

    await page.locator('button:has-text("Delete")').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('E2E Test Dest')).toHaveCount(0, { timeout: 10000 })
  })

  test('Events — create + status transition + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/events')
    await expect(page.getByText(/5 events/)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'New Event' }).click()
    await expect(page.getByLabel('Title')).toBeVisible({ timeout: 10000 })

    await page.getByLabel('Title').fill('E2E Test Event')
    await page.getByLabel('County').fill('Nairobi')
    await page.getByLabel('Start Date').fill('2025-12-01')

    await page.getByRole('button', { name: 'Create Event' }).click()

    await expect(page.getByText('E2E Test Event').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /→ postponed/ })).toBeVisible({ timeout: 10000 })

    await page.locator('button:has-text("Delete")').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('E2E Test Event')).toHaveCount(0, { timeout: 10000 })
  })

  test('Campaigns — create + type switch + push send + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/campaigns')
    await expect(page.getByText(/6 campaigns/)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'New Campaign' }).click()
    await expect(page.getByLabel('Title')).toBeVisible({ timeout: 10000 })

    await page.getByLabel('Title').fill('E2E Push Camp')
    await page.getByLabel('Campaign Type').selectOption('push_notification')
    await expect(page.getByLabel('Audience')).toBeVisible({ timeout: 5000 })
    await page.getByLabel('Audience').fill('all')

    await page.getByRole('button', { name: 'Create Campaign' }).click()

    await expect(page.getByText('E2E Push Camp').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Push Notification Send')).toBeVisible({ timeout: 10000 })

    await page.locator('#push-target').selectOption('county')
    await page.getByLabel('Value').fill('Kwale')

    await page.getByRole('button', { name: 'Preview Count' }).click()
    await expect(page.getByText(/devices/)).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'Send Now' }).click()
    await expect(page.getByText('Send History')).toBeVisible({ timeout: 10000 })

    await page.locator('button:has-text("Delete")').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('E2E Push Camp')).toHaveCount(0, { timeout: 10000 })
  })

  test('Conservation — create + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/conservation')
    await expect(page.getByText('Beach Cleanup').first()).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'New Activity' }).click()
    await expect(page.getByLabel('Title')).toBeVisible({ timeout: 10000 })

    await page.getByLabel('Title').fill('E2E Test Cons')
    await page.getByLabel('Organizer').fill('E2E Org')
    await page.getByLabel('Location').fill('Kwale Beach')

    await page.getByRole('button', { name: 'Create Activity' }).click()

    await expect(page.getByText('E2E Test Cons').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible({ timeout: 10000 })

    await page.locator('button:has-text("Delete")').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('E2E Test Cons')).toHaveCount(0, { timeout: 10000 })
  })

  test('LMS — create course + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/lms')
    await expect(page.getByText(/3 courses/)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'New Course' }).click()
    await expect(page.getByLabel('Title')).toBeVisible({ timeout: 10000 })

    await page.getByLabel('Title').fill('E2E Test Course')

    await page.getByRole('button', { name: 'Create Course' }).click()

    await expect(page.getByText('E2E Test Course').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible({ timeout: 10000 })

    await page.locator('button:has-text("Delete")').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('E2E Test Course')).toHaveCount(0, { timeout: 10000 })
  })

  test('Validation — required field errors visible on create', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await expect(page.getByText(/3 destinations/)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'New Destination' }).click()
    await expect(page.getByLabel('Name')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'Create Destination' }).click()

    await expect(page.getByText('Name is required')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('County is required')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Category is required')).toBeVisible({ timeout: 5000 })
  })
})
