import { test, expect, type Page } from '@playwright/test'
import { loginAs } from './helpers/auth'

const AREAS = ['analytics', 'destinations', 'media', 'lms', 'conservation', 'events', 'ai-config', 'campaigns', 'users']

const ROLE_MATRIX: Record<string, string[]> = {
  super_admin: AREAS,
  administrator: AREAS,
  moderator: ['analytics', 'media'],
  county_officer: ['destinations', 'media'],
}

test.describe('E2E Authorization Tests', () => {
  test.describe('Unauthenticated', () => {
    for (const area of AREAS) {
      test(`/${area} redirects to /login`, async ({ page }) => {
        await page.goto(`/${area}`)
        await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
      })
    }
  })

  test.describe('Authenticated — per-role RBAC', () => {
    test.describe.configure({ timeout: 60000 })

    async function navigateTo(page: Page, area: string) {
      if (page.url().includes(area)) return
      await page.goto(`/${area}`)
    }

    test('super_admin can access all 9 areas', async ({ page }) => {
      await loginAs(page, 'admin@example.com')
      for (const area of AREAS) {
        await navigateTo(page, area)
        await expect(page).not.toHaveURL(/\/login|no-access/, { timeout: 5000 })
      }
    })

    test('administrator can access all 9 areas', async ({ page }) => {
      await loginAs(page, 'grace@example.com')
      for (const area of AREAS) {
        await navigateTo(page, area)
        await expect(page).not.toHaveURL(/\/login|no-access/, { timeout: 5000 })
      }
    })

    test('moderator can only access analytics + media', async ({ page }) => {
      await loginAs(page, 'moderator@example.com')
      for (const area of AREAS) {
        await navigateTo(page, area)
        if (ROLE_MATRIX.moderator.includes(area)) {
          await expect(page).not.toHaveURL(/\/login|no-access/, { timeout: 5000 })
        } else {
          await expect(page).toHaveURL(/\/no-access/, { timeout: 5000 })
        }
      }
    })

    test('county_officer can only access destinations + media', async ({ page }) => {
      await loginAs(page, 'officer@example.com')
      for (const area of AREAS) {
        await navigateTo(page, area)
        if (ROLE_MATRIX.county_officer.includes(area)) {
          await expect(page).not.toHaveURL(/\/login|no-access/, { timeout: 5000 })
        } else {
          await expect(page).toHaveURL(/\/no-access/, { timeout: 5000 })
        }
      }
    })

    test('banned user cannot log in', async ({ page }) => {
      await page.goto('/login')
      await page.waitForFunction(() => Object.keys(document).some(k => k.startsWith('__reactContainer')))
      await page.waitForTimeout(500)
      await page.fill('input[type="email"]', 'suspended@example.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button:has-text("Sign In")')
      await expect(page.locator('text=banned').first()).toBeVisible({ timeout: 5000 })
      await expect(page).not.toHaveURL(/\/analytics/)
    })
  })
})
