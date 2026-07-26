import { test, expect, type Page } from '@playwright/test'

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
    async function loginAs(page: Page, email: string) {
      // Sign in via direct API call to set the session cookie
      await page.goto('/login')
      const resp = await page.evaluate(async (e) => {
        const r = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: e, password: 'password' }),
        })
        return r.ok ? 'ok' : 'fail'
      }, email)
      expect(resp).toBe('ok')
    }

    test('super_admin can access all 9 areas', async ({ page }) => {
      await loginAs(page, 'admin@example.com')
      for (const area of AREAS) {
        await page.goto(`/${area}`)
        await expect(page).not.toHaveURL(/\/login|no-access/, { timeout: 10000 })
      }
    })

    test('administrator can access all 9 areas', async ({ page }) => {
      await loginAs(page, 'grace@example.com')
      for (const area of AREAS) {
        await page.goto(`/${area}`)
        await expect(page).not.toHaveURL(/\/login|no-access/, { timeout: 10000 })
      }
    })

    test('moderator can only access analytics + media', async ({ page }) => {
      await loginAs(page, 'moderator@example.com')
      for (const area of AREAS) {
        await page.goto(`/${area}`)
        if (ROLE_MATRIX.moderator.includes(area)) {
          await expect(page).not.toHaveURL(/\/login|no-access/, { timeout: 10000 })
        } else {
          await expect(page).toHaveURL(/\/no-access/, { timeout: 10000 })
        }
      }
    })

    test('county_officer can only access destinations + media', async ({ page }) => {
      await loginAs(page, 'officer@example.com')
      for (const area of AREAS) {
        await page.goto(`/${area}`)
        if (ROLE_MATRIX.county_officer.includes(area)) {
          await expect(page).not.toHaveURL(/\/login|no-access/, { timeout: 10000 })
        } else {
          await expect(page).toHaveURL(/\/no-access/, { timeout: 10000 })
        }
      }
    })

    test('banned user cannot log in', async ({ page }) => {
      await page.goto('/login')
      const resp = await page.evaluate(async () => {
        const r = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'suspended@example.com', password: 'password' }),
        })
        return { ok: r.ok, status: r.status }
      })
      expect(resp.ok).toBe(false)
      expect(resp.status).toBe(403)
    })
  })
})
