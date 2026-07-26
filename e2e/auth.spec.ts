import { test, expect, type Page } from '@playwright/test'

const AREAS = ['analytics', 'destinations', 'media', 'lms', 'conservation', 'events', 'ai-config', 'campaigns', 'users']

const ROLE_MATRIX: Record<string, string[]> = {
  super_admin: AREAS,
  administrator: AREAS,
  moderator: ['analytics', 'media'],
  county_officer: ['destinations', 'media'],
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/analytics', { timeout: 15000 })
}

test.describe('E2E Authorization Tests', () => {
  test.describe('Unauthenticated', () => {
    for (const area of AREAS) {
      test(`/${area} redirects to /login`, async ({ page }) => {
        await page.goto(`/${area}`)
        await expect(page).toHaveURL(/\/login/)
      })
    }
  })

  test.describe('Authenticated — per-role RBAC', () => {
    test('super_admin can access all 9 areas', async ({ page }) => {
      await loginAs(page, 'admin@example.com', 'password')
      for (const area of AREAS) {
        await page.goto(`/${area}`)
        await expect(page).not.toHaveURL(/\/login|no-access/)
      }
    })

    test('administrator can access all 9 areas', async ({ page }) => {
      await loginAs(page, 'grace@example.com', 'password')
      for (const area of AREAS) {
        await page.goto(`/${area}`)
        await expect(page).not.toHaveURL(/\/login|no-access/)
      }
    })

    test('moderator can only access analytics + media', async ({ page }) => {
      await loginAs(page, 'moderator@example.com', 'password')
      for (const area of AREAS) {
        await page.goto(`/${area}`)
        if (ROLE_MATRIX.moderator.includes(area)) {
          await expect(page).not.toHaveURL(/\/login|no-access/)
        } else {
          await expect(page).toHaveURL(/\/no-access/)
        }
      }
    })

    test('county_officer can only access destinations + media', async ({ page }) => {
      await loginAs(page, 'officer@example.com', 'password')
      for (const area of AREAS) {
        await page.goto(`/${area}`)
        if (ROLE_MATRIX.county_officer.includes(area)) {
          await expect(page).not.toHaveURL(/\/login|no-access/)
        } else {
          await expect(page).toHaveURL(/\/no-access/)
        }
      }
    })

    test('banned user cannot log in', async ({ page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', 'suspended@example.com')
      await page.fill('input[type="password"]', 'password')
      await page.click('button[type="submit"]')
      await expect(page).not.toHaveURL(/\/analytics/)
      await expect(page.locator('text=error\\|banned\\|failed').first()).toBeVisible({ timeout: 5000 })
    })
  })
})
