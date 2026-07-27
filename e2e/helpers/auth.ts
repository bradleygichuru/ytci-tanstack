import { expect, type Page } from '@playwright/test'

export async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.waitForFunction(() => Object.keys(document).some(k => k.startsWith('__reactContainer')))
  await page.waitForTimeout(500)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'password')
  await page.click('button:has-text("Sign In")')
  await page.waitForURL('**/analytics', { timeout: 20000 })
  await page.waitForTimeout(1000)
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, 'admin@example.com')
}

export async function waitForData(page: Page) {
  await expect(page.locator('text=Loading...')).not.toBeVisible({ timeout: 15000 })
}
