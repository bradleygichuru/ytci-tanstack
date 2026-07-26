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
    await page.waitForURL('**/analytics', { timeout: 15000 })
    await page.waitForTimeout(1000)
  }

  test('Destinations — create + edit + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/destinations')
    await page.waitForTimeout(1000)

    const newBtn = page.locator('button:has-text("New Destination")')
    await expect(newBtn).toBeVisible()
    await newBtn.click()
    await page.waitForTimeout(500)

    await page.fill('input[placeholder="Search destinations..."]', '')
    const nameInputs = page.locator('input')
    await nameInputs.first().fill('E2E Test Destination')
    await page.waitForTimeout(200)

    const saveBtn = page.locator('button:has-text("Create Destination")')
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=E2E Test Destination').first()).toBeVisible({ timeout: 5000 })

    const row = page.locator('text=E2E Test Destination').first()
    await row.click()
    await page.waitForTimeout(500)

    const saveChanges = page.locator('button:has-text("Save Changes")')
    await expect(saveChanges).toBeVisible()

    const deleteBtn = page.locator('button:has-text("Delete")')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()
    await page.waitForTimeout(500)

    const confirmBtn = page.locator('button:has-text("Delete")').last()
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=E2E Test Destination')).toHaveCount(0, { timeout: 5000 })
  })

  test('Events — create + status transition + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/events')
    await page.waitForTimeout(1000)

    await page.locator('button:has-text("New Event")').click()
    await page.waitForTimeout(500)

    const titleInput = page.locator('input').first()
    await titleInput.fill('E2E Test Event')

    await page.locator('button:has-text("Create Event")').click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=E2E Test Event').first()).toBeVisible({ timeout: 5000 })

    await page.locator('text=E2E Test Event').first().click()
    await page.waitForTimeout(500)

    await expect(page.locator('button:has-text("→ postponed")').first()).toBeVisible()
    await expect(page.locator('button:has-text("→ cancelled")').first()).toBeVisible()

    await page.locator('button:has-text("Delete")').click()
    await page.waitForTimeout(300)
    await page.locator('button:has-text("Delete")').last().click()
    await page.waitForTimeout(1000)
    await expect(page.locator('text=E2E Test Event')).toHaveCount(0, { timeout: 5000 })
  })

  test('Campaigns — create + conditional type fields + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/campaigns')
    await page.waitForTimeout(1000)

    await page.locator('button:has-text("New Campaign")').click()
    await page.waitForTimeout(500)

    await page.locator('input').first().fill('E2E Test Campaign')

    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('push_notification')
    await page.waitForTimeout(300)

    await expect(page.locator('text=Audience')).toBeVisible()

    await typeSelect.selectOption('featured_destination')
    await page.waitForTimeout(300)

    await expect(page.locator('text=Destination ID')).toBeVisible()

    await page.locator('button:has-text("Create Campaign")').click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=E2E Test Campaign').first()).toBeVisible({ timeout: 5000 })

    await page.locator('text=E2E Test Campaign').first().click()
    await page.waitForTimeout(1000)

    await page.locator('button:has-text("Delete")').click()
    await page.waitForTimeout(300)
    await page.locator('button:has-text("Delete")').last().click()
    await page.waitForTimeout(1000)
    await expect(page.locator('text=E2E Test Campaign')).toHaveCount(0, { timeout: 5000 })
  })

  test('Conservation — create + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/conservation')
    await page.waitForTimeout(1000)

    await page.locator('button:has-text("New Activity")').click()
    await page.waitForTimeout(500)

    const inputs = page.locator('input')
    await inputs.nth(1).fill('E2E Test Activity')
    await inputs.nth(2).fill('E2E Organizer')

    await page.locator('button:has-text("Create Activity")').click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=E2E Test Activity').first()).toBeVisible({ timeout: 5000 })

    await page.locator('text=E2E Test Activity').first().click()
    await page.waitForTimeout(500)

    await page.locator('button:has-text("Delete")').first().click()
    await page.waitForTimeout(300)
    await page.locator('button:has-text("Delete")').last().click()
    await page.waitForTimeout(1000)
    await expect(page.locator('text=E2E Test Activity')).toHaveCount(0, { timeout: 5000 })
  })

  test('LMS — create course + delete', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/lms')
    await page.waitForTimeout(1000)

    await page.locator('button:has-text("New Course")').click()
    await page.waitForTimeout(500)

    await page.locator('input').first().fill('E2E Test Course')

    await page.locator('button:has-text("Create Course")').click()
    await page.waitForTimeout(1000)

    await expect(page.locator('text=E2E Test Course').first()).toBeVisible({ timeout: 5000 })

    await page.locator('text=E2E Test Course').first().click()
    await page.waitForTimeout(500)

    await page.locator('button:has-text("Delete")').first().click()
    await page.waitForTimeout(300)
    await page.locator('button:has-text("Delete")').last().click()
    await page.waitForTimeout(1000)
    await expect(page.locator('text=E2E Test Course')).toHaveCount(0, { timeout: 5000 })
  })
})
