import { test, expect, type Page } from '@playwright/test'

test.describe('User Management E2E', () => {
  test.describe.configure({ timeout: 90000 })

  async function loginAs(page: Page, email: string) {
    await page.goto('/login')
    await page.waitForFunction(() => Object.keys(document).some(k => k.startsWith('__reactContainer')))
    await page.waitForTimeout(500)
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'password')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL('**/analytics', { timeout: 20000 })
    await page.waitForTimeout(1000)
  }

  async function waitForData(page: Page) {
    await expect(page.locator('text=Loading...')).not.toBeVisible({ timeout: 15000 })
  }

  async function clickFirstRow(page: Page) {
    const firstCell = page.locator('table tbody td:not([colspan])').first()
    await firstCell.waitFor({ state: 'visible', timeout: 10000 })
    await firstCell.click()
    await page.waitForTimeout(500)
  }

  async function apiPost(page: Page, action: string, body: Record<string, unknown>) {
    return page.evaluate(async ({ a, b }: { a: string; b: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/users/${a}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b), credentials: 'same-origin'
      })
      if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error) }
      return res.json()
    }, { a: action, b: body })
  }

  function editPanel(page: Page) {
    return page.locator('table tbody td[colspan]')
  }

  test.describe('Page access', () => {
    test('super_admin can access /users', async ({ page }) => {
      await loginAs(page, 'admin@example.com')
      await page.goto('/users')
      await expect(page).not.toHaveURL(/\/login|\/no-access/, { timeout: 10000 })
      await expect(page.locator('h1')).toContainText('User Management & Security')
    })

    test('administrator can access /users', async ({ page }) => {
      await loginAs(page, 'grace@example.com')
      await page.goto('/users')
      await expect(page).not.toHaveURL(/\/login|\/no-access/, { timeout: 10000 })
      await expect(page.locator('h1')).toContainText('User Management & Security')
    })

    test('moderator is redirected from /users', async ({ page }) => {
      await loginAs(page, 'moderator@example.com')
      await page.goto('/users')
      await expect(page).toHaveURL(/\/no-access/, { timeout: 10000 })
    })

    test('county_officer is redirected from /users', async ({ page }) => {
      await loginAs(page, 'officer@example.com')
      await page.goto('/users')
      await expect(page).toHaveURL(/\/no-access/, { timeout: 10000 })
    })
  })

  test.describe('Super admin user management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin@example.com')
      await page.goto('/users')
      await expect(page.locator('h1')).toContainText('User Management & Security')
      await waitForData(page)
    })

    test.afterEach(async ({ page }) => {
      // Cleanup: reset grace to known state
      try {
        await page.evaluate(async () => {
          await fetch('/api/admin/users/update', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: '1Hv1qBABcU9rQh0VQoZLI2dHyq23ck7m', role: 'administrator', banned: false, consentGrantedAt: null }),
            credentials: 'same-origin'
          })
        })
      } catch {}
    })

    test('displays stat cards and user table', async ({ page }) => {
      await expect(page.locator('text=Total Users').first()).toBeVisible()
      await expect(page.locator('text=Active Directory').first()).toBeVisible()
      await expect(page.locator('text=Roles').first()).toBeVisible()
      const userRows = page.locator('table tbody tr').filter({ hasText: '@' })
      await expect(userRows.first()).toBeVisible({ timeout: 10000 })
    })

    test('can create a new user', async ({ page }) => {
      const testEmail = `e2e-create-${Date.now()}@example.com`
      await apiPost(page, 'create', { name: 'E2E Test User', email: testEmail, role: 'moderator' })
      await page.reload()
      await waitForData(page)
      await expect(page.getByText(testEmail).first()).toBeVisible({ timeout: 10000 })
    })

    test('can edit user name', async ({ page }) => {
      await clickFirstRow(page)
      const nameInput = editPanel(page).locator('input').first()
      await nameInput.waitFor({ state: 'visible', timeout: 5000 })
      await nameInput.fill('Updated Admin Name')

      await page.click('button:has-text("Save")')
      await waitForData(page)
      await expect(page.getByText('Updated Admin Name').first()).toBeVisible({ timeout: 5000 })
    })

    test('can ban and unban a user', async ({ page }) => {
      await apiPost(page, 'update', { userId: '1Hv1qBABcU9rQh0VQoZLI2dHyq23ck7m', banned: true, banReason: 'E2E test ban' })
      await page.reload()
      await waitForData(page)
      await expect(page.locator('table').getByText('Banned').first()).toBeVisible({ timeout: 5000 })

      await apiPost(page, 'update', { userId: '1Hv1qBABcU9rQh0VQoZLI2dHyq23ck7m', banned: false })
      await page.reload()
      await waitForData(page)
    })

    test('can toggle user consent', async ({ page }) => {
      await apiPost(page, 'update', { userId: '1Hv1qBABcU9rQh0VQoZLI2dHyq23ck7m', consentGrantedAt: new Date().toISOString() })
      await page.reload()
      await waitForData(page)
    })

    test('can change user role and audit log shows it', async ({ page }) => {
      await apiPost(page, 'update', { userId: '1Hv1qBABcU9rQh0VQoZLI2dHyq23ck7m', role: 'moderator' })
      await page.reload()
      await waitForData(page)

      await apiPost(page, 'update', { userId: '1Hv1qBABcU9rQh0VQoZLI2dHyq23ck7m', role: 'administrator' })
      await page.reload()
      await waitForData(page)

      await page.click('button:has-text("Consent Audit")')
      await page.waitForTimeout(1500)
      await expect(page.getByText('role assigned').first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Administrator limitations', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'grace@example.com')
      await page.goto('/users')
      await expect(page.locator('h1')).toContainText('User Management & Security')
      await waitForData(page)
    })

    test('role dropdown is disabled', async ({ page }) => {
      await clickFirstRow(page)
      const roleSelect = editPanel(page).locator('select')
      await expect(roleSelect).toBeDisabled()
      await expect(page.getByText('Only super-admin can change roles')).toBeVisible()
    })

    test('suspend checkbox is disabled', async ({ page }) => {
      await clickFirstRow(page)
      const suspendCheckbox = editPanel(page).locator('label:has-text("Suspend account")').locator('input[type="checkbox"]')
      await expect(suspendCheckbox).toBeDisabled()
      await expect(page.getByText('Only super-admin can suspend users')).toBeVisible()
    })
  })
})
