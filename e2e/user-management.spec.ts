import { test, expect, type Page } from '@playwright/test'

test.describe('User Management E2E', () => {
  test.describe.configure({ timeout: 60000 })

  async function loginAs(page: Page, email: string) {
    await page.goto('/login')
    await page.waitForFunction(() => Object.keys(document).some(k => k.startsWith('__reactContainer')))
    await page.waitForTimeout(500)
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'password')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL('**/analytics', { timeout: 15000 })
    await page.waitForTimeout(1000)
  }

  test.describe('Page access', () => {
    test('super_admin can access /users', async ({ page }) => {
      await loginAs(page, 'admin@example.com')
      await page.goto('/users')
      await expect(page).not.toHaveURL(/\/login|\/no-access/, { timeout: 5000 })
      await expect(page.locator('text=User Management & Security')).toBeVisible({ timeout: 5000 })
    })

    test('administrator can access /users', async ({ page }) => {
      await loginAs(page, 'grace@example.com')
      await page.goto('/users')
      await expect(page).not.toHaveURL(/\/login|\/no-access/, { timeout: 5000 })
      await expect(page.locator('text=User Management & Security')).toBeVisible({ timeout: 5000 })
    })

    test('moderator is redirected from /users', async ({ page }) => {
      await loginAs(page, 'moderator@example.com')
      await page.goto('/users')
      await expect(page).toHaveURL(/\/no-access/, { timeout: 5000 })
    })

    test('county_officer is redirected from /users', async ({ page }) => {
      await loginAs(page, 'officer@example.com')
      await page.goto('/users')
      await expect(page).toHaveURL(/\/no-access/, { timeout: 5000 })
    })
  })

  test.describe('Super admin user management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin@example.com')
      await page.goto('/users')
      await expect(page.locator('text=User Management & Security')).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)
    })

    test('displays user list with summary cards', async ({ page }) => {
      await expect(page.locator('text=Total Users')).toBeVisible()
      await expect(page.locator('text=Active Directory')).toBeVisible()
      await expect(page.locator('text=Banned')).toBeVisible()
      await expect(page.locator('text=Roles')).toBeVisible()
    })

    test('can create a new user', async ({ page }) => {
      await page.click('button:has-text("New User")')
      await expect(page.locator('text=New User').first()).toBeVisible({ timeout: 5000 })

      const testEmail = `e2e-create-${Date.now()}@example.com`
      const inputs = page.locator('[role="dialog"] input:not([type="checkbox"])')
      await inputs.nth(0).fill('E2E Test User')
      await inputs.nth(1).fill(testEmail)

      await page.click('text=I attest that user consent has been obtained')
      await page.click('button:has-text("Create User")')

      await expect(page.locator('text=User created')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=Share this securely')).toBeVisible()

      const password = await page.locator('font-mono').textContent()
      expect(password).toBeTruthy()

      await page.click('button:has-text("Done")')
      await expect(page.locator(`text=${testEmail}`).first()).toBeVisible({ timeout: 5000 })
    })

    test('can edit user name', async ({ page }) => {
      const nameCell = page.locator('table tbody tr').first().locator('td').first()
      await nameCell.click()
      await page.waitForTimeout(500)

      const nameInput = page.locator('input[value]').first()
      await nameInput.fill('Updated Admin Name')

      await page.click('button:has-text("Save")')
      await page.waitForTimeout(1000)
      await expect(page.locator('text=Updated Admin Name').first()).toBeVisible({ timeout: 5000 })
    })

    test('can ban and unban a user', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.click()
      await page.waitForTimeout(500)

      const suspendCheckbox = page.locator('text=Suspend account').locator('..').locator('input[type="checkbox"]')
      await suspendCheckbox.check()
      await page.waitForTimeout(200)

      const reasonInput = page.locator('input[placeholder="Reason for suspension..."]')
      await reasonInput.fill('E2E test ban')

      await page.click('button:has-text("Save")')
      await page.waitForTimeout(1000)

      await expect(page.locator('text=Banned').first()).toBeVisible({ timeout: 5000 })

      const bannedRow = page.locator('table tbody tr').first()
      await bannedRow.click()
      await page.waitForTimeout(500)

      const unbanCheckbox = page.locator('text=Suspend account').locator('..').locator('input[type="checkbox"]')
      await unbanCheckbox.uncheck()

      await page.click('button:has-text("Save")')
      await page.waitForTimeout(1000)
    })

    test('can toggle user consent', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.click()
      await page.waitForTimeout(500)

      const revokeBtn = page.locator('button:has-text("Revoke Consent")')
      const grantBtn = page.locator('button:has-text("Grant Consent")')

      if (await revokeBtn.isVisible()) {
        await revokeBtn.click()
      } else if (await grantBtn.isVisible()) {
        await grantBtn.click()
      }

      await page.click('button:has-text("Save")')
      await page.waitForTimeout(1000)
    })

    test('can change user role', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.click()
      await page.waitForTimeout(500)

      const roleSelect = page.locator('select')
      await roleSelect.selectOption('administrator')

      await page.click('button:has-text("Save")')
      await page.waitForTimeout(1000)

      await expect(page.locator('text=administrator').first()).toBeVisible({ timeout: 5000 })

      // Re-open and restore role
      const rowAgain = page.locator('table tbody tr').first()
      await rowAgain.click()
      await page.waitForTimeout(500)
      await page.locator('select').selectOption('super_admin')
      await page.click('button:has-text("Save")')
      await page.waitForTimeout(1000)
    })

    test('audit log shows entries after role change', async ({ page }) => {
      // Trigger a role change
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.click()
      await page.waitForTimeout(500)
      await page.locator('select').selectOption('administrator')
      await page.click('button:has-text("Save")')
      await page.waitForTimeout(1000)

      // Restore
      await page.locator('table tbody tr').first().click()
      await page.waitForTimeout(500)
      await page.locator('select').selectOption('super_admin')
      await page.click('button:has-text("Save")')
      await page.waitForTimeout(1000)

      // Check audit tab
      await page.click('button:has-text("Consent Audit")')
      await page.waitForTimeout(1000)
      await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=role_assigned').first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Administrator limitations', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'grace@example.com')
      await page.goto('/users')
      await expect(page.locator('text=User Management & Security')).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)
    })

    test('can view user list but role dropdown is disabled', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.click()
      await page.waitForTimeout(500)

      const roleSelect = page.locator('select')
      await expect(roleSelect).toBeDisabled()
      await expect(page.locator('text=Only super-admin can change roles')).toBeVisible()
    })

    test('ban checkbox is disabled', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.click()
      await page.waitForTimeout(500)

      const suspendCheckbox = page.locator('text=Suspend account').locator('..').locator('input[type="checkbox"]')
      await expect(suspendCheckbox).toBeDisabled()
      await expect(page.locator('text=Only super-admin can suspend users')).toBeVisible()
    })
  })
})
