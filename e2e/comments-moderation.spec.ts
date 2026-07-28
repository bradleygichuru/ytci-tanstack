import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

const isIntegration = process.env.INTEGRATION_TEST === 'true'

test.describe('Comments Moderation', () => {
  test.describe.configure({ timeout: 90000 })
  test.skip(!isIntegration, 'integration tests require INTEGRATION_TEST=true')

  test('moderation list loads from Go API with seeded comments', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/comments')
    await page.waitForURL('**/comments', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Comments')
    // Verify seeded comment data renders from Go API
    await expect(page.locator('body')).toContainText('What a wonderful destination!')
    await expect(page.locator('body')).toContainText('Thank you! We loved it there.')
  })

  test('status filter pills filter comments', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/comments')
    await page.waitForURL('**/comments', { timeout: 15000 })

    // Click "Published" filter — published comments visible, deleted comments hidden
    await page.getByRole('button', { name: 'Published', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('What a wonderful destination!')).toBeVisible()
    await expect(page.getByText('Thank you! We loved it there.')).toBeVisible()
    await expect(page.getByText('[deleted]')).not.toBeVisible()

    // Click "Deleted" filter — deleted comments visible, published hidden
    await page.getByRole('button', { name: 'Deleted', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('[deleted]')).toBeVisible()
    await expect(page.getByText('What a wonderful destination!')).not.toBeVisible()
  })

  test('remove comment via ConfirmDialog', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/comments')
    await page.waitForURL('**/comments', { timeout: 15000 })

    // Click "Remove" on the first comment card
    await page.locator('button:has-text("Remove")').first().click()

    // ConfirmDialog appears with title "Remove Comment"
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Remove Comment')).toBeVisible()

    // Click "Remove" in the dialog to confirm
    await page.getByRole('button', { name: 'Remove' }).last().click()

    // Verify toast notification
    await expect(page.getByText('Comment removed')).toBeVisible({ timeout: 10000 })
  })
})
